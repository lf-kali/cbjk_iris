// @cbjk_iris/engine/codegen: Sync, SyncBrand, SyncRegistry e SyncRoutes (SPEC §5.6), e a tabela de rotas
// geradas (§5.1.3). Só para Node (CLI e scripts): o core não importa este subpath.
export { sync, syncBrand, syncRegistry, syncRoutes } from "./sync";
export { ROUTE_PAGES, type RoutePage } from "./routes";
export { GENERATED_HEADER } from "./files";
