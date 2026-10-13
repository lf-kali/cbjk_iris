// npm run theme:add -- <nome-ou-url-do-tweakcn>   ex.: ocean-breeze, https://tweakcn.com/r/themes/ocean-breeze.json
// npm run theme:add -- --shadcn <cor>             ex.: neutral, stone, zinc, slate, gray, taupe
// Opcional: --as <nome> para escolher o nome do arquivo.
// Gera themes/<nome>.css no mesmo formato do "Copy code" do tweakcn (:root e .dark).
// Também dá para colar o CSS do tweakcn direto num arquivo em themes/.
import { writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const shadcn = flag("--shadcn");
const as = flag("--as");
const source = args[0];

if (!shadcn && !source) {
  console.error("Uso: npm run theme:add -- <tema-do-tweakcn | url> [--as nome]\n     npm run theme:add -- --shadcn <neutral|stone|zinc|slate|gray|taupe|...>");
  process.exit(1);
}

const url = shadcn
  ? `https://ui.shadcn.com/r/colors/${shadcn}.json`
  : source.startsWith("http") ? source : `https://tweakcn.com/r/themes/${source}.json`;
const name = as ?? shadcn ?? path.basename(new URL(url).pathname, ".json");

const res = await fetch(url);
if (!res.ok) {
  console.error(`Não consegui baixar ${url} (HTTP ${res.status}).`);
  process.exit(1);
}
const data = await res.json();

let light, dark;
if (shadcn) {
  const vars = data.cssVarsV4 ?? data.cssVars;
  // as paletas do shadcn não definem fonte; Geist é a fonte padrão do shadcn
  light = { "font-sans": "Geist, sans-serif", ...vars.light };
  dark = { ...vars.dark };
} else {
  light = { ...data.cssVars.theme, ...data.cssVars.light };
  dark = { ...data.cssVars.dark };
}

const block = (selector, vars) =>
  `${selector} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}\n`;

const origin = shadcn ? `paleta "${shadcn}" do shadcn/ui` : `tema "${data.name ?? name}" do tweakcn`;
const css = `/* ${origin} (${url}) */\n${block(":root", light)}\n${block(".dark", dark)}`;

const file = path.join(process.cwd(), "themes", `${name}.css`);
writeFileSync(file, css);
console.log(`themes/${name}.css criado. Use com: theme: "${name}" no site.config.ts`);
