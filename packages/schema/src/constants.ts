// Listas de dados e regras pequenas, sem zod: entram também no subpath ./defaults, que vai
// para o navegador (lib/config.ts do core). Não importe zod aqui (teste defaults-isolation).

/** Plataformas de compra, na ordem nativa (Q-07). */
export const PURCHASE_PLATFORMS = ["whatsapp", "mercadoLivre", "shopee", "amazon", "external"] as const;
export type PurchasePlatform = (typeof PURCHASE_PLATFORMS)[number];

/** Ordem padrão dos botões de compra; vale quando commerce.buttonOrder está ausente. */
export const DEFAULT_BUTTON_ORDER: readonly PurchasePlatform[] = Object.freeze([...PURCHASE_PLATFORMS]);

/**
 * Completa commerce.buttonOrder: as plataformas que faltam vão para o fim, na ordem de
 * DEFAULT_BUTTON_ORDER. Não confere repetição (isso é validação do siteConfigSchema).
 */
export function completeButtonOrder(order?: readonly PurchasePlatform[]): PurchasePlatform[] {
  const list = order ?? [];
  return [...list, ...DEFAULT_BUTTON_ORDER.filter((p) => !list.includes(p))];
}

/** Ícones disponíveis para benefícios (lista fixa do lucide, ver core/src/sections/icons.ts). */
export const SECTION_ICONS = [
  "shield-check", "badge-check", "award", "star", "thumbs-up", "heart", "gem",
  "clock", "timer", "calendar", "truck", "package", "credit-card", "hand-coins",
  "wrench", "hammer", "ruler", "paint-roller", "house", "zap", "droplets", "lightbulb",
  "leaf", "recycle", "users", "headset", "phone", "message-circle", "map-pin", "sparkles",
] as const;
export type SectionIcon = (typeof SECTION_ICONS)[number];

/** Campos do formulário de lead. */
export const LEAD_FIELDS = ["name", "phone", "email", "message"] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

export const SOCIAL_NETWORKS = [
  "instagram", "facebook", "youtube", "tiktok", "whatsapp", "x", "pinterest", "threads", "linkedin",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** Variáveis de cor do tema (formato do shadcn/tweakcn). */
export const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "cta", "cta-foreground", "highlight", "highlight-foreground",
  "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground",
  "destructive", "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ColorTokens = Record<ColorToken, string>;

/** "system": começa pelo tema do sistema e mostra o botão de troca. "light" | "dark": fixo. */
export const COLOR_MODES = ["system", "light", "dark"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];
