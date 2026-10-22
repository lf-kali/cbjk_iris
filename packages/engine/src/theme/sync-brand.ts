// SyncBrand (SPEC §5.6): o ex-brand:sync (apps/site/scripts/sync-brand.mjs), portado sem mudar a saída.
// Gera app/fonts.generated.ts a partir de siteConfig.brand.fonts (ou, sem elas, da --font-sans do
// tema, se for do Google Fonts) e avisa de contraste baixo. O next/font só aceita chamadas estáticas,
// por isso as fontes viram código gerado. Todo valor do config entra no código por JSON.stringify.
// Erros e avisos viram Diagnostic (nada de console nem process.exit): quem imprime é o chamador.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parse } from "culori";
import { DEFAULT_STYLE_ID, type BrandFont, type Diagnostic, type SiteConfig } from "@cbjk_iris/schema";
import { emptyPlan, GENERATED_HEADER, type SyncPlan } from "../codegen/files";
import { CONFIG_FILE } from "../project/errors";
import { contrastReport, resolveSiteTheme } from "./brand";
import { firstFontFamily, readThemeFile } from "./theme-file";

export const FONTS_FILE = "app/fonts.generated.ts";
const FONT_DATA = "next/dist/compiled/@next/font/dist/google/font-data.json";

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type GoogleFonts = Record<string, { weights: string[] }>;
type FontCall = { import: { from: string; name: string; default?: boolean }; code: string };

const configError = (pathText: string | undefined, message: string, hint?: string): Diagnostic => ({
  level: "error",
  file: CONFIG_FILE,
  ...(pathText ? { path: pathText } : {}),
  message,
  ...(hint ? { hint } : {}),
});
const configWarning = (pathText: string, message: string): Diagnostic => ({ level: "warning", file: CONFIG_FILE, path: pathText, message });

// resolve a partir do projeto: no monorepo o next fica no node_modules da raiz
function readGoogleFonts(root: string): GoogleFonts | null {
  try {
    const require = createRequire(path.join(root, "package.json"));
    return require(require.resolve(FONT_DATA)) as GoogleFonts;
  } catch {
    return null;
  }
}

function googleCall(role: string, font: { google: string; weights?: string[] }, fonts: GoogleFonts, errors: Diagnostic[]): FontCall | null {
  // hasOwn: "constructor" e outras chaves de Object.prototype não são fontes
  const data = Object.hasOwn(fonts, font.google) ? fonts[font.google] : undefined;
  if (!data) {
    errors.push(configError(`brand.fonts.${role}.google`, `"${font.google}" não existe no Google Fonts (confira a grafia exata, ex.: "Playfair Display").`));
    return null;
  }
  const isVariable = data.weights.includes("variable");
  const weights = font.weights ?? (isVariable ? undefined : ["400", "700"].filter((w) => data.weights.includes(w)));
  const invalid = (font.weights ?? []).filter((w) => !data.weights.includes(w));
  if (invalid.length) {
    errors.push(configError(`brand.fonts.${role}.weights`, `pesos ${invalid.join(", ")} não existem em "${font.google}" (disponíveis: ${data.weights.join(", ")}).`));
  }
  const fn = font.google.replace(/ /g, "_");
  // defesa em profundidade: o nome vira identificador no TS gerado, e o font-data.json vem do node_modules do projeto
  if (!IDENTIFIER.test(fn)) {
    errors.push(configError(`brand.fonts.${role}.google`, `"${font.google}" não pode virar nome de função no código gerado.`));
    return null;
  }
  const options = [
    `subsets: ["latin"]`,
    weights ? `weight: ${JSON.stringify(weights)}` : null,
    `variable: ${JSON.stringify(`--font-brand-${role}`)}`,
    `display: "swap"`,
  ].filter(Boolean);
  return { import: { from: "next/font/google", name: fn }, code: `${fn}({ ${options.join(", ")} })` };
}

function localCall(root: string, role: string, font: Extract<BrandFont, { local: unknown }>, errors: Diagnostic[]): FontCall {
  const out = path.join(root, FONTS_FILE);
  const src = font.local.map((file, i) => {
    if (!existsSync(path.join(root, file.path))) errors.push(configError(`brand.fonts.${role}.local[${i}].path`, `arquivo ${file.path} não encontrado.`));
    const rel = path.relative(path.dirname(out), path.join(root, file.path)).split(path.sep).join("/");
    return `    { path: ${JSON.stringify(rel)}, weight: ${JSON.stringify(file.weight)}, style: ${JSON.stringify(file.style ?? "normal")} },`;
  });
  return {
    import: { from: "next/font/local", name: "localFont", default: true },
    code: `localFont({\n  src: [\n${src.join("\n")}\n  ],\n  variable: ${JSON.stringify(`--font-brand-${role}`)},\n  display: "swap",\n})`,
  };
}

