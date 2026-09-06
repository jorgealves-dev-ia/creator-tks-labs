/**
 * A LINHAGEM DE UM FILME, em forma de tela — Fase 4 · item 2.
 *
 * ---------------------------------------------------------------------------
 * Por que a regra mora aqui, e não dentro do JSX
 * ---------------------------------------------------------------------------
 *
 * Fora do arquivo `"use server"` pelo mesmo motivo que tirou o `estadoDaCena` de
 * dentro do `machine-actions`: **uma regra embutida no chamador só se testa
 * tendo o chamador inteiro de pé**, e o chamador aqui exige sessão e banco. A
 * regra é uma ordenação e um ternário; ela merece ser exercitada como tal.
 *
 * ---------------------------------------------------------------------------
 * A regra, e ela cabe numa frase
 * ---------------------------------------------------------------------------
 *
 * **A posição nunca some.** Quando um clipe que formou o filme é apagado, o
 * banco anula a peça (`part_asset_id` → `null`, pelo `on delete set null`) e o
 * filme continua inteiro — os bytes dele são dele. A linha permanece, com a
 * `ordem` dela, e a tela diz **«peça removida»** ali.
 *
 * Filtrar a peça anulada seria a tentação óbvia e o erro: um buraco na
 * numeração obriga quem lê a adivinhar se faltou uma peça ou se o filme só tinha
 * duas. É o mesmo argumento que fez a coluna ser **anulável** em vez de a linha
 * ser apagada — perder a linha perderia a informação de que existiu uma terceira
 * cena.
 */

/** Uma linha de `asset_montage_parts`, como o banco a devolve. */
export type LinhaDeLinhagem = {
  ordem: number;
  part_asset_id: string | null;
  /** O rótulo do clipe, quando ele ainda existe. */
  rotulo: string | null;
};

export type PecaDaLinhagem = {
  ordem: number;
  /** `null` quando o clipe foi apagado — e a posição fica assim mesmo. */
  assetId: string | null;
  rotulo: string | null;
  removida: boolean;
};

/**
 * As linhas do banco viram as peças da tela, **sem perder nenhuma**.
 *
 * Ordena por `ordem` porque a ordem das cenas ≠ a ordem de criação — foi o
 * primeiro achado da Fase 0, e montar por `created_at` entregou um filme com 242
 * de 363 quadros fora do lugar. O mesmo vale para exibir.
 */
export function pecasDaLinhagem(linhas: readonly LinhaDeLinhagem[]): PecaDaLinhagem[] {
  return [...linhas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((linha) => ({
      ordem: linha.ordem,
      assetId: linha.part_asset_id,
      rotulo: linha.part_asset_id === null ? null : linha.rotulo,
      removida: linha.part_asset_id === null,
    }));
}
