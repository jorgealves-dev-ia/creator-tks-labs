/**
 * "no seu quarto" → "no quarto dela" — item 3b da D1, e a metade do vazamento
 * de gênero que a substituição da menção não alcança.
 *
 * A Fase 3 pôs sujeito na frase e mediu o que sobrou: a mesma cena, com o mesmo
 * sujeito, saiu *"in her gamer room"* numa rodada e *"in his gamer bedroom"* na
 * seguinte. "Seu" em português é ambíguo por construção — dele, dela ou seu de
 * você — e um tradutor diante de ambiguidade não devolve ambiguidade: ele
 * escolhe. Trocar o possessivo por `dela`/`dele` tira a escolha da mesa.
 *
 * ---------------------------------------------------------------------------
 * Por que quase tudo aqui é recusa
 * ---------------------------------------------------------------------------
 *
 * A regra é conservadora por decisão do Jorge, e a decisão está certa pelo
 * custo assimétrico dos dois erros. **Deixar ambíguo é barato**: o modelo às
 * vezes acerta, e quando erra, erra do jeito que já errava. **Reescrever errado
 * é caro**: o modelo obedece. "No quarto do seu namorado" reescrito como "no
 * quarto do namorado dela" ainda é sobre o namorado; mas uma reescrita que
 * erra o dono transforma a cena em outra cena, com a autoridade de uma frase
 * bem-formada. Então, na dúvida, esta função não faz nada — e a maior parte do
 * arquivo é a definição de "dúvida".
 *
 * Cinco condições, todas obrigatórias:
 *
 *   1. **Uma pessoa só na frase.** Quem responde isso é o chamador (a menção é
 *      única e resolveu), e aqui ainda se recusa se aparecer substantivo de
 *      pessoa — "namorado", "amiga", "chefe". A lista é fechada e incompleta
 *      por natureza, e é por isso que ela só *adiciona* recusa: uma palavra que
 *      falta nela cai nas outras quatro condições.
 *   2. **Artigo antes do possessivo.** "no seu quarto" (em+o), "o seu cabelo",
 *      "da sua camiseta". Sem artigo, tirar o possessivo deixaria o substantivo
 *      pelado — "ajeita seu cabelo" viraria "ajeita cabelo dela" —, e inserir o
 *      artigo certo exigiria saber o gênero do substantivo, que é dicionário
 *      que não temos.
 *   3. **O sintagma termina onde dá para ver.** Uma ou duas palavras depois do
 *      possessivo, fechadas por fim de frase, pontuação, conjunção, verbo comum
 *      ou preposição que abre frase nova. Três ou mais: recusa.
 *   4. **Nada de "de/do/da" logo depois.** Essa preposição *continua* o
 *      sintagma ("quarto de luzes", "casa da praia"), e o "dela" cairia no meio
 *      dele.
 *   5. **Nada de "você" na frase.** Aí "seu" pode ser de você, e é.
 *
 * Tudo é tabela e consulta — sem rede, sem relógio, sem aleatoriedade —, então
 * o compilador continua função pura.
 */

/** As três formas que a personagem empresta, iguais às da substituição do `@`. */
export type PossessiveSubject = {
  sujeito: string;
  de: string;
  em: string;
};

/** `seu` · `sua` · `seus` · `suas`. O possessivo concorda com a coisa, não com o dono. */
const POSSESSIVES = new Set(["seu", "sua", "seus", "suas"]);

/**
 * Palavras que carregam artigo e podem ficar onde estão.
 *
 * O artigo é o que sobra segurando o substantivo depois que o possessivo sai —
 * e é por isso que a ausência dele é recusa e não um caso a resolver.
 */
const ARTICLE_BEARING = new Set([
  "o", "a", "os", "as",
  "no", "na", "nos", "nas",
  "do", "da", "dos", "das",
  "ao", "à", "aos", "às",
  "pelo", "pela", "pelos", "pelas",
  "num", "numa", "nuns", "numas",
]);

