# Changesets

Versões do Iris (SPEC §5.1 e Q-11). Os cinco pacotes publicáveis (`@cbjk_iris/schema`, `engine`, `core`, `cli` e `create-iris-site`) saem sempre com a mesma versão (`fixed` no `config.json`). O `apps/site` é privado e não recebe versão.

- Registrar uma mudança: `npx changeset`.
- A publicação roda só no GitHub Actions (`release.yml`, disparo manual), nunca localmente.
