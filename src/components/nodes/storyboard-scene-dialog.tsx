"use client";

import { useEffect, useRef, useState } from "react";

import { ANGULO_CAMERA } from "@/lib/character-sheet/dictionary";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";
import { saveScene, type CtaOption, type SceneRow } from "@/lib/storyboard/actions";
import type { Canal, Enquadramento, Historia, Transicao } from "@/lib/storyboard/contract";
import {
  requestStoryboard,
  type StoryboardGenerationFailure,
} from "@/lib/storyboard/generation-contract";

const copy = t.storyboardNode;
const fichaCopy = copy.ficha;

/**
 * A ficha completa, em overlay — FRENTE STORYBOARD · CICLO 2 · Fase 3.
 *
 * ---------------------------------------------------------------------------
 * Caminho único para ver uma cena inteira
 * ---------------------------------------------------------------------------
 *
 * O trilho mostra seis campos por linha; os outros sete moram aqui, e **só
 * aqui**. A alternativa considerada e recusada era expandir a linha no próprio
 * trilho: dois caminhos para a mesma informação são duas telas para manter, duas
 * para divergir, e nenhuma das duas sendo *a* resposta para "onde eu vejo esta
 * cena inteira?".
 *
 * ---------------------------------------------------------------------------
 * Os dois gestos daqui têm pesos opostos, e a tela precisa dizer isso
 * ---------------------------------------------------------------------------
 *
 * **Salvar** reescreve a ficha à mão: não cobra nada, não cria linha em
 * `generations`, não encosta no ledger. **Regerar** chama o modelo e custa 5 ⚡.
 * Os dois ficam a poucos centímetros um do outro, então cada um diz o próprio
 * preço em voz alta — o de baixo com o número, o de cima com "não custa Spark
 * nenhum". Um botão silencioso ao lado de um botão que gasta é lido como sendo
 * do mesmo tipo.
 *
 * E é por isso que **"Regerar esta cena" não existe na lista**: numa lista de dez
 * linhas, dez botões de gastar a um clique de distância transformam a rolagem
 * num campo minado. Aqui ele custa um passo a mais, e esse passo é a deliberação.
 *
 * ---------------------------------------------------------------------------
 * `<dialog>` nativo, pela receita que o seletor de referências registrou
 * ---------------------------------------------------------------------------
 *
 * Top layer do navegador (acima de qualquer z-index), Escape fechando de fábrica
 * e foco preso dentro do modal — as três de graça. Um `div` com `fixed inset-0`
 * bastaria enquanto quem abre é o canvas, e deixaria de bastar no dia em que
 * este overlay fosse aberto de dentro de outro dialog.
 */

type SceneDialogProps = {
  scene: SceneRow;
  total: number;
  historia: Historia;
  canal: Canal;
  ctas: CtaOption[];
  projectId: string;
  nodeId: string;
  /** Qual modelo reescreve, e quanto ele cobra por uma cena. Do catálogo. */
  modelId: string | null;
  cenaPrice: number | null;
  onClose: () => void;
  /** A ficha mudou no banco — o trilho precisa reler. */
  onChanged: () => void;
};

/** O que o formulário guarda: a ficha editável, sem `ordem` e sem `personagem`. */
type FormState = {
  acao: string;
  cenario: string;
  enquadramento: Enquadramento;
  movimento: string;
  fala: string;
  produto: string;
  ctaId: string | null;
  ctaTexto: string;
  duracaoSegundos: number;
  transicao: Transicao;
  status: "rascunho" | "aprovada";
};

function toForm(scene: SceneRow): FormState {
  return {
    acao: scene.acao,
    cenario: scene.cenario,
    enquadramento: scene.enquadramento,
    movimento: scene.movimento,
    fala: scene.fala ?? "",
    produto: scene.produto ?? "",
    ctaId: scene.cta_id,
    ctaTexto: scene.cta_texto ?? "",
    duracaoSegundos: scene.duracao_segundos,
    transicao: scene.transicao,
    status: scene.status,
  };
}

