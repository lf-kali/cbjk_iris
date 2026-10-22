// npm run sync            -> gera app/layout.tsx, app/(iris)/**, app/iris.registry.generated.tsx e
//                            app/fonts.generated.ts (roda sozinho antes de dev e build)
// npm run sync:check      -> falha se algum deles estiver desatualizado
// Chama o Sync do @cbjk_iris/engine (SPEC §5.6). Quando a CLI existir, vira "iris sync" (iris-cli).
// Erro inesperado sai com mensagem curta; o stack só aparece com --verbose ou DEBUG.
const verbose = process.argv.includes("--verbose") || Boolean(process.env.DEBUG);

function fail(message, error) {
  console.error(message);
  if (verbose && error?.stack) console.error(error.stack);
  process.exit(1);
}

// "Cannot find module '<x>'" / "Cannot find package '<x>'": o engine não compilado aparece como
// @cbjk_iris/... ou como um caminho dentro de node_modules/@cbjk_iris/
function missingIrisPackage(error) {
  const missing = /Cannot find (?:module|package) '([^']+)'/.exec(String(error?.message))?.[1] ?? "";
  return missing.startsWith("@cbjk_iris/") || missing.includes("/@cbjk_iris/");
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

const check = process.argv.includes("--check");
let result;
try {
  result = engine.sync(process.cwd(), { check });
} catch (error) {
  fail(`erro inesperado: ${error?.message ?? error}`, error);
}
for (const d of result.diagnostics) {
  const line = `${d.level === "error" ? "erro" : "aviso"}: ${engine.formatDiagnostic(d)}${d.hint ? ` (${d.hint})` : ""}`;
  if (d.level === "error") console.error(line);
  else console.warn(line);
}
if (result.diagnostics.some((d) => d.level === "error")) process.exit(1);
if (check && !result.upToDate) {
  console.error(`Desatualizado: ${result.changed.join(", ")}. Rode: npm run sync`);
  process.exit(1);
}
if (!check && result.changed.length) console.log(`Atualizado: ${result.changed.join(", ")}`);
