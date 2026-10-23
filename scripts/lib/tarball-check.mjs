// Conferência dos tarballs no job "publish" do release.yml, antes de qualquer npm publish.
//
// O tarball é lido com o node-tar e o pacote do próprio npm que vai publicar (scripts/lib/npm-modules.mjs):
// - a lista de entradas sai do tar.t do npm (o mesmo parser que o pacote usa para extrair), e só passa
//   se todas forem arquivo comum ou pasta, dentro de package/, sem caminho repetido (sem diferenciar
//   maiúsculas) e sem binding.gyp;
// - o manifesto sai do pacote.manifest("file:<tgz>"), a mesma chamada do npm publish <tgz>.
// Rodada 5 da E7: o leitor de tar escrito à mão divergia do node-tar (bloco nulo isolado, pax repetido,
// pax + L, NUL no pax), e o npm publicava um package.json que a conferência não tinha visto.
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { LIFECYCLE_SCRIPTS } from "./lifecycle.mjs";
import { publishConfigProblems } from "./publish-config.mjs";

const STABLE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const TARBALL_NAME = /^[a-z0-9][a-z0-9._-]*\.tgz$/;
// eslint-disable-next-line no-control-regex
const BAD_CHARS = /[\u0000-\u001f\u007f\\]/;

/** Caminho sem o "package/" (o npm tira o 1º componente), ou null para a própria pasta package/. */
function strippedPath(raw, type) {
  const clean = type === "Directory" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
  const parts = clean.split("/");
  if (clean === "" || clean.startsWith("/") || BAD_CHARS.test(clean) || parts.some((p) => p === "" || p === "." || p === "..")) {
    throw new Error(`caminho inválido no tarball: ${JSON.stringify(raw)}`);
  }
  if (parts[0] !== "package") throw new Error(`entrada fora de package/: ${JSON.stringify(raw)}`);
  if (parts.length === 1) {
    if (type !== "Directory") throw new Error(`entrada fora de package/: ${JSON.stringify(raw)}`);
    return null;
  }
  return parts.slice(1).join("/");
}

/**
 * Lê um .tgz com o tar e o pacote do npm. Devolve o manifesto que o npm publicaria e a lista de
 * arquivos (sem o package/). Rejeita o que o npm trataria de outro jeito que a conferência.
 */
export async function inspectTarball({ tar, tarMajor, pacote }, file, cache) {
  const entries = [];
  const onEntry = (e) => {
    entries.push({ path: e.path, type: e.type });
    e.resume();
  };
  try {
    await tar.t({ file, strict: true, [tarMajor >= 7 ? "onReadEntry" : "onentry"]: onEntry });
  } catch (error) {
    throw new Error(`tar inválido (${error.message})`);
  }

  const seen = new Set();
  const files = [];
  for (const { path: raw, type } of entries) {
    if (type !== "File" && type !== "Directory") throw new Error(`tipo de entrada não permitido (${type}): ${JSON.stringify(raw)}`);
    const rel = strippedPath(raw, type);
    if (rel === null) continue;
    const key = rel.normalize("NFC").toLowerCase();
    if (seen.has(key)) throw new Error(`caminho duplicado no tarball: ${JSON.stringify(raw)}`);
    seen.add(key);
    if (key === "binding.gyp") throw new Error("binding.gyp no tarball: o npm rodaria node-gyp rebuild no cliente");
    if (type === "File") files.push(rel);
  }
  if (!files.includes("package.json")) throw new Error("tarball sem package/package.json");

  let manifest;
  try {
    manifest = await pacote.manifest(`file:${file}`, { cache, fullMetadata: true, fullReadJson: true });
  } catch (error) {
    throw new Error(`o npm não leu o manifesto (${error.message})`);
  }
  return { manifest, files };
}

/** Problemas no manifesto lido pelo npm: lista fixa de nomes, versão X.Y.Z, sem desvio de publicação. */
export function manifestProblems(json, expected) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return ["package.json não é um objeto"];
  const problems = [];
  if (typeof json.name !== "string" || !expected.includes(json.name)) problems.push(`name fora da lista: ${JSON.stringify(json.name)}`);
  if (typeof json.version !== "string" || !STABLE.test(json.version) || json.version === "0.0.0") {
    problems.push(`version inválida (só X.Y.Z, nunca 0.0.0): ${JSON.stringify(json.version)}`);
  }
  // lista de permissão: o npm publish passa o publishConfig inteiro para a config (rodada 6)
  problems.push(...publishConfigProblems(json.publishConfig));
  for (const script of LIFECYCLE_SCRIPTS) {
    if (json.scripts && typeof json.scripts === "object" && Object.hasOwn(json.scripts, script)) problems.push(`scripts.${script} não é permitido`);
  }
  return problems;
}

