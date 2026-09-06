/**
 * O QUE CONTA COMO EDIÇÃO DE UMA FICHA — Fase 7 do «vídeo final».
 *
 * ---------------------------------------------------------------------------
 * O defeito que isto conserta
 * ---------------------------------------------------------------------------
 *
 * `saveScene` carimbava `edited_at` em **toda** gravação. Aprovar uma ficha é
 * uma gravação — o `status` viaja no mesmo patch de sempre —, então **aprovar
 * acusava de "editada à mão" quem só aprovou**.
 *
 * E o estrago não é estético. O comentário do próprio `actions.ts` diz para que
 * a coluna existe: *"é a coluna que a confirmação de «gerar de novo» vai contar
 * em voz alta antes de substituir"*. **Uma coluna de auditoria que marca todo
 * mundo não distingue ninguém** — se aprovar carimba, "3 fichas foram editadas à
 * mão e serão substituídas" acaba dizendo "3 fichas existem".
 *
 * ---------------------------------------------------------------------------
 * Por que `status` não está no tipo — e isso é o mecanismo, não descuido
 * ---------------------------------------------------------------------------
 *
 * A regra é *"`status` não é edição de conteúdo"*. Ela podia ser um campo
 * ignorado na comparação, com um comentário pedindo para ninguém acrescentá-lo.
 * **Um comentário não é uma trava** — a lição da marca que a regra 8 varre com
 * `git grep`, e que atravessou um commit por ser só uma frase em maiúsculas.
 * Aqui o campo simplesmente **não existe no tipo**: quem tentar compará-lo não
 * compila.
 *
 * *(E a frase está escrita assim de propósito: citar a marca literalmente faria
 * este arquivo aparecer na própria varredura, e uma trava que acusa quem a
 * elogia é uma trava que se aprende a ignorar.)*
 *
 * A lista abaixo é a do plano, e é fechada: `acao`, `cenario`, `enquadramento`,
 * `movimento`, `fala`, `produto`, `cta_id`, `cta_texto`, `duracao_segundos`,
 * `transicao`. Um campo editável novo entra aqui **ou o `edited_at` deixa de
 * enxergá-lo** — e é por isso que o tipo é escrito com os nomes de coluna: quem
 * adicionar a coluna vê a lista no mesmo momento em que escreve o `update`.
 */

export type ConteudoDaFicha = {
  acao: string;
  cenario: string;
  enquadramento: string;
  movimento: string;
  fala: string | null;
  produto: string | null;
  cta_id: string | null;
  cta_texto: string | null;
  duracao_segundos: number;
  transicao: string;
};

const CAMPOS = [
  "acao",
  "cenario",
  "enquadramento",
  "movimento",
  "fala",
  "produto",
  "cta_id",
  "cta_texto",
  "duracao_segundos",
  "transicao",
] as const satisfies readonly (keyof ConteudoDaFicha)[];

/**
 * Mudou algum campo de conteúdo?
 *
 * A comparação é feita sobre os valores **já normalizados** — `trim()` e vazio
 * virando nulo —, os mesmos que descem para o banco. Comparar o cru diria que
 * um espaço no fim é uma edição, e o `update` gravaria o mesmo texto de antes:
 * a ficha ficaria carimbada por uma diferença que ela própria apaga.
 */
export function houveEdicaoDeConteudo(
  antes: ConteudoDaFicha,
  depois: ConteudoDaFicha,
): boolean {
  return CAMPOS.some((campo) => antes[campo] !== depois[campo]);
}
