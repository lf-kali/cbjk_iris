import { defineConfig, globalIgnores } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

// Regras de TypeScript do eslint-config-next (sem as de React/Next: este pacote roda no Node).
export default defineConfig([...nextTs, globalIgnores(["dist/**", "coverage/**"])]);
