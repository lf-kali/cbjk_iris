// LICENSE e NOTICE em cada pacote publicável (plano da Frente 1, §6; SPEC §5.8).
// O tarball só leva o que está na pasta do pacote, e os temas Apache-2.0 do engine exigem o NOTICE
// junto da redistribuição. Cada pacote publicável guarda uma cópia igual, byte a byte, à da raiz.
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const LEGAL_FILES = ["LICENSE", "NOTICE"];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/**
 * Pastas (relativas à raiz, com "/") dos workspaces publicáveis, em ordem alfabética. Mesma regra do
 * scripts/release-check.mjs: padrões "<pasta>/*" do `workspaces` da raiz, pasta que não começa com
 * ".", com package.json, e publicável quando `private` é falso (o npm publish recusa qualquer valor
 * verdadeiro).
 * @param {string} root
 * @returns {string[]}
 */
export function publishablePackageDirs(root) {
  const { workspaces = [] } = readJson(path.join(root, "package.json"));
  const dirs = workspaces.flatMap((pattern) => {
    if (!/^[a-z0-9_-]+\/\*$/.test(pattern)) throw new Error(`legal-files: padrão de workspace não suportado: ${pattern}`);
    const parent = pattern.slice(0, -2);
    if (!existsSync(path.join(root, parent))) return [];
    return readdirSync(path.join(root, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => `${parent}/${entry.name}`)
      .filter((dir) => existsSync(path.join(root, dir, "package.json")))
      .filter((dir) => !readJson(path.join(root, dir, "package.json")).private);
  });
  return [...dirs].sort();
}

/** Problema de um arquivo legal de um pacote, ou null. */
function fileProblem(root, dir, name) {
  const file = path.join(root, dir, name);
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    return `${dir}/${name}: ausente`;
  }
  if (!stat.isFile()) return `${dir}/${name}: precisa ser arquivo comum (o npm pack não segue link simbólico)`;
  if (!readFileSync(file).equals(readFileSync(path.join(root, name)))) return `${dir}/${name}: diferente do ${name} da raiz`;
  return null;
}

/**
 * Lista de problemas ("<pasta>/<arquivo>: <motivo>"); vazia quando todo pacote publicável tem
 * LICENSE e NOTICE iguais aos da raiz.
 * @param {string} root
 * @returns {string[]}
 */
export function legalFileProblems(root) {
  return publishablePackageDirs(root)
    .flatMap((dir) => LEGAL_FILES.map((name) => fileProblem(root, dir, name)))
    .filter((p) => p !== null);
}
