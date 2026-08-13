"use client";

import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { PromptField } from "@/components/nodes/prompt-field";
import { ReferenceStrip, type ReferenceEntry } from "@/components/nodes/reference-strip";
import { ResultFrame, type FrameImage } from "@/components/nodes/result-frame";
import {
  RESULT_GRID_SIZE,
  ResultGrid,
  type ResultBoxState,
} from "@/components/nodes/result-grid";
import { useImageCatalog } from "@/components/nodes/use-image-catalog";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import {
  ANGULO_CAMERA,
  ESTILO_RENDERIZACAO,
  estiloOption,
  EXPRESSAO,
  ILUMINACAO,
} from "@/lib/character-sheet/dictionary";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { useEntitiesStore } from "@/lib/entities/store";
import {
  requestGeneration,
  type CanvasGenerationResult,
} from "@/lib/generation/canvas-contract";
import {
  generatorCapacity,
  mentionedCharacter,
  sheetAnchorSlots,
} from "@/lib/generation/capacity";
import {
  listNodeGenerations,
  loadResultCard,
  type GenerationThumb,
} from "@/lib/generation/history";
import { findMentions, sceneWithoutMentions } from "@/lib/generation/mentions";
import {
  DEFAULT_IMAGE_SIZE,
  DEFAULT_PRESET_ID,
  FORMAT_PRESETS,
  IMAGE_SIZES,
  findPreset,
} from "@/lib/generation/presets";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";

/**
 * "Gerar Imagem" — the block where the `@` is finally spent (decision N1).
 *
 * Everything the block knows lives in its own node data and is saved with the
 * graph, so a project reopened tomorrow still has the scene someone was writing,
 * the format they chose and the last image they got.
 *
 * What it deliberately does not do is decide anything the server must decide.
 * The prompt travels as text; which frozen version `@luna` names, what the
 * generation costs and whether it is affordable are all answered on the other
 * side. This component's job is to make the answer legible before the click.
 */

const copy = t.generation;

export type GeneratorNodeData = {
  prompt?: string;
  modelId?: string | null;
  presetId?: string;
  /** "1K" · "2K" · "4K". Absent means the default, which is 2K. */
  imageSize?: string;
  /** null (or absent) means "inherit the character's style" — rule 11. */
  estiloKey?: string | null;
  /**
   * The scene adjustments (§5.27 and §6 rule 4). Null or absent means Auto —
   * the prompt and the character decide, exactly as before these existed.
   */
  anguloKey?: string | null;
  iluminacaoKey?: string | null;
  expressaoKey?: string | null;
  /** How many images one click asks for, 1 to 4. Absent means one. */
  quantity?: number;
  /** The images attached to this block, in the order they will be numbered. */
  references?: ReferenceEntry[];
  /**
   * Whether the attached images enter the generation.
   *
   * Absent or false means they do not — the resting state, including right after
   * something is wired in. The base case of this block is a generation with no
   * references ("uma imagem de um cachorro"), and a default of `true` would
   * treat the exception as the rule.
   */
  referencesEnabled?: boolean;
  /**
   * O que o bloco produziu, como o grafo guardava — **legado desde 13/08/2026**.
   *
   * Nem escrito nem lido daqui em diante. A coluna de resultados passou a ler do
   * banco, por `project_id + node_id`, que sempre foi a autoridade: o grafo
   * guardava só a última leva, e tudo que veio antes dependia de cartões que
   * quem arruma o canvas apaga. Duas cópias de um mesmo fato, uma delas parcial.
   *
   * Continuam declarados porque grafos salvos os carregam — e `duplicateNode`
   * continua limpando-os do clone, para uma cópia nunca herdar o resultado do
   * original.
   *
   * O efeito colateral é bem-vindo e vale registrar: **gerar deixou de alterar o
   * documento.** Uma imagem nova não marca mais o canvas como sujo, não dispara
   * autosave e não muda o que o projeto guarda. O canvas só muda quando alguém
   * mexe nele — inclusive por "Usar no fluxo", que é a única porta pela qual uma
   * geração entra no grafo agora.
   */
  lastAssetIds?: string[];
  lastGenerationIds?: string[];
  /** Idem, de antes de a quantidade existir: um fato, um campo. */
  lastAssetId?: string | null;
  lastGenerationId?: string | null;
};

/** The stepper's range — §4 of the Canvas 4 briefing. */
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 4;

export type GeneratorNodeType = Node<GeneratorNodeData, "generator">;

