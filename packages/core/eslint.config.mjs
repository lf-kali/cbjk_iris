import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Mesmas regras do apps/site: o core é código de app Next (componentes e páginas).
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "../../apps/site" } },
  },
  globalIgnores(["coverage/**"]),
]);
