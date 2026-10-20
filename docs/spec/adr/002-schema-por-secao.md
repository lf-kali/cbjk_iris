# ADR 002: Schema zod por seção como fonte única

- **Status:** Proposto. Vira Aceito no congelamento dos contratos (tag `contracts-v1`).
- **Data:** 2026-10-19
- **Spec:** [§4 b](../SPEC.md#b-schema-por-seção-como-fonte-única), [§5.5](../SPEC.md#55-formato-do-schema-de-seção)

## Contexto

Hoje uma seção existe em três lugares: o tipo em `types/sections.ts`, o componente e o registro em `modules.json`. A CLI vai precisar de um quarto (as perguntas), e o editor visual do backlog de um quinto (os campos). Listas mantidas à mão se desencontram.

O zod 4.4 já está no `node_modules` (dependência indireta) e tem `.meta()` para metadados por campo e `z.toJSONSchema()`. Os dois foram testados nesta sessão.

## Decisão

Cada seção é um arquivo `packages/schema/src/sections/<type>.ts` com `defineSection({ type, module, label, description, fields, presets, limits })`. Os campos levam `.meta({ label, description, example, input, ask, order })`.

Saem do schema:
- o tipo TS (`z.infer`), inclusive `Section` e `SectionOf<T>`;
- a validação do build (loaders do `engine`);
- as perguntas e as flags da CLI;
- o JSON Schema de `content/*.json` (publicado em `@cbjk_iris/schema/json/`);
- o registro de seções (`syncRegistry()` do `engine`, chamado por `iris sync`), a partir de `definition.module` e `siteConfig.modules`.

`coreSections` e `modules[].sections` do `modules.json` deixam de existir.

## Consequências

- **Bom:** acrescentar uma seção é um arquivo de schema e um componente. Um teste garante que os dois existem.
- **Bom:** o JSON do conteúdo ganha autocomplete e descrição no VS Code, pelo `$schema`.
- **Ruim:** tipos inferidos podem perder os comentários JSDoc no hover do `site.config.ts`. O spike verifica. Se perderem, a descrição vai no `.meta({ description })` e aparece no JSON Schema, e o `site.config.ts` fica com os comentários escritos no próprio arquivo.
  - **Resultado do spike (2026-10-20, [`spike-001.md`](../spike-001.md#6-hover-de-campo-de-tipo-zinfer-mostra-a-descrição--não-mostra-registrado-no-adr-002)):** perdem. Com o `@cbjk_iris/schema` instalado, o quickinfo do language service mostra `(property) name: string` sem documentação, no `site.config.ts` e em tipos `z.infer`. O JSDoc escrito no campo do schema sobrevive ao `z.infer` quando o tipo vem do fonte, mas some no `.d.mts` emitido pelo tsdown. O `.meta({ description })` nunca aparece no hover. Vale o plano acima: descrição no `.meta()` (JSON Schema e CLI) e comentários no próprio `site.config.ts` do starter. Não bloqueia a migração.
- **Regra:** `.meta()` vem por último na cadeia (depois de `.optional()` e `.default()`).
- **Regra:** os schemas são `.strict()`. O loader remove a chave `$schema` dos JSON antes de validar, e o JSON Schema publicado é gerado com `io: "input"`, para campos com `.default()` não aparecerem como obrigatórios.
- **Dependência nova direta:** `zod@^4` no `schema`.
