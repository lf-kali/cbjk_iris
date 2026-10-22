// Gerado por iris sync. Não edite à mão.
// Fonte: siteConfig.brand.fonts (ou a --font-sans do tema). Para regenerar: npm run sync (depois, iris sync).
import { Geist } from "next/font/google";

const sans = Geist({ subsets: ["latin"], variable: "--font-brand-sans", display: "swap" });

/** Classes com as variáveis de fonte (--font-brand-*), aplicadas no <html>. */
export const fontClassName = [sans.variable].join(" ");