function renderFonts(calls: [string, FontCall][]): string {
  const googleNames = [...new Set(calls.filter(([, c]) => c.import.from === "next/font/google").map(([, c]) => c.import.name))];
  const imports = [
    calls.some(([, c]) => c.import.default) ? `import localFont from "next/font/local";` : null,
    googleNames.length ? `import { ${googleNames.join(", ")} } from "next/font/google";` : null,
  ].filter(Boolean);
  return `${GENERATED_HEADER}
// Fonte: siteConfig.brand.fonts (ou a --font-sans do tema). Para regenerar: npm run sync (depois, iris sync).
${imports.join("\n")}

${calls.map(([role, c]) => `const ${role} = ${c.code};`).join("\n\n")}

/** Classes com as variáveis de fonte (--font-brand-*), aplicadas no <html>. */
export const fontClassName = [${calls.map(([role]) => `${role}.variable`).join(", ")}].join(" ");
`;
}

// O motor lança "Cor inválida" para cor que o culori não entende ("#"); aqui vira erro com caminho.
function colorErrors(config: SiteConfig): Diagnostic[] {
  return Object.entries(config.brand.colors)
    .filter(([, value]) => typeof value === "string" && !parse(value))
    .map(([key, value]) =>
      configError(`brand.colors.${key}`, `cor que o motor de tema não entende: ${JSON.stringify(value)} (use hex, rgb(), hsl() ou oklch()).`),
    );
}

function contrastWarnings(root: string, config: SiteConfig): Diagnostic[] {
  try {
    const low = contrastReport(resolveSiteTheme(config.theme.name, config.brand, root));
    return low.map((r) =>
      configWarning(
        "brand.colors",
        `contraste ${r.ratio.toFixed(2)}:1 em ${r.pair} no modo ${r.mode === "light" ? "claro" : "escuro"}; texto pequeno pede 4.5:1 (WCAG AA).`,
      ),
    );
  } catch (error) {
    return [configError("theme.name", `o tema "${config.theme.name}" não pôde ser montado: ${(error as Error).message}`)];
  }
}

function styleWarnings(config: SiteConfig): Diagnostic[] {
  const style = config.theme.style;
  if (!style || style === DEFAULT_STYLE_ID) return [];
  return [configWarning("theme.style", `o estilo "${style}" ainda não tem preset: o site usa os valores do "${DEFAULT_STYLE_ID}" por enquanto.`)];
}

/** Plano do fonts.generated.ts para um config já validado. */
export function planBrand(root: string, config: SiteConfig): SyncPlan {
  const googleFonts = readGoogleFonts(root);
  if (!googleFonts) {
    return emptyPlan([{ level: "error", file: "package.json", message: "o pacote next não está instalado neste projeto", hint: "npm install" }]);
  }
  let theme;
  try {
    theme = readThemeFile(config.theme.name, root);
  } catch (error) {
    return emptyPlan([configError("theme.name", (error as Error).message)]);
  }

  const errors = colorErrors(config);
  const warnings: Diagnostic[] = [];
  // fonte da marca tem prioridade; sem ela, a sans do tema, se for do Google Fonts
  const fonts: Record<string, BrandFont | undefined> = { ...config.brand.fonts };
  const themeSans = firstFontFamily(theme.light["font-sans"]);
  if (!fonts.sans && themeSans) {
    if (Object.hasOwn(googleFonts, themeSans)) fonts.sans = { google: themeSans };
    else warnings.push(configWarning("theme.name", `a fonte do tema "${themeSans}" não está no Google Fonts; o site usa a fonte do sistema.`));
  }
  const calls = Object.entries(fonts).flatMap(([role, font]): [string, FontCall][] => {
    if (!font) return [];
    // o schema só aceita sans e heading; conferido de novo porque o papel vira nome de constante
    if (!IDENTIFIER.test(role)) {
      errors.push(configError("brand.fonts", `papel de fonte inválido: ${JSON.stringify(role)} (use sans ou heading).`));
      return [];
    }
    const call = "google" in font ? googleCall(role, font, googleFonts, errors) : localCall(root, role, font, errors);
    return call ? [[role, call]] : [];
  });

  if (errors.length) return emptyPlan([...errors, ...warnings, ...styleWarnings(config)]);
  return {
    files: new Map([[FONTS_FILE, renderFonts(calls)]]),
    remove: [],
    diagnostics: [...warnings, ...contrastWarnings(root, config), ...styleWarnings(config)],
  };
}
