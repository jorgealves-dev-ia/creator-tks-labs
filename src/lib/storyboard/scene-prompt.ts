import { findMentions, sceneWithoutMentions } from "@/lib/generation/mentions";
import { ENQUADRAMENTO_KEYS } from "@/lib/storyboard/contract";

/**
 * A ponte, em uma função pura — FRENTE STORYBOARD · CICLO 2 · Fase 4.
 *
 * ---------------------------------------------------------------------------
 * O que ela faz, e o que ela deliberadamente NÃO faz
 * ---------------------------------------------------------------------------
 *
 * Ela transforma uma ficha de cena no que uma pessoa digitaria à mão no bloco
 * Gerar Imagem: um prompt em português e uma chave de ângulo. **Só isso.**
 *
 * Nada aqui traduz, resolve versão de personagem, monta JSON ou fala com o
 * banco. O compilador, a tradução com cache, o `mencao_sujeito` e o
 * `prompt_compiled` continuam exatamente onde estavam, fazendo exatamente o que
 * faziam — a ponte preenche o campo, e o campo segue o caminho de sempre.
 *
 * Pura no sentido estrito da invariante 10: sem rede, sem relógio, sem
 * aleatoriedade. É o que permite que a Máquina do Ciclo 3 a chame dez vezes
 * seguidas e saiba de antemão o que vai sair.
 *
 * ---------------------------------------------------------------------------
 * Por que o enquadramento é atribuição e não tradução
 * ---------------------------------------------------------------------------
 *
 * `ENQUADRAMENTO_KEYS` é a §5.27 do character sheet reusada verbatim, e essa
 * decisão de 15/08/2026 é cobrada aqui: a chave da ficha **é** a chave que o
 * bloco consome como `anguloKey`. Não existe tabela de conversão, e por isso não
 * existe o `default` de uma tabela de conversão — que é sempre por onde ela erra.
 *
 * A única checagem que sobra é a de pertencimento: chave desconhecida vira
 * `null`, que o bloco lê como Auto. O pior caso é uma cena sem ângulo dirigido,
 * nunca uma cena com o ângulo errado.
 */

/** O que uma ficha manda para o canvas. Nada além disto atravessa a ponte. */
export type SceneDirective = {
  ordem: number;
  /** O prompt em PT, pronto para o campo — com a `@` como sujeito da frase. */
  prompt: string;
  /** A chave de `ANGULO_CAMERA`, ou null para Auto. */
  anguloKey: string | null;
  /**
   * O produto da cena, que **não** vira nada no bloco.
   *
   * Viaja porque a tela precisa dizer que ele existe: `storyboard_scenes.produto`
   * é texto livre desde a migration — produto virou card de canvas em
   * 10/08/2026 e não há linha para uma FK apontar. O bloco manda conectar um
   * Input de Produto em vez de fingir que resolveu.
   */
  produto: string | null;
};

/**
 * A ficha como esta função precisa dela.
 *
 * Declarada estruturalmente, e não importada de `actions.ts` ou do contrato: os
 * dois lados que chamam isto são o navegador (o trilho) e, um dia, a Máquina — e
 * nenhum deles deveria ter de arrastar um módulo `"use server"` junto para
 * compor um texto. É a mesma doutrina do `StoredReference` no store do canvas.
 */
type SceneFields = {
  ordem: number;
  acao: string;
  cenario: string;
  movimento: string;
  enquadramento: string;
  personagem: string | null;
  produto: string | null;
};

export function buildSceneDirective(cena: SceneFields): SceneDirective {
  return {
    ordem: cena.ordem,
    prompt: buildScenePrompt(cena),
    anguloKey: readAngulo(cena.enquadramento),
    produto: cena.produto?.trim() ? cena.produto.trim() : null,
  };
}

