// Gerado por iris sync. Não edite à mão.
// Até a CLI existir, quem gera é "npm run brand:sync" (roda sozinho antes de dev e build), a partir de siteConfig.brand.fonts.
import { Geist } from "next/font/google";

const sans = Geist({ subsets: ["latin"], variable: "--font-brand-sans", display: "swap" });

/** Classes com as variáveis de fonte (--font-brand-*), aplicadas no <html>. */
export const fontClassName = [sans.variable].join(" ");
