// Cada tema em themes/<nome>/ exporta isto por padrão e importa o próprio theme.css.
export interface Theme {
  name: string;
  // classes das variáveis de fonte (next/font) aplicadas no <html>
  fontClassName: string;
}
