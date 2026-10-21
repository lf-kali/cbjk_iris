// npm run brand:sync            -> gera app/fonts.generated.ts a partir de siteConfig.brand.fonts
//                                  (ou, em branco, da fonte --font-sans do tema)
// npm run brand:sync -- --check -> falha se o arquivo estiver desatualizado
// Roda sozinho antes de "dev" e "build". Também imprime o relatório de contraste das cores.
// O next/font só aceita chamadas estáticas, por isso as fontes viram código gerado.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = process.cwd();
const OUT = "app/fonts.generated.ts";
// resolve a partir do projeto: no monorepo o next fica no node_modules da raiz (SPEC §5.6, SyncBrand)
const require = createRequire(path.join(ROOT, "package.json"));

const { siteConfig: rawConfig } = await import(path.join(ROOT, "site.config.ts"));
// Roda no predev/prebuild, antes do next.config (withIris): valida o config antes de gerar código.
const { resolveSiteConfig, SiteConfigError } = await import("@cbjk_iris/schema");
let siteConfig;
try {
  siteConfig = resolveSiteConfig(rawConfig);
} catch (error) {
  if (!(error instanceof SiteConfigError)) throw error;
  console.error(error.message);
  process.exit(1);
}
// motor de tema compilado (rode npm run build:packages na raiz antes)
const { contrastReport, resolveSiteTheme, readThemeFile, firstFontFamily } = await import("@cbjk_iris/engine/theme");
const googleFonts = require(require.resolve("next/dist/compiled/@next/font/dist/google/font-data.json"));

const errors = [];

function googleCall(role, font) {
  // hasOwn: "constructor" e outras chaves de Object.prototype não são fontes
  const data = Object.hasOwn(googleFonts, font.google) ? googleFonts[font.google] : undefined;
  if (!data) {
    errors.push(`brand.fonts.${role}: "${font.google}" não existe no Google Fonts (confira a grafia exata, ex.: "Playfair Display").`);
    return null;
  }
  const isVariable = data.weights.includes("variable");
  const weights = font.weights ?? (isVariable ? undefined : ["400", "700"].filter((w) => data.weights.includes(w)));
  const invalid = (font.weights ?? []).filter((w) => !data.weights.includes(w));
  if (invalid.length) errors.push(`brand.fonts.${role}: pesos ${invalid.join(", ")} não existem em "${font.google}" (disponíveis: ${data.weights.join(", ")}).`);

  const fn = font.google.replace(/ /g, "_");
  const options = [
    `subsets: ["latin"]`,
    weights ? `weight: ${JSON.stringify(weights)}` : null,
    `variable: "--font-brand-${role}"`,
    `display: "swap"`,
  ].filter(Boolean);
  return { import: { from: "next/font/google", name: fn }, code: `${fn}({ ${options.join(", ")} })` };
}

function localCall(role, font) {
  const src = font.local.map((file) => {
    if (!existsSync(path.join(ROOT, file.path))) errors.push(`brand.fonts.${role}: arquivo ${file.path} não encontrado.`);
    const rel = path.relative(path.dirname(path.join(ROOT, OUT)), path.join(ROOT, file.path)).split(path.sep).join("/");
    // valores em JSON: nada do config entra cru no código gerado
    return `    { path: ${JSON.stringify(rel)}, weight: ${JSON.stringify(file.weight)}, style: ${JSON.stringify(file.style ?? "normal")} },`;
  });
  return {
    import: { from: "next/font/local", name: "localFont", default: true },
    code: `localFont({\n  src: [\n${src.join("\n")}\n  ],\n  variable: "--font-brand-${role}",\n  display: "swap",\n})`,
  };
}

// fonte da marca tem prioridade; sem ela, a sans do tema, se for do Google Fonts
const theme = readThemeFile(siteConfig.theme.name);
const themeSans = firstFontFamily(theme.light["font-sans"]);
const fonts = { ...siteConfig.brand.fonts };
if (!fonts.sans && themeSans) {
  if (Object.hasOwn(googleFonts, themeSans)) fonts.sans = { google: themeSans };
  else console.warn(`Fonte do tema "${themeSans}" não está no Google Fonts; o site usa a fonte do sistema.`);
}

const roles = Object.entries(fonts).filter(([, font]) => font);
const calls = roles.map(([role, font]) => [role, "google" in font ? googleCall(role, font) : localCall(role, font)]);

if (errors.length) {
  console.error("Erro nas fontes da marca (site.config.ts):\n- " + errors.join("\n- "));
  process.exit(1);
}

const googleNames = [...new Set(calls.filter(([, c]) => c.import.from === "next/font/google").map(([, c]) => c.import.name))];
const imports = [
  calls.some(([, c]) => c.import.default) ? `import localFont from "next/font/local";` : null,
  googleNames.length ? `import { ${googleNames.join(", ")} } from "next/font/google";` : null,
].filter(Boolean);

const content = `// Gerado por iris sync. Não edite à mão.
// Até a CLI existir, quem gera é "npm run brand:sync" (roda sozinho antes de dev e build), a partir de siteConfig.brand.fonts.
${imports.join("\n")}

${calls.map(([role, c]) => `const ${role} = ${c.code};`).join("\n\n")}

/** Classes com as variáveis de fonte (--font-brand-*), aplicadas no <html>. */
export const fontClassName = [${calls.map(([role]) => `${role}.variable`).join(", ")}].join(" ");
`;

const file = path.join(ROOT, OUT);
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const check = process.argv.includes("--check");

if (current !== content) {
  if (check) {
    console.error(`${OUT} está desatualizado. Rode: npm run brand:sync`);
    process.exit(1);
  }
  writeFileSync(file, content);
  console.log(`${OUT} atualizado.`);
}

const lowContrast = contrastReport(resolveSiteTheme(siteConfig.theme.name, siteConfig.brand));
if (lowContrast.length) {
  console.warn("Aviso de contraste (texto pequeno pede 4.5:1, WCAG AA):");
  for (const r of lowContrast) console.warn(`  ${r.mode.padEnd(5)} ${r.pair}: ${r.ratio.toFixed(2)}:1`);
}
