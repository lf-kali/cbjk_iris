// npm run check:client-bundle  (na raiz, depois de npm run build)
// R-1 (E4): o zod e o código de Node do engine não podem chegar aos chunks do navegador.
// Uso: node scripts/check-client-bundle.mjs [pasta]   (padrão: apps/site/.next/static)
// Sai com 0 sem achado, 1 com achado ou se a pasta faltar ou estiver vazia.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FORBIDDEN_TERMS, scanClientBundle } from "./lib/client-bundle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.resolve(ROOT, process.argv[2] ?? "apps/site/.next/static");

try {
  const { files, hits } = scanClientBundle(dir);
  if (hits.length > 0) {
    console.error(`check:client-bundle: ${hits.length} arquivo(s) do navegador com termo proibido (${FORBIDDEN_TERMS.join(", ")}):`);
    for (const hit of hits) console.error(`  ${hit.file}: ${hit.term}`);
    process.exit(1);
  }
  console.log(`check:client-bundle: ${files} arquivo(s) em ${path.relative(ROOT, dir) || "."}, nenhum termo proibido.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
