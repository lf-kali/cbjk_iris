// @cbjk_iris/engine: lógica de Node do Iris (SPEC §5.1 e §5.6).
// Importe só em código de servidor: o engine roda pelo Node (serverExternalPackages), nunca no navegador.
export * from "./theme";
export { BUILTIN_THEMES_DIR } from "./paths";
export { IRIS_ALIASES, withIris, type WithIrisSiteConfig } from "./next";
