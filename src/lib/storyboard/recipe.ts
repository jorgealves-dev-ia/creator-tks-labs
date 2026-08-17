import {
  ENQUADRAMENTO_KEYS,
  ESTILO_KEYS,
  FORMATO_KEYS,
  TETO_CENAS,
  TRANSICAO_KEYS,
  type Canal,
  type Cena,
  type Historia,
} from "@/lib/storyboard/contract";

/**
 * A receita do gerador de roteiro — FRENTE STORYBOARD · CICLO 2 · Fase 2.
 *
 * Promovida de `scratchpad/storyboard-c2/contrato.mjs` (receita v3), medida em
 * 47 chamadas reais na Fase 0. **As três durezas abaixo não foram reescritas**,
 * e a razão está em cada uma: as três nasceram de um defeito observado, não de
 * uma intuição sobre o que um modelo faria.
 *
 * Função pura, como o compilador de imagem: sem rede, sem relógio, sem
 * aleatoriedade. Os CTAs entram por parâmetro porque moram no banco desde a
 * Fase 1 — quem lê `cta_library` é o motor, e a receita continua sendo uma
 * função de texto para texto, do jeito que dá para testar sem banco nenhum.
 *
 * O contrário — a receita indo ao banco sozinha — faria de cada teste de
 * redação um teste de integração, e é a diferença entre uma mudança de frase
 * ser barata e ser cara.
 */

/** Um CTA da biblioteca, na forma reduzida que a receita precisa. */
export type CtaSugestao = { id: string; texto_pt: string };

/** Quem está em cena, quando há alguém. */
export type PersonagemDaReceita = { handle: string; genero: string };

/** O que a receita devolve: dois textos, e nada mais. */
export type Receita = { system: string; user: string };

// ---------------------------------------------------------------------------
// Dureza 1 — o rosto no primeiro segundo da continuação
// ---------------------------------------------------------------------------

/**
 * A herança direta do Ciclo 1, e a razão de o `gemini-3.7-flash` ter sido
 * escolhido: 24/24 continuações corretas contra 17/21 do flash-lite.
 *
 * A lição que a gerou: *medir identidade num quadro em que ninguém está olhando
 * é não medir*. Uma cena emendada que abre de costas quebra a emenda para o
 * espectador antes de quebrar para quem mede.
 *
 * O parágrafo sobre VARIAR existe por um defeito da rodada 2, não por estética:
 * com a regra do rosto e sem ele, seis cenas seguidas abriram com as mesmas
 * cinco palavras. Um roteiro assim se lê como formulário — e o modelo obedecia
 * à regra ao pé da letra, que é como uma instrução certa produz um resultado
 * ruim.
 */
const REGRA_ROSTO_NO_PRIMEIRO_SEGUNDO = `
- "transicao" tem duas opções e elas significam coisas diferentes de produção:
  * "corte" — a cena começa num plano novo. Use quando muda de lugar, de roupa
    ou salta no tempo.
  * "continuacao" — a cena começa EXATAMENTE no último quadro da anterior, sem
    salto nenhum. Use sempre que a ação continua no mesmo instante e no mesmo
    lugar: é o que permite emendar os dois clipes sem corte visível, e é o que
    faz o vídeo parecer contínuo em vez de picotado. Prefira "continuacao" quando
    a história permitir.
- Quando "transicao" for "continuacao", a "acao" DEVE manter o rosto da
  personagem enquadrado e voltado para a câmera no primeiro segundo, antes de
  qualquer outro movimento. É nesse quadro que quem assiste reconhece que
  continua sendo a mesma pessoa. Quebram a emenda, e são proibidos como abertura
  de uma continuação: começar de costas, começar de perfil, começar com a câmera
  num objeto, ou começar com ela olhando para outro lugar que não a lente.
- VARIE a forma como o rosto entra no quadro. Não repita a mesma frase de
  abertura entre continuações — "encara a lente e ri por um segundo", "emerge da
  água já de frente para a câmera", "vira o rosto para a lente por um segundo",
  "sustenta o olhar na câmera por um segundo" dizem a mesma coisa de quatro
  jeitos. Seis cenas abrindo com as mesmas cinco palavras é um roteiro que se lê
  como formulário.
- A cena 1 nunca é "continuacao": não existe quadro anterior.`.trim();

