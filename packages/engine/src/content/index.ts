// @cbjk_iris/engine/content: loaders de content/ (SPEC §5.3).
// Só em código de servidor (server components, CLI): usam fs e zod.
export { ContentError, formatDiagnostic } from "./errors";
export { MAX_CONTENT_FILE_BYTES } from "./read";
export { loadHome, loadPage, loadPages, loadProducts, loadServices } from "./loaders";
export type { ContentOptions, LoadedPage, SectionContentOptions } from "./loaders";
