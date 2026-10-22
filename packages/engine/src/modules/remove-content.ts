// RemoveModuleContent (SPEC §5.6): tira as seções de um módulo de content/home.json e de
// content/pages/*.json (o "iris module remove" chama antes de mudar siteConfig.modules). Não mexe em
// content/<módulo>/ nem no config. Regras:
// - leitura pelas mesmas regras dos loaders (read.ts): link simbólico, hard link, arquivo especial e
//   arquivo grande são recusados, sem ler o alvo;
// - lê e confere todos os arquivos antes de gravar o primeiro: com qualquer problema, ContentError e
//   nada gravado;
// - cada arquivo é gravado num temporário (flag wx) e trocado por rename; o temporário é apagado no
//   finally se o rename não aconteceu. O conjunto não é atômico: uma falha de E/S no meio pode deixar
//   parte dos arquivos atualizada (rodar de novo completa);
// - $schema e a ordem das chaves são mantidos; o JSON sai com 2 espaços e \n no fim;
// - arquivo com número que o JavaScript não representa com exatidão (1e400, 12345678901234567890) é
//   recusado: o JSON.stringify gravaria outro valor em silêncio;
// - a permissão (mode) do arquivo original é mantida;
// - gravar exige que content/ fique dentro da pasta do projeto: a leitura aceita content/ como link
//   simbólico (por desenho, §5.3), mas a escrita não segue o link para fora (dryRun continua aceito).
import { randomBytes } from "node:crypto";
import { chmodSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MODULE_IDS, sectionsOfModule, type Diagnostic, type FileChange, type RemoveModuleContent } from "@cbjk_iris/schema";
import { ContentError } from "../content/errors";
import { contentDiagnostic } from "../content/errors";
import { contentContext, listContentDir, readContentJson, relPath, type ContentContext } from "../content/read";
import { inexactNumbers } from "./json-numbers";

interface Edit {
  abs: string;
  rel: string;
  json: string;
  mode: number;
}

const INEXACT =
  "o arquivo tem números que o JavaScript não representa com exatidão, e regravá-lo mudaria o valor: edite à mão, tirando as seções do módulo";

function planEdit(ctx: ContentContext, abs: string, types: readonly string[], problems: Diagnostic[]): Edit | null {
  const read = readContentJson(ctx, abs);
  if (read.status === "missing") return null;
  if (read.status === "error") {
    problems.push(...read.diagnostics);
    return null;
  }
  const sections = read.raw.sections;
  if (!Array.isArray(sections)) return null;
  const kept = sections.filter((s) => !(s && typeof s === "object" && types.includes((s as { type?: unknown }).type as string)));
  if (kept.length === sections.length) return null;
  const rel = relPath(ctx, abs);
  const inexact = inexactNumbers(read.text);
  if (inexact.length) {
    problems.push(contentDiagnostic(rel, `${INEXACT} (${inexact.slice(0, 3).join(", ")})`));
    return null;
  }
  return { abs, rel, json: `${JSON.stringify({ ...read.raw, sections: kept }, null, 2)}\n`, mode: statSync(abs).mode & 0o777 }; // sem setuid, setgid e sticky
}

function writeAtomic(abs: string, content: string, mode: number) {
  const tmp = `${abs}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    writeFileSync(tmp, content, { flag: "wx", mode: 0o600 });
    chmodSync(tmp, mode); // a umask não interfere: a permissão final é a do arquivo original
    renameSync(tmp, abs);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        unlinkSync(tmp);
      } catch {
        // o temporário pode nem ter sido criado
      }
    }
  }
}

// content/ pode ser link (a leitura aceita); gravar através dele mudaria arquivos fora do projeto
function assertWritable(ctx: ContentContext) {
  const rootReal = realpathSync(ctx.root);
  if (!ctx.base.startsWith(rootReal + path.sep)) {
    throw new ContentError([
      contentDiagnostic("content", "content/ aponta para fora da pasta do projeto (link simbólico): o conteúdo não é alterado por aqui. Edite os arquivos no destino do link"),
    ]);
  }
}

export const removeModuleContent: RemoveModuleContent = (root, id, opts) => {
  if (!(MODULE_IDS as readonly string[]).includes(id)) {
    throw new Error(`Módulo desconhecido: ${JSON.stringify(id)}. Módulos: ${MODULE_IDS.join(", ")}`);
  }
  const ctx = contentContext(root);
  const types = sectionsOfModule(id);
  const pages = listContentDir(ctx, "pages");
  const problems: Diagnostic[] = [...pages.diagnostics];
  const files = [path.join(ctx.root, "content", "home.json"), ...pages.files.map((f) => f.abs)];
  const edits = files.flatMap((abs) => planEdit(ctx, abs, types, problems) ?? []);
  if (problems.length) throw new ContentError(problems);

  if (opts?.dryRun) return { changes: edits.map((e): FileChange => ({ path: e.rel, action: "update" })) };
  assertWritable(ctx);
  for (const edit of edits) writeAtomic(edit.abs, edit.json, edit.mode);
  return { changes: edits.map((e): FileChange => ({ path: e.rel, action: "update" })) };
};
