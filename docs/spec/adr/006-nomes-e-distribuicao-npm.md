# ADR 006: Nomes no npm e distribuição do starter

- **Status:** Aceito pelo dono em 2026-10-20 ([Q-02](../OPEN-QUESTIONS.md#q-02-nomes-no-npm-decisão-do-dono), [Q-10](../OPEN-QUESTIONS.md#q-10-starter-dentro-do-pacote-ou-baixado-do-github), [Q-11](../OPEN-QUESTIONS.md#q-11-publicação-e-versionamento)).
- **Data:** 2026-10-20
- **Spec:** [§3](../SPEC.md#3-fatos-verificados-que-mudam-o-plano), [§5.1](../SPEC.md#51-estrutura-do-monorepo)

## Contexto

O pedido original era `npx create-iris-project@latest <nome>` e um pacote `@iris/core`. Conferido no registro do npm:

| Nome | Situação |
|---|---|
| `create-iris-project` | Ocupado (v1.0.1, outro dono, "Create and set up a new Iris app project") |
| `@iris/*` | Escopo com dono (`@iris/cli`, de outra pessoa) |
| `iris`, `iris-cli`, `create-iris`, `create-iris-app` | Ocupados |
| `create-iris-site` | Livre (2026-10-20) |
| `@cbjk_iris/*` | Livre como pacote (2026-10-20). Nome válido pelo `validate-npm-package-name` 8.0. A org só se confirma ao criá-la |

O `npx <pacote>` exige nome sem escopo para ficar curto. `npm create x` vira `create-x`.

## Decisão

| Item | Decisão |
|---|---|
| Comando de criação | `create-iris-site`, sem escopo. Uso: `npx create-iris-site@latest [nome]` ou `npm create iris-site@latest [nome]` |
| Bibliotecas | Org `@cbjk_iris`: `@cbjk_iris/schema`, `@cbjk_iris/engine`, `@cbjk_iris/core`, `@cbjk_iris/cli` |
| Aliases do core | `@cbjk_iris/site-config`, `@cbjk_iris/site-registry` |
| Bin da CLI | `iris`, instalado como dependência de desenvolvimento do projeto |
| Starter | Dentro do pacote `create`: a pasta `template/` é copiada de `apps/site` no `prepack`, com as reescritas de [§5.1.4 da spec](../SPEC.md#514-de-appssite-para-o-starter). Funciona offline, e cada versão do `create` traz o starter da mesma versão do core |
| Versões | Lockstep com changesets. Primeira versão `0.1.0`; a `1.0.0` só depois de dois sites reais rodando com o core |
| Publicação | Só pelo GitHub Actions (`release.yml`, disparo manual), com trusted publishing (OIDC) e `--provenance`. Nunca da máquina local. 2FA obrigatório na org |
| Licença | MIT em todos os pacotes. `NOTICE` com os temas do tweakcn (Apache-2.0) |

## Consequências

- **Bom:** nenhum nome depende de terceiros.
- **Bom:** o starter não depende do GitHub no momento da criação.
- **Ruim:** o comando fica diferente do pedido original (`create-iris-site`, não `create-iris-project`).
- **Ruim:** o pacote `create` leva cerca de 2MB de imagens de exemplo.
- **Ação do dono:** criar a org `cbjk_iris` em npmjs.com antes da primeira publicação. Se o nome não estiver livre, este ADR é revisto.
- **Regra:** os nomes são contrato. Mudar exige ADR novo.