export function StoryboardSceneDialog({
  scene,
  total,
  historia,
  canal,
  ctas,
  projectId,
  nodeId,
  modelId,
  cenaPrice,
  onClose,
  onChanged,
}: SceneDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const balance = useBalance((state) => state.sparks);

  const [form, setForm] = useState<FormState>(() => toForm(scene));
  const [editedAt, setEditedAt] = useState<string | null>(scene.editedAt);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [instrucao, setInstrucao] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
    setNote(null);
  }

  const primeiraCena = scene.ordem === 1;

  /**
   * Qual opção do dropdown está escolhida, **derivada** do par (id, texto).
   *
   * Derivada e não guardada num terceiro estado, porque o par é a verdade: a
   * ficha grava `cta_id` (de onde veio) e `cta_texto` (o que ficou), e um estado
   * paralelo de "modo do dropdown" seria uma terceira opinião capaz de discordar
   * dos dois no primeiro salvamento.
   */
  const ctaValue = form.ctaId ?? (form.ctaTexto.trim() === "" ? "" : "proprio");

  function chooseCta(value: string) {
    if (value === "") {
      patch({ ctaId: null, ctaTexto: "" });
      return;
    }

    if (value === "proprio") {
      patch({ ctaId: null, ctaTexto: form.ctaTexto });
      return;
    }

    const chosen = ctas.find((cta) => cta.id === value);

    // O texto da biblioteca entra preenchido e continua editável: o catálogo é
    // sugestão, não lista fechada — a mesma decisão que deixou `cta_id` sem FK.
    patch({ ctaId: value, ctaTexto: chosen?.textoPt ?? form.ctaTexto });
  }

  async function save() {
    if (saving) return;

    setSaving(true);
    setNote(null);

    const result = await saveScene({
      projectId,
      nodeId,
      ordem: scene.ordem,
      patch: {
        acao: form.acao,
        cenario: form.cenario,
        enquadramento: form.enquadramento,
        movimento: form.movimento,
        fala: form.fala === "" ? null : form.fala,
        produto: form.produto === "" ? null : form.produto,
        ctaId: form.ctaId,
        ctaTexto: form.ctaTexto === "" ? null : form.ctaTexto,
        duracaoSegundos: form.duracaoSegundos,
        transicao: form.transicao,
        status: form.status,
      },
    });

    setSaving(false);

    if (!result.ok) {
      setNote(fichaCopy.saveError);
      return;
    }

    setEditedAt(result.editedAt);
    setNote(fichaCopy.saved);
    onChanged();
  }

  /**
   * O gesto pago. A ordem dos guardas é a mesma do motor, um degrau acima: o que
   * dá para recusar de graça é recusado aqui, antes de a requisição sair.
   */
  const noBalance = cenaPrice !== null && balance !== null && balance < cenaPrice;
  const canRegenerate =
    modelId !== null && cenaPrice !== null && !noBalance && instrucao.trim() !== "";

  async function regenerate() {
    if (!canRegenerate || !modelId || regenerating) return;

    setRegenerating(true);
    setNote(null);

    const result = await requestStoryboard({
      job: "cena",
      projectId,
      nodeId,
      ordem: scene.ordem,
      instrucao: instrucao.trim(),
      modelId,
    });

    setRegenerating(false);

    if (!result.ok) {
      setNote(copy.errors[result.reason as StoryboardGenerationFailure] ?? copy.errors.error);
      return;
    }

    useBalance.getState().spend(result.sparksCharged);

    // A resposta já traz o roteiro inteiro; a ficha nova é a de mesma ordem.
    // Reaproveitá-la evita uma segunda viagem ao banco para ler o que acabou de
    // chegar — e o trilho relê de qualquer jeito, pelo `onChanged`.
    const fresh = result.cenas.find((cena) => cena.ordem === scene.ordem);

    if (fresh) {
      setForm(toForm({ ...fresh, status: form.status, editedAt: null }));
      // A máquina escreveu de novo: a ficha deixa de ser "editada à mão".
      setEditedAt(null);
    }

    setInstrucao("");
    onChanged();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={fichaCopy.titulo(scene.ordem, total)}
      onClose={onClose}
      // Clicar no vão em volta fecha: num `<dialog>`, esse clique tem o próprio
      // dialog como alvo, então comparar com o ref é o que distingue "cliquei ao
      // lado" de "cliquei dentro".
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-auto max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl
                 border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/50
                 backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] flex-col">
        {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">
              {fichaCopy.titulo(scene.ordem, total)}
            </h2>
            {/* O canal aparece aqui porque a biblioteca de CTA logo abaixo é
                dele: um dropdown que muda de conteúdo sem dizer de onde o
                conteúdo vem parece arbitrário. */}
            <p className="mt-0.5 truncate text-[11px] text-ink-faint">
              {historia.titulo} · {copy.canais[canal] ?? canal} · {historia.formato} ·{" "}
              {historia.estilo}
              {editedAt ? ` · ${copy.editadaAMao}` : null}
            </p>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={fichaCopy.close}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* ── A ficha ─────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <Field label={fichaCopy.acaoLabel} hint={fichaCopy.acaoHint}>
            <textarea
              value={form.acao}
              onChange={(event) => patch({ acao: event.target.value })}
              rows={3}
              maxLength={2000}
              className={`${INPUT_CLASS} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={fichaCopy.cenarioLabel} hint={fichaCopy.cenarioHint}>
              <input
                value={form.cenario}
                onChange={(event) => patch({ cenario: event.target.value })}
                maxLength={500}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label={fichaCopy.enquadramentoLabel}>
              {/* A lista do dicionário, reusada verbatim (§5.27). Onde já existe
                  vocabulário fechado não se inventa vocabulário paralelo — e a
                  chave daqui É a que o bloco Gerar Imagem consome. */}
              <select
                value={form.enquadramento}
                onChange={(event) =>
                  patch({ enquadramento: event.target.value as Enquadramento })
                }
                className={INPUT_CLASS}
              >
                {ANGULO_CAMERA.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.pt}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={fichaCopy.movimentoLabel}>
              <input
                value={form.movimento}
                onChange={(event) => patch({ movimento: event.target.value })}
                placeholder={fichaCopy.movimentoPlaceholder}
                maxLength={500}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label={fichaCopy.produtoLabel} hint={fichaCopy.ponteProduto}>
              <input
                value={form.produto}
                onChange={(event) => patch({ produto: event.target.value })}
                maxLength={200}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          {/*
            O que esta ficha leva para a imagem, e o que ela não leva.

            Dito aqui porque é aqui que a pergunta nasce: alguém que acabou de
            escrever uma fala e uma transição precisa saber, **antes** de clicar
            no ▸, que os dois não vão aparecer na imagem. É o mesmo remédio do
            `falaDormente` aplicado aos quatro campos que são de vídeo e de voz —
            um campo preenchido que não aparece parece defeito da ponte.
          */}
          <p className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[10px] leading-relaxed text-ink-faint">
            <span className="text-ink-muted">{fichaCopy.pontePega}</span>{" "}
            {fichaCopy.ponteNaoPega}
          </p>

          {/* A personagem é leitura, e a frase diz por quê: um handle digitado à
              mão gravaria sem reclamar (não há FK) e só falharia lá na frente,
              quando a ficha virasse imagem e o `@` não resolvesse. */}
          <Field label={fichaCopy.personagemLabel} hint={fichaCopy.personagemFixo}>
            <p className="rounded-lg border border-line bg-surface-raised px-2 py-1.5 text-xs text-ink-muted">
              {scene.personagem ? `@${scene.personagem}` : fichaCopy.personagemNenhuma}
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={fichaCopy.duracaoLabel}>
              <input
                type="number"
                min={1}
                max={60}
                value={form.duracaoSegundos}
                onChange={(event) =>
                  patch({ duracaoSegundos: clamp(Number(event.target.value), 1, 60) })
                }
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              label={fichaCopy.transicaoLabel}
              hint={primeiraCena ? fichaCopy.transicaoPrimeira : undefined}
            >
              <select
                value={form.transicao}
                onChange={(event) => patch({ transicao: event.target.value as Transicao })}
                className={INPUT_CLASS}
              >
                <option value="corte">{fichaCopy.transicaoCorte}</option>
                {/* A trava do banco (`storyboard_scenes_primeira_nao_continua`)
                    dita na tela: a cena 1 não tem quadro anterior para emendar.
                    A opção não some — ela aparece impossível, que é o que ensina
                    a regra em vez de esconder que ela existe. */}
                <option value="continuacao" disabled={primeiraCena}>
                  {fichaCopy.transicaoContinuacao}
                </option>
              </select>
            </Field>
          </div>

          {/* ── O CTA, por canal ──────────────────────────────────────────── */}
          <Field label={fichaCopy.ctaLabel} hint={ctas.length === 0 ? fichaCopy.ctaVazia : undefined}>
            <select value={ctaValue} onChange={(event) => chooseCta(event.target.value)} className={INPUT_CLASS}>
              <option value="">{fichaCopy.ctaNenhum}</option>
              {ctas.map((cta) => (
                // O `hint` do catálogo vira o title da opção: o dropdown ensina
                // quando usar, em vez de só listar.
                <option key={cta.id} value={cta.id} title={cta.hint ?? undefined}>
                  {cta.textoPt}
                </option>
              ))}
              <option value="proprio">{fichaCopy.ctaProprio}</option>
            </select>
          </Field>

          {ctaValue === "" ? null : (
            <Field label={fichaCopy.ctaTextoLabel}>
              <input
                value={form.ctaTexto}
                onChange={(event) => patch({ ctaTexto: event.target.value })}
                maxLength={500}
                className={INPUT_CLASS}
              />
            </Field>
          )}

          {/* ── A fala, dormente ──────────────────────────────────────────── */}
          <Field label={fichaCopy.falaLabel} hint={copy.falaDormente}>
            <textarea
              value={form.fala}
              onChange={(event) => patch({ fala: event.target.value })}
              placeholder={fichaCopy.falaPlaceholder}
              rows={2}
              maxLength={2000}
              className={`${INPUT_CLASS} resize-none`}
            />
          </Field>

          <Field label={fichaCopy.statusLabel}>
            <select
              value={form.status}
              onChange={(event) =>
                patch({ status: event.target.value === "aprovada" ? "aprovada" : "rascunho" })
              }
              className={INPUT_CLASS}
            >
              <option value="rascunho">{copy.statusRascunho}</option>
              <option value="aprovada">{copy.statusAprovada}</option>
            </select>
          </Field>

          {/* ────────────────────────────────────────────────────────────────
              O gesto pago, e o único do trilho — separado por uma linha, e não
              por espaço: o que muda deste lado é a natureza da ação, não o
              assunto, e um vão em branco não diz isso.
             ──────────────────────────────────────────────────────────────── */}
          <div className="space-y-2 rounded-lg border border-line bg-surface-raised p-3">
            <p className="text-[11px] font-medium text-ink">{fichaCopy.regenerateTitle}</p>

            <textarea
              value={instrucao}
              onChange={(event) => setInstrucao(event.target.value)}
              placeholder={fichaCopy.regenerateInstrucaoPlaceholder}
              rows={2}
              maxLength={1000}
              aria-label={fichaCopy.regenerateInstrucaoLabel}
              className={`${INPUT_CLASS} resize-none`}
            />

            <button
              type="button"
              onClick={regenerate}
              disabled={!canRegenerate || regenerating}
              title={instrucao.trim() === "" ? fichaCopy.regenerateNeedsInstrucao : undefined}
              className="h-8 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                         transition-colors hover:bg-accent-hover disabled:cursor-not-allowed
                         disabled:bg-surface-hover disabled:text-ink-faint"
            >
              {regenerating
                ? fichaCopy.regenerateWorking
                : `${fichaCopy.regenerateTitle} · ${cenaPrice ?? "—"} ⚡`}
            </button>

            <p className="text-center text-[10px] leading-relaxed text-ink-faint">
              {fichaCopy.regenerateHint}
              {balance === null ? null : ` · ${copy.balanceLabel}: ${balance.toLocaleString("pt-BR")} ⚡`}
            </p>

            {noBalance ? (
              <p className="text-center text-[10px] text-warning">
                {copy.errors.insufficient_balance}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── O rodapé: o gesto de graça ──────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-3">
          <p className="min-w-0 flex-1 truncate text-[11px] text-ink-faint">
            {note ?? fichaCopy.saveFree}
          </p>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-8 shrink-0 rounded-lg border border-line bg-surface-raised px-3 text-xs
                       font-medium text-ink transition-colors hover:border-accent
                       disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            {saving ? fichaCopy.saving : fichaCopy.save}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Rótulo, campo e — quando há — a frase que ensina. Um só jeito de vestir. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] leading-relaxed text-ink-faint">{hint}</span> : null}
    </label>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.min(max, Math.max(min, Math.round(value)));
}

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-faint focus:border-accent focus:outline-none";
