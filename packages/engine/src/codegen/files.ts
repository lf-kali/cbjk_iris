// Escrita dos arquivos gerados pelo sync (SPEC §5.1.3 e §5.6). Regras:
// - todo arquivo gerado começa com GENERATED_HEADER. Arquivo sem o cabeçalho num caminho gerado é
//   erro e não é sobrescrito (P-5 = A): foi escrito à mão, e apagar é decisão do dono do projeto;
// - nenhuma gravação se houver erro no plano: com qualquer erro, nada é escrito nem apagado. Cada
//   arquivo é gravado de forma atômica, mas o conjunto não: uma falha de E/S no meio (disco cheio,
//   permissão) pode deixar parte dos arquivos atualizada. Rodar o sync de novo completa;
// - nenhum link simbólico entre a raiz e o arquivo (app/, app/(iris)/, ...): escrever através de um
//   link mudaria um arquivo fora do projeto. A própria raiz pode ser um link;
// - escrita atômica: arquivo temporário (flag wx) + rename; o temporário some se algo falhar;
// - só se apaga arquivo com o cabeçalho, e depois as pastas que ficarem vazias até pruneRoot.
import { randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Diagnostic, SyncResult } from "@cbjk_iris/schema";

export const GENERATED_HEADER = "// Gerado por iris sync. Não edite à mão.";

export interface SyncPlan {
  /** caminho relativo à raiz (com "/") → conteúdo esperado */
  files: Map<string, string>;
  /** arquivos gerados que não devem mais existir (módulo desligado) */
  remove: string[];
  diagnostics: Diagnostic[];
  /** pasta até onde as pastas vazias são apagadas depois de um remove */
  pruneRoot?: string;
}

export function emptyPlan(diagnostics: Diagnostic[] = []): SyncPlan {
  return { files: new Map(), remove: [], diagnostics };
}

export function mergePlans(plans: SyncPlan[]): SyncPlan {
  return {
    files: new Map(plans.flatMap((p) => [...p.files])),
    remove: plans.flatMap((p) => p.remove),
    diagnostics: plans.flatMap((p) => p.diagnostics),
    pruneRoot: plans.find((p) => p.pruneRoot)?.pruneRoot,
  };
}

type Inspection = { kind: "missing" } | { kind: "file"; text: string } | { kind: "problem"; diagnostic: Diagnostic };

function lstatOrNull(abs: string) {
  try {
    return lstatSync(abs);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

const errorAt = (file: string, message: string, hint?: string): Diagnostic => ({
  level: "error",
  file,
  message,
  ...(hint ? { hint } : {}),
});
const problem = (file: string, message: string): Inspection => ({ kind: "problem", diagnostic: errorAt(file, message) });

/** Confere cada pasta entre a raiz e o arquivo, e o próprio arquivo, sem seguir link simbólico. */
function inspect(root: string, rel: string): Inspection {
  const parts = rel.split("/");
  for (let i = 1; i < parts.length; i++) {
    const dirRel = parts.slice(0, i).join("/");
    const stat = lstatOrNull(path.join(root, dirRel));
    if (!stat) return { kind: "missing" };
    if (stat.isSymbolicLink()) return problem(dirRel, "link simbólico não é aceito no caminho dos arquivos gerados: use uma pasta de verdade");
    if (!stat.isDirectory()) return problem(dirRel, "precisa ser uma pasta");
  }
  const stat = lstatOrNull(path.join(root, rel));
  if (!stat) return { kind: "missing" };
  if (stat.isSymbolicLink()) return problem(rel, "link simbólico não é aceito no lugar de um arquivo gerado");
  if (!stat.isFile()) return problem(rel, "precisa ser um arquivo comum");
  return { kind: "file", text: readFileSync(path.join(root, rel), "utf8") };
}

const isGenerated = (text: string) => text.startsWith(`${GENERATED_HEADER}\n`);

const HAND_WRITTEN = `arquivo sem o cabeçalho "${GENERATED_HEADER.slice(3)}": parece escrito à mão e não será sobrescrito`;
const HAND_WRITTEN_HINT = "apague o arquivo (ou mova o conteúdo para outro lugar) e rode npm run sync de novo";

function writeAtomic(abs: string, content: string) {
  mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    writeFileSync(tmp, content, { flag: "wx" });
    renameSync(tmp, abs);
  } catch (error) {
    try {
      unlinkSync(tmp);
    } catch {
      // o temporário pode nem ter sido criado
    }
    throw error;
  }
}

function prune(root: string, rel: string, pruneRoot: string | undefined) {
  if (!pruneRoot) return;
  let dir = path.posix.dirname(rel);
  while (dir.startsWith(`${pruneRoot}/`)) {
    const abs = path.join(root, dir);
    if (readdirSync(abs).length) return;
    rmdirSync(abs);
    dir = path.posix.dirname(dir);
  }
}

// Um link simbólico em app/(iris) aparece uma vez por rota que passa por ele: basta um diagnóstico.
function unique(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((d) => {
    const key = JSON.stringify([d.level, d.file, d.path ?? "", d.message]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Compara o plano com o disco e, sem check e sem erro, aplica. */
export function applyPlan(rootInput: string, plan: SyncPlan, check: boolean): SyncResult {
  const root = path.resolve(/* turbopackIgnore: true */ rootInput);
  const diagnostics = [...plan.diagnostics];
  const writes: [string, string][] = [];
  const deletes: string[] = [];

  for (const [rel, content] of plan.files) {
    const found = inspect(root, rel);
    if (found.kind === "problem") diagnostics.push(found.diagnostic);
    else if (found.kind === "missing") writes.push([rel, content]);
    else if (!isGenerated(found.text)) diagnostics.push(errorAt(rel, HAND_WRITTEN, HAND_WRITTEN_HINT));
    else if (found.text !== content) writes.push([rel, content]);
  }
  for (const rel of plan.remove) {
    const found = inspect(root, rel);
    if (found.kind === "problem") diagnostics.push(found.diagnostic);
    else if (found.kind === "file" && isGenerated(found.text)) deletes.push(rel);
    else if (found.kind === "file") {
      diagnostics.push({ level: "warning", file: rel, message: "rota de módulo desligado escrita à mão: não foi apagada" });
    }
  }

  const pending = [...writes.map(([rel]) => rel), ...deletes];
  const hasError = diagnostics.some((d) => d.level === "error");
  // com --check, changed = o que mudaria; sem --check, o que mudou (nada, se houve erro)
  const changed = check || !hasError ? pending : [];
  if (!check && !hasError) {
    for (const [rel, content] of writes) writeAtomic(path.join(root, rel), content);
    for (const rel of deletes) {
      unlinkSync(path.join(root, rel));
      prune(root, rel, plan.pruneRoot);
    }
  }
  return { changed, upToDate: pending.length === 0 && !hasError, diagnostics: unique(diagnostics) };
}
