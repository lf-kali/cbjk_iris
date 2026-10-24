import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes dos scripts da raiz (scripts/test). Os pacotes têm config própria.
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  test: {
    include: ["scripts/test/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["scripts/style-inventory.mjs", "scripts/lib/client-bundle.mjs", "scripts/lib/release-check.mjs", "scripts/lib/tarball-check.mjs", "scripts/lib/lifecycle.mjs", "scripts/lib/npm-modules.mjs", "scripts/lib/publish-config.mjs", "scripts/lib/credits-check.mjs", "scripts/lib/e2e-docker.mjs", "scripts/lib/legal-files.mjs"],
      reporter: ["text"],
    },
  },
});
