// npm run theme:add -- <nome-do-tweakcn | https://...>   ex.: ocean-breeze
// npm run theme:add -- --shadcn <cor>                     ex.: neutral, stone, zinc, slate, gray, taupe
// Opções: --as <nome> (nome do arquivo), --force (sobrescreve themes/<nome>.css).
// Chama importTheme e writeThemeFile do @cbjk_iris/engine (SPEC §5.6): só https, e o CSS gravado tem só
// as variáveis permitidas em :root e .dark. Quando a CLI existir, vira "iris theme add" (iris-cli).
// Erro inesperado sai com mensagem curta; o stack só aparece com --verbose ou DEBUG.
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || Boolean(process.env.DEBUG);

function fail(message, error) {
  console.error(message);
  if (verbose && error?.stack) console.error(error.stack);
  process.exit(1);
}

function missingIrisPackage(error) {
  const missing = /Cannot find (?:module|package) '([^']+)'/.exec(String(error?.message))?.[1] ?? "";
  return missing.startsWith("@cbjk_iris/") || missing.includes("/@cbjk_iris/");
}

function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
}
const shadcn = flag("--shadcn");
const as = flag("--as");
const force = args.includes("--force");
const positional = args.find((a) => !a.startsWith("--"));

if (!shadcn && !positional) {
  fail("Uso: npm run theme:add -- <tema-do-tweakcn | https://...> [--as nome] [--force]\n     npm run theme:add -- --shadcn <neutral|stone|zinc|slate|gray|taupe|...>");
}

let engine;
try {
  engine = await import("@cbjk_iris/engine");
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND" && missingIrisPackage(error)) {
    fail("O @cbjk_iris/engine não está compilado. Rode na raiz do monorepo: npm run build:packages", error);
  }
  fail(`erro ao carregar o @cbjk_iris/engine: ${error?.message ?? error}`, error);
}

// com esquema (https:, http:, file:...) é endereço, e o importTheme recusa o que não for https;
// o resto é nome de tema do tweakcn
const source = shadcn ? { shadcn } : /^[a-z][a-z0-9+.-]*:/i.test(positional) ? { url: positional } : { tweakcn: positional };
try {
  const { name, css } = await engine.importTheme(source, as);
  const change = engine.writeThemeFile(process.cwd(), name, css, { force });
  console.log(`${change.path} ${change.action === "create" ? "criado" : "atualizado"}. Use com: theme: { name: "${name}" } no site.config.ts`);
} catch (error) {
  fail(`erro: ${error?.message ?? error}`, error);
}
