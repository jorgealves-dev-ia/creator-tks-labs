/**
 * Datas como o usuário lê — e num fuso decidido, não no do servidor.
 *
 * O fuso é explícito de propósito. Estas telas renderizam no servidor, e o
 * servidor da Vercel roda em UTC: uma geração feita às 22h de terça em São Paulo
 * é 01h de quarta em UTC, e a data "certa" do servidor seria o dia seguinte ao
 * que a pessoa viveu. Um cartão que diz "13/08" sobre algo que aconteceu na
 * terça-feira à noite não está arredondando — está errado.
 *
 * `America/Sao_Paulo` fixo enquanto o produto é pt-BR/BRL e de um país só. No dia
 * em que houver usuário fora do fuso, isto vira preferência de perfil — e o lugar
 * de mudar é este arquivo, que é a razão de ele existir em vez de um
 * `toLocaleDateString` solto em cada componente.
 */
const TIME_ZONE = "America/Sao_Paulo";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dayAndTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `12/08/2026` */
export function formatDay(iso: string): string {
  return dayFormatter.format(new Date(iso));
}

/** `12/08/2026 22:14` — para o extrato, onde duas linhas do mesmo dia precisam se distinguir. */
export function formatDayAndTime(iso: string): string {
  return dayAndTimeFormatter.format(new Date(iso));
}
