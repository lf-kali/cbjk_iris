// npm view <nome>@<versão> version --json | node scripts/npm-view-state.mjs <código-de-saída> <versão>
// Imprime "published" ou "missing" (E404). Qualquer outro resultado sai com 1 (job "publish" do
// release.yml: erro de rede ou de registro para o lançamento antes de publicar qualquer pacote).
import { readFileSync } from "node:fs";
import { viewState } from "./lib/tarball-check.mjs";

const [code, version] = process.argv.slice(2);
try {
  console.log(viewState(readFileSync(0, "utf8"), Number(code), version));
} catch (error) {
  console.error(`npm-view-state: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
