# ADR 001: Core como pacote no npm

- **Status:** Aceito pelo dono em 2026-10-20 ([Q-01](../OPEN-QUESTIONS.md#q-01-core-como-pacote-ou-template-copiado-decisão-do-dono)), na org `@cbjk_iris`.
- **Data:** 2026-10-19
- **Spec:** [§4 a](../SPEC.md#a-template-copiado-ou-core-como-pacote-decisão-do-dono)

## Contexto

Hoje cada site é uma cópia do repositório. O dono quer uma ferramenta para criar **e gerenciar** sites. Com cópias, uma correção precisa ser aplicada à mão em cada site, e o `iris upgrade` do backlog não tem como existir.

O módulo opcional funciona por remoção de arquivos: `modules.json` lista os `paths`, e o módulo está ativo quando o primeiro existe. `modules:check` remove cada módulo numa cópia e roda o build.

Fatos que pesam (verificados, ver [§3 da spec](../SPEC.md#3-fatos-verificados-que-mudam-o-plano)):
- o Next 16 compila TSX de `node_modules` só com `transpilePackages`;
- o Node não roda `.ts` de dentro de `node_modules`, então o que roda fora do Next precisa ir compilado;
- o Tailwind v4 não varre `node_modules` sem `@source`;
- 17 arquivos de `components/` e `lib/` importam `@/site.config` direto, `RenderSections` importa o registro gerado, e o layout importa as fontes geradas.

## Decisão

**Opção A**. O núcleo vira o pacote `@cbjk_iris/core` (componentes, seções e rotas, como TSX fonte), apoiado em `@cbjk_iris/schema` e `@cbjk_iris/engine` (JS compilado). O projeto do cliente tem config, conteúdo, temas próprios, `public/` e rotas finas geradas.

- O core lê o config e o registro de seções pelos aliases `@cbjk_iris/site-config` e `@cbjk_iris/site-registry`, configurados pelo `withIris()` (de `@cbjk_iris/engine/next`, JS compilado) no Turbopack e pelo `tsconfig.json` no tsc. As fontes chegam por prop, do `app/layout.tsx` gerado.
- Módulo ativo passa a ser o que está em `siteConfig.modules`. O `iris module remove` apaga as rotas finas, os itens de menu e as seções do módulo.
- O manifesto de módulos vai para o `schema`. O `modules:check` vira teste de matriz na CI do monorepo.

## Consequências

- **Bom:** uma correção chega a todos os sites com `npm update`. O cliente vê um projeto pequeno, com só o que é dele.
- **Ruim:** customizar o JSX de um componente deixa de ser editar um arquivo. Fica para o `iris eject` (backlog).
- **Ruim:** campo obrigatório novo no config quebra todos os clientes. Regra: campo novo é opcional com padrão, ou é versão major. `texts` passa a ser parcial.
- **Risco:** 7 pontos técnicos a provar num spike antes da migração (spec [§6.1](../SPEC.md#61-iris-architect-arquitetura-e-contratos)). Se algum falhar, um ADR novo revê esta decisão.
- **Alternativa rejeitada (B, template copiado):** o cliente receberia todo o código, sem caminho de atualização. Foi rejeitada porque o objetivo é gerenciar sites, não só criá-los.
