// publishConfig por lista de permissão (rodada 6 da E7). O npm publish passa o publishConfig inteiro
// pelo flatten da config, então qualquer chave de .npmrc vale ali: "<escopo>:registry", "proxy",
// "https-proxy", "strict-ssl"... e a troca do token OIDC iria para o registro que o pacote escolher.
// Os 5 pacotes do Iris só precisam de { "access": "public" }. Sem dependência: o job "publish" importa.
const ALLOWED = { access: "public" };

/** Problemas do publishConfig: tem de ser um objeto com exatamente { "access": "public" }. */
export function publishConfigProblems(publishConfig) {
  if (!publishConfig || typeof publishConfig !== "object" || Array.isArray(publishConfig)) {
    return ['falta "publishConfig": { "access": "public" } (publishConfig precisa ser exatamente esse objeto)'];
  }
  const problems = [];
  if (publishConfig.access !== ALLOWED.access) problems.push('falta "publishConfig": { "access": "public" }');
  for (const key of Object.keys(publishConfig)) {
    if (!Object.hasOwn(ALLOWED, key)) problems.push(`publishConfig.${key} não é permitido`);
  }
  return problems;
}