/**
 * Palavras que fecham o sintagma: depois delas começa outra coisa.
 *
 * Verbos comuns entram porque é onde o sintagma termina sem pontuação nenhuma
 * ("seu cabelo **está** solto"), e a lista é curta de propósito: cada verbo aqui
 * é uma reescrita a mais permitida, e o que não está na lista vira recusa.
 */
const CLOSERS = new Set([
  // conjunções
  "e", "ou", "mas", "enquanto", "que", "quando", "porque", "então",
  // preposições que abrem frase nova (nunca "de/do/da", ver DE_FORMS)
  "em", "no", "na", "nos", "nas", "com", "para", "pra", "por", "sem",
  "sobre", "entre", "até", "após", "durante", "contra",
  // verbos e cópulas comuns
  "é", "está", "estão", "são", "foi", "era", "fica", "ficam", "parece",
  "tem", "têm", "usa", "usando", "veste", "vestindo", "segura", "segurando",
  "olha", "olhando", "sorri", "sorrindo", "posa", "posando", "anda", "andando",
  "sentada", "sentado", "deitada", "deitado", "em pé",
]);

/** A preposição que *continua* o sintagma em vez de fechá-lo. */
const DE_FORMS = new Set(["de", "do", "da", "dos", "das"]);

/**
 * Substantivos de pessoa: quando um deles é o possuído, o "seu" tem outro dono
 * possível e a frase tem outra pessoa dentro dela.
 *
 * Fechada e incompleta, e isso é seguro **porque ela só recusa**. Uma palavra
 * que falta aqui não vira reescrita errada por causa disso: ela ainda precisa
 * passar pelo artigo, pelo fim de sintagma e pelo resto.
 */
const PEOPLE = new Set([
  "namorado", "namorada", "noivo", "noiva", "marido", "esposa", "mulher", "homem",
  "amigo", "amiga", "amigos", "amigas", "colega", "colegas", "parceiro", "parceira",
  "mãe", "pai", "filho", "filha", "filhos", "filhas", "irmão", "irmã", "irmãos", "irmãs",
  "avó", "avô", "tio", "tia", "primo", "prima", "sobrinho", "sobrinha",
  "chefe", "cliente", "clientes", "professor", "professora", "aluno", "aluna",
  "vizinho", "vizinha", "sócio", "sócia", "time", "equipe", "família",
  "criança", "crianças", "bebê", "menino", "menina", "moço", "moça",
  "modelo", "fotógrafo", "fotógrafa", "público", "convidado", "convidada",
]);

/** O "seu de você": se a segunda pessoa está na frase, o possessivo é dela. */
const SECOND_PERSON = new Set(["você", "voce", "vc", "te", "ti", "contigo", "tu", "vocês"]);

/** Palavra "limpa": só letras (com acento), sem número e sem pontuação colada. */
const PLAIN_WORD = /^[\p{L}]+$/u;

export type PossessiveRewrite = {
  /** A cena, reescrita onde foi seguro e intacta em todo o resto. */
  text: string;
  /** Quantos possessivos foram trocados. Vai para a auditoria da geração. */
  reescritos: number;
};

