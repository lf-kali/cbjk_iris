// Varredura dos chunks do navegador (R-1, E4): o zod e o código de Node do engine não podem chegar ao
// cliente. Equivale a `grep -rlE "<termos>" apps/site/.next/static`, mas falha quando a pasta não existe
// ou está vazia (o grep passaria em branco se o build não tivesse rodado) e recusa link simbólico.
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const FORBIDDEN_TERMS = ["ZodError", "zod", "spawnSync", "child_process", "importTheme", "writeThemeFile", "listThemes"];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`check:client-bundle: link simbólico em ${full}; os chunks do build não usam link`);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/** Lê todos os arquivos da pasta e devolve os que contêm um termo proibido (o primeiro achado por arquivo). */
export function scanClientBundle(dir) {
  let stat;
  try {
    stat = lstatSync(dir);
  } catch {
    throw new Error(`check:client-bundle: ${dir} não existe. Rode npm run build antes.`);
  }
  if (!stat.isDirectory()) throw new Error(`check:client-bundle: ${dir} não é uma pasta`);

  let files = 0;
  const hits = [];
  for (const file of walk(dir)) {
    files += 1;
    // latin1 lê qualquer byte sem erro; os termos são ASCII
    const text = readFileSync(file).toString("latin1");
    const term = FORBIDDEN_TERMS.find((t) => text.includes(t));
    if (term) hits.push({ file: path.relative(dir, file).split(path.sep).join("/"), term });
  }
  if (files === 0) throw new Error(`check:client-bundle: nenhum arquivo em ${dir}. Rode npm run build antes.`);
  return { files, hits };
}