// O que o pacote.manifest acrescenta ao package.json, medido nos 5 pacotes reais com o npm 11.19.1 e o
// 12.0.1: _id, _integrity, _resolved e _from (o pacote grava esses quatro por cima de qualquer valor
// vindo do tarball, menos o _id, que é conferido), e readme, bugs e homepage, derivados.
const NPM_ADDED = new Set(["_integrity", "_resolved", "_from"]);
const NO_README = "ERROR: No README data found!";
const GITHUB_URL = /^git\+https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/;

/**
 * Valor que o npm derivaria para uma chave ausente do package.json do repositório, ou undefined se o
 * npm não acrescentaria a chave. readme: o npm usa o conteúdo do README do pacote; os pacotes do Iris
 * não têm README próprio, então só o texto de ausência passa (um README novo faz a conferência falhar
 * fechado até esta regra ser revista). bugs e homepage: só para repository.url do GitHub.
 */
function derived(key, manifest, repoJson) {
  if (key === "_id") return `${repoJson.name}@${repoJson.version}`;
  if (key === "readme") return NO_README;
  const match = typeof repoJson.repository?.url === "string" ? GITHUB_URL.exec(repoJson.repository.url) : null;
  if (!match) return undefined;
  const web = `https://github.com/${match[1]}/${match[2]}`;
  if (key === "bugs") return { url: `${web}/issues` };
  if (key === "homepage") return `${web}#readme`;
  return undefined;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/**
 * O manifesto que o npm lê do tarball tem de ser igual ao package.json do repositório no mesmo commit
 * (o job "pack" empacotou esse commit): toda chave de topo. Fora da comparação ficam só _integrity,
 * _resolved e _from (locais do pacote); _id, readme, bugs e homepage ausentes do repositório têm de
 * ter exatamente o valor que o npm derivaria.
 */
export function repoProblems(manifest, repoJson) {
  const keys = new Set([...Object.keys(repoJson), ...Object.keys(manifest)]);
  const problems = [];
  for (const key of keys) {
    if (NPM_ADDED.has(key)) continue;
    const expected = Object.hasOwn(repoJson, key) ? repoJson[key] : derived(key, manifest, repoJson);
    if (canonical(manifest[key]) !== canonical(expected)) problems.push(`campo ${key} diferente do package.json do repositório (o package.json publicável precisa estar na forma normalizada: ver normalizedFormProblems em scripts/lib/release-check.mjs)`);
  }
  return problems;
}

/**
 * Segunda conferência: a saída de `npm publish <tgz> --dry-run --json` (npm 11 e 12 imprimem
 * { "<nome>": { name, version, files: [{ path }] } }) tem de bater com o que foi lido. Entradas de
 * pasta (path "" ou terminado em "/") não contam.
 */
export function dryRunProblems(stdout, name, version, files) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [`saída inesperada do npm publish --dry-run: ${String(stdout).slice(0, 200)}`];
  }
  const values = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.values(parsed) : [];
  const info = values[0];
  if (values.length !== 1 || !info || typeof info !== "object" || !Array.isArray(info.files)) {
    return [`saída inesperada do npm publish --dry-run: ${JSON.stringify(parsed).slice(0, 200)}`];
  }
  const problems = [];
  if (info.name !== name) problems.push(`dry-run: name ${JSON.stringify(info.name)}, a conferência leu ${JSON.stringify(name)}`);
  if (info.version !== version) problems.push(`dry-run: version ${JSON.stringify(info.version)}, a conferência leu ${JSON.stringify(version)}`);
  const theirs = info.files.map((f) => f?.path).filter((p) => !(typeof p === "string" && (p === "" || p.endsWith("/")))).sort();
  const ours = [...files].sort();
  if (theirs.length !== ours.length || theirs.some((p, i) => p !== ours[i])) problems.push("dry-run: lista de arquivos diferente da que a conferência leu");
  return problems;
}

