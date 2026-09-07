/**
 * O QUE A MÁQUINA DIZ SOBRE O PRODUTO — Frente A′ · P3.
 *
 * ---------------------------------------------------------------------------
 * Três estados, e a lição tem dois dias
 * ---------------------------------------------------------------------------
 *
 * A Fase 6 fechou em 06/09 corrigindo um ternário com **dois braços para três
 * estados** — e a tela mentia exatamente no terceiro. Esta função nasce com os
 * três separados de propósito, porque o meio deles é o que engana:
 *
 *   `so_nome`    a ficha tem produto e **nenhum** Input está conectado. O
 *                `storyboard_scenes.produto` é texto livre desde a migration, e
 *                **nome não é foto** — sozinho ele faz o modelo inventar o
 *                produto em vez de usar o da pessoa.
 *
 *   `mudo`       o Input **está** conectado e a chave «Input Referências» está
 *                **desligada**. A geração sai sem a foto, e a pessoa acabou de
 *                ver o fio ser desenhado. *Este é o estado que não pode ser
 *                confundido com o de baixo* — e ele não é raro: a chave **nasce
 *                desligada** (invariante 12), então é o estado imediatamente
 *                posterior a conectar.
 *
 *   `entrando`   conectado e ligado. **A tela não diz nada** — aviso que fica
 *                depois de resolvido é aviso que se aprende a ignorar.
 *
 * ---------------------------------------------------------------------------
 * Pura, e por isso testável sem levantar o canvas
 * ---------------------------------------------------------------------------
 *
 * Fora do JSX pela mesma razão que tirou o `vereditoDoFilme` de lá: uma regra
 * embutida no componente só se prova montando o componente. Esta é uma
 * classificação de três estados; ela merece uma tabela-verdade.
 */

export type EstadoDoProduto =
  /** Nada a dizer: nenhuma ficha tem produto e nenhuma foto está conectada. */
  | { estado: "sem_produto" }
  | { estado: "so_nome"; nome: string }
  | { estado: "mudo"; fotos: number }
  | { estado: "entrando"; fotos: number };

export function estadoDoProduto(input: {
  /** O campo `produto` de cada ficha do roteiro, na ordem delas. */
  produtos: readonly (string | null | undefined)[];
  /** Quantas fotos os Inputs conectados a esta Máquina entregam. */
  fotosConectadas: number;
  /** A chave «Input Referências». Nasce desligada — invariante 12. */
  chaveLigada: boolean;
}): EstadoDoProduto {
  const nome = input.produtos.map((p) => p?.trim() ?? "").find((p) => p !== "") ?? "";

  // Conectado vence o resto, e a ordem é a decisão: uma foto conectada muda o
  // que a geração faz, tenha ou não a ficha um `produto` escrito. Perguntar
  // pelo texto primeiro deixaria a chave desligada invisível num roteiro sem
  // produto nomeado — e a geração sairia sem as imagens mesmo assim.
  if (input.fotosConectadas > 0) {
    return input.chaveLigada
      ? { estado: "entrando", fotos: input.fotosConectadas }
      : { estado: "mudo", fotos: input.fotosConectadas };
  }

  return nome === "" ? { estado: "sem_produto" } : { estado: "so_nome", nome };
}

/**
 * A frase que o PORTÃO acrescenta à linha de custo — exigência do dono, 06/09.
 *
 * **O terceiro estado do aviso não basta se ele não estiver onde o dedo vai.**
 * O aviso por cena mora no trilho, que é onde se *lê*; a linha de custo é onde
 * se *decide*. Quem já leu o trilho e desceu para o botão tem o número na
 * frente e a informação atrás.
 *
 * Só no `mudo`: nos outros dois não há o que emendar ao custo — no `so_nome`
 * não há foto conectada para deixar de entrar, e no `entrando` ela entra.
 */
export function emendaDoPortao(estado: EstadoDoProduto): "sem_foto" | null {
  return estado.estado === "mudo" ? "sem_foto" : null;
}