// ---------------------------------------------------------------------------
// Dureza 2 — a ação dirige, e carrega tempo
// ---------------------------------------------------------------------------

/**
 * Sem a marca de tempo explícita, a rodada 1 produziu ações como "ela está
 * feliz com o produto" — que descreve um estado e não dirige nada. O motor de
 * vídeo precisa saber quanto dura cada beat dentro dos 5 segundos, e uma ação
 * sem tempo é uma ação que ele não sabe executar.
 *
 * Os quatro exemplos (dois bons, dois ruins) estão aqui porque a instrução
 * abstrata sozinha não bastou: o par "dirige mas sem tempo" é o que ensina a
 * diferença que a frase não consegue explicar.
 */
const REGRA_ACAO = `
- "acao" DIRIGE, não descreve. Verbo no presente, e TODA ação carrega pelo menos
  uma marca de tempo explícita ("por um segundo", "em dois segundos", "por meio
  segundo"). Uma ação sem tempo é uma ação que o motor de vídeo não sabe executar
  — ele precisa saber quanto dura cada beat dentro dos 5 segundos.
  Bom:  "ri de forma escandalosa por meio segundo, depois encara a câmera por dois segundos"
  Bom:  "levanta a peça na altura do rosto e segura por um segundo"
  Ruim: "ela está feliz com o produto"        (não dirige, e não tem tempo)
  Ruim: "levanta a peça e sorri"              (dirige, mas sem tempo)`.trim();

// ---------------------------------------------------------------------------
// Dureza 3 — cenário próprio de cada cena
// ---------------------------------------------------------------------------

/**
 * Cada cena vira uma imagem gerada **separadamente**. Um cenário repetido
 * palavra por palavra em três cenas produz três imagens iguais, e um roteiro de
 * seis cenas vira um vídeo de duas.
 *
 * A saída não é proibir o mesmo ambiente — histórias acontecem em um lugar só o
 * tempo todo. É exigir outro recorte: "quarto, em frente ao espelho" e "quarto,
 * sentada na beira da cama" são o mesmo quarto e dois cenários.
 */
const REGRAS_COMUNS = `
${REGRA_ACAO}
- "cenario" é o lugar concreto, curto, e é PRÓPRIO de cada cena: "quarto gamer
  com luz roxa", "calçada ensolarada em frente a um café", "deck de madeira ao
  lado da piscina". Cada cena vira uma imagem gerada separadamente, então um
  cenário repetido palavra por palavra em três cenas produz três imagens iguais.
  Quando a cena de fato acontece no mesmo ambiente, mude o recorte: outro canto,
  outra luz, outra distância — "quarto, em frente ao espelho" e "quarto, sentada
  na beira da cama" são o mesmo quarto e dois cenários.
- "movimento" é o movimento de câmera ou do corpo: "câmera se aproxima devagar",
  "ela gira mostrando as costas".
- "fala" é o que a personagem diz, curto e falado — nunca narração literária.
- "duracao_segundos" é sempre 5.
- Escreva TUDO em português do Brasil. Nenhum campo em inglês, exceto as chaves
  das listas fechadas.`.trim();

const CABECALHO = `
Você é diretor de conteúdo para social commerce brasileiro. Escreve roteiros
curtos e filmáveis para vídeo vertical, cena a cena, em português do Brasil.

Cada cena vira uma ficha estruturada que outros motores vão executar: um gera a
imagem, outro anima, outro dá voz. Então cada campo tem que ser executável
sozinho — nada de subentendido entre cenas.`.trim();

/**
 * As listas fechadas, escritas por extenso no prompt mesmo já viajando no
 * `response_format`.
 *
 * Não é cinto e suspensório desnecessário: o schema garante que a resposta
 * *tenha* uma das chaves, e o prompt é o que faz o modelo **escolher a certa**.
 * Um enum sem explicação produz respostas válidas e erradas — sempre a primeira
 * da lista, que era o comportamento observado antes de as listas entrarem no
 * texto.
 */
