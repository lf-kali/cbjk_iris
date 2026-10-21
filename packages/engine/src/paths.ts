import path from "node:path";
import { fileURLToPath } from "node:url";

// Fica na raiz de src/ de propósito: este arquivo e os chunks do dist/ estão no mesmo nível,
// então "../themes" aponta para packages/engine/themes/ no fonte (vitest) e no pacote compilado.
//
// Por que path.resolve e não new URL("../themes/", import.meta.url): o Turbopack trata
// new URL(<literal>, import.meta.url) como asset e falha o build ("Can't resolve '../themes/'")
// sempre que empacota o engine. Num projeto, o engine vem de node_modules e o withIris o põe em
// serverExternalPackages (não é empacotado, spike-001 ponto 7). No monorepo, o engine é um
// workspace (symlink para packages/engine, fora de node_modules) e o Turbopack o empacota
// mesmo assim (migration-001). Com path.resolve, os dois casos acham a mesma pasta.
export const BUILTIN_THEMES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../themes");
