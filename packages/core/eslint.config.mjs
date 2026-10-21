import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Imports proibidos no core (SPEC §5.1 e §5.1.3; também conferidos em test/imports.test.ts):
// - "@/": no projeto do cliente resolveria para o tsconfig dele;
// - "@cbjk_iris/core": o core importando a si mesmo fura o isolamento dos módulos (modules:check);
// - a CLI: grafo schema ← engine ← core, e core não importa cli;
// - "@cbjk_iris/site-config": só src/lib/config.ts lê o config do projeto.
const restricted = (allowSiteConfig) => [
  "error",
  {
    patterns: [
      { group: ["@/*"], message: "No core, use import relativo: @/ resolveria para o tsconfig do projeto do cliente." },
      { group: ["@cbjk_iris/core", "@cbjk_iris/core/*"], message: "O core não importa a si mesmo: use import relativo." },
      { group: ["@cbjk_iris/cli", "@cbjk_iris/cli/*", "create-iris-site"], message: "O core não importa a CLI." },
      ...(allowSiteConfig
        ? []
        : [{ group: ["@cbjk_iris/site-config"], message: "Só src/lib/config.ts lê o site.config.ts; importe siteConfig de lib/config." }]),
    ],
  },
];

// Mesmas regras do apps/site: o core é código de app Next (componentes e páginas).
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "../../apps/site" } },
  },
  { files: ["src/**/*.{ts,tsx}"], rules: { "no-restricted-imports": restricted(false) } },
  { files: ["src/lib/config.ts"], rules: { "no-restricted-imports": restricted(true) } },
  globalIgnores(["coverage/**"]),
]);