function blocoListas(): string {
  return `
"enquadramento" só aceita uma destas chaves, sem exceção:
${ENQUADRAMENTO_KEYS.map((k) => `  - ${k}`).join("\n")}

"formato" só aceita: ${FORMATO_KEYS.join(", ")}
"estilo" só aceita: ${ESTILO_KEYS.join(", ")}   (UGC é estilo, nunca formato)
"transicao" só aceita: ${TRANSICAO_KEYS.join(", ")}`.trim();
}

/**
 * A biblioteca de CTAs entra como **sugestão**, e a diferença decide o schema:
 * um CTA não vira frase fixa de prompt, ele é copy lido por um humano e falado
 * por uma personagem. Por isso o modelo pode escrever um próprio, e a ficha
 * guarda `cta_id` (de onde veio) e `cta_texto` (o que ficou).
 *
 * Lista vazia é caso real e não erro: um canal sem CTA semeado deve produzir
 * roteiro assim mesmo, com o modelo escrevendo os seus. Dizer "não há
 * biblioteca" em vez de omitir o bloco é o que impede o modelo de concluir que
 * CTA não é para existir.
 */
function blocoCta(canal: Canal, ctas: readonly CtaSugestao[]): string {
  if (ctas.length === 0) {
    return `
Não há biblioteca de CTA para o canal ${canal}: escreva um CTA próprio em
"cta_texto", com "cta_id": null.

Normalmente UMA cena só carrega CTA, e é a última. As demais têm
"cta_id": null e "cta_texto": null.`.trim();
  }

  return `
Biblioteca de CTA do canal ${canal} — use "cta_id" quando um destes servir, e
escreva um próprio em "cta_texto" com "cta_id": null quando nenhum servir:
${ctas.map((c) => `  - ${c.id}: "${c.texto_pt}"`).join("\n")}

Normalmente UMA cena só carrega CTA, e é a última. As demais têm
"cta_id": null e "cta_texto": null.`.trim();
}

/**
 * Quem está em cena.
 *
 * O handle vai **sem** o `@`, e isso espelha a coluna: `personagem_handle`
 * guarda o handle e nunca o id de uma versão congelada. Uma ficha é um plano;
 * quem resolve `@luna` para um retrato é o servidor, no momento da geração
 * (decisão N2). Congelar aqui faria um roteiro escrito hoje gerar com a versão
 * de hoje daqui a um mês.
 */
function blocoPersonagem(personagem: PersonagemDaReceita | null): string {
  if (!personagem) {
    return `Não há personagem definida: "personagem" é null em todas as cenas.`;
  }

  return `
A personagem desta história é @${personagem.handle} (${personagem.genero}).
Use "${personagem.handle}" — o handle, SEM o @ — no campo "personagem" de toda
cena em que ela aparece. Não invente outras personagens.`.trim();
}

function blocoProduto(produto: string | null): string {
  return produto ? `Produto em cena: ${produto}` : "Sem produto em cena.";
}

// ---------------------------------------------------------------------------
// As três receitas, uma por job_kind
// ---------------------------------------------------------------------------

/** `roteiro`: uma ideia vira até N fichas. */
export function receitaRoteiro(input: {
  ideia: string;
  canal: Canal;
  ctas: readonly CtaSugestao[];
  personagem: PersonagemDaReceita | null;
  produto: string | null;
  cenas: number;
}): Receita {
  return {
    system: `${CABECALHO}

${blocoListas()}

${blocoPersonagem(input.personagem)}

${blocoCta(input.canal, input.ctas)}

REGRAS:
${REGRAS_COMUNS}
${REGRA_ROSTO_NO_PRIMEIRO_SEGUNDO}
- Escreva EXATAMENTE ${input.cenas} cenas, numeradas de 1 a ${input.cenas} em "ordem".
- "historia.cenas_no_original" é null e "historia.ajuste" é null: a história está
  sendo escrita agora, então não houve original nem redução.`,
    user: `Ideia da história:
${input.ideia}

Canal de destino: ${input.canal}
${blocoProduto(input.produto)}`,
  };
}

