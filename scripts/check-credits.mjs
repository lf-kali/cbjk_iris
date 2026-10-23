// npm run check:credits  (na raiz)
// SPEC §6.1, "Pronto quando": cada arquivo em apps/site/public/{home,products,services,ultimos_projetos}
// tem linha na seção "## Fotos" do CREDITS.md, cada linha aponta para um arquivo que existe, e nenhum
// arquivo passa de 300 KB. As outras seções (temas, logo, ícones de marca) ficam fora.
// Uso: node scripts/check-credits.mjs [raiz]   (padrão: a raiz do repositório)
// Sai com 0 sem problema e 1 com problema.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkCredits } from "./lib/credits-check.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(process.argv[2] ?? REPO);

const { photos, credits, problems } = checkCredits(root);
if (problems.length > 0) {
  console.error(`check-credits: ${problems.length} problema(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`check-credits: ${photos} foto(s), ${credits} crédito(s), tudo certo.`);
