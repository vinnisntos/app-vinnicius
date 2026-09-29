/**
 * Identidade do produto num lugar só — manifest PWA, ícones, metadata e
 * links de suporte leem daqui. Renomear o produto = editar este arquivo.
 */
export const APP_CONFIG = {
  name: "Life OS",
  shortName: "Life OS",
  description: "Alimentação, água, treino e comunidade para emagrecer com constância.",
  brandColor: "#9333EA", // --brand-600
  backgroundColor: "#09090b", // --background (tema dark)
  locale: "pt-BR",
  defaultTimezone: "America/Sao_Paulo",
} as const;

/** Tamanhos gerados por src/app/pwa-icon/[size]/route.tsx. */
export const PWA_ICON_SIZES = [192, 512] as const;
