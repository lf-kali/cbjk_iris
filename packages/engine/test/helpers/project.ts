// Projeto temporário para os testes do sync e do loadSiteConfig.
// Fica dentro do monorepo (apps/.engine-test-*, padrão apps/.* no .gitignore) para o createRequire
// do projeto achar o "next" no node_modules da raiz (font-data.json do SyncBrand).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SiteConfigInput } from "@cbjk_iris/schema";
import { siteConfigFixture } from "../fixtures/site-config";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const created: string[] = [];

export function configSource(config: unknown): string {
  return `import type { SiteConfigInput } from "@cbjk_iris/schema";\n\nexport const siteConfig = ${JSON.stringify(config, null, 2)} satisfies SiteConfigInput;\n`;
}

export function writeFile(root: string, rel: string, content: string) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/** Cria o projeto com o site.config.ts (objeto ou fonte TS) e os arquivos extras. */
export function makeProject(config: Partial<SiteConfigInput> | string = {}, files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(REPO, "apps", ".engine-test-"));
  created.push(root);
  writeFile(root, "package.json", '{ "name": "engine-test", "private": true, "type": "module" }\n');
  writeFile(root, "site.config.ts", typeof config === "string" ? config : configSource(siteConfigFixture(config)));
  for (const [rel, content] of Object.entries(files)) writeFile(root, rel, content);
  return root;
}

export function cleanupProjects() {
  for (const root of created.splice(0)) rmSync(root, { recursive: true, force: true });
}
