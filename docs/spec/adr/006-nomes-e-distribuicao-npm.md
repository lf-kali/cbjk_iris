# ADR 006: Nomes no npm e distribuição do starter

- **Status:** Proposto. Aguarda o dono ([Q-02](../OPEN-QUESTIONS.md#q-02-nomes-no-npm-decisão-do-dono), [Q-10](../OPEN-QUESTIONS.md#q-10-starter-dentro-do-pacote-ou-baixado-do-github)).
- **Data:** 2026-10-19
- **Spec:** [§3](../SPEC.md#3-fatos-verificados-que-mudam-o-plano), [§5.1](../SPEC.md#51-estrutura-do-monorepo)

## Contexto

O dono pediu `npx create-iris-project@latest <nome>` e um pacote `@iris/core`. Conferido no registro em 2026-10-19:

| Nome | Situação |
|---|---|
| `create-iris-project` | Ocupado (v1.0.1, outro dono, "Create and set up a new Iris app project") |
| `@iris/*` | Escopo com dono (`@iris/cli`, de outra pessoa) |
| `iris`, `iris-cli`, `create-iris`, `create-iris-app` | Ocupados |
| `create-iris-site`, `create-iris-vitrine`, `iris-vitrine` | Livres |
| `@iris-vitrine/*`, `@lf-kali/*` | Livres como pacotes. A org só se confirma criando em npmjs.com |

O `npx <pacote>` exige nome sem escopo para ficar curto. `npm create x` vira `create-x`, e `npm create @scope/x` vira `@scope/create-x`.

## Decisão

Proposta:
- **Comando de criação:** `create-iris-site` (sem escopo). Uso: `npx create-iris-site@latest [nome]` ou `npm create iris-site@latest [nome]`.
- **Pacotes de biblioteca:** org nova `@iris-vitrine` (`schema`, `engine`, `core`, `cli`). Se a org não puder ser criada, o escopo pessoal do dono no npm.
- **Bin da CLI:** `iris`, instalado como dependência de desenvolvimento do projeto.
- **Starter dentro do pacote `create`:** a pasta `template/` é copiada de `apps/site` no build. Funciona offline, e cada versão do `create` traz o starter da mesma versão do core. As reescritas de caminho estão em [§5.1.4 da spec](../SPEC.md#514-de-appssite-para-o-starter). Custo: cerca de 2MB de imagens de exemplo no pacote.
- **Versões em lockstep** com changesets. Publicação por GitHub Actions com trusted publishing (OIDC) e `--provenance`, nunca da máquina local.

## Consequências

- **Bom:** nenhum nome depende de terceiros.
- **Ruim:** o comando fica diferente do pedido (`create-iris-site`, não `create-iris-project`).
- **Ruim:** reivindicar `create-iris-project` pela política de disputas do npm é possível, mas lento e sem garantia, porque o pacote está ativo e tem descrição.
- **Regra:** os nomes são contrato. Até a resposta do dono, o código usa `@iris-vitrine/`, e a troca é um find/replace.
