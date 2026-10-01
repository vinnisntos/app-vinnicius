/** Número no formato brasileiro (vírgula decimal): 0.25 → "0,25". */
export function formatDecimal(value: number, maxFractionDigits = 3): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: maxFractionDigits });
}

/** Valor em reais: 19.9 → "R$ 19,90". */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
