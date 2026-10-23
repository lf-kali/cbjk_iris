// node scripts/check-tarballs.mjs --npm <binário-do-npm> --repo <checkout> <pasta-do-artefato> <pacote>...
// (job "publish" do release.yml)
//
// Confere o artefato do job "pack" contra a lista fixa de pacotes (scripts/lib/tarball-check.mjs):
// - cada tarball é lido com o tar e o pacote do MESMO npm que vai publicar (--npm, 11.5.1 ou mais novo);
// - o manifesto tem de ser igual ao package.json do repositório no mesmo commit (--repo);
// - `<npm> publish <tgz> --dry-run --json` tem de mostrar o mesmo name, version e arquivos. Esse dry-run
//   roda com um ambiente mínimo, sem as variáveis de CI e de OIDC: o npm só tenta a troca do token OIDC
//   quando detecta GitHub Actions, GitLab ou CircleCI (lib/utils/oidc.js), e aqui não detecta nenhum.
// Imprime "<tarball> <nome>@<versão> <sha256>" por pacote, na ordem do order.txt. Sai com 1 se qualquer
// coisa estiver errada, antes de qualquer consulta ao registro ou publicação.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { atLeast, findNpmDir, loadNpmModules } from "./lib/npm-modules.mjs";
import { checkArtifact } from "./lib/tarball-check.mjs";

const MIN_NPM = "11.5.1";
const args = process.argv.slice(2);
if (args[0] !== "--npm" || !args[1] || args[2] !== "--repo" || !args[3] || !args[4] || args.length < 6) {
  console.error("check-tarballs: uso: node scripts/check-tarballs.mjs --npm <binário> --repo <checkout> <pasta> <pacote>...");
  process.exit(1);
}
const [, npmBin, , repoDir, artifactDir, ...expected] = args;

/** package.json de packages/* do checkout, por nome. */
function repoManifests(root) {
  const base = path.join(path.resolve(root), "packages");
  const map = new Map();
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    const file = path.join(base, entry.name, "package.json");
    if (!entry.isDirectory() || !existsSync(file)) continue;
    const json = JSON.parse(readFileSync(file, "utf8"));
    map.set(json.name, json);
  }
  return map;
}

const workdir = mkdtempSync(path.join(os.tmpdir(), "iris-check-tarballs-"));
try {
  // ambiente mínimo para o npm da conferência: nada de GITHUB_ACTIONS, ACTIONS_ID_TOKEN_REQUEST_*,
  // NPM_ID_TOKEN, NPM_CONFIG_* herdados; config de usuário e global vazias; cache descartável
  // dois arquivos: o npm recusa o mesmo arquivo como config de usuário e global
  const userRc = path.join(workdir, "npmrc-usuario-vazio");
  const globalRc = path.join(workdir, "npmrc-global-vazio");
  writeFileSync(userRc, "");
  writeFileSync(globalRc, "");
  const env = {
    PATH: process.env.PATH ?? "",
    HOME: workdir,
    TMPDIR: workdir,
    LANG: "C",
    NPM_CONFIG_USERCONFIG: userRc,
    NPM_CONFIG_GLOBALCONFIG: globalRc,
    NPM_CONFIG_CACHE: path.join(workdir, "npm-cache"),
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
  };
  const npmRun = (npmArgs) => execFileSync(npmBin, npmArgs, { cwd: workdir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });

  // a versão do package.json do npm e a do binário têm de ser a mesma, e bastar para trusted publishing
  // (antes de carregar qualquer módulo de dentro dele)
  const npmDir = findNpmDir(npmBin);
  const dirVersion = JSON.parse(readFileSync(path.join(npmDir, "package.json"), "utf8")).version;
  const reported = npmRun(["--version"]).trim();
  if (reported !== dirVersion) throw new Error(`o binário diz npm ${reported}, mas a pasta é do npm ${dirVersion}`);
  if (!atLeast(reported, MIN_NPM)) throw new Error(`npm ${reported}: trusted publishing exige ${MIN_NPM} ou mais novo`);
  const npm = loadNpmModules(npmDir);

  const dryRun = async (file) => npmRun(["publish", file, "--dry-run", "--json", "--access", "public", "--ignore-scripts"]);
  const { items } = await checkArtifact({ ...npm, cache: path.join(workdir, "cache"), dryRun }, artifactDir, expected, repoManifests(repoDir));
  for (const item of items) console.log(`${item.tarball} ${item.name}@${item.version} ${item.sha256}`);
} catch (error) {
  console.error(`check-tarballs: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
