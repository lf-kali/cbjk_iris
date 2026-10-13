// Gerado por scripts/sync-brand.mjs a partir de siteConfig.brand.fonts. Não edite à mão:
// rode "npm run brand:sync" depois de mudar as fontes (roda sozinho antes de dev e build).
import localFont from "next/font/local";

const sans = localFont({
  src: [
    { path: "../fonts/mont/Mont-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/mont/Mont-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/mont/Mont-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/mont/Mont-Heavy.woff2", weight: "800", style: "normal" },
    { path: "../fonts/mont/Mont-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-brand-sans",
  display: "swap",
});

/** Classes com as variáveis de fonte (--font-brand-*), aplicadas no <html>. */
export const fontClassName = [sans.variable].join(" ");
