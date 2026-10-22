// Erros do carregamento do site.config.ts (SPEC §5.6, LoadSiteConfig).
// SiteConfigError (do schema) = o arquivo carregou, mas o config é inválido.
// SiteConfigLoadError = o arquivo nem chegou a ser lido como dados (ausente, sintaxe, exceção, valor que não é dado).
import { formatIssuePath, SiteConfigError, type Diagnostic } from "@cbjk_iris/schema";

export const CONFIG_FILE = "site.config.ts";

export class SiteConfigLoadError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    super(`${CONFIG_FILE} não pôde ser carregado:\n${diagnostics.map((d) => `  - ${d.path ? `${d.path}: ` : ""}${d.message}`).join("\n")}`);
    this.name = "SiteConfigLoadError";
    this.diagnostics = diagnostics;
  }
}

/** Converte SiteConfigError e SiteConfigLoadError em Diagnostic. Qualquer outro erro é bug e é relançado. */
export function configDiagnostics(error: unknown): Diagnostic[] {
  if (error instanceof SiteConfigLoadError) return error.diagnostics;
  if (error instanceof SiteConfigError) {
    return error.issues.map((issue) => ({
      level: "error",
      file: CONFIG_FILE,
      path: formatIssuePath(issue.path),
      message: issue.message,
    }));
  }
  throw error;
}