export function rewritePossessives(
  scene: string,
  subject: PossessiveSubject,
  options: { unicaPessoa: boolean },
): PossessiveRewrite {
  // A trava que não depende de lista nenhuma: sem uma pessoa só, não se mexe.
  if (!options.unicaPessoa) return { text: scene, reescritos: 0 };

  const tokens = scene.split(/(\s+)/);
  const words = tokens.map((token) => bare(token));

  // "Você" em qualquer lugar da frase envenena todos os possessivos dela.
  if (words.some((word) => SECOND_PERSON.has(word))) {
    return { text: scene, reescritos: 0 };
  }

  // Outra pessoa em qualquer lugar da frase: a menção não é a única dona
  // possível, que é exatamente a condição que o Jorge pôs.
  if (words.some((word) => PEOPLE.has(word))) {
    return { text: scene, reescritos: 0 };
  }

  let reescritos = 0;

  // Da direita para a esquerda: reescrever encurta a lista à frente.
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    if (!POSSESSIVES.has(words[index])) continue;

    const previous = previousWordIndex(tokens, index);

    // Condição 2 — artigo antes.
    if (previous === null || !ARTICLE_BEARING.has(words[previous])) continue;

    // Condições 3 e 4 — o sintagma tem que terminar onde dá para ver.
    const head = headAfter(tokens, words, index);

    if (head === null) continue;

    // Sai o possessivo (e o espaço que vinha com ele), entra o "dela" depois
    // da última palavra do sintagma.
    tokens[index] = "";
    if (tokens[index + 1] !== undefined && /^\s+$/.test(tokens[index + 1])) {
      tokens[index + 1] = "";
    }

    // Antes da pontuação, nunca depois: "no seu quarto, com cores" tem que
    // virar "no quarto dela, com cores" e não "no quarto, dela com cores" —
    // uma vírgula deslocada muda de que parte da frase o dono é dono.
    const last = head.lastIndex;
    const [, palavra, pontuacao] = /^(.*?)([^\p{L}\p{N}]*)$/u.exec(tokens[last]) ?? [
      "",
      tokens[last],
      "",
    ];

    tokens[last] = `${palavra} ${possessiveOf(subject)}${pontuacao}`;

    reescritos += 1;
  }

  if (reescritos === 0) return { text: scene, reescritos: 0 };

  return { text: tokens.join("").replace(/\s{2,}/g, " ").trim(), reescritos };
}

/**
 * "dela" · "dele" · "da pessoa" — a mesma forma contraída que a substituição da
 * menção já usa depois de "de", porque é literalmente a mesma construção:
 * "o quarto **de ela**" é "o quarto dela".
 */
function possessiveOf(subject: PossessiveSubject): string {
  return subject.de;
}

/** A palavra (não-espaço) imediatamente anterior, ou null se não houver. */
function previousWordIndex(tokens: readonly string[], from: number): number | null {
  for (let index = from - 1; index >= 0; index -= 1) {
    if (tokens[index].trim() !== "") return index;
  }

  return null;
}

/**
 * O sintagma possuído, quando dá para ver onde ele termina.
 *
 * Uma ou duas palavras limpas seguidas de um fechador reconhecível. Qualquer
 * outra coisa — três palavras, um "de", uma palavra que não é palavra — devolve
 * null, que é a recusa.
 */
function headAfter(
  tokens: readonly string[],
  words: readonly string[],
  possessiveIndex: number,
): { lastIndex: number } | null {
  const MAX_WORDS = 2;
  let lastIndex: number | null = null;
  let taken = 0;

  for (let index = possessiveIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].trim() === "") continue;

    const word = words[index];
    const raw = tokens[index];

    // Pontuação colada na palavra ("quarto,") fecha o sintagma nela mesma.
    const endsPhrase = /[.,;:!?]$/.test(raw);

    if (taken > 0 && (CLOSERS.has(word) || DE_FORMS.has(word))) {
      // "de" continua o sintagma: recusa. Os outros fecham: aceita o que veio.
      return DE_FORMS.has(word) ? null : { lastIndex: lastIndex as number };
    }

    if (!PLAIN_WORD.test(bare(raw))) return null;
    if (PEOPLE.has(word)) return null;

    taken += 1;
    lastIndex = index;

    if (endsPhrase) return { lastIndex: index };
    if (taken > MAX_WORDS) return null;
  }

  return lastIndex === null ? null : { lastIndex };
}

/** A palavra sem pontuação e em minúsculas, para comparar com as tabelas. */
function bare(token: string): string {
  return token.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "").toLowerCase();
}
