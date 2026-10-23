// Scripts que o npm roda na instalação do pacote no cliente, no npm pack ou no npm publish.
// Nenhum pacote publicável do Iris pode declarar um deles (release-check e conferência dos tarballs).
// Sem dependência: é importado também pelo job "publish" do release.yml, que não roda npm ci.
export const LIFECYCLE_SCRIPTS = [
  "preinstall", "install", "postinstall",
  "preprepare", "prepare", "postprepare",
  "prepack", "postpack",
  "prepublish", "prepublishOnly", "publish", "postpublish",
];
