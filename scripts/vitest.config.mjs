import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes dos scripts da raiz (scripts/test). Os pacotes têm config própria.
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  test: {
    include: ["scripts/test/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["scripts/style-inventory.mjs"],
      reporter: ["text"],
    },
  },
});
