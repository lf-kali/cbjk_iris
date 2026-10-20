# ADR 004: Conteúdo em JSON validado, config em TypeScript

- **Status:** Proposto. Pede confirmação do dono ([Q-03](../OPEN-QUESTIONS.md#q-03-conteúdo-em-json-decisão-do-dono)).
- **Data:** 2026-10-19
- **Spec:** [§4 d](../SPEC.md#d-como-a-cli-edita-arquivos), [§5.3](../SPEC.md#53-config-e-conteúdo)

## Contexto

A CLI precisa criar produtos, serviços e páginas sem estragar o arquivo do cliente. Hoje tudo é TypeScript: `data/products.ts`, `data/services.ts` e `site.config.ts` (que também guarda `home` e `pages`).

Editar TS por AST (magicast ou ts-morph) funciona enquanto o arquivo tem só literais. Basta o cliente escrever uma variável, um spread ou uma função para a edição falhar. Validar um `.ts` exige executá-lo. Um arquivo único com todos os produtos gera conflito de merge a cada mudança.

## Decisão

- Produtos, serviços, páginas e home vão para `content/`, **um JSON por item**: `content/products/<slug>.json`, `content/services/<slug>.json`, `content/pages/<slug>.json` e `content/home.json`.
- Cada JSON tem `$schema` apontando para o JSON Schema publicado pelo `@iris-vitrine/schema`. O loader remove essa chave antes de validar.
- O nome do arquivo é o slug. `kind` e `slug` não se repetem dentro do JSON.
- O `site.config.ts` fica para a configuração. A CLI edita nele só `theme.*`, `menu` e `modules` (o `create`, no starter recém-copiado, também `name`, `seo`, `whatsapp.phone`, `brand` e `leads`), com **magicast**. Valor não literal → saída 7, com a linha a mudar à mão.
- Os loaders do `engine` leem e validam o conteúdo no build. A interface `ProductRepository` não muda.

magicast em vez de ts-morph: ele trata o objeto exportado como objeto JS e preserva a formatação. O ts-morph é mais completo do que o necessário para três caminhos fixos.

## Consequências

- **Bom:** criar e remover item é escrever e apagar um arquivo. Validar não executa código do cliente.
- **Bom:** prepara o import de CSV, o feed do Merchant Center, o Keystatic e o Puck do backlog, que trabalham com arquivos de dados.
- **Bom:** um arquivo por item reduz conflitos de merge.
- **Ruim:** JSON não aceita comentário. A ajuda passa para o `description` do JSON Schema, que o VS Code mostra no hover.
- **Ruim:** o iniciante perde a sensação de "um arquivo só". O README do projeto gerado precisa explicar `content/` logo no começo, e a CLI vira o caminho principal.
- **Migração:** o arquiteto converte o conteúdo de `apps/site` uma vez, com teste de que as páginas geradas são iguais.
