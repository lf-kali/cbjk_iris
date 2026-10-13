# create-vitrine — Blueprint do CLI

Gerador de sites-vitrine (Next.js + shadcn) a partir do projeto JR Acabamentos, no estilo `create-next-app` / `nest new`.

## Objetivo

```bash
npx create-vitrine@latest meu-site
```

Um comando cria o projeto, faz o setup por perguntas e entrega um site-vitrine pronto para trocar dados e fazer deploy. O projeto gerado é do cliente: sem dependência do CLI depois de criado.

## Fluxo

1. Perguntas (ou flags, para modo não interativo: `--theme warm --yes`)
2. Copiar `template/` para a pasta do projeto
3. Aplicar respostas (escrever `site.config.ts`, copiar o tema escolhido, apagar módulos desligados, renomear `package.json`)
4. Instalar dependências (gerenciador detectado automaticamente)
5. `git init` e commit inicial
6. Mostrar próximos passos

## Perguntas do setup

- Nome do projeto, nome do negócio e WhatsApp
- Módulos: produtos, serviços, últimos projetos (galeria)
- Tema (lista de temas prontos, com fonte incluída)
- Modo escuro: sistema, só claro ou só escuro
- Origem das imagens: locais ou ImageKit
- Gerenciador de pacotes, instalar dependências, iniciar git

## Decisões de design

- **Template como projeto rodável.** Desenvolvido e testado com `npm run dev` dentro do repo do CLI. O CLI não faz string-replace em código: só escreve `site.config.ts` e copia o tema.
- **Módulos desligados são apagados na geração** (rotas, itens de menu, dados), como o `create-next-app` faz. Sem flags mortas no projeto gerado. Cada módulo precisa de um manifest dizendo quais arquivos e entradas de menu ele possui.
- **Temas como arquivos CSS** (`themes/<nome>.css`) com um `theme.json` para fontes e metadados.
- **Tema externo (opcional):** aceitar CSS colado do tweakcn/shadcn, para ter tema ilimitado sem criar um por um.
- **Stack do CLI:** TypeScript, `tsup`, `@clack/prompts`, `cac` (flags), `execa` (install).

## Estrutura do repositório

```
create-vitrine/
├─ src/            # CLI (prompts, copy, apply, install)
├─ template/       # projeto Next completo e rodável
├─ themes/         # css + theme.json por tema
└─ test/           # gera combinações e faz build
```

## Testes (CI)

Gerar o projeto com várias combinações de tema e módulos e rodar `tsc` e `next build` em cada uma. É a principal proteção contra o gerador quebrar.

## Publicação

- Antes de publicar: `npx github:<usuario>/create-vitrine meu-site`
- Nome `create-vitrine` no npm: **não verificado**. Alternativa com escopo: `@lf-kali/create-vitrine` (`npm create @lf-kali/vitrine`).

## Ordem de trabalho

1. Refatorar o template (config central, cores semânticas, temas, `CatalogItem` único, camada de dados). O CLI depende desse contrato.
2. Montar o CLI em cima do template refatorado.
3. Testes de geração em CI e publicação.

## Em aberto

- ~~Manifest de módulos~~ decidido: `modules.json` central na raiz do template, com registro de seções da home gerado (ver plano de refatoração, Fase 3)
- Quais temas vêm de fábrica
- ~~Estratégia de dark mode do template~~ decidido: classe + script inline próprio (ver plano de refatoração)
- Template de backend (Neon + Clerk + API) será um projeto separado, depois do front
