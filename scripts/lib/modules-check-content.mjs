// Edição dos JSON de conteúdo da cópia usada pelo npm run modules:check (scripts/check-modules.mjs).
// A cópia vem de um cpSync, que copia link simbólico como link: escrever através dele mudaria um arquivo
// fora de apps/.modules-check-*. Por isso todo link simbólico no caminho é erro, antes de ler ou gravar.
// Hard link e o que não é arquivo comum também são erro, e a gravação é por arquivo temporário +
// rename (troca a entrada da pasta, nunca escreve no inode de outro nome). No fluxo real a cópia vem
// do cpSync, que já desfaz hard links (nlink 2 no original vira 1 na cópia): é defesa em profundidade.
import { lstatSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

function lstatOrNull(p) {
  try {
    return lstatSync(p);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function assertNotLink(p, stat) {
  if (stat?.isSymbolicLink()) throw new Error(`modules:check: ${p} é um link simbólico; a cópia só edita arquivos de verdade`);
}

/** Tira as seções dos tipos pedidos de content/home.json e content/pages/*.json, mantendo o $schema. */
export function removeSectionsFromContent(dir, types) {
  for (const p of [path.join(dir, "content"), path.join(dir, "content/pages")]) assertNotLink(p, lstatOrNull(p));
  const pagesDir = path.join(dir, "content/pages");
  const pages = lstatOrNull(pagesDir)
    ? readdirSync(pagesDir).filter((f) => f.endsWith(".json")).map((f) => path.join(pagesDir, f))
    : [];
  for (const file of [path.join(dir, "content/home.json"), ...pages]) {
    const stat = lstatOrNull(file);
    if (!stat) continue;
    assertNotLink(file, stat);
    if (!stat.isFile()) throw new Error(`modules:check: ${file} precisa ser um arquivo comum`);
    if (stat.nlink > 1) throw new Error(`modules:check: ${file} tem mais de um nome (hard link); a cópia só edita arquivos próprios`);
    const data = JSON.parse(readFileSync(file, "utf8"));
    data.sections = data.sections.filter((section) => !types.includes(section.type));
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
    renameSync(tmp, file);
  }
}