/**
 * `@handle {acao}. {cenario}. {movimento}.`
 *
 * A ordem é a decisão, e ela tem uma razão que a invariante 13 cobra: a menção
 * precisa ser **sujeito da frase**. Escrita assim, o texto sem a menção continua
 * dizendo alguma coisa — então a cena é uma cena dirigida, os padrões de cena do
 * sheet não entram e o traje canônico não entra. Uma ordem que deixasse a `@`
 * solta no fim produziria o oposto, e o produto tem registro do estrago: o
 * tradutor inventa sujeito e gênero quando a frase fica órfã.
 *
 * Partes vazias somem em vez de virar espaço duplo ou ponto solto — `movimento`
 * pode vir string vazia do modelo, e `personagem` é nulo em roteiro de produto.
 */
function buildScenePrompt(cena: SceneFields): string {
  const partes = [cena.acao, cena.cenario, cena.movimento].map(sentence).filter((p) => p !== "");
  const sujeito = mentionFor(cena.personagem);
  const corpo = partes.join(" ");

  if (sujeito === null) return corpo;

  return corpo === "" ? sujeito : `${sujeito} ${corpo}`;
}

/**
 * A menção, validada pelo **próprio parser que a lê depois**.
 *
 * Conferir o formato com uma regex copiada daria duas verdades sobre o que é um
 * handle, e a segunda envelheceria calada. Passando pelo `findMentions`, um
 * handle que este arquivo aceita é exatamente um handle que o resolvedor do
 * servidor vai reconhecer — nem um a mais.
 *
 * Handle impossível vira cena sem personagem, e isso é deliberado: uma menção
 * quebrada no prompt viraria texto literal no inglês compilado, e a imagem sairia
 * com o nome dela escrito na cena.
 */
function mentionFor(handle: string | null): string | null {
  const limpo = handle?.trim().replace(/^@+/, "") ?? "";

  if (limpo === "") return null;

  const raw = `@${limpo}`;
  const mentions = findMentions(raw);

  return mentions.length === 1 && mentions[0].raw === raw ? raw : null;
}

/**
 * O que a ficha manda para o motor de VÍDEO — Ciclo 3 · Fase 3.
 *
 * ---------------------------------------------------------------------------
 * Três diferenças em relação ao prompt de imagem, e as três são deliberadas
 * ---------------------------------------------------------------------------
 *
 *   sem cenário    o cenário já está na imagem de partida. Repeti-lo aqui pediria
 *                  ao motor que redesenhasse o que ele deveria apenas mover.
 *   sem menção     o Kling é image-to-video e recebe UMA imagem, que já é a
 *                  personagem. Uma `@` no texto não teria para onde ir — e a rota
 *                  de vídeo a recusa por isso (`mention_not_supported`), o que
 *                  quebraria a cadeia numa cena que parece perfeita na tela. A
 *                  remoção usa o MESMO parser que a rota usa para recusar, então
 *                  o que esta função aceita é exatamente o que ela aceita.
 *   ação e câmera  `acao` já vem escrita como direção com marcas de tempo
 *                  ("ri por meio segundo, depois encara a câmera por dois") — é
 *                  literalmente um prompt de movimento. `movimento` é a câmera.
 *                  Juntas, são os 5 segundos.
 *
 * Pura como a irmã dela, e pelo mesmo motivo: a Máquina compõe seis destas antes
 * de gastar um Spark, e o servidor recompõe a mesma para o registro.
 */
export function buildSceneMotion(cena: Pick<SceneFields, "acao" | "movimento">): string {
  const bruto = [cena.acao, cena.movimento]
    .map(sentence)
    .filter((parte) => parte !== "")
    .join(" ");

  return sceneWithoutMentions(bruto, findMentions(bruto));
}

/** Um campo da ficha virando frase: aparada, e terminada uma vez só. */
function sentence(text: string): string {
  const trimmed = text.trim();

  if (trimmed === "") return "";

  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function readAngulo(enquadramento: string): string | null {
  return (ENQUADRAMENTO_KEYS as readonly string[]).includes(enquadramento) ? enquadramento : null;
}
