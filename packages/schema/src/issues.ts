// Formatação de caminhos de erro, no formato das mensagens do build e da CLI:
// content/pages/sobre.json → sections[2].items[0].answer: ...

export function formatIssuePath(path: readonly PropertyKey[]): string {
  if (!path.length) return "(raiz)";
  return path
    .map((key, i) => (typeof key === "number" ? `[${key}]` : `${i === 0 ? "" : "."}${String(key)}`))
    .join("");
}