export function GeneratorNode({ id, data, selected }: NodeProps<GeneratorNodeType>) {
  const router = useRouter();
  const providers = useImageCatalog();
  const projectId = useCanvasStore((state) => state.projectId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const attachResultCard = useCanvasStore((state) => state.attachResultCard);
  const removeReference = useCanvasStore((state) => state.removeReference);
  // Para levar a tela até o cartão que "Usar no fluxo" acabou de pôr no canvas.
  const { setCenter, getZoom } = useReactFlow();
  const characters = useEntitiesStore((state) => state.characters);
  // A wire the canvas refused, aimed at this block. Ephemeral by construction —
  // it lives outside the saved graph, and the next edit clears it.
  const refusedWire = useCanvasStore((state) => (state.notice?.nodeId === id ? state.notice : null));

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Seeded by the page, not by this block: the price under the button has to be
  // able to say the balance before anything has been generated.
  const balance = useBalance((state) => state.sparks);
  /**
   * A leva que está rodando, ou a que acabou de rodar — uma entrada por imagem
   * pedida, cada uma com o seu estado.
   *
   * Transitória por construção, e nula até o primeiro clique da sessão: o que
   * sobrevive a um recarregamento são as imagens, que o banco guarda; o que uma
   * requisição fez é notícia, e notícia não se grava no documento. Um slot
   * recusado não tem o que fazer num arquivo que se reabre amanhã.
   *
   * Estas entradas ocupam o **topo** da grade, porque são as mais novas — é
   * assim que a caixinha vazia vira barra e a barra vira miniatura sem nada
   * saltar de lugar.
   */
  const [liveSlots, setLiveSlots] = useState<ResultBoxState[] | null>(null);
  /**
   * O que este bloco já produziu, do banco — §4a.
   *
   * O grafo guardava só a última leva; o histórico das anteriores existia apenas
   * como cartão Resultado no canvas, e quem arruma o canvas apagando cartões
   * perdia o rastro de vista. O banco nunca perdeu, e desde 13/08/2026 é a
   * **única** fonte da coluna de resultados — a moldura inclusive.
   */
  const [recent, setRecent] = useState<GenerationThumb[]>([]);
  /**
   * Muda quando há motivo para reler o banco: a montagem e o fim de uma leva.
   *
   * Era `savedKey` — os ids que o grafo guardava —, o que amarrava a releitura a
   * uma escrita no documento que não existe mais. Um contador diz a mesma coisa
   * sem precisar que a tela grave algo para poder se atualizar.
   */
  const [historyKey, setHistoryKey] = useState(0);
  /**
   * A imagem que a grade promoveu para a moldura, de propósito.
   *
   * Transitória por decisão (11/08/2026): promover é **ver**, não gravar. Olhar
   * uma imagem antiga nunca marca o canvas como alterado.
   */
  const [promotedAssetId, setPromotedAssetId] = useState<string | null>(null);
  /**
   * A última imagem que chegou, que toma a moldura ao chegar.
   *
   * Numa leva de quatro disparadas juntas, a ordem de chegada é a do provedor e
   * não a dos slots. Deixar a moldura com "a primeira da lista" a faria trocar de
   * imagem quando a slot 0 finalmente voltasse; deixá-la com a última a chegar
   * faz cada imagem ocupar a moldura no momento em que existe, que é o que a
   * pessoa está esperando para ver.
   */
  const [arrivedAssetId, setArrivedAssetId] = useState<string | null>(null);
  /** "Usar no fluxo" está buscando a legenda do cartão. */
  const [attaching, setAttaching] = useState(false);

  const prompt = data.prompt ?? "";
  const presetId = data.presetId ?? DEFAULT_PRESET_ID;
  const imageSize = data.imageSize ?? DEFAULT_IMAGE_SIZE;
  const quantity = clampQuantity(data.quantity);
  const estiloKey = data.estiloKey ?? null;
  const anguloKey = data.anguloKey ?? null;
  const iluminacaoKey = data.iluminacaoKey ?? null;
  const expressaoKey = data.expressaoKey ?? null;

  const activeAdjustments = [anguloKey, iluminacaoKey, expressaoKey].filter(
    (key) => key !== null,
  ).length;

  // Initial state only: a block reopened with a saved adjustment shows it
  // without a click, the same way a field with details already open does.
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(activeAdjustments > 0);

  // Resolved rather than stored: writing a default into the node on mount would
  // mark the canvas dirty just for having been opened.
  const modelId = data.modelId ?? defaultModelId(providers);
  const model = findModel(providers, modelId);
  const preset = findPreset(presetId);

  /**
   * What this resolution costs on this model — and whether the model sells it
   * at all.
   *
   * Both answers come from the catalogue rather than from a table in here, for
   * the same reason the price of a model does: a number the browser knows on its
   * own is a number that can disagree with the bill. When the model does not
   * sell the chosen size, there is deliberately no fallback price: the block
   * says so and refuses to generate, because the alternative is quoting one
   * price and being charged another.
   */
  const sizePrice = model?.sizes.find((entry) => entry.size === imageSize) ?? null;
  const sizeOffered = sizePrice !== null;

  const mentions = findMentions(prompt);
  const scene = sceneWithoutMentions(prompt, mentions);
  const mentioned = mentionedCharacter(prompt, characters);

  // What "inherit" resolves to right now, shown in the selector itself — a
  // default the user cannot see is a default the user cannot trust.
  const inheritedStyle = estiloOption(
    typeof mentioned?.activeVersion?.sheet.padroes_variaveis.estilo_renderizacao.valor === "string"
      ? mentioned.activeVersion.sheet.padroes_variaveis.estilo_renderizacao.valor
      : null,
  );

  const references = data.references ?? [];
  const referencesEnabled = data.referencesEnabled === true;

  /**
   * A Pose input is connected and heard, so the angle selector is standing down.
   *
   * Said here rather than discovered in the compiled prompt afterwards: two
   * controls over the same axis, one silently winning, is the failure the Pose
   * input was argued against for. The one that stands down says so.
   */
  const anglePaused =
    referencesEnabled && references.some((reference) => reference.papel === "pose");

  // The ceiling belongs to the model, and the character's own sheet occupies one
  // of its places — so the number the strip shows is the number the server will
  // enforce, said before the click instead of after it. Computed by the same
  // function the wire from a product card consults, so the two can never
  // disagree about how much room is left.
  const capacity = generatorCapacity({
    modelSlug: model?.slug ?? null,
    referenceCount: references.length,
    reserved: sheetAnchorSlots(mentioned),
  });

  /**
   * The image the `@` contributes, for the strip to draw as image 1.
   *
   * The same frozen folha `sheetAnchorSlots` counts — so the thumbnail and the
   * reserved slot can never disagree about whether there is one.
   */
  const anchorFolha = mentioned?.activeVersion?.sheet.imagens_canonicas.folha_completa ?? null;
  const anchorSheet =
    mentioned && anchorFolha ? { assetId: anchorFolha, handle: mentioned.handle } : null;

  /**
   * A coluna de resultados, carregada na montagem e ao fim de cada leva.
   *
   * Uma requisição só, e ela traz tudo: os ids, as legendas e os **links já
   * assinados** das dezesseis. Havia uma segunda aqui — o bloco assinava à parte
   * os ids que o grafo guardava, para a moldura ter o que mostrar antes desta
   * responder. Não comprava nada: as duas são idas ao servidor e chegam juntas,
   * e as duas mostravam a mesma imagem. Duas fontes para um fato só é o começo
   * de as duas discordarem.
   */
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    void listNodeGenerations({ projectId, nodeId: id }).then((items) => {
      if (!cancelled) setRecent(items);
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, id, historyKey]);

  /**
   * "+" — a new input card, wired in, with its picker already open.
   *
   * It used to reach into the gallery and drop the chosen image straight into
   * this block's list. That made the strip a door as well as a mirror, and the
   * references that came through it existed nowhere on the canvas: you could
   * see the thumbnail and not the thing. Now every reference has a card, and
   * the strip has exactly one job — reflecting what is out there.
   *
   * The card is created first and filled second, on purpose. The picker can be
   * cancelled, and an empty input card beside the block is an honest state: it
   * is wired, it has nothing to give yet, and the moment it does the wire
   * carries it (see syncInputInto).
   */
  function openPicker() {
    const inputId = crypto.randomUUID();

    useCanvasStore.getState().addInputNode({
      id: inputId,
      type: "input-image",
      generatorId: id,
    });

    useReferencePicker.getState().open({
      key: inputId,
      scope: "input",
      remaining: 1,
      limit: 1,
      onConfirm: (picked) => {
        const image = picked[0];

        // Straight into the card, never into this block: the wire is what
        // delivers it, and going around the wire is the thing this change
        // exists to stop.
        if (image) {
          useCanvasStore.getState().updateNodeData(inputId, { assetId: image.assetId });
        }
      },
    });
  }

  /**
   * The click.
   *
   * `quantity` images means `quantity` independent requests, fired together —
   * technically identical to pressing the button that many times, which is
   * exactly what it is meant to replace. Each one has its own row in
   * `generations`, its own debit in the ledger and its own way of failing, so
   * each one lands in its own slot as it arrives rather than everything
   * appearing at the end.
   *
   * Nothing here waits for the batch before showing anything: the first image
   * back is on screen while the fourth is still drawing.
   */
  async function handleGenerate() {
    setMessage(null);
    setNotice(null);

    if (!projectId) return;

    if (!modelId) {
      setMessage(copy.errors.noModel);
      return;
    }

    setBusy(true);
    // Uma leva nova é o resultado da vez: a olhada no passado acaba aqui.
    setPromotedAssetId(null);
    setArrivedAssetId(null);
    setLiveSlots(Array.from({ length: quantity }, () => ({ status: "running" })));

    const request = {
      projectId,
      nodeId: id,
      prompt,
      modelId,
      presetId,
      imageSize,
      estiloKey,
      anguloKey,
      iluminacaoKey,
      expressaoKey,
      references,
      referencesEnabled,
    };

    const results = await Promise.all(
      Array.from({ length: quantity }, (_unused, slot) =>
        requestGeneration(request).then((result) => {
          applyResult(slot, result);
          return result;
        }),
      ),
    );

    setBusy(false);

    const succeeded = results.filter(
      (result): result is Extract<CanvasGenerationResult, { ok: true }> => result.ok,
    );

    // The whole batch failed and every slot already says why in its own words.
    // A sentence under the button repeating the first of them would be the same
    // complaint twice — except when there was only one, where the slot is small
    // and the sentence is the only room to explain properly.
    if (succeeded.length === 0 && quantity === 1) {
      const failure = results[0];

      if (failure && !failure.ok) setMessage(failureMessage(failure));
    }

    if (succeeded.length > 0) {
      // O banco é quem guarda o que este bloco produziu, então a leva nova entra
      // relendo — não gravando no grafo. É o que faz gerar deixar de sujar o
      // documento: a imagem existe no acervo, e o canvas só muda quando alguém
      // pede um cartão.
      setHistoryKey((current) => current + 1);

      // Both of these are honesty, not decoration: the proportion that was really
      // drawn, and an identity that had to travel as text alone. Read off the
      // first image back — they all asked the same question, so they all have
      // the same answer.
      const first = succeeded[0];

      if (first.approximated && preset) {
        setNotice(
          `${copy.node.approximatedPrefix} ${preset.ratio} ${copy.node.approximatedMiddle} ${first.aspectRatio}.`,
        );
      } else if (first.character && !first.character.hasSheetImage) {
        setNotice(
          `${copy.node.noSheetImagePrefix} v${first.character.versionNumber} de @${first.character.handle} ${copy.node.noSheetImageSuffix}`,
        );
      }
    }

    // Once, at the end, not once per image: the balance in the header belongs to
    // the server-rendered page, and four refreshes would re-render it four times
    // to show the same final number.
    router.refresh();
  }

  /**
   * Uma resposta, na caixinha dela — desenhada no instante em que chega.
   *
   * **E não cria mais cartão nenhum** *(13/08/2026 — a inversão do cartão)*. Era
   * aqui que toda geração bem-sucedida plantava um Resultado no canvas, sem que
   * ninguém tivesse pedido: quatro imagens plantavam quatro caixas, e quem
   * gerasse a manhã inteira encontrava o desenho do fluxo enterrado sob as
   * tentativas. A imagem não se perde por não virar cartão — ela está no acervo,
   * na grade logo abaixo e na Galeria. O cartão passou a ser o que ele sempre
   * significou: *esta* imagem alimenta o próximo bloco.
   */
  function applyResult(slot: number, result: CanvasGenerationResult) {
    setLiveSlots((current) => {
      if (!current) return current;

      const next = [...current];

      next[slot] = result.ok
        ? {
            status: "ready",
            assetId: result.assetId,
            generationId: result.generationId,
            url: result.url,
            label: null,
          }
        : { status: "failed", message: failureMessage(result) };

      return next;
    });

    if (!result.ok) return;

    // A imagem que acabou de chegar toma a moldura. Cada uma na sua vez, na
    // ordem em que o provedor devolve — que é a ordem em que elas existem.
    setArrivedAssetId(result.assetId);

    // What this image charged, taken off as it lands. Subtracting the charges
    // rather than trusting each answer's `balanceSparks` is what makes four at
    // once add up — see the balance store for the arithmetic.
    useBalance.getState().spend(result.sparksCharged);
  }

  /**
   * "Usar no fluxo": a imagem da moldura vira cartão conectado a este bloco.
   *
   * A legenda e a proporção são buscadas **agora**, no clique, e não guardadas
   * por miniatura: dezesseis miniaturas por bloco pagariam duas consultas cada
   * para responder uma pergunta que quase nenhuma delas recebe (decisão do
   * Jorge, 13/08/2026).
   *
   * Um caminho só, inclusive para a imagem que acabou de sair e cujos dados o
   * navegador ainda tem na mão — o cartão nasce do que está **gravado**, que é a
   * mesma doutrina que faz o nome do produto ser resolvido no servidor.
   */
  async function handleUseInFlow() {
    if (!frameImage) return;

    setMessage(null);
    setNotice(null);
    setAttaching(true);

    // Sem geração não há o que consultar: acontece com imagem de grafo antigo,
    // e o cartão dela já nasce com o "Ver prompt" desabilitado.
    const card = frameImage.generationId ? await loadResultCard(frameImage.generationId) : null;

    setAttaching(false);

    const attached = attachResultCard({
      sourceNodeId: id,
      data: {
        assetId: frameImage.assetId,
        generationId: frameImage.generationId,
        handle: card?.handle ?? null,
        versionNumber: card?.versionNumber ?? null,
        aspectRatio: card?.aspectRatio ?? null,
      },
    });

    if (!attached) return;

    // Já existia: ele foi destacado, não duplicado — e a frase existe porque um
    // clique que faz a coisa certa sem criar nada precisa dizer o que fez.
    if (!attached.created) setNotice(copy.node.useInFlowExisting);

    // A tela vai até o cartão. Sem isto, "Usar no fluxo" num canvas grande é
    // indistinguível de um clique que não fez nada — que é exatamente o defeito
    // que `freePosition` foi escrito para consertar, por outro caminho.
    const node = useCanvasStore.getState().nodes.find((entry) => entry.id === attached.id);

    if (node) {
      void setCenter(
        node.position.x + (node.measured?.width ?? RESULT_CARD_WIDTH) / 2,
        node.position.y + (node.measured?.height ?? RESULT_CARD_HEIGHT) / 2,
        { zoom: getZoom(), duration: 400 },
      );
    }
  }

  const emptyScene = scene === "";
  const nothingToDo = emptyScene && !mentions.length;

  /**
   * A coluna de resultados: o que está vivo, e depois o que o banco guarda.
   *
   * As duas listas não se fundem — se emendam, nessa ordem. A leva viva diz o
   * que **cada requisição está fazendo agora**, recusas incluídas; o banco diz
   * quais imagens **existem**. Pôr a viva na frente é o que faz a caixinha vazia
   * virar barra e a barra virar miniatura sempre no mesmo lugar, e é a regra da
   * fila dita em código: **o histórico não consome vaga de trabalho vivo** — ele
   * entra depois e o que não couber transborda para o "Ver todas".
   *
   * A deduplicação é por asset porque, no fim de uma leva, a mesma imagem está
   * nos dois lugares: viva com o link que a resposta trouxe, e no banco com o
   * link que a consulta assinou. A viva ganha, e a troca é invisível.
   */
  const liveAssetIds = new Set(
    (liveSlots ?? []).flatMap((slot) => (slot.status === "ready" ? [slot.assetId] : [])),
  );

  const boxes: ResultBoxState[] = [
    ...(liveSlots ?? []),
    ...recent
      .filter((item) => !liveAssetIds.has(item.assetId))
      .map((item) => ({
        status: "ready" as const,
        assetId: item.assetId,
        generationId: item.generationId,
        url: item.url,
        label: item.label,
      })),
  ].slice(0, RESULT_GRID_SIZE);

  /**
   * O que a moldura mostra, em três degraus.
   *
   * A promoção manual ganha de tudo — é alguém dizendo "quero olhar esta". Em
   * seguida a última que chegou, que é a razão de a moldura existir logo depois
   * de um clique em Gerar. E por fim a primeira da grade, que é a mais recente
   * que este bloco tem.
   */
  const promotedImage = findImage(boxes, promotedAssetId);
  const frameImage =
    promotedImage ?? findImage(boxes, arrivedAssetId) ?? findImage(boxes, null);

  return (
    <div
      className={`group/node w-[38rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader
        nodeId={id}
        kind="generator"
        title={copy.node.title}
        removeHint={copy.node.remove}
      />

      {/*
        Two columns: the question on the left, the answer on the right.

        The left column is the anatomy of the block, in order — configuration,
        then what it is looking at, then what it is being told, then the button,
        then the price. It reads the way the decision is actually made. The old
        single column opened with an empty frame where the image would eventually
        be (the *answer* first, the question underneath it) and kept the price in
        the top corner, three centimetres from the button that spends it.

        Stacking all of that vertically made the card taller than the screen: to
        read the controls you scrolled, and to see the whole card you zoomed out
        far enough that you could no longer read them. Putting the result beside
        the controls instead of below them is what keeps the block a single
        glance — which is the only reason a canvas beats a form.
      */}
      <div className="flex gap-3 p-3">
        <div className="min-w-0 flex-1">
          {/* ── Configuração ─────────────────────────────────────────────── */}
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.node.configTitle}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label
                htmlFor={`model-${id}`}
                className="mb-1 block text-[11px] font-medium text-ink-muted"
              >
                {copy.node.modelLabel}
              </label>
              <ModelSelect
                id={`model-${id}`}
                providers={providers}
                value={modelId}
                disabled={busy}
                // Priced at the chosen resolution, so this field and the line
                // under the button can never show two different numbers.
                imageSize={imageSize}
                onChange={(value) => updateNodeData(id, { modelId: value })}
              />
            </div>

            <div>
              <label
                htmlFor={`format-${id}`}
                className="mb-1 block text-[11px] font-medium text-ink-muted"
              >
                {copy.node.formatLabel}
              </label>
              <select
                id={`format-${id}`}
                value={presetId}
                disabled={busy}
                onChange={(event) => updateNodeData(id, { presetId: event.target.value })}
                className={SELECT_CLASS}
              >
                {FORMAT_PRESETS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.pt} · {entry.ratio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              {/* Where the style comes from belongs to the label; what it is
                  belongs to the value. Reading "Da personagem · Fotorrealista"
                  inside the option asked one control to answer two questions, and
                  made the inherited value look like a different style from the
                  explicit one of the same name. */}
              <label
                htmlFor={`style-${id}`}
                className="mb-1 block truncate text-[11px] font-medium text-ink-muted"
              >
                {copy.node.styleLabel}
                <span className="font-normal text-ink-faint">
                  {" · "}
                  {estiloKey
                    ? copy.node.styleFromNode
                    : mentioned
                      ? copy.node.styleFromCharacter
                      : copy.node.styleFromDefault}
                </span>
              </label>
              <select
                id={`style-${id}`}
                value={estiloKey ?? ""}
                disabled={busy}
                onChange={(event) =>
                  updateNodeData(id, { estiloKey: event.target.value === "" ? null : event.target.value })
                }
                className={SELECT_CLASS}
              >
                {/* Never an empty or "none" option: the node picks *which* style,
                    never whether there is one (compilation rule 11). */}
                <option value="">{inheritedStyle.pt}</option>
                {ESTILO_RENDERIZACAO.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.pt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`quality-${id}`}
                className="mb-1 block text-[11px] font-medium text-ink-muted"
              >
                {copy.node.qualityLabel}
              </label>
              <select
                id={`quality-${id}`}
                value={imageSize}
                disabled={busy}
                onChange={(event) => updateNodeData(id, { imageSize: event.target.value })}
                className={SELECT_CLASS}
              >
                {/* Every resolution the product knows, always — the ones this
                    model does not sell stay on the list, greyed, saying why.
                    An option that is merely absent teaches nobody anything.
                    The price is in the label because resolution is the one
                    setting here whose whole point is what it costs. */}
                {IMAGE_SIZES.map((size) => {
                  const price = model?.sizes.find((entry) => entry.size === size) ?? null;

                  return (
                    <option key={size} value={size} disabled={price === null}>
                      {size} ·{" "}
                      {price ? `${price.sparks} ⚡` : copy.node.qualityUnavailable}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                {copy.node.quantityLabel}
              </span>

              {/* A stepper and not a select: the range is four, and four options
                  behind a menu is three more clicks than "+". */}
              <div
                className="nodrag flex h-[30px] items-center justify-between rounded-lg border
                           border-line bg-surface px-1"
              >
                <StepperButton
                  label={copy.node.quantityFewer}
                  glyph="−"
                  disabled={busy || quantity <= MIN_QUANTITY}
                  onClick={() => updateNodeData(id, { quantity: quantity - 1 })}
                />

                <span
                  aria-live="polite"
                  className="text-xs font-medium tabular-nums text-ink"
                >
                  {quantity}
                </span>

                <StepperButton
                  label={copy.node.quantityMore}
                  glyph="+"
                  disabled={busy || quantity >= MAX_QUANTITY}
                  onClick={() => updateNodeData(id, { quantity: quantity + 1 })}
                />
              </div>
            </div>
          </div>

          {/* Rule 4 of §6, exercised. Unlike the style selector, "Auto" here is a
              plain word on purpose: showing the inherited value would be honest
              only in "padrões" mode — in a directed scene the sheet's default
              does not enter at all, so a label promising it would lie half the
              time. */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setAdjustmentsOpen((current) => !current)}
              aria-expanded={adjustmentsOpen}
              className="nodrag flex items-center gap-1.5 text-[11px] font-medium text-ink-muted
                         transition-colors hover:text-ink"
            >
              <svg
                viewBox="0 0 10 10"
                className={`size-2.5 transition-transform ${adjustmentsOpen ? "rotate-90" : ""}`}
                aria-hidden
              >
                <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {copy.node.sceneAdjustments}
              <span className="font-normal text-ink-faint">
                {" · "}
                {!adjustmentsOpen && activeAdjustments > 0
                  ? `${activeAdjustments} ${copy.node.sceneAdjustmentsCountSuffix}`
                  : copy.node.sceneAdjustmentsOptional}
              </span>
            </button>

            {adjustmentsOpen ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor={`angle-${id}`}
                    className="mb-1 block text-[11px] font-medium text-ink-muted"
                  >
                    {copy.node.cameraAngleLabel}
                    {anglePaused ? (
                      <span className="font-normal text-warning">
                        {" · "}
                        {copy.node.anglePaused}
                      </span>
                    ) : null}
                  </label>
                  <select
                    id={`angle-${id}`}
                    value={anguloKey ?? ""}
                    // Two controls over one axis, and the image outranks the
                    // word. The selector says so instead of being quietly
                    // ignored — see buildCanvasPrompt for the rule.
                    disabled={busy || anglePaused}
                    title={anglePaused ? copy.node.anglePausedHint : undefined}
                    onChange={(event) =>
                      updateNodeData(id, {
                        anguloKey: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">{copy.node.adjustmentAuto}</option>
                    {ANGULO_CAMERA.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`lighting-${id}`}
                    className="mb-1 block text-[11px] font-medium text-ink-muted"
                  >
                    {copy.node.lightingLabel}
                  </label>
                  <select
                    id={`lighting-${id}`}
                    value={iluminacaoKey ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      updateNodeData(id, {
                        iluminacaoKey: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">{copy.node.adjustmentAuto}</option>
                    {ILUMINACAO.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`expression-${id}`}
                    className="mb-1 block text-[11px] font-medium text-ink-muted"
                  >
                    {copy.node.expressionLabel}
                  </label>
                  <select
                    id={`expression-${id}`}
                    value={expressaoKey ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      updateNodeData(id, {
                        expressaoKey: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">{copy.node.adjustmentAuto}</option>
                    {EXPRESSAO.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.pt}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="col-span-2 text-[10px] leading-relaxed text-ink-faint">
                  {copy.node.sceneAdjustmentsHint}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── Referências ──────────────────────────────────────────────── */}
          <ReferenceStrip
            references={references}
            limit={capacity.limit}
            reserved={capacity.reserved}
            // The sheet the mention brings, drawn as image 1 so the numbering
            // explains itself. Read from the same active version the server
            // will resolve — advisory here, authoritative there.
            anchor={anchorSheet}
            disabled={busy}
            enabled={referencesEnabled}
            onEnabledChange={(next) => updateNodeData(id, { referencesEnabled: next })}
            onAdd={openPicker}
            onChange={(next) => updateNodeData(id, { references: next })}
            onRemove={(index) => removeReference({ nodeId: id, index })}
          />

          {/* The ceiling, said where the wire was aimed and before anything was
              spent — which is the only moment at which a ceiling is a ceiling.
              Beside the strip it refused to fill, not at the foot of the card. */}
          {refusedWire ? (
            <p className="mt-1.5 text-[10px] leading-relaxed text-warning">
              {copy.errors.productOverLimitPrefix} {refusedWire.needed}{" "}
              {copy.errors.productOverLimitMiddle} {refusedWire.free}.{" "}
              {copy.errors.productOverLimitSuffix}
            </p>
          ) : null}

          {/* ── Prompt principal ─────────────────────────────────────────── */}
          <label
            htmlFor={`prompt-${id}`}
            className="mb-1 mt-3 block text-[11px] font-medium text-ink-muted"
          >
            {copy.node.promptLabel}
          </label>

          <PromptField
            id={`prompt-${id}`}
            value={prompt}
            disabled={busy}
            onChange={(value) => updateNodeData(id, { prompt: value })}
          />

          <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
            {nothingToDo
              ? copy.node.emptyPromptAlone
              : emptyScene
                ? copy.node.emptyPromptWithCharacter
                : copy.node.promptHint}
          </p>

          {/* ── O botão, e logo abaixo o que ele custa ───────────────────── */}
          <button
            type="button"
            disabled={busy || nothingToDo || !modelId || !projectId || !sizeOffered}
            title={nothingToDo ? copy.node.emptyPromptAlone : undefined}
            onClick={() => void handleGenerate()}
            className="nodrag mt-3 h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                       transition-colors hover:bg-accent-hover disabled:cursor-not-allowed
                       disabled:bg-surface-hover disabled:text-ink-faint"
          >
            {busy ? copy.node.generating : copy.node.generate}
          </button>

          {/* Under the button, in the future tense, with the balance beside it.
              Both halves are needed to answer the only question anyone asks here:
              can I afford this one? */}
          {model ? (
            sizePrice ? (
              /* The truth, multiplied. "Custará 3 × 75 = 225 ⚡" shows the sum
                 and the working, because the number that surprises somebody is
                 the total and the number that explains it is the unit. */
              <p className="mt-1.5 text-center text-[11px] text-ink-faint">
                {copy.node.costWillPrefix}{" "}
                {quantity > 1 ? `${quantity} × ${sizePrice.sparks} = ` : null}
                <strong className="font-medium text-ink-muted">
                  {quantity * sizePrice.sparks} ⚡
                </strong>
                {balance === null ? null : (
                  <>
                    {" · "}
                    {copy.node.balanceLabel}: {balance.toLocaleString("pt-BR")} ⚡
                  </>
                )}
              </p>
            ) : (
              /* No price, so no price is shown. Falling back to the model's base
                 figure would quote one number and charge another. */
              <p className="mt-1.5 text-center text-[11px] leading-relaxed text-warning">
                {copy.errors.unsupportedSize}
              </p>
            )
          ) : null}

          {busy ? (
            <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
              {copy.node.generatingHint}
            </p>
          ) : null}

          {notice ? (
            <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">{notice}</p>
          ) : null}

          {message ? (
            <p className="mt-2 text-[10px] leading-relaxed text-warning">{message}</p>
          ) : null}
        </div>

        {/* ── O que saiu ───────────────────────────────────────────────── */}
        <div className="w-56 shrink-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.node.resultTitle}
          </p>

          <ResultFrame
            image={frameImage}
            attaching={attaching}
            onUseInFlow={() => void handleUseInFlow()}
          />

          <ResultGrid
            items={boxes}
            // Só conta como promoção o que a grade consegue mostrar: uma imagem
            // que saiu das dezesseis não pode deixar a frase "vendo uma imagem
            // anterior" acesa sobre uma moldura que já voltou ao normal.
            promotedAssetId={promotedImage ? promotedAssetId : null}
            onPromote={setPromotedAssetId}
            onSeeAll={() => {
              if (projectId) useReferencePicker.getState().browse({ projectId });
            }}
          />
        </div>
      </div>

      {/* Decision N1: the connector is always visible on the edge, and clicking
          it opens the right action rather than merely being a socket. It also
          accepts an edge from a Resultado — the same reference, arriving from
          the canvas instead of from the gallery. */}
      <Handle
        type="target"
        position={Position.Left}
        title={copy.node.inputHandle}
        onClick={openPicker}
        className="!size-2.5 !cursor-pointer !border-2 !border-canvas !bg-accent"
      />

      <Handle
        type="source"
        position={Position.Right}
        title={copy.node.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}

const SELECT_CLASS =
  "nodrag w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink " +
  "transition-colors hover:border-line-strong focus:border-accent focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/**
 * O tamanho de um cartão Resultado, só para centralizar a tela nele.
 *
 * Um cartão recém-criado ainda não foi medido pelo React Flow — `measured` só
 * existe depois de ele ter sido desenhado —, e a tela precisa ir até lá agora.
 * Um palpite errado por alguns pixels desloca o centro por alguns pixels;
 * esperar a medida deslocaria o clique por um quadro inteiro.
 */
const RESULT_CARD_WIDTH = 256;
const RESULT_CARD_HEIGHT = 320;

/**
 * A imagem de uma caixinha da grade, para a moldura.
 *
 * Com `assetId` nulo devolve a primeira imagem da lista — que, sendo a lista
 * ordenada do mais novo para o mais velho, é a mais recente que este bloco tem.
 * Caixinhas gerando ou recusadas são puladas: elas não são uma imagem, e a
 * moldura só sabe mostrar imagem.
 */
function findImage(
  boxes: readonly ResultBoxState[],
  assetId: string | null,
): FrameImage | null {
  for (const box of boxes) {
    if (box.status !== "ready") continue;
    if (assetId !== null && box.assetId !== assetId) continue;

    return { assetId: box.assetId, generationId: box.generationId, url: box.url };
  }

  return null;
}

/** 1 to 4, whatever a saved graph or a stale bundle happens to carry. */
function clampQuantity(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return MIN_QUANTITY;

  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(value)));
}

/** One end of the stepper. */
function StepperButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-5 items-center justify-center rounded text-xs leading-none
                 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink
                 disabled:cursor-not-allowed disabled:opacity-30
                 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
    >
      {glyph}
    </button>
  );
}

/** The sentence for each way a generation can fail, in the user's own terms. */
function failureMessage(result: Extract<CanvasGenerationResult, { ok: false }>): string {
  const errors = copy.errors;

  switch (result.reason) {
    case "insufficient_balance":
      return `${errors.insufficientPrefix} ${result.neededSparks ?? 0} ⚡ ${errors.insufficientMiddle} ${result.balanceSparks ?? 0} ⚡.`;
    case "not_configured":
      return errors.notConfigured;
    case "empty_request":
      return errors.emptyRequest;
    case "empty_character":
      return errors.emptyCharacter;
    case "unknown_handle":
      return `${errors.unknownHandlePrefix} @${result.handle ?? ""} ${errors.unknownHandleSuffix}`;
    case "not_linked":
      return `${errors.notLinkedPrefix} @${result.handle ?? ""} ${errors.notLinkedSuffix}`;
    case "no_version":
      return `${errors.noVersionPrefix} @${result.handle ?? ""} ${errors.noVersionSuffix}`;
    case "unknown_version":
      return `${errors.unknownVersionPrefix} @${result.handle ?? ""} ${errors.unknownVersionSuffix}`;
    case "multiple_characters":
      return errors.multipleCharacters;
    case "unsupported_size":
      return errors.unsupportedSize;
    case "unauthenticated":
      return errors.unauthenticated;
    case "too_many_references":
      return `${errors.tooManyReferencesPrefix} ${result.limit ?? 0} ${errors.tooManyReferencesSuffix}`;
    case "missing_reference":
      return errors.missingReference;
    case "translation_failed":
      return errors.translationFailed;
    case "refused":
      return errors.refused;
    case "invalid":
      return errors.invalid;
    default:
      return errors.failed;
  }
}
