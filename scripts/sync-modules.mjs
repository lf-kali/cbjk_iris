// npm run modules:sync           -> regenera components/sections/registry.tsx
// npm run modules:sync -- --check -> falha se o arquivo estiver desatualizado
import { syncRegistry, REGISTRY_FILE } from "./modules.mjs";

const check = process.argv.includes("--check");
const upToDate = syncRegistry(process.cwd(), { check });

if (check && !upToDate) {
  console.error(`${REGISTRY_FILE} está desatualizado. Rode: npm run modules:sync`);
  process.exit(1);
}
console.log(upToDate ? `${REGISTRY_FILE} já está em dia.` : `${REGISTRY_FILE} atualizado.`);
