/** Data de hoje (YYYY-MM-DD) no fuso do usuário — nunca `new Date().toISOString()`,
 * que usa UTC e vira o dia errado à noite no Brasil. */
export function getTodayIsoDate(timeZone = "America/Sao_Paulo"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