/**
 * Confere o artefato inteiro: só order.txt e tarballs, um tarball por pacote da lista fixa, na ordem do
 * order.txt, todos válidos, com a mesma versão, iguais ao package.json do repositório e confirmados
 * pelo dry-run. Devolve o sha256 de cada tarball (o release.yml confere de novo antes do publish).
 * Lança Error com o motivo.
 * @param {{ tar: any, pacote: any, cache?: string, dryRun: (file: string, item: { name: string, version: string }, files: string[]) => Promise<string> }} npm
 * @param {string} artifactDir
 * @param {string[]} expected
 * @param {Map<string, Record<string, unknown>>} repo  package.json do repositório, por nome
 */
export async function checkArtifact(npm, artifactDir, expected, repo) {
  // caminho absoluto: "pasta/x.tgz" relativo viraria atalho do GitHub para o npm (EALLOWGIT)
  const dir = path.resolve(artifactDir);
  const files = new Set();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || (entry.name !== "order.txt" && !entry.name.endsWith(".tgz"))) throw new Error(`arquivo inesperado no artefato: ${entry.name}`);
    files.add(entry.name);
  }
  if (!files.has("order.txt")) throw new Error("artefato sem order.txt");

  const order = [];
  for (const line of readFileSync(path.join(dir, "order.txt"), "utf8").split(/\r?\n/)) {
    if (line === "") continue;
    if (!TARBALL_NAME.test(line)) throw new Error(`nome inesperado em order.txt: ${JSON.stringify(line)}`);
    if (!files.has(line)) throw new Error(`tarball ausente: ${line}`);
    if (order.includes(line)) throw new Error(`tarball repetido em order.txt: ${line}`);
    order.push(line);
  }
  if (order.length !== expected.length) throw new Error(`order.txt tem ${order.length} tarball(s); esperava ${expected.length}`);
  const leftover = [...files].filter((f) => f !== "order.txt" && !order.includes(f));
  if (leftover.length > 0) throw new Error(`tarball fora do order.txt: ${leftover.join(", ")}`);

  const cache = npm.cache ?? mkdtempSync(path.join(os.tmpdir(), "iris-pacote-cache-"));
  try {
    const items = [];
    for (const tarball of order) {
      const file = path.join(dir, tarball);
      const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
      let read;
      try {
        read = await inspectTarball(npm, file, cache);
      } catch (error) {
        throw new Error(`${tarball}: ${error.message}`);
      }
      const { manifest } = read;
      const problems = manifestProblems(manifest, expected);
      if (problems.length > 0) throw new Error(`${tarball}: ${problems.join("; ")}`);
      if (items.some((item) => item.name === manifest.name)) throw new Error(`pacote repetido: ${manifest.name}`);
      if (items.length > 0 && items[0].version !== manifest.version) throw new Error(`versões diferentes: ${manifest.name}@${manifest.version} e ${items[0].version}`);
      const repoJson = repo.get(manifest.name);
      if (!repoJson) throw new Error(`${tarball}: ${manifest.name} sem package.json no repositório`);
      const diff = repoProblems(manifest, repoJson);
      if (diff.length > 0) throw new Error(`${tarball}: ${diff.join("; ")}`);
      const item = { tarball, name: manifest.name, version: manifest.version };
      const dry = dryRunProblems(await npm.dryRun(file, item, read.files), item.name, item.version, read.files);
      if (dry.length > 0) throw new Error(`${tarball}: ${dry.join("; ")}`);
      items.push({ ...item, sha256 });
    }
    return { version: items[0].version, items };
  } finally {
    if (!npm.cache) rmSync(cache, { recursive: true, force: true });
  }
}

/**
 * Estado de um pacote no registro, pela saída de `npm view <nome>@<versão> version --json`.
 * npm 11 imprime "x.y.z"; npm 12 imprime ["x.y.z"]; o erro vem como {"error":{"code":...}}.
 * Devolve "published" ou "missing" (E404); qualquer outra coisa é erro.
 */
export function viewState(stdout, exitCode, version) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`saída inesperada do npm view (código ${exitCode}): ${String(stdout).slice(0, 200)}`);
  }
  if (exitCode === 0) {
    if (parsed === version || (Array.isArray(parsed) && parsed.length === 1 && parsed[0] === version)) return "published";
    throw new Error(`saída inesperada do npm view: ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  const code = parsed?.error?.code;
  if (code === "E404") return "missing";
  if (typeof code === "string") throw new Error(`npm view falhou: ${code}`);
  throw new Error(`saída inesperada do npm view (código ${exitCode}): ${JSON.stringify(parsed).slice(0, 200)}`);
}
