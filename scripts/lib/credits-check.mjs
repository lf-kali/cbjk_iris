// Conferência dos créditos das fotos de exemplo (SPEC §6.1, "Pronto quando"; plano da Frente 1, E8).
// Node puro, sem dependências: roda antes do npm ci, se preciso.
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

/** Pastas conferidas, relativas à raiz do repositório. */
export const PHOTO_DIRS = ["apps/site/public/home", "apps/site/public/products", "apps/site/public/services", "apps/site/public/ultimos_projetos"];

/** Limite por arquivo: 300 KB (SPEC §6.1.1, "até ~300KB por arquivo"). */
export const MAX_PHOTO_BYTES = 300 * 1024;

const IMAGE_EXT = /\.(?:jpe?g|png|webp|avif|gif|svg)$/i;
const SECTION = "## Fotos";
const COLUMNS = 5;

/** Linha `| a | b |` → ["a", "b"]. */
function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/**
 * Lê a tabela da seção "## Fotos" do CREDITS.md (até o próximo "## ").
 * Cada linha precisa de 5 colunas preenchidas, a primeira com o caminho entre crases.
 * @returns {{ files: string[], problems: string[] }}
 */
export function parsePhotoCredits(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === SECTION);
  if (start === -1) return { files: [], problems: [`CREDITS.md: falta a seção "${SECTION}"`] };

  const files = [];
  const problems = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith("## "); i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) continue;
    const row = cells(line);
    if (row[0] === "Arquivo" || row.every((c) => /^:?-+:?$/.test(c))) continue;
    const where = `CREDITS.md, linha ${i + 1}`;
    const match = /^`([^`]+)`$/.exec(row[0]);
    if (!match) {
      problems.push(`${where}: a primeira coluna precisa ser o caminho do arquivo entre crases`);
      continue;
    }
    if (row.length !== COLUMNS || row.some((c) => c === "")) {
      problems.push(`${where}: precisa de ${COLUMNS} colunas preenchidas (arquivo, título, autor, página e licença)`);
    }
    if (files.includes(match[1])) problems.push(`${where}: ${match[1]} repetido`);
    else files.push(match[1]);
  }
  return { files, problems };
}

/** Único arquivo dispensado de crédito: marca uma pasta vazia no git. */
const PLACEHOLDER = ".gitkeep";

/**
 * Arquivos de uma pasta, recursivo, com o caminho relativo à raiz em POSIX. Ocultos entram (um
 * `.foto.jpg` também é servido pelo public/); só o .gitkeep fica de fora. Link simbólico não é
 * seguido: aparece como arquivo e o fileProblems recusa.
 */
function walk(root, rel) {
  return readdirSync(path.join(root, rel), { withFileTypes: true })
    .filter((e) => e.name !== PLACEHOLDER)
    .flatMap((e) => {
      const child = `${rel}/${e.name}`;
      return e.isDirectory() ? walk(root, child) : [child];
    });
}

/** O caminho real (sem links no meio) é o próprio caminho dentro da raiz. */
function isRealPath(root, rel) {
  return realpathSync(path.join(root, rel)) === path.join(realpathSync(root), rel);
}

/** Pasta de fotos: ausente conta como vazia; link (nela ou numa pasta acima) é problema. */
function photoDir(root, rel) {
  if (!existsSync(path.join(root, rel))) return { files: [], problems: [] };
  if (!isRealPath(root, rel)) return { files: [], problems: [`${rel}: a pasta (ou uma pasta acima) é link simbólico`] };
  return { files: walk(root, rel), problems: [] };
}

function insidePhotoDirs(file) {
  const normal = path.posix.normalize(file);
  return normal === file && PHOTO_DIRS.some((d) => normal.startsWith(`${d}/`));
}

function fileProblems(root, file) {
  const stat = lstatSync(path.join(root, file));
  if (stat.isSymbolicLink()) return [`${file}: link simbólico (use o arquivo de verdade)`];
  if (!stat.isFile()) return [`${file}: não é um arquivo comum`];
  const problems = IMAGE_EXT.test(file) ? [] : [`${file}: não é imagem (extensões aceitas: jpg, jpeg, png, webp, avif, gif, svg)`];
  if (stat.size > MAX_PHOTO_BYTES) {
    problems.push(`${file}: ${stat.size} bytes, acima do limite de ${MAX_PHOTO_BYTES} bytes (300 KB)`);
  }
  return problems;
}

/** Linha do CREDITS.md: dentro das pastas de fotos, sem link no caminho e apontando para uma imagem. */
function creditProblems(root, file) {
  if (!insidePhotoDirs(file)) return [`${file}: fora das pastas de fotos (${PHOTO_DIRS.join(", ")})`];
  if (!existsSync(path.join(root, file))) return [`${file}: está no CREDITS.md, mas o arquivo não existe`];
  if (!isRealPath(root, file)) return [`${file}: o caminho passa por link simbólico`];
  if (!lstatSync(path.join(root, file)).isFile()) return [`${file}: está no CREDITS.md, mas não é um arquivo comum`];
  return IMAGE_EXT.test(file) ? [] : [`${file}: está no CREDITS.md, mas não é imagem`];
}

/**
 * Confere as 4 pastas de fotos contra o CREDITS.md da raiz. Todo arquivo dessas pastas (menos o
 * .gitkeep) precisa de crédito, ser imagem e ter até 300 KB.
 * @returns {{ photos: number, credits: number, problems: string[] }}
 */
export function checkCredits(root) {
  const creditsFile = path.join(root, "CREDITS.md");
  if (!existsSync(creditsFile)) return { photos: 0, credits: 0, problems: ["CREDITS.md não encontrado na raiz"] };

  const { files: credited, problems } = parsePhotoCredits(readFileSync(creditsFile, "utf8"));
  const dirs = PHOTO_DIRS.map((d) => photoDir(root, d));
  const all = dirs.flatMap((d) => d.files).sort();

  const dirProblems = dirs.flatMap((d) => d.problems);
  const fileIssues = all.flatMap((f) => fileProblems(root, f));
  const missing = all.filter((f) => !credited.includes(f)).map((f) => `${f}: sem crédito no CREDITS.md`);
  const orphan = credited.flatMap((f) => creditProblems(root, f));

  return { photos: all.length, credits: credited.length, problems: [...problems, ...dirProblems, ...fileIssues, ...missing, ...orphan] };
}
