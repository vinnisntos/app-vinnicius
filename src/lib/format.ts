/** Número no formato brasileiro (vírgula decimal): 0.25 → "0,25". */
export function formatDecimal(value: number, maxFractionDigits = 3): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: maxFractionDigits });
}
