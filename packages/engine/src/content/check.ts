// CheckContent (SPEC §5.6): o "iris check". Valida o site.config.ts e todo o content/ de uma vez, e
// devolve todos os problemas como Diagnostic, sem lançar e sem escrever.
// Fica fora do index de content/: carrega o config num processo filho (child_process), e o core
// importa ./content em server components (R-1). Exportado só pela raiz do engine.
import { lstatSync } from "node:fs";
import path from "node:path";
import { MODULE_IDS, MODULES, type CheckContent, type Diagnostic, type ModuleId } from "@cbjk_iris/schema";
import { configDiagnostics } from "../project/errors";
import { loadSiteConfigSync } from "../project/load-config";
import { ContentError } from "./errors";
import { collectHome, collectPages, collectProducts, collectServices } from "./loaders";
import { contentContext } from "./read";

function exists(abs: string): boolean {
  try {
    lstatSync(abs);
    return true;
  } catch {
    return false;
  }
}

// Conteúdo de módulo desligado não quebra nada (é ignorado), mas costuma ser engano.
function disabledModuleDirs(root: string, modules: readonly ModuleId[]): Diagnostic[] {
  return MODULES.filter((m) => !modules.includes(m.id) && exists(path.join(root, m.contentDir))).map((m) => ({
    level: "warning",
    file: m.contentDir,
    message: m.contentDir.startsWith("public/")
      ? `o módulo "${m.id}" está desligado: esta pasta não é usada pelo site enquanto o módulo estiver desligado (os arquivos em public/ continuam acessíveis pela URL). Ligue o módulo ou apague a pasta.`
      : `o módulo "${m.id}" está desligado: esta pasta não é usada pelo site enquanto o módulo estiver desligado. Ligue o módulo ou apague a pasta.`,
    hint: `iris module add ${m.id}`,
  }));
}

function contentDiagnostics(root: string, modules: readonly ModuleId[]): Diagnostic[] {
  let ctx;
  try {
    ctx = contentContext(root);
  } catch (error) {
    if (error instanceof ContentError) return error.diagnostics;
    throw error;
  }
  return [
    ...collectHome(ctx, modules).diagnostics,
    ...collectPages(ctx, modules).diagnostics,
    ...collectProducts(ctx).diagnostics,
    ...collectServices(ctx).diagnostics,
  ];
}

export const checkContent: CheckContent = (root) => {
  const abs = path.resolve(/* turbopackIgnore: true */ root);
  let config: { modules: readonly ModuleId[] } | null = null;
  let configProblems: Diagnostic[] = [];
  try {
    config = loadSiteConfigSync(abs);
  } catch (error) {
    configProblems = configDiagnostics(error);
  }
  // Sem config válido, o conteúdo ainda é conferido; a checagem de módulo desligado fica de fora
  // (todos contam como ligados), porque não dá para saber quais estão ativos.
  const modules = config?.modules ?? MODULE_IDS;
  return [
    ...configProblems,
    ...contentDiagnostics(abs, modules),
    ...(config ? disabledModuleDirs(abs, modules) : []),
  ];
};
