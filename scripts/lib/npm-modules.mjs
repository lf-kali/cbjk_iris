// Carrega o node-tar e o pacote de dentro do npm que vai publicar (job "publish" do release.yml).
// Assim a conferência lê o tarball com o mesmo código que o npm publish usa, e não com um leitor
// próprio (rodada 5 da E7: o leitor próprio divergia do node-tar). Falha fechado: sem a pasta do
// npm, ou com um módulo resolvido fora do node_modules dela, nada segue.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/** Pasta do pacote npm a partir do binário (o link em bin/ aponta para .../npm/bin/npm-cli.js). */
export function findNpmDir(npmBin) {
  if (typeof npmBin !== "string" || npmBin === "") throw new Error("binário do npm não informado");
  let dir;
  try {
    dir = path.dirname(realpathSync(npmBin));
  } catch {
    throw new Error(`binário do npm não encontrado: ${npmBin}`);
  }
  for (let i = 0; i < 4; i += 1) {
    const pkg = path.join(dir, "package.json");
    if (existsSync(pkg)) {
      let name;
      try {
        ({ name } = JSON.parse(readFileSync(pkg, "utf8")));
      } catch {
        name = undefined;
      }
      if (name === "npm") return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`não achei a pasta do npm a partir de ${npmBin}`);
}

/** true se a versão X.Y.Z for igual ou maior que a mínima (trusted publishing: npm 11.5.1). */
export function atLeast(version, minimum) {
  const parse = (v) => (/^\d+\.\d+\.\d+/.test(String(v)) ? String(v).split(".").slice(0, 3).map((n) => parseInt(n, 10)) : null);
  const a = parse(version);
  const b = parse(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

/** tar e pacote do node_modules do próprio npm. */
export function loadNpmModules(npmDir) {
  const own = path.join(npmDir, "node_modules") + path.sep;
  const req = createRequire(path.join(npmDir, "package.json"));
  const load = (name) => {
    let resolved;
    try {
      resolved = req.resolve(name);
    } catch {
      throw new Error(`o npm em ${npmDir} não tem o módulo ${name}`);
    }
    if (!resolved.startsWith(own)) throw new Error(`o módulo ${name} veio de fora do npm (${resolved})`);
    return { mod: req(name), resolved };
  };
  const tar = load("tar");
  const pacote = load("pacote");
  const { version } = JSON.parse(readFileSync(path.join(npmDir, "package.json"), "utf8"));
  // o tar 7 (npm 11+) chama o callback de entrada de onReadEntry; o tar 6 (npm 10), de onentry
  const tarVersion = JSON.parse(readFileSync(path.join(own, "tar", "package.json"), "utf8")).version;
  return { tar: tar.mod, tarPath: tar.resolved, tarMajor: Number(String(tarVersion).split(".")[0]), pacote: pacote.mod, pacotePath: pacote.resolved, npmVersion: version };
}
