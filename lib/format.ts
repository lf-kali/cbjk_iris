import { siteConfig } from "@/site.config";

const priceFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
});

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

/** Substitui {chave} pelos valores: fillTemplate("{count} itens", { count: 3 }) */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
