// Conferências do release.yml antes de empacotar (SPEC §6.1 passo 8; Q-11: os cinco pacotes em
// lockstep, com changesets). Funções puras, separadas para teste; a leitura do disco e o npm pack
// ficam em scripts/release-check.mjs.

import semver from "semver";
import { LIFECYCLE_SCRIPTS } from "./lifecycle.mjs";
import { publishConfigProblems } from "./publish-config.mjs";

// O npm compara o repositório da provenance (o que rodou o workflow) com o repository.url do pacote.
export const REPOSITORY_URL = "git+https://github.com/lf-kali/cbjk_iris.git";

const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DEP_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

// a mesma lista vale na conferência do package.json de cada tarball (scripts/lib/tarball-check.mjs)
export { LIFECYCLE_SCRIPTS } from "./lifecycle.mjs";

// nome de pacote do npm (com ou sem escopo), para o alvo de um alias
const PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;

/**
 * Lista branca de range de dependência externa: só range do registro (semver.validRange), ou alias
 * "npm:<nome>@<range>" para outro pacote do registro. Caminho local, git, URL, atalho do GitHub
 * ("user/repo") e dist-tag ("latest") são recusados. Devolve o motivo da recusa, ou null.
 */
export function rangeProblem(range, privateNames) {
  if (typeof range !== "string") return "não é texto";
  const trimmed = range.trim();
  if (/^npm:/i.test(trimmed)) {
    const spec = trimmed.slice(4).trim();
    const at = spec.indexOf("@", spec.startsWith("@") ? 1 : 0);
    const target = at === -1 ? spec : spec.slice(0, at);
    const sub = at === -1 ? "*" : spec.slice(at + 1);
    if (privateNames.includes(target)) return "aponta para um workspace privado, que não existe no registro";
    if (!PACKAGE_NAME.test(target)) return `alias para nome de pacote inválido ("${target}")`;
    if (semver.validRange(sub) === null) return `alias com range fora do registro ("${sub}")`;
    return null;
  }
  if (semver.validRange(trimmed) === null) return "não é range do registro (caminho local, git, URL, atalho do GitHub ou dist-tag)";
  return null;
}

const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/**
 * Forma normalizada do package.json publicável. No job "publish", a conferência exige que o manifesto
 * lido pelo pacote.manifest do npm seja igual ao package.json do repositório (repoProblems em
 * scripts/lib/tarball-check.mjs), e o npm reescreve as formas abreviadas: description vinda do README,
 * repository/author/contributors/maintainers em texto, bin em texto, man em texto, directories.bin.
 * Recusar aqui faz o erro aparecer no job "pack", com a correção, e não no "publish".
 */
function normalizedFormProblems(json, readme) {
  const problems = [];
  if (typeof json.description !== "string" || json.description.trim() === "") {
    problems.push('description precisa ser texto não vazio (sem ela o npm usa o README, e a conferência do release.yml falha)');
  }
  if (json.author !== undefined && !isObject(json.author)) problems.push('author precisa ser objeto ({ "name": ..., "email": ... }), não texto');
  for (const key of ["contributors", "maintainers"]) {
    if (json[key] !== undefined && !(Array.isArray(json[key]) && json[key].every(isObject))) problems.push(`${key} precisa ser lista de objetos, não texto`);
  }
  if (json.bin !== undefined && !isObject(json.bin)) problems.push('bin precisa ser objeto ({ "<comando>": "<arquivo>" }), não texto');
  if (json.man !== undefined && !Array.isArray(json.man)) problems.push("man precisa ser lista, não texto");
  if (isObject(json.directories) && Object.hasOwn(json.directories, "bin")) problems.push("directories.bin não é permitido (o npm o transforma em bin); declare bin como objeto");
  if (readme) problems.push("README na pasta do pacote: o npm publicaria o conteúdo como readme, e a conferência do release.yml só aceita pacote sem README (revisar repoProblems antes)");
  return problems;
}

const publishable = (manifests) => manifests.filter((m) => !m.json.private);

function sameSet(a, b) {
  return a.length === b.length && [...a].sort().every((name, i) => name === [...b].sort()[i]);
}

/**
 * Lista o que impede o lançamento.
 * @param {{ manifests: { dir: string, json: Record<string, any>, bindingGyp?: boolean }[], fixed: string[][], changesets: string[] }} input
 *   manifests: package.json de cada workspace (dir relativo à raiz, com "/"; bindingGyp: a pasta tem binding.gyp);
 *   fixed: o campo "fixed" do .changeset/config.json;
 *   changesets: arquivos .md pendentes em .changeset/ (sem o README.md).
 */
