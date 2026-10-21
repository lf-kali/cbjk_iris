// Grava json/*.schema.json a partir do build (npm run build -w @cbjk_iris/schema).
// A pasta json/ é gerada e fica fora do git (.gitignore); vai no tarball ("files").
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildJsonSchemas } from "../dist/json-schema.mjs";

const out = fileURLToPath(new URL("../json/", import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [name, schema] of Object.entries(buildJsonSchemas())) {
  writeFileSync(new URL(name, `file://${out}`), JSON.stringify(schema, null, 2) + "\n");
}