/**
 * `estruturar`: um roteiro pronto vira fichas.
 *
 * As duas regras que só existem aqui são as duas que a Fase 0 mediu:
 *
 *   1. **Contar o original.** É o número, não a prosa, que decide se houve
 *      condensação — a tela compara `cenas_no_original` com o total.
 *   2. **Nunca amputar o final.** Um roteiro de 14 cenas condensado para 10
 *      perdendo o desfecho perde a razão de o vídeo existir. Preferir perder um
 *      meio repetido a perder o fim.
 */
export function receitaEstruturar(input: {
  texto: string;
  canal: Canal;
  ctas: readonly CtaSugestao[];
  personagem: PersonagemDaReceita | null;
  produto: string | null;
}): Receita {
  return {
    system: `${CABECALHO}

Desta vez você NÃO inventa a história: ela já foi escrita. Seu trabalho é
ESTRUTURAR o texto recebido em fichas de cena, preservando a intenção de quem
escreveu.

${blocoListas()}

${blocoPersonagem(input.personagem)}

${blocoCta(input.canal, input.ctas)}

REGRAS:
${REGRAS_COMUNS}
${REGRA_ROSTO_NO_PRIMEIRO_SEGUNDO}
- Conte quantas cenas o texto recebido tem e escreva esse número em
  "historia.cenas_no_original". Conte o que o texto tem, não o que você produziu.
- O teto é ${TETO_CENAS} cenas, e ele é absoluto.
- Se o roteiro recebido tiver MAIS de ${TETO_CENAS} cenas, CONDENSE: junte cenas
  vizinhas que contam o mesmo beat numa ficha só. NUNCA ampute o final — o
  desfecho e o CTA são a razão do vídeo existir. Preferir perder um meio
  repetido a perder o fim.
- "historia.ajuste" é null SEMPRE que o número de cenas que você produziu for
  igual ao original. Não houve ajuste: não escreva frase nenhuma. Uma frase do
  tipo "condensado de 6 para 6" é falsa e ensina quem lê a ignorar o campo.
  Preencha "ajuste" apenas quando de fato reduziu, e diga o que juntou.`,
    user: `Roteiro recebido:
---
${input.texto}
---

Canal de destino: ${input.canal}
${blocoProduto(input.produto)}`,
  };
}

/**
 * `cena`: reescreve UMA ficha com uma instrução.
 *
 * As vizinhas viajam junto — ajuste (d) do Jorge na aprovação do plano. Sem
 * elas, uma cena reescrita não tem como saber com o que ela emenda:
 * "continuacao" viraria uma promessa sobre um quadro que o modelo nunca viu, e
 * a instrução de quem dirige ("deixa ela mais animada") seria aplicada no vácuo.
 */
export function receitaCena(input: {
  cena: Cena;
  anterior: Cena | null;
  seguinte: Cena | null;
  instrucao: string;
  canal: Canal;
  ctas: readonly CtaSugestao[];
  personagem: PersonagemDaReceita | null;
  historia: Pick<Historia, "titulo" | "formato" | "estilo">;
}): Receita {
  const vizinha = (rotulo: string, c: Cena | null) =>
    c
      ? `${rotulo} (cena ${c.ordem}): ação "${c.acao}" · cenário "${c.cenario}" · enquadramento ${c.enquadramento} · transição ${c.transicao}`
      : `${rotulo}: não existe.`;

  return {
    system: `${CABECALHO}

Desta vez você reescreve UMA cena de um roteiro que já existe. Devolva apenas
essa cena, com o mesmo "ordem" que ela tinha.

${blocoListas()}

${blocoPersonagem(input.personagem)}

${blocoCta(input.canal, input.ctas)}

REGRAS:
${REGRAS_COMUNS}
${REGRA_ROSTO_NO_PRIMEIRO_SEGUNDO}
- Mantenha a coerência com as cenas vizinhas: a sua entra depois da anterior e
  antes da seguinte, e a emenda tem que continuar fazendo sentido.
- Não mude "ordem".`,
    user: `História: "${input.historia.titulo}" · formato ${input.historia.formato} · estilo ${input.historia.estilo}

${vizinha("Cena ANTERIOR", input.anterior)}
${vizinha("Cena SEGUINTE", input.seguinte)}

Cena a reescrever (cena ${input.cena.ordem}):
${JSON.stringify(input.cena, null, 2)}

Instrução de quem dirige:
${input.instrucao}`,
  };
}