export function releaseProblems({ manifests, fixed, changesets }) {
  const pkgs = publishable(manifests);
  if (pkgs.length === 0) return ["nenhum pacote publicável encontrado em packages/*"];

  const problems = [];
  const names = pkgs.map((m) => m.json.name);
  if (fixed.length !== 1 || !sameSet(fixed[0], names)) {
    problems.push(`o "fixed" do .changeset/config.json precisa ser um grupo só, com os pacotes publicáveis: ${names.join(", ")}`);
  }
  if (changesets.length > 0) {
    problems.push(`há changesets pendentes (${changesets.join(", ")}): rode npx changeset version, revise e faça o merge no main antes do lançamento`);
  }

  const versions = [...new Set(pkgs.map((m) => m.json.version))];
  if (versions.length !== 1) {
    problems.push(`os pacotes publicáveis precisam ter a mesma versão (lockstep); achei ${pkgs.map((m) => `${m.json.name}@${m.json.version}`).join(", ")}`);
  }
  const version = versions[0];
  if (versions.length === 1 && !STABLE.test(version ?? "")) {
    problems.push(`versão "${version}" fora do formato X.Y.Z (pré-lançamento exige --tag, que este workflow não usa)`);
  } else if (version === "0.0.0") {
    problems.push("a versão 0.0.0 não sai por este workflow: ela é a publicação manual do primeiro lançamento (OPEN-QUESTIONS, Ações do dono)");
  }

  const privateNames = manifests.filter((m) => m.json.private).map((m) => m.json.name);
  for (const { dir, json, bindingGyp, readme } of pkgs) {
    for (const problem of normalizedFormProblems(json, readme)) problems.push(`${json.name}: ${problem}`);
    // sem script install, o npm roda "node-gyp rebuild" no cliente quando o pacote tem binding.gyp
    if (bindingGyp) problems.push(`${json.name}: binding.gyp não é permitido (o npm compilaria código nativo no cliente)`);
    // lista de permissão: só { access: public } (qualquer chave vira config do npm publish)
    for (const problem of publishConfigProblems(json.publishConfig)) problems.push(`${json.name}: ${problem}`);
    for (const script of LIFECYCLE_SCRIPTS) {
      if (json.scripts && Object.hasOwn(json.scripts, script)) {
        problems.push(`${json.name}: scripts.${script} não é permitido (rodaria na instalação do cliente ou no npm pack do release)`);
      }
    }
    for (const key of ["bundledDependencies", "bundleDependencies"]) {
      if (Object.hasOwn(json, key)) problems.push(`${json.name}: ${key} não é permitido (levaria código de terceiros dentro do tarball)`);
    }
    if (json.license !== "MIT") problems.push(`${json.name}: "license" precisa ser "MIT"`);
    if (json.repository?.url !== REPOSITORY_URL) problems.push(`${json.name}: repository.url precisa ser "${REPOSITORY_URL}"`);
    if (json.repository?.directory !== dir) problems.push(`${json.name}: repository.directory precisa ser "${dir}"`);
    for (const field of DEP_FIELDS) {
      for (const [dep, range] of Object.entries(json[field] ?? {})) {
        // interna: só a versão exata do lançamento
        if (names.includes(dep)) {
          if (range !== version) problems.push(`${json.name}: ${field}["${dep}"] é "${range}", mas precisa ser exatamente "${version}"`);
          continue;
        }
        if (privateNames.includes(dep)) {
          problems.push(`${json.name}: ${field}["${dep}"] aponta para um workspace privado, que não existe no registro`);
          continue;
        }
        const problem = rangeProblem(range, privateNames);
        if (problem) problems.push(`${json.name}: ${field}["${dep}"] = ${JSON.stringify(range)} não é permitido: ${problem}`);
      }
    }
  }
  return problems;
}

/**
 * Nome do tarball na saída de `npm pack --json` de um pacote só. O npm 10 e o 11 devolvem um array
 * ([{ filename }]); o npm 12 devolve um objeto por nome de pacote ({ "<nome>": { filename } }).
 */
export function packFilename(json) {
  const entries = Array.isArray(json) ? json : json && typeof json === "object" ? Object.values(json) : [];
  if (entries.length !== 1 || typeof entries[0]?.filename !== "string" || entries[0].filename === "") {
    throw new Error(`release-check: saída inesperada do npm pack --json: ${JSON.stringify(json)?.slice(0, 200)}`);
  }
  return entries[0].filename;
}

/** Ordem de publicação: cada pacote depois das dependências internas dele; empate por nome. */
export function publishOrder(manifests) {
  const pkgs = publishable(manifests);
  const byName = new Map(pkgs.map((m) => [m.json.name, m]));
  const internalDeps = (m) => DEP_FIELDS.flatMap((field) => Object.keys(m.json[field] ?? {})).filter((dep) => byName.has(dep));

  const order = [];
  const done = new Set();
  let pending = [...pkgs].sort((a, b) => a.json.name.localeCompare(b.json.name));
  while (pending.length > 0) {
    const ready = pending.filter((m) => internalDeps(m).every((dep) => done.has(dep)));
    if (ready.length === 0) throw new Error(`ciclo entre dependências internas: ${pending.map((m) => m.json.name).join(", ")}`);
    const next = ready[0];
    order.push(next);
    done.add(next.json.name);
    pending = pending.filter((m) => m !== next);
  }
  return order;
}
