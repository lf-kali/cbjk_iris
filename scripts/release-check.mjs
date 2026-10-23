// node scripts/release-check.mjs [--pack <pasta>]   (usado pelo .github/workflows/release.yml)
// Confere lockstep, changesets pendentes, dependências internas, access, license e repository dos
// pacotes publicáveis (scripts/lib/release-check.mjs). Sai com 1 se houver problema.
// Com --pack, roda npm pack de cada pacote na ordem de publicação e grava <pasta>/order.txt com um
// tarball por linha. Não publica nada: quem publica é o job "publish" do release.yml.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packFilename, publishOrder, releaseProblems } from "./lib/release-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// todos os workspaces da raiz ("packages/*", "apps/*"): os privados entram para a conferência de que
// nenhum pacote publicável depende deles. Pastas que começam com "." são cópias temporárias.
const { workspaces = [] } = readJson(path.join(ROOT, "package.json"));
const manifests = workspaces.flatMap((pattern) => {
  if (!/^[a-z0-9_-]+\/\*$/.test(pattern)) throw new Error(`release-check: padrão de workspace não suportado: ${pattern}`);
  const parent = pattern.slice(0, -2);
  if (!existsSync(path.join(ROOT, parent))) return [];
  return readdirSync(path.join(ROOT, parent), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && existsSync(path.join(ROOT, parent, entry.name, "package.json")))
    .map((entry) => ({
      dir: `${parent}/${entry.name}`,
      json: readJson(path.join(ROOT, parent, entry.name, "package.json")),
      bindingGyp: existsSync(path.join(ROOT, parent, entry.name, "binding.gyp")),
      // o npm sempre leva README* para o tarball e usa o conteúdo como readme
      readme: readdirSync(path.join(ROOT, parent, entry.name)).some((f) => /^readme(\.|$)/i.test(f)),
    }));
});
const { fixed = [] } = readJson(path.join(ROOT, ".changeset/config.json"));
const changesets = readdirSync(path.join(ROOT, ".changeset")).filter((name) => name.endsWith(".md") && name !== "README.md");

const problems = releaseProblems({ manifests, fixed, changesets });
if (problems.length > 0) {
  console.error("release-check: o lançamento não pode seguir:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const order = publishOrder(manifests);
console.log(`release-check: ${order.map((m) => `${m.json.name}@${m.json.version}`).join(", ")}`);

const packIndex = process.argv.indexOf("--pack");
if (packIndex !== -1) {
  const outArg = process.argv[packIndex + 1];
  if (!outArg) {
    console.error("release-check: --pack precisa da pasta de saída");
    process.exit(1);
  }
  const out = path.resolve(ROOT, outArg);
  mkdirSync(out, { recursive: true });
  const tarballs = order.map(({ dir }) => {
    const stdout = execFileSync("npm", ["pack", `./${dir}`, "--pack-destination", out, "--json"], { cwd: ROOT, encoding: "utf8" });
    const name = path.basename(packFilename(JSON.parse(stdout)));
    if (!existsSync(path.join(out, name))) throw new Error(`release-check: npm pack não gerou ${name}`);
    return name;
  });
  writeFileSync(path.join(out, "order.txt"), `${tarballs.join("\n")}\n`);
  console.log(`release-check: ${tarballs.length} tarball(s) em ${path.relative(ROOT, out)}: ${tarballs.join(", ")}`);
}
