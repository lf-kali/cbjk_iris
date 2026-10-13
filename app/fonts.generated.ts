// Gerado por scripts/sync-brand.mjs a partir de siteConfig.brand.fonts. Não edite à mão:
// rode "npm run brand:sync" depois de mudar as fontes (roda sozinho antes de dev e build).
import { Geist } from "next/font/google";

const sans = Geist({ subsets: ["latin"], variable: "--font-brand-sans", display: "swap" });

/** Classes com as variáveis de fonte (--font-brand-*), aplicadas no <html>. */
export const fontClassName = [sans.variable].join(" ");
