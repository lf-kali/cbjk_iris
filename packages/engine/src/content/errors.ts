// Erro dos loaders de content/ (SPEC §5.3). Junta todos os problemas encontrados numa leitura,
// no formato das mensagens do build e da CLI:
//   content/pages/sobre.json → sections[2].items[0].answer: <mensagem>
// Limites contra amplificação (o zod ecoa o nome de chave desconhecida, que pode ter megabytes):
// cada mensagem e cada caminho com até MAX_DIAGNOSTIC_LENGTH caracteres, e a mensagem do erro lista
// até MAX_LISTED_DIAGNOSTICS linhas. `diagnostics` guarda todos (cada um já truncado), para a CLI
// (--json, iris check) mostrar a lista inteira; o custo fica limitado pelo número de arquivos.
import type { Diagnostic } from "@cbjk_iris/schema";

export const MAX_DIAGNOSTIC_LENGTH = 200;
export const MAX_LISTED_DIAGNOSTICS = 50;

function truncate(text: string): string {
  return text.length > MAX_DIAGNOSTIC_LENGTH ? `${text.slice(0, MAX_DIAGNOSTIC_LENGTH)}…` : text;
}

/** Uma linha da mensagem: "arquivo → caminho: mensagem", ou "arquivo: mensagem" sem caminho. */
export function formatDiagnostic(d: Diagnostic): string {
  return d.path ? `${d.file} → ${d.path}: ${d.message}` : `${d.file}: ${d.message}`;
}

export class ContentError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    const listed = diagnostics.slice(0, MAX_LISTED_DIAGNOSTICS).map(formatDiagnostic);
    const rest = diagnostics.length - listed.length;
    super(`content/ tem erros:\n${listed.join("\n")}${rest > 0 ? `\n… e mais ${rest} erros` : ""}`);
    this.name = "ContentError";
    this.diagnostics = diagnostics;
  }
}

export function contentDiagnostic(file: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic {
  const d: Diagnostic = { level: "error", file, ...extra, message: truncate(message) };
  if (d.path !== undefined) d.path = truncate(d.path);
  return d;
}
