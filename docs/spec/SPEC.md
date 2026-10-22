# Iris: spec do framework

> **Decisões do dono: respondidas em 2026-10-20** ([`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md)).
> **Status dos contratos: RASCUNHO.** O `iris-architect` já pode começar. As frentes paralelas só começam quando esta linha mudar para `CONGELADO em <data> (tag contracts-v1)`.

Documentos relacionados:
- [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md): as perguntas ao dono e as respostas.
- [`adr/`](./adr/): uma decisão por arquivo.

**Precedência:** esta spec prevalece sobre `instructions/02-*.md` a `06-*.md`, que foram escritas antes dela e usam caminhos e nomes antigos. A tradução está em [§6.6](#66-mapeamento-para-as-instruções-02-a-06).

---

## Sumário

1. [Visão](#1-visão)
2. [Ponto de partida: o que existe hoje](#2-ponto-de-partida-o-que-existe-hoje)
3. [Fatos verificados que mudam o plano](#3-fatos-verificados-que-mudam-o-plano)
4. [Decisões](#4-decisões)
5. [Contratos](#5-contratos)
6. [Frentes de trabalho](#6-frentes-de-trabalho)
7. [Backlog (fora desta rodada)](#7-backlog-fora-desta-rodada)
8. [Glossário](#8-glossário)

---

## 1. Visão

Hoje o `cbjk_iris` é um template: quem cria um site copia o repositório e edita o `site.config.ts`. O Iris passa a ser uma ferramenta para **criar e gerenciar** sites de vitrine:

| Objetivo do dono | Como a spec atende |
|---|---|
| Criar um site com um comando | `npx create-iris-site@latest [nome]` ([§3](#3-fatos-verificados-que-mudam-o-plano) explica por que não `create-iris-project`) |
| CLI para páginas, produtos, serviços e temas | CLI `iris`, com flags que preenchem campos e perguntas só para o que faltar ([§5.7](#57-interface-pública-da-cli)) |
| Temas que mudam a forma dos componentes | Tokens de forma, mais estilos selecionados por `data-style` ([§5.4](#54-tokens-de-forma-e-estilos)) |
| Botões de marketplace no produto | Campos novos em `Product` e uma lista ordenada de botões ([§5.2](#52-tipo-product-e-botões-de-compra)) |
| Botão do WhatsApp opcional | `whatsappButton: boolean`, padrão `true` |

Princípios que valem para todas as frentes:

1. **Um schema, muitas saídas.** O schema zod de cada coisa (seção, produto, serviço, página, config) gera o tipo TS, as perguntas da CLI, a validação do build e o JSON Schema do editor. Ninguém mantém uma segunda lista de campos à mão.
2. **Nenhum comando trava.** Sem terminal interativo, a CLI nunca pergunta: ela falha com uma mensagem clara e um código de saída.
3. **O cliente edita conteúdo, não código.** Config, conteúdo, temas próprios e imagens são do cliente. O resto vem do framework.
4. **Upgrade não quebra o cliente.** Campo novo no config é sempre opcional e tem padrão. Campo obrigatório novo exige versão major.

---

## 2. Ponto de partida: o que existe hoje

Lido do código em 2026-10-19 (`main`, commit `ff50368`). O commit seguinte, `07b91c7`, só limpou o diretório de trabalho ([Q-13](./OPEN-QUESTIONS.md#q-13-pendências-no-diretório-de-trabalho)).

| Peça | Onde | Observação para a migração |
|---|---|---|
| Config | `site.config.ts` (242 linhas), tipado por `types/site-config.ts` | Também guarda `home.sections` e `pages`, que passam a ser conteúdo ([ADR 004](./adr/004-conteudo-em-json.md)) |
| Tipos de seção | `types/sections.ts`, união `Section` com 13 tipos | Viram schemas zod ([ADR 002](./adr/002-schema-por-secao.md)) |
| Catálogo | `types/catalog.ts`, `data/products.ts`, `data/services.ts`, repositórios em `lib/catalog/` | A interface `ProductRepository` continua igual |
| Temas | `themes/*.css` (`:root` e `.dark`), lidos por `lib/theme-file.ts` e montados por `lib/brand.ts` | Hoje só mudam cores, fontes, `--radius`, sombras e `--tracking-normal` |
| Estilo dos componentes | `components/ui/*` no estilo shadcn `base-sera` | Forma fixa no código: `rounded-none` (12 ocorrências), `shadow-md` (13), `uppercase` e `tracking-*` em botão, badge, breadcrumb, tabs e rótulos de categoria, `ring-1 ring-foreground/5` no Card, `backdrop-blur-2xl` e `bg-background/86` no header, `bg-black/20 backdrop-blur-sm` no fundo do Sheet |
| Módulos | `modules.json` (products, services, gallery). Um módulo está ativo quando o primeiro `path` existe | O critério de "ativo" muda ([ADR 001](./adr/001-distribuicao-core-pacote.md)) |
| Arquivos gerados | `app/fonts.generated.ts` (`brand:sync`), `components/sections/registry.tsx` (`modules:sync`) | Continuam gerados, com nomes novos ([§5.1](#51-estrutura-do-monorepo)) |
| Scripts | `brand:sync`, `theme:add`, `modules:sync`, `modules:check` | Viram funções do `@cbjk_iris/engine`, chamadas por scripts e depois pela CLI |
| Acoplamento | 17 arquivos de `components/` e `lib/` importam `@/site.config` direto. `RenderSections` importa `./registry`, e o layout importa `./fonts.generated` | No pacote, cada um desses imports precisa de um mecanismo ([§5.1](#51-estrutura-do-monorepo)) |
| Testes | Não há vitest nem Playwright no `package.json` | O arquiteto instala ([§6.1](#61-iris-architect-arquitetura-e-contratos)) |
| Licença | Não há `LICENSE`, e o `package.json` não tem `license` | Bloqueia a publicação ([Q-04](./OPEN-QUESTIONS.md#q-04-licença)) |

As pendências do diretório de trabalho foram resolvidas no commit `07b91c7` ([Q-13](./OPEN-QUESTIONS.md#q-13-pendências-no-diretório-de-trabalho)).

---

## 3. Fatos verificados que mudam o plano

Conferidos nesta sessão, com comando. O context7 não estava disponível; usei a doc instalada em `node_modules/next/dist/docs/`, o registro do npm e testes locais.

| Fato | Como foi verificado | Consequência |
|---|---|---|
| `create-iris-project` já existe no npm (v1.0.1, de outro dono, "Create and set up a new Iris app project") | `npm view create-iris-project` | O comando pedido pelo dono não pode ser publicado com esse nome ([ADR 006](./adr/006-nomes-e-distribuicao-npm.md)) |
| O escopo `@iris` tem dono (`@iris/cli` publicado por outra pessoa) | `npm view @iris/cli` | `@iris/core` não está disponível para nós |
| Livres em 2026-10-20: `create-iris-site` e `@cbjk_iris/*`. Os nomes passam no `validate-npm-package-name`. A org só se confirma ao criá-la em npmjs.com | `npm view` com 404 e `validate-npm-package-name` 8.0 | Nomes escolhidos pelo dono ([Q-02](./OPEN-QUESTIONS.md#q-02-nomes-no-npm-decisão-do-dono)) |
| `npx iris` fora de um projeto baixa o pacote `iris` (uma lib de XHR de 2022) | `npm view iris` | Nos docs, a CLI roda por `npx iris` só dentro do projeto (bin local) ou por `npm run iris --` |
| O Node se recusa a remover tipos de `.ts` dentro de `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) | Teste local no Node 24.18 | Tudo o que o Node executa direto (CLI, `next.config.ts` → `withIris`, motor de tema, geradores) vai publicado como JS compilado |
| O Next 16 usa Turbopack por padrão e **falha o build** se encontrar uma chave `webpack` no config | `docs/01-app/02-guides/upgrading/version-16.md` | O `withIris()` só pode usar `turbopack.resolveAlias` e `transpilePackages` |
| O Next não compila TS de `node_modules`, a não ser que o pacote esteja em `transpilePackages`. Workspaces são compilados sozinhos | `docs/.../transpilePackages.md` | O `@cbjk_iris/core` pode ir como TSX fonte, desde que o `withIris()` o adicione ali |
| zod 4.4 está instalado (dependência indireta): tem `.meta()` e `z.toJSONSchema()` | Teste com `node -e` | Base do schema por seção ([ADR 002](./adr/002-schema-por-secao.md)) |
| `.strict()` rejeita a chave `$schema`, e `z.toJSONSchema` no modo padrão (`io: "output"`) marca campos com `.default()` como obrigatórios | Teste local (revisão adversarial) | Loader remove `$schema` antes de validar; JSON Schema gerado com `io: "input"` ([§5.3](#53-config-e-conteúdo)) |
| commander 15 e vitest 5 exigem Node `>=22.12`; tsdown exige `^22.18` | `npm view <pkg> engines` | O README diz Node 22.6+. O mínimo passa a ser **22.18** ([Q-05](./OPEN-QUESTIONS.md#q-05-node-mínimo-decisão-do-dono)) |
| std-env 4.3 exporta `isCI`, `hasTTY`, `isAgent` e `agent` (detecta `CLAUDECODE`, `CODEX_*`, `CURSOR_AGENT`, `AI_AGENT`) | Leitura do `.d.mts` do pacote | A detecção de agente não precisa de código próprio |
| @clack/prompts 1.8: `text`, `select`, `multiselect`, `confirm`, `group`, `isCancel`, `cancel`, `spinner` | Leitura do `.d.mts` | API das perguntas |
| simple-icons 16.35 tem **Shopee**, mas **não tem** Mercado Livre nem Amazon (só Mercado Pago) | Busca no `data/simple-icons.json` | Os três ícones de marketplace vêm do kit de marca oficial de cada empresa ([Q-08](./OPEN-QUESTIONS.md#q-08-ícones-do-mercado-livre-e-da-amazon)) |

### Armadilhas conhecidas (do blind-spot pass)

| Armadilha | O que acontece | Onde a spec trata |
|---|---|---|
| Tailwind v4 não varre `node_modules` | Classes usadas só dentro do core somem do CSS | `@source` no CSS do projeto ([§5.1](#51-estrutura-do-monorepo)) |
| Workspaces põem `node_modules` na raiz do monorepo | Caminhos relativos do starter não valem dentro de `apps/site` | Reescritas do starter ([§5.1.4](#514-de-appssite-para-o-starter)) |
| Bundler apaga `"use client"` | Componente cliente vira servidor e quebra | Core vai como fonte, sem bundler próprio |
| Campo obrigatório novo no config | Todo projeto existente para de compilar no upgrade | Regra de semver ([§1](#1-visão), princípio 4) |
| `texts` obrigatório e completo | Cada versão que adiciona um texto quebra os clientes | `texts` vira parcial, com padrões em `DEFAULT_TEXTS` ([§5.3](#53-config-e-conteúdo)) |
| E2E do `create` com pacotes não publicados | `npm install` dá 404 | Registro local Verdaccio na CI ([§6.4](#64-iris-cli-create-iris-site-e-cli-iris)) |
| Publicar sem 2FA ou com token clássico | Conta comprometida publica malware em nome do projeto | GitHub Actions com trusted publishing (OIDC) e provenance ([Q-11](./OPEN-QUESTIONS.md#q-11-publicação-e-versionamento)) |
| Temas do tweakcn são Apache-2.0 | Redistribuir sem o aviso de licença viola a licença | `NOTICE` no pacote do core, sob o arquiteto ([§5.8](#58-arquivos-de-posse-exclusiva-do-iris-architect)) |
| CLI rodada por agente sem TTY | Prompt fica esperando para sempre | Regra de interatividade ([§5.7](#57-interface-pública-da-cli)) |
| Blur e transparência em celular fraco | Rolagem trava | `prefers-reduced-transparency`, faixa máxima de blur, meta de Lighthouse ([§5.4](#54-tokens-de-forma-e-estilos)) |

---

## 4. Decisões

Cada decisão tem um ADR com contexto e consequências. Aqui fica o resumo com opções, recomendação e o que muda no código.

### a) Template copiado ou core como pacote **[DECISÃO DO DONO]**

ADR: [`001-distribuicao-core-pacote.md`](./adr/001-distribuicao-core-pacote.md). Pergunta: [Q-01](./OPEN-QUESTIONS.md#q-01-core-como-pacote-ou-template-copiado-decisão-do-dono).

| | A. Core como pacote no npm (recomendada) | B. Template copiado (estilo shadcn) |
|---|---|---|
| O que o cliente recebe | Config, conteúdo, temas próprios, `public/` e arquivos finos gerados | O código inteiro |
| `iris upgrade` | Possível: `npm update @cbjk_iris/core` | Impossível sem um sistema de patches |
| Customizar um componente | Só por props, tokens e estilos. Mudança de JSX exige "ejetar" (backlog) | Livre, edita o arquivo |
| Correção de bug para 20 clientes | Uma publicação | 20 PRs à mão |
| Custo de engenharia | Alto: aliases, `transpilePackages`, `@source`, rotas finas, semver | Baixo: o que já existe hoje |
| `modules.json` e `modules:check` | O manifesto vai para o pacote. Módulo ativo = listado em `siteConfig.modules`. O check vira teste de matriz na CI do monorepo | Continua como hoje: apagar `paths` desliga o módulo |
| Risco técnico | Médio. 7 pontos a provar num spike antes de tudo ([§6.1](#61-iris-architect-arquitetura-e-contratos)) | Baixo |

**Decisão do dono (2026-10-20): A**, na org `@cbjk_iris`. A ferramenta serve para *gerenciar* sites, não só criar. Sem pacote, cada site gerado vira um fork que nunca mais recebe correção. O custo da opção A é real, mas é pago uma vez, e quase todo ele é a mesma refatoração que a opção B também pede (separar o núcleo em `packages/core`).

**O que muda no código:** os 17 imports de `@/site.config` passam a importar `packages/core/src/lib/config.ts`, o único arquivo que lê o alias `@cbjk_iris/site-config` ([§5.3](#53-config-e-conteúdo)); `components/`, `lib/` e as rotas vão para `packages/core/src`; `modules.json` vira `packages/schema/src/modules.ts`; o `app/` do projeto fica só com arquivos finos gerados.

A opção B fica registrada no [ADR 001](./adr/001-distribuicao-core-pacote.md) como alternativa rejeitada.

### b) Schema por seção como fonte única

ADR: [`002-schema-por-secao.md`](./adr/002-schema-por-secao.md).

| Opção | Prós | Contras |
|---|---|---|
| **zod 4 com `.meta()` (recomendada)** | Tipo por `z.infer`, validação por `safeParse`, JSON Schema por `z.toJSONSchema`, metadados de pergunta no próprio campo | Tipos inferidos podem perder os comentários JSDoc no hover (a provar no spike) |
| Tipos TS à mão + gerador de schema | Mantém o hover de hoje | Duas fontes de verdade, que se desencontram |
| JSON Schema à mão | Padrão aberto | Sem tipo TS sem gerador, verboso para escrever |

**Recomendação: zod 4.** O formato está em [§5.5](#55-formato-do-schema-de-seção).

**O que muda no código:**
- `types/sections.ts` vira `packages/schema/src/sections/*.ts`, um arquivo por seção, e `Section` passa a ser `z.infer` da união;
- `modules.json` sai do projeto; `coreSections` e `modules[].sections` passam a vir de `sectionDefinitions` (cada definição diz a que módulo pertence);
- `modules:sync` vira `syncRegistry()` do `engine`, que gera o registro lendo `sectionDefinitions` e `siteConfig.modules`.

### c) Como os temas mudam os componentes

ADR: [`003-temas-tokens-de-forma.md`](./adr/003-temas-tokens-de-forma.md).

| Opção | Troca depois da instalação | Custo |
|---|---|---|
| Reescrever o código dos componentes por estilo (como o `npx shadcn create`) | Não, ou só por codemod | Um conjunto de componentes por estilo |
| **Tokens CSS de forma + estilos por `data-style` (recomendada)** | Sim: muda o config, o layout emite outras variáveis | Uma lista de tokens e uma convenção |
| Variantes `cva` escolhidas em JS a partir do tema | Sim, mas precisa do tema em cada componente | Server components não leem o `<html>`; exige passar o estilo por props a todo componente |

**Recomendação: tokens + variantes CSS do Tailwind**, uma correção à proposta original. O `cva` precisa de um valor em JS e não enxerga o `data-style` do `<html>`. O Tailwind v4 resolve isso em CSS puro com `@custom-variant`: `style-glass:bg-card/60` só vale quando o `<html>` tem `data-style="glass"`. Funciona em server components e troca sem JS. O `cva` continua para as variantes semânticas (`variant`, `size`), como hoje.

Também separa **tema** (cores e fontes, compatível com o tweakcn) de **estilo** (forma). Assim dá para usar as cores do `ocean-breeze` com a forma do `glass`.

"Em runtime via `iris theme set`" quer dizer: trocar depois de instalado, sem reescrever componentes. O comando muda o config e roda o sync. Trocar o estilo pelo visitante, no navegador, não está no escopo.

**O que muda no código:**
- `lib/brand.ts` e `lib/theme-file.ts` vão para `packages/engine/src/theme/`, com uma camada nova de preset de estilo e validação de tokens;
- `app/globals.css` vira `packages/core/styles/iris.css`, com os tokens no `@theme inline`, os utilitários e os `@custom-variant style-*`;
- todo `rounded-*`, `shadow-*`, `backdrop-blur*`, `ring-*` de superfície, `uppercase` e `tracking-*` fixos nos componentes viram utilitários de [§5.4](#54-tokens-de-forma-e-estilos);
- o layout escreve `data-style` no `<html>`; `SiteConfig` ganha `theme.style` e `brand.shape`.

### d) Como a CLI edita arquivos

ADR: [`004-conteudo-em-json.md`](./adr/004-conteudo-em-json.md). Pergunta: [Q-03](./OPEN-QUESTIONS.md#q-03-conteúdo-em-json-decisão-do-dono).

| Opção | Prós | Contras |
|---|---|---|
| AST em tudo (magicast ou ts-morph no `site.config.ts` e em `data/*.ts`) | O cliente continua com um arquivo `.ts`, comentários preservados | Falha quando o cliente escreve uma variável, um spread ou uma função no lugar de um literal. Validar exige executar o TS. Conflitos de merge num arquivo único |
| **Conteúdo em JSON validado por zod, config em `.ts` (recomendada)** | Edição trivial e segura, um arquivo por item, validação sem executar código, pronto para Keystatic, Puck e import de CSV | JSON não aceita comentário. Iniciante troca vírgula e aspas por outro erro de sintaxe |
| Tudo em JSON, inclusive o config | Uma regra só | Perde o tipo e o comentário de `brand`, `texts` e `seo`, que o iniciante mais lê |

**Decisão do dono (2026-10-20): conteúdo em JSON, config em `.ts`.**
- Produtos, serviços, páginas e a home vão para `content/`, um arquivo JSON por item, com `$schema` apontando para o JSON Schema gerado. O VS Code dá autocomplete e erro sublinhado, como hoje no `.ts`.
- O `site.config.ts` fica para configuração. A CLI edita nele só os caminhos listados em [§5.7](#edição-do-siteconfigts), com magicast. Se o valor não for literal, a CLI para com código 7 e mostra a linha a mudar à mão.
- magicast em vez de ts-morph: ele edita o objeto como um objeto JS e preserva a formatação. O ts-morph é mais poderoso, mas pesa mais e é verboso para esse uso.

**O que muda no código:** `data/*.ts` e as chaves `home` e `pages` do config viram `content/**/*.json`; `lib/catalog/*` passa a chamar loaders do `engine`; `app/[slug]/page.tsx` e a home leem de `content/`.

### e) CLI para agentes e CI

ADR: [`005-cli-nao-interativa.md`](./adr/005-cli-nao-interativa.md).

| Peça | Opção | Prós | Contras |
|---|---|---|---|
| Comandos e flags | **commander 15 (recomendada)** | Padrão do ecossistema, subcomandos aninhados, help bom, `exitOverride` para controlar códigos de saída | Node ≥ 22.12 |
| | cac | Pequeno, usado no plano antigo | Subcomandos aninhados (`iris product add`) são desajeitados |
| | yargs | Muito completo | API grande, tipos fracos |
| | oclif | Plugins, help gerado | Framework pesado para uma CLI pequena; estrutura de pastas própria |
| Perguntas | **@clack/prompts 1.8 (recomendada)** | Bonito, pequeno, `isCancel` claro | Sem modo não interativo próprio: a regra é nossa |
| | inquirer / @inquirer/prompts | Muito usado | Mais pesado, visual datado |
| Detecção de ambiente | **std-env 4 (recomendada)** | `isCI`, `hasTTY`, `isAgent` num pacote só | Lista de agentes depende do mantenedor |
| | ci-info + @vercel/detect-agent | Cada um bom no seu caso | Duas dependências para o mesmo problema |

**O que muda no código:** os quatro scripts de `scripts/` deixam de ser a interface. Viram funções do `engine`, e a CLI chama essas funções. Os `package.json` do starter passam a ter `"predev": "iris sync"` e `"prebuild": "iris sync"`.

O ponto central: todas as perguntas passam por uma única função `ask()`, que lança erro em modo não interativo. Um teste roda cada comando que pergunta com `stdin` fechado e falha se ele não terminar em 5 segundos.

---

## 5. Contratos

Contratos são de posse exclusiva do `iris-architect`. Depois de congelados, qualquer mudança exige um ADR novo. Acrescentar um valor a uma lista de dados (um host de marketplace, um ícone de seção) não é mudança de contrato: basta um PR revisado pelo arquiteto.

Nomes de pacote decididos pelo dono ([Q-02](./OPEN-QUESTIONS.md#q-02-nomes-no-npm-decisão-do-dono)): o comando `create-iris-site` e a org `@cbjk_iris`.

### 5.1 Estrutura do monorepo

```
cbjk_iris/                         ← raiz, "private": true
├─ package.json                    ← npm workspaces: ["packages/*", "apps/*"]; devDeps de teste
├─ tsconfig.base.json
├─ .changeset/                     ← versões (lockstep)
├─ .github/workflows/              ← ci.yml (arquiteto) + um arquivo por frente
├─ scripts/                        ← scripts de verificação da raiz (ver §6)
├─ LICENSE, NOTICE
├─ docs/spec/                      ← esta spec (iris-architect)
├─ packages/
│  ├─ schema/   @cbjk_iris/schema    contratos: schemas zod, tipos, constantes. JS compilado
│  ├─ engine/   @cbjk_iris/engine    lógica de Node: tema, fontes, codegen, módulos, conteúdo, withIris. JS compilado
│  ├─ core/     @cbjk_iris/core      componentes React, seções e páginas. TSX fonte
│  ├─ cli/      @cbjk_iris/cli       bin "iris". JS compilado
│  └─ create/   create-iris-site        bin "create-iris-site", leva o starter. JS compilado
└─ apps/
   └─ site/                        ← "private": true. O site cbjk de hoje e a fonte do starter
      └─ e2e/                      ← testes Playwright, uma pasta por frente
```

| Pacote | Depende de | Publicado como | Quem executa |
|---|---|---|---|
| `schema` | zod | ESM + `.d.ts` + `json/*.schema.json`. Subpath `./defaults` sem zod (vai para o navegador) | Next, Node, CLI |
| `engine` | schema | ESM + `.d.ts`. Subpath `./next` exporta `withIris` | Node (CLI, `next.config.ts`), server components |
| `core` | schema, engine; peer: next 16, react 19 | TSX fonte, transpilado pelo Next | Next |
| `cli` | schema, engine, commander, @clack/prompts, magicast, std-env | ESM, `bin.iris` | Node |
| `create` | cli (API programática) | ESM, `bin.create-iris-site`, pasta `template/` | Node |

Regras:
- **Grafo sem ciclo:** `schema ← engine ← core`, `schema ← engine ← cli ← create`. `schema` e `engine` não importam React. `core` não importa `cli`. Um teste que precise olhar dois pacotes mora no pacote de cima (ex.: "toda seção tem componente" mora no `core`).
- **Versão em lockstep:** os cinco pacotes saem sempre com a mesma versão. O starter fixa as versões exatas.
- **Node mínimo:** `"engines": { "node": ">=22.18" }` em todos.
- **Build:** tsdown para `schema`, `engine`, `cli` e `create`. O `core` não tem build.
- **Typecheck do core isolado:** `packages/core/tsconfig.json` mapeia os aliases para `packages/core/test/fixtures/` (um `site.config.ts` e um registro de exemplo).

#### 5.1.1 Árvore de `packages/core/src` e de onde vem cada arquivo

| Caminho novo | Vem de hoje | Dono depois de `contracts-v1` |
|---|---|---|
| `app/layout.tsx` (`IrisRootLayout`, `irisMetadata`) | `app/layout.tsx` | `iris-theme` |
| `app/home.tsx`, `app/config-page.tsx` | `app/page.tsx`, `app/[slug]/page.tsx` | `iris-theme` (só estilo; a leitura de conteúdo é do arquiteto até a tag) |
| `app/products/{list,detail}.tsx` | `app/produtos/`, `app/produto/[slug]/` | `iris-commerce` |
| `app/services/{list,detail}.tsx` | `app/servicos/`, `app/servico/[slug]/` | `iris-commerce` |
| `app/gallery/page.tsx` | `app/ultimos-projetos/` | `iris-commerce` |
| `ui/*` | `components/ui/*` | `iris-theme` |
| `sections/*` | `components/sections/*` (menos `registry.tsx`) | `iris-theme` (estilo e JSX); props vêm do schema |
| `header/*`, `footer/*`, `brand/*`, `theme/*`, `carousel/FadeCarousel.tsx` | `components/{header,footer,brand,theme}/*`, `components/FadeCarousel.tsx` | `iris-theme` |
| `catalog/*` (inclui os repositórios `products.ts` e `services.ts`, e `purchase.ts`) | `components/catalog/*`, `lib/catalog/*` | `iris-commerce` |
| `products/*`, `services/*`, `gallery/*` | `components/{products,services,gallery}/*`, `lib/gallery.ts` | `iris-commerce` |
| `icons/*` | `components/icons/*` | `iris-commerce` (ícones de plataforma e redes) |
| `lib/{whatsapp,format,routes,links,leads}.ts` | `lib/*` | `iris-commerce` |
| `lib/utils.ts` | `lib/utils.ts` | `iris-theme` |
| `packages/core/styles/iris.css` (fora de `src/`) | `app/globals.css` | `iris-theme` |
| `lib/config.ts` (config resolvido, [§5.3](#53-config-e-conteúdo)) | — | `iris-architect` |

`lib/brand.ts` e `lib/theme-file.ts` vão para `packages/engine/src/theme/`, e os 10 temas de `themes/*.css` vão para `packages/engine/themes/` (dono dos dois: `iris-theme`). Os temas embutidos ficam no `engine` porque quem os lê é o motor de tema (chamado pela CLI e pelo layout); o `core` não lê arquivo de tema. `lib/theme.ts` (script de modo escuro no navegador) vai para `packages/core/src/theme/` (dono: `iris-theme`). `scripts/*.mjs` vão para `packages/engine/src/{codegen,modules}/` (dono: `iris-architect`).

#### 5.1.2 Projeto gerado (o que o cliente recebe, opção A)

```
meu-site/
├─ site.config.ts            ← config (editável, comentado)
├─ content/
│  ├─ home.json              ← seções da home
│  ├─ pages/<slug>.json      ← páginas extras
│  ├─ products/<slug>.json   ← um arquivo por produto
│  └─ services/<slug>.json
├─ themes/                   ← temas próprios do cliente (os embutidos ficam no core)
├─ public/
├─ app/
│  ├─ layout.tsx             ← gerado
│  ├─ globals.css            ← gerado uma vez; o cliente pode acrescentar CSS no fim
│  ├─ (iris)/...             ← rotas geradas. Não editar
│  ├─ iris.registry.generated.tsx
│  └─ fonts.generated.ts
├─ next.config.ts            ← export default withIris({ ... })
├─ tsconfig.json             ← paths dos aliases
├─ AGENTS.md, CLAUDE.md      ← escritos pelo iris-docs
├─ .gitignore                ← node_modules, .next, .env*, next-env.d.ts
├─ iris-example.json         ← lista dos arquivos de exemplo (ver §5.1.4)
└─ package.json              ← "predev"/"prebuild": "iris sync"
```

#### 5.1.3 Como o core acessa o projeto

| O core precisa de | Mecanismo | Assinatura exigida no arquivo do projeto |
|---|---|---|
| Config | Alias `@cbjk_iris/site-config` → `./site.config.ts` | `export const siteConfig = { ... } satisfies SiteConfigInput` |
| Registro de seções | Alias `@cbjk_iris/site-registry` → `./app/iris.registry.generated.tsx` | `export const sectionRegistry: SectionRegistry` |
| Fontes | Prop: o `app/layout.tsx` gerado importa `./fonts.generated` e passa para o `IrisRootLayout` | `export const fontClassName: string` |
| Conteúdo | Loaders do `engine` leem `content/` a partir de `process.cwd()` | — |

Os aliases são configurados em dois lugares, sempre juntos:
- `withIris()` (de `@cbjk_iris/engine/next`) em `turbopack.resolveAlias`, para o build;
- `tsconfig.json` do projeto em `compilerOptions.paths`, para o `tsc` e o editor.

Assinatura: `withIris(siteConfig: SiteConfigInput, nextConfig?: NextConfig): NextConfig`. O `next.config.ts` do projeto já importa o `site.config.ts` (como hoje) e o passa. O `withIris` acrescenta `@cbjk_iris/core` em `transpilePackages`, `@cbjk_iris/engine` em `serverExternalPackages` (obrigatório: [spike-001](./spike-001.md), ponto 7), os aliases em `turbopack.resolveAlias` e os hosts de `images.remoteHosts` em `images.remotePatterns`. Antes disso, valida o config inteiro com `resolveSiteConfig` (zod, no Node): config inválido falha o `next build` e o `next dev` com `SiteConfigError` e a lista de erros em pt-BR (`site.config.ts tem erros:` e uma linha `caminho: mensagem` por erro). Nunca define `webpack`, e falha com mensagem clara se um pacote ficar nas duas listas. Por isso o core só importa o engine em server components. No monorepo, o engine é um workspace fora de `node_modules` e o Turbopack o empacota mesmo assim ([migration-001](./migration-001.md)); o caminho "engine externo" é coberto pelo E2E do `create`.

**Imports internos do core:** sempre relativos (`../lib/config`). Nada de `@/`, que no projeto do cliente resolveria para o `tsconfig` dele.

**Temas:** os embutidos ficam em `@cbjk_iris/engine/themes/*.css`. Um tema em `themes/` do projeto com o mesmo nome tem prioridade.

Arquivos gerados pelo sync, todos com o cabeçalho "Gerado por iris sync. Não edite à mão":

| Arquivo | Conteúdo |
|---|---|
| `app/layout.tsx` | `export { irisMetadata as metadata }` + `RootLayout` que renderiza `<IrisRootLayout fontClassName={fontClassName}>` |
| `app/(iris)/<rota>/page.tsx` | Reexporta `default`, `generateStaticParams` e `generateMetadata` da página do core. Config de segmento (`dynamicParams = false`) escrito literal, porque a doc do Next só garante exports diretos |
| `app/iris.registry.generated.tsx` | Seções `module: "core"` e as dos módulos em `siteConfig.modules`, importadas de `@cbjk_iris/core/sections/<type>` |
| `app/fonts.generated.ts` | Igual ao de hoje |

O `app/globals.css` é gerado só na criação do projeto: `@import "@cbjk_iris/core/styles/iris.css";` e `@source "../node_modules/@cbjk_iris/core/src";`. O cliente pode acrescentar CSS depois dessas linhas.

#### 5.1.4 De `apps/site` para o starter

`apps/site` roda dentro do monorepo, onde `node_modules` fica na raiz e as dependências são `workspace:`. O `create` copia `apps/site` para `packages/create/template/` no `prepack`, com estas reescritas:

| Arquivo | Em `apps/site` | No starter |
|---|---|---|
| `package.json` | `@cbjk_iris/core`, `@cbjk_iris/engine` e `@cbjk_iris/schema` em `dependencies`, e `@cbjk_iris/cli` em `devDependencies`, todos com `"*"` (o npm workspaces resolve pelo monorepo) | As mesmas quatro, com a versão exata do lockstep. `"private"` e `"name"` removidos |
| `.gitignore` | `apps/site/.gitignore` (o arquiteto cria; hoje só existe o da raiz) | Guardado no tarball como `template/gitignore`, sem ponto, porque o `npm pack` descarta `.gitignore`. O `create` renomeia ao copiar |
| `app/globals.css` | `@source "../../../packages/core/src";` | `@source "../node_modules/@cbjk_iris/core/src";` |
| `content/**/*.json` | `"$schema": "<n níveis>/packages/schema/json/<tipo>.schema.json"` | `"$schema": "<n níveis>/node_modules/@cbjk_iris/schema/json/<tipo>.schema.json"` |
| `tsconfig.json` | `"extends": "../../tsconfig.base.json"` | Opções do base copiadas para dentro, sem `extends` |
| `next.config.ts` | `withIris(siteConfig, process.env.TAILNET_ADDRESS ? { allowedDevOrigins: [process.env.TAILNET_ADDRESS] } : {})` | `export default withIris(siteConfig)`, sem `allowedDevOrigins` |
| `eslint.config.mjs`, `postcss.config.mjs` | iguais | iguais (sem caminho para fora do projeto) |
| Excluídos | `e2e/`, `.next/`, `node_modules/`, `test-results/` | — |

Um teste do `create` confere que o `template/` não contém `"*"` como versão de `@cbjk_iris/*`, nem `workspace:`, `packages/`, `tsconfig.base` ou `allowedDevOrigins`. Também confere que `template/gitignore` existe.

**Conteúdo de exemplo no projeto gerado:**

| O que | O `create` faz |
|---|---|
| `name`, `seo.*`, `whatsapp.phone` | Escreve com as respostas (`seo.title` = nome, `seo.titleTemplate` = `%s \| <nome>`, `seo.description` = frase genérica com o nome) |
| `whatsapp.messages`, `footer.text` | Troca por textos genéricos com `{name}`, sem falar de celulares |
| `contact` | Remove `address`, `email`, `hours` e `mapEmbedUrl`. Mantém só `phone`, derivado do WhatsApp |
| `content/home.json` | Escreve a partir do modelo `--home` |
| Produtos, serviços, páginas e fotos da cbjk | Mantidos como exemplo, listados em `iris-example.json`. Com `--no-example-content`, o `create` apaga todos e deixa `content/products/` e `content/services/` vazios |

No fim, o `create` imprime a lista do que o cliente precisa trocar. O `iris check` dá um aviso enquanto algum arquivo de `iris-example.json` existir com o hash original.

Quando a CLI cria um JSON, o `$schema` é calculado: caminho relativo do arquivo novo até `createRequire(root).resolve("@cbjk_iris/schema/json/<tipo>.schema.json")`. Assim vale dentro e fora do monorepo.

**Ordem num clone novo do monorepo:** `npm install` → `npm run build:packages` (tsdown dos 4 pacotes compilados) → `npm run dev` (na raiz: `tsdown --watch` nos pacotes e `next dev` no `apps/site`). O `predev` do `apps/site` chama o bin compilado, então falha com mensagem clara se os pacotes não foram compilados.

### 5.2 Tipo `Product` e botões de compra

Fonte: `packages/schema/src/catalog.ts`. O tipo TS é `z.infer<typeof productSchema>`.

```ts
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);

export const productSchema = catalogItemBase.extend({
  kind: z.literal("product"),
  category: z.string().min(1),
  price: z.number().nonnegative(),                 // à vista
  originalPrice: z.number().positive().optional(), // "de"; > price gera o selo de oferta
  installment: installmentSchema.optional(),
  stockQty: z.number().int().nonnegative(),        // 0 = sob encomenda

  // novos
  whatsappButton: z.boolean().default(true),
  mercadoLivreLink: platformUrl("mercadoLivre").optional(),
  shopeeLink: platformUrl("shopee").optional(),
  amazonLink: platformUrl("amazon").optional(),
  externalLink: httpsUrl.optional(),
}).strict();
```

`catalogItemBase` mantém os campos de hoje: `slug`, `name`, `shortDescription`, `description`, `images` (mín. 1), `specs?`. Ganha um campo novo, comum a produtos e serviços: `order: z.number().int().nonnegative().optional()`. `Service` não ganha os campos de compra nesta rodada.

**Ordem dos itens:** com um JSON por item, a ordem do array de `data/*.ts` deixa de existir. Os loaders (`loadProducts`, `loadServices`) ordenam por `order` crescente; quem não tem `order` vai para o fim; o empate se resolve por slug. Na migração, o arquiteto grava `order` de 10 em 10, na ordem atual do array, para a lista e o `limit` dos destaques não mudarem. O `iris product add` e o `iris service add` gravam `order` = maior existente + 10 (fim da lista), a menos que venha `--order`.

| Campo | Regra | Mensagem de erro |
|---|---|---|
| `whatsappButton` | Booleano. Ausente = `true` (comportamento de hoje) | — |
| `mercadoLivreLink` | `https:`, host em `PLATFORM_HOSTS.mercadoLivre` | "mercadoLivreLink precisa ser um link https do Mercado Livre (ex.: https://produto.mercadolivre.com.br/...)" |
| `shopeeLink` | `https:`, host em `PLATFORM_HOSTS.shopee` | idem, com o exemplo da Shopee |
| `amazonLink` | `https:`, host em `PLATFORM_HOSTS.amazon` | idem, com o exemplo da Amazon |
| `externalLink` | `https:`, qualquer host. Rejeita `http:`, `javascript:`, `data:` e URL sem host | "externalLink precisa começar com https://" |
| Todos os links | Máx. 2048 caracteres. Sem credenciais na URL (`user:pass@`) | — |

Regra de host: aceita quando `hostname === d` ou `hostname.endsWith("." + d)`, para algum `d` da lista. Comparação em minúsculas, depois de `new URL()`. Vale o `hostname` (sem porta), e URL com porta explícita é rejeitada; host com ponto final (`mercadolivre.com.br.`) não casa e também é rejeitado. A URL precisa começar com `https://` em minúsculas (é o `pattern` do JSON Schema). A mesma checagem (`urlProblem` em `packages/schema/src/fields.ts`) vale para `externalLink` e para todo link https do config e das seções.

```ts
export const PLATFORM_HOSTS = {
  mercadoLivre: ["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com"],
  shopee: ["shopee.com.br", "shopee.com", "shope.ee"],
  amazon: ["amazon.com.br", "amazon.com", "amzn.to", "a.co"],
} as const;
```

A lista é dado, não contrato. Candidatos a conferir com links reais pelo `iris-commerce`, e a acrescentar por PR ao arquiteto se forem válidos: `meli.la`, `shp.ee`, `amzn.com`. Até lá, um link curto desses é rejeitado com a sugestão de colar o link completo do anúncio.

#### Botões de compra

Tipos no `schema` (`catalog.ts`). Implementação no core (`catalog/purchase.ts`), do `iris-commerce`:

```ts
export type PurchasePlatform = "whatsapp" | "mercadoLivre" | "shopee" | "amazon" | "external";

export const DEFAULT_BUTTON_ORDER: readonly PurchasePlatform[] =
  ["whatsapp", "mercadoLivre", "shopee", "amazon", "external"];

export interface PurchaseContext {
  /** URL do WhatsApp já montada para este produto (lib/whatsapp); null = sem WhatsApp no site */
  whatsappUrl: string | null;
  /** siteConfig.commerce.buttonOrder já resolvido: as 5 plataformas, cada uma uma vez */
  order: readonly PurchasePlatform[];
  /** siteConfig.texts.products.buttons, já resolvido por resolveTexts */
  texts: PurchaseButtonTexts;
}

export interface PurchaseButton {
  platform: PurchasePlatform;
  href: string;
  /** texto final, já resolvido */
  label: string;
  emphasis: "primary" | "secondary";
  /** variante do Button: primary+whatsapp = "cta"; primary+outro = "default"; secondary = "outline" */
  variant: "cta" | "default" | "outline";
  rel: "noopener noreferrer";
  target: "_blank";
}

export type ResolvePurchaseButtons = (product: Product, ctx: PurchaseContext) => PurchaseButton[];
```

A função é pura: recebe tudo o que precisa e não lê o config. Assim o teste unitário não precisa de mock do alias.

Regras de `commerce.buttonOrder` (validadas no `siteConfigSchema`):
- cada plataforma aparece no máximo uma vez; repetida é erro de validação;
- a plataforma que faltar na lista vai para o fim, na ordem de `DEFAULT_BUTTON_ORDER`. Por isso `ctx.order` sempre tem as 5;
- a ordem não esconde botão. Quem decide se um botão aparece é o produto (o link ou o `whatsappButton`).

| Regra | Valor |
|---|---|
| Ordem | `ctx.order`, que vem de `siteConfig.commerce.buttonOrder`. Vale para o site inteiro: não há ordem por produto ([Q-07](./OPEN-QUESTIONS.md#q-07-ordem-padrão-dos-botões)). Ausente = `DEFAULT_BUTTON_ORDER` |
| Quem aparece | WhatsApp quando `whatsappButton !== false` e `ctx.whatsappUrl` não é nulo; cada marketplace quando o link existe |
| Ênfase e variante | O primeiro da lista é `primary`: variante `cta` se for o WhatsApp, `default` se for outro. Os demais são `secondary`, variante `outline` |
| Nenhum botão | Permitido. O detalhe não mostra ação nem o aviso do WhatsApp. O `iris check` dá um aviso, não um erro ([Q-06](./OPEN-QUESTIONS.md#q-06-produto-sem-nenhum-botão)) |
| Card da grade | Mostra só o botão `primary`, com o rótulo curto `texts.products.buy` ("Comprar agora") e o ícone da plataforma. O detalhe mostra todos, com o rótulo longo |
| Nome do card | Texto visível + texto só para leitor de tela: `fillTemplate(texts.products.cardLabel, { buy, platform })`, com `cardLabel` = `"{buy} ({platform})"` e `platform` vindo de `texts.products.platforms.<plataforma>`. Resultado: "Comprar agora (Shopee)". O nome acessível começa pelo texto visível (WCAG 2.5.3) |
| `rel` | `noopener noreferrer` em todos. `sponsored` fica para o item de afiliados do backlog |
| Nome acessível | No detalhe, o texto visível já diz a plataforma. No card, ver a linha acima. Ícone com `aria-hidden` |
| Ícones | WhatsApp: o de hoje. Mercado Livre, Shopee e Amazon: SVG oficial do kit de marca de cada empresa, com as regras de uso registradas no `CREDITS.md` ([Q-08](./OPEN-QUESTIONS.md#q-08-ícones-do-mercado-livre-e-da-amazon)). Se uma regra proibir o uso por lojistas, a frente para e avisa o dono. Os ícones de marketplace mantêm as cores oficiais, como as regras de marca costumam exigir; é a única exceção à regra "cores sempre por token" do README, e fica registrada em `docs/spec/style-inventory.json`. Externo: `ShoppingBag` do lucide |

Textos (`SiteTexts.products`):

| Chave | Situação | Padrão pt-BR |
|---|---|---|
| `buy` | Mantida. Rótulo curto do card | "Comprar agora" |
| `buyOnWhatsapp` | **Obsoleta.** Se o cliente a definir, vale como `buttons.whatsapp` | — |
| `buttons.whatsapp` | Nova | "Comprar pelo WhatsApp" |
| `buttons.mercadoLivre` | Nova | "Comprar no Mercado Livre" |
| `buttons.shopee` | Nova | "Comprar na Shopee" |
| `buttons.amazon` | Nova | "Comprar na Amazon" |
| `buttons.external` | Nova | "Comprar no site" |
| `cardLabel` | Nova | "{buy} ({platform})" |
| `platforms.{whatsapp,mercadoLivre,shopee,amazon,external}` | Nova | "WhatsApp", "Mercado Livre", "Shopee", "Amazon", "site" |

### 5.3 Config e conteúdo

Fonte: `packages/schema/src/site-config.ts`, `page.ts`, `catalog.ts`, `texts.ts`.

| Arquivo do projeto | Schema | Observação |
|---|---|---|
| `site.config.ts` | `siteConfigSchema` | Igual a hoje, com as mudanças abaixo |
| `content/home.json` | `homeSchema = { sections: Section[] }` | Antes era `siteConfig.home` |
| `content/pages/<slug>.json` | `pageSchema = { title, description?, sections }` | O slug vem do nome do arquivo. Antes era `siteConfig.pages` |
| `content/products/<slug>.json` | `productSchema` sem `kind` e sem `slug` (vêm do diretório e do nome do arquivo) | Antes era `data/products.ts` |
| `content/services/<slug>.json` | `serviceSchema`, idem | Antes era `data/services.ts` |

Mudanças no `SiteConfig`:

| Campo | Antes | Depois |
|---|---|---|
| `home` | `{ sections }` | Removido (vai para `content/home.json`) |
| `pages` | `PageConfig[]` | Removido (vai para `content/pages/`) |
| `modules` | Não existia | `("products" \| "services" \| "gallery")[]`. Fonte de verdade do que está ativo |
| `theme.style` | Não existia | `StyleId` opcional (`z.enum(STYLE_IDS)`). Ausente = o `--iris-style` do tema, ou `sera`. A CLI valida `--style` contra `STYLE_IDS`, nunca contra `ListStyles` |
| `brand.shape` | Não existia | `Partial<ShapeTokens>`: sobrescreve tokens de forma |
| `brand.radius` | `string` | Mantido, como atalho de `brand.shape.radius` |
| `texts` | `SiteTexts` obrigatório e completo | `DeepPartial<SiteTexts>`, mesclado com `DEFAULT_TEXTS` (pt-BR) de `packages/schema/src/texts.ts` |
| `modules` ausente | — | Vale `["products", "services", "gallery"]` (o comportamento de hoje) |
| `commerce.buttonOrder` | Não existia | `PurchasePlatform[]` opcional, global. Ausente = `DEFAULT_BUTTON_ORDER` |

**Config de entrada e config resolvido:**

```ts
// packages/schema/src/site-config.ts
export type SiteConfigInput = z.input<typeof siteConfigSchema>;   // o que o cliente escreve (texts parcial, modules opcional...)
export type SiteConfig = z.output<typeof siteConfigSchema>;       // tudo preenchido
export function resolveSiteConfig(input: SiteConfigInput): SiteConfig; // valida e preenche os padrões
export function resolveTexts(partial?: DeepPartial<SiteTexts>): SiteTexts; // usada por resolveSiteConfig
export type PurchaseButtonTexts = SiteTexts["products"]["buttons"]; // definido em texts.ts, reexportado pelo pacote
```

- O `site.config.ts` do projeto exporta `siteConfig` com `satisfies SiteConfigInput`.
- `resolveTexts` faz o merge profundo com `DEFAULT_TEXTS` e aplica o fallback: se o cliente definiu `products.buyOnWhatsapp` e não `products.buttons.whatsapp`, o primeiro vale como o segundo. Na saída, `SiteTexts.products.buyOnWhatsapp` continua existindo, marcado `@deprecated`, sempre igual ao `buttons.whatsapp` final (o core ainda o lê até o `iris-commerce` trocar). `DEFAULT_TEXTS` não tem essa chave.
- `texts` é parcial em todos os níveis, mas strict: chave de texto desconhecida é erro de validação (pega erro de digitação).
- `resolveSiteConfig` lança `SiteConfigError` (com `issues`), mensagem `site.config.ts tem erros:` e uma linha `caminho: mensagem` por erro. As mensagens padrão do zod saem em pt-BR (locale `ptBR` do zod, passado em cada parse, sem mudar a config global).
- **No core, ninguém importa o alias direto.** Só `packages/core/src/lib/config.ts` importa `@cbjk_iris/site-config` e exporta `export const siteConfig: SiteConfig = applySiteConfigDefaults(raw)`, de `@cbjk_iris/schema/defaults`. Os 53 acessos de hoje a `siteConfig.texts.*` continuam iguais; muda só o import, que o arquiteto troca na migração.
- **Onde o config é validado (R-1 da E4, decisão do dono em 2026-10-21):** `lib/config.ts` vai para o navegador (componentes `"use client"` o importam), e o zod no bundle somava cerca de 62 KB gzip. Por isso o core só preenche os padrões, com `applySiteConfigDefaults` (subpath `@cbjk_iris/schema/defaults`, que não importa zod nem de forma indireta; um teste confere o fonte e o `dist`). A validação completa (`resolveSiteConfig`) roda no Node: no `withIris` (o `next.config` carrega o config, então o build falha antes de renderizar) e, a partir da E6, em `LoadSiteConfig`, `Sync` e `iris check`. Um teste garante que `applySiteConfigDefaults(x)` é igual a `siteConfigSchema.parse(x)` para configs válidos.
- **Validações de segurança do config e das seções** (`packages/schema/src/fields.ts`):
  - **Valor cru primeiro:** link, caminho e imagem recusam, antes de qualquer outra regra, caractere de controle (C0, DEL, C1), espaço, espaço e marca invisível (NBSP, soft hyphen U+00AD, U+200B a U+200F, U+2028, U+2029, controles bidi U+202A a U+202E, U+2060 a U+206F, CGJ U+034F, ALM U+061C, MVS U+180E, BOM), a barra invertida e os pontos unicode `\u3002`, `\uff0e` e `\uff61`. O navegador e o `new URL()` removem ou reinterpretam esses caracteres: `"/\t/evil.com"` vira `//evil.com`, e `"https://mercadolivre.com.br\\@evil.com"` aponta para `evil.com`.
  - **Links** de botão e de menu (`href`, `path`): só rota (`/`, nunca `//`), âncora (`#`), `https:`, `mailto:` e `tel:` (sem espaço). O `mailto:` aceita um único e-mail válido (formato do `z.email()`) e, na query, só `subject` e `body`: `cc`, `bcc`, `to` e outros parâmetros são recusados, e `%0d`/`%0a` em qualquer parte também.
  - **Imagens:** caminho em `public/` (começa com `/`, sem `//` e sem `..`) ou `https:`.
  - **Caminho local** (link ou imagem começando por `/`): também recusa `%2e`, `%2f` e `%5c`, em maiúsculas ou minúsculas.
  - **Valores que vão crus para o `<style>` do layout** (`brand.colors`, `brand.radius`, `brand.shape`, `brand.overrides`, validados por `cssValue`): estrutura permitida, não lista negra. Até 200 caracteres (o limite vem antes das outras regras); só os caracteres permitidos, letras ASCII, dígitos, espaço e `. , % # ( ) / + - * _` (fica de fora todo o resto, como `[` e `]`, que abririam um bloco que engole o resto da folha, `!`, `:`, `=`, `;`, `{ }`, `< >`, `@`, aspas, `\` e qualquer caractere não-ASCII); sem `/*` nem `*/`; parênteses balanceados; toda chamada de função na lista permitida (`calc`, `min`, `max`, `clamp`, `var`, `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`, `color-mix`, sem diferenciar maiúsculas; `url`, `image-set`, `attr`, `env`, `expression` e qualquer outra são recusadas); `var()` só com `--nome` como primeiro argumento. Os padrões `sera` de `SHAPE_TOKENS` passam (um teste confere). Defesa em profundidade: o `renderThemeCss` do engine escapa `</style`.
  - **`brand.fonts`:** nome do Google só com letras, números e espaços; pesos com 3 dígitos ou `variable`; fonte local com caminho relativo à raiz, sem `..`, terminando em `.woff2`, `.woff`, `.ttf` ou `.otf`.
  - **`images.remoteHosts`:** só o host exato, porque um curinga vira proxy aberto no `/_next/image`. Recusa curinga (`*`/`**`), protocolo, caminho, porta, IP, maiúsculas e host sem ponto. Recusa também o host que é exatamente um sufixo de hospedagem pública ou de registro de 2 níveis (`PUBLIC_SUFFIX_HOSTS`: `vercel.app`, `github.io`, `r2.dev`, `ngrok.io`, `googleapis.com`, `com.br`, `co.uk`...), aceitando o subdomínio específico (`meu-site.vercel.app`). E recusa host de rede interna, nome reservado ou DNS curinga, igual ou terminado em `internal`, `local`, `localhost`, `arpa`, `lan`, `corp`, `intranet`, `private`, `home`, `test`, `example`, `invalid`, `onion`, `nip.io`, `sslip.io`, `xip.io`, `localtest.me`, `lvh.me`, `vcap.me` ou `traefik.me` (`PRIVATE_HOST_SUFFIXES`). As duas listas são dado, não contrato: acrescentar um item é PR ao arquiteto. São defesa em profundidade: a defesa principal contra imagem de rede interna é do Next 16, cujo otimizador recusa IP local por padrão (`images.dangerouslyAllowLocalIP`, padrão `false`: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`, linhas 896 a 900, conferido no 16.2.11), e o `withIris` nunca liga essa opção.
  - **`contact.mapEmbedUrl`** (src do iframe do mapa): passa pelas regras de link https acima, com host exato `www.google.com` e caminho `/maps/embed` (qualquer query) ou `/maps` com `output=embed` na query. Qualquer outro host ou caminho é recusado.
  - **Outros campos:** `contact.email` validado como e-mail (`z.email()`); `contact.social` e `leads.endpoint` só `https:`; `theme.name` em formato de slug; `whatsapp.phone` só dígitos (10 a 15); `currency` ISO 4217; `seo.titleTemplate` com `%s`.
- **`widget.html` é área de confiança:** o HTML e os `<script>` colados executam no site, com acesso à página inteira. O schema só exige texto não vazio. Quem edita o conteúdo é o dono do site. A CLI (`iris-cli`) deve exigir uma flag explícita para gravar um widget e dar aviso quando o código tiver `<script>`.
- **`home` e `pages` saíram do config na E5:** passaram para `content/home.json` e `content/pages/<slug>.json`. No `site.config.ts`, as duas chaves agora são chave desconhecida (erro de validação).

Regras de conteúdo:
- **Slug:** `^[a-z0-9]+(?:-[a-z0-9]+)*$`, até 80 caracteres. O nome do arquivo é o slug, o que impede caminho com `..` ou `/`.
- **Slugs reservados para páginas:** `produtos`, `produto`, `servicos`, `servico`, `ultimos-projetos`, `api`, `_next`, `home`, mesmo com o módulo desligado.
- **`$schema` em cada JSON:** caminho relativo para o JSON Schema ([§5.1.4](#514-de-appssite-para-o-starter)). O loader remove a chave `$schema` antes de validar, porque os schemas são `.strict()`.
- **JSON Schema publicado:** gerado com `z.toJSONSchema(schema, { io: "input" })` (campos com padrão ficam opcionais) e com a propriedade `$schema: { type: "string" }` declarada nas 4 raízes de arquivo (`home`, `page`, `product`, `service`; o `section.schema.json` não é raiz de arquivo). Os metadados de campo viram palavras-chave do JSON Schema: `label` → `title`, `example` → `examples`; `ask`, `input` e `order` são da CLI e não vão para o arquivo. A pasta `packages/schema/json/` é gerada no build (`tsdown && node scripts/write-json.mjs`), fica fora do git e vai no tarball.
- **Validação no build:** os loaders do `engine` (`loadHome`, `loadPage`, `loadPages`, `loadProducts`, `loadServices`) validam cada arquivo e param o build com `content/pages/sobre.json → sections[2].items[0].answer: <mensagem>`.
- **Seção de módulo desligado:** erro com as duas saídas: `iris module add gallery` ou remover a seção.
- **Repositórios:** `ProductRepository` e `ServiceRepository` mantêm a assinatura de hoje e ficam em `packages/core/src/catalog/products.ts` e `catalog/services.ts` (um arquivo por módulo, para o isolamento dos módulos continuar valendo). A implementação padrão chama `loadProducts` e `loadServices`. `get(slug)` procura na lista: o slug da URL nunca vira caminho de arquivo.

#### Loaders de conteúdo

Fonte: `packages/engine/src/content/`, exportados só por `@cbjk_iris/engine/content` (não pela raiz do `engine`, que levaria `fs` e zod a quem importa a raiz). Só em código de servidor: usam `fs` e zod. O core os importa só de server components (um teste do core segue o grafo dos arquivos `"use client"` e falha se algum alcançar o engine, o `@cbjk_iris/schema` raiz, o zod ou um módulo do Node).

```ts
export interface ContentOptions { root?: string }                // padrão: process.cwd()
export interface SectionContentOptions extends ContentOptions {
  modules: readonly ModuleId[];                                   // siteConfig.modules: seção de módulo fora da lista é erro
}
export type LoadedPage = Page & { slug: string };

export function loadHome(opts: SectionContentOptions): Promise<Home>;
export function loadPage(slug: string, opts: SectionContentOptions): Promise<LoadedPage | undefined>;
export function loadPages(opts: SectionContentOptions): Promise<LoadedPage[]>;
export function loadProducts(opts?: ContentOptions): Promise<Product[]>;
export function loadServices(opts?: ContentOptions): Promise<Service[]>;
export class ContentError extends Error { readonly diagnostics: Diagnostic[] }
export function formatDiagnostic(d: Diagnostic): string;        // "arquivo → caminho: mensagem"
export const MAX_CONTENT_FILE_BYTES: number;                     // 1 MiB
```

| Regra | Comportamento |
|---|---|
| Raiz | `root` ou `process.cwd()`. Sem a pasta `content/`, `ContentError` ("pasta content/ não encontrada"): um `cwd` errado não vira um site vazio |
| Ausentes | `home.json` ausente = `{ sections: [] }`; pasta `products/`, `services/` ou `pages/` ausente = `[]`; `loadPage` de arquivo ausente = `undefined` |
| Nome de arquivo | Entradas que começam com `.` são ignoradas (`.gitkeep`). O resto precisa ser um arquivo regular `<slug>.json`; subpasta e nome fora do padrão são erro. Em `pages/`, slug reservado é erro |
| Links simbólicos | Recusados dentro de `content/` (arquivo ou pasta), sem ler o alvo: `lstat`, `O_NOFOLLOW` e `realpath` dentro de `content/`. O próprio `content/` pode ser um link, por desenho: ele vira a base, e quem cria esse link é o dono do projeto |
| Arquivos especiais | Só arquivo regular. FIFO, socket e dispositivo são recusados no `lstat`, antes de abrir (o `open` de um FIFO travaria o build); `O_NONBLOCK` é a segunda barreira. Hard link (`nlink > 1`) é recusado |
| `loadPage(slug)` | Slug inválido ou reservado devolve `undefined` sem tocar no disco (o slug pode vir da URL) |
| Leitura | Até 1 MiB por arquivo (o `fstat` recusa antes, e a leitura para em 1 MiB + 1 byte); BOM inicial removido; a raiz do JSON precisa ser um objeto. `$schema`, se existir, precisa ser texto e é removido antes de validar. JSON inválido dá só linha e coluna e um texto fixo, sem repetir nada do arquivo |
| Validação | `productContentSchema`, `serviceContentSchema`, `homeSchema`, `pageSchema`, com as mensagens do zod em pt-BR (`ptBRError`). O loader acrescenta `kind` e `slug` |
| Ordem | Produtos e serviços: `order` crescente, sem `order` no fim, empate pelo slug (ordem de code unit, sem depender do locale). Páginas: pelo slug |
| Erros | Juntos, de todos os arquivos lidos: `content/ tem erros:` e uma linha por erro, `arquivo → caminho: mensagem` (ou `arquivo: mensagem` quando o erro é do arquivo inteiro). `diagnostics` usa o tipo `Diagnostic` do §5.6; seção de módulo desligado tem `hint: "iris module add <id>"`. Cada mensagem e cada caminho com até 200 caracteres (com "…"), porque o zod repete o nome de chave desconhecida; o campo `file` não é truncado (é o caminho relativo, limitado pelo nome no sistema de arquivos); a mensagem do erro lista até 50 linhas e termina em "… e mais N erros", e `diagnostics` guarda todos |
| `modules` | Obrigatório em `loadHome`, `loadPage` e `loadPages`, como lista de `ModuleId`. Faltando ou inválido, `ContentError` com mensagem clara |
| Cache | Nenhum: cada chamada lê de novo. No `next dev`, a edição de um JSON aparece ao recarregar a página (não há recarga automática, porque o JSON não entra no grafo de módulos) |

As rotas de detalhe (`produto/[slug]`, `servico/[slug]`) e as páginas (`[slug]`) têm `dynamicParams = false`: todo o conteúdo é lido no `next build`, e nada de `content/` é lido em tempo de execução.

### 5.4 Tokens de forma e estilos

Fonte da lista: `packages/schema/src/theme/tokens.ts` (`SHAPE_TOKENS`, com nome, tipo, faixa e padrão do `sera`) e `STYLE_IDS`. Os valores de cada preset são do `iris-theme`, em `packages/engine/src/theme/styles.ts`.

Formato de cada entrada de `SHAPE_TOKENS`:

```ts
type ShapeTokenSpec =
  | { name: `--${string}`; kind: "length"; min: string; max: string; units?: ("px" | "rem" | "em")[]; sera: string }
  | { name: `--${string}`; kind: "percentage" | "number"; min: number; max: number; sera: string }
  | { name: `--${string}`; kind: "color" | "shadow"; sera: string }   // shadow aceita "none"
  | { name: `--${string}`; kind: "keyword"; values: string[]; sera: string };
```

Alguns padrões do `sera` são expressões (`var()`, `calc()`, `color-mix()`): o validador de faixa (`ValidateTheme`) precisa aceitá-las. O `--radius` tem padrão `0.625rem`, e o tema sobrescreve. `brand.shape` usa a chave sem o `--`, em kebab-case, como `brand.overrides` (ex.: `{ "radius-control": "9999px" }`; tipo `Partial<ShapeTokens>`, com `ShapeTokenKey` e `SHAPE_TOKEN_KEYS`). Os utilitários congelados da tabela abaixo também estão em `tokens.ts`, como `FROZEN_UTILITIES`; um teste confere que a lista é igual ao `utilities` do `style-inventory.json`. `IRIS_STYLE_VAR` é `"--iris-style"`, e `DEFAULT_STYLE_ID` é `"sera"`.

Os padrões do `sera` foram tirados do código de hoje, para reproduzir o visual atual. A coluna "Consumido por" diz onde cada token entra; o destino de cada classe, ocorrência por ocorrência, está em [`style-inventory.json`](./style-inventory.json).

| Token | Tipo e faixa | Padrão no `sera` | Reproduz hoje | Consumido por |
|---|---|---|---|---|
| `--radius` | comprimento, 0–2rem | o do tema, ou `0.625rem` | `--radius` | escala `rounded-sm`…`rounded-4xl` (já existe) |
| `--radius-control` | comprimento, 0–9999px | `0px` | `rounded-none` | Button, Badge, TabsTrigger, gatilho do Accordion, gatilho e itens do menu de navegação |
| `--radius-card` | comprimento, 0–3rem | `0px` | `rounded-none` | Card e cabeçalho do Card, Sheet, popup e seta do menu de navegação |
| `--radius-media` | comprimento, 0–3rem | `0px` | `*:[img]:rounded-none` | imagens do Card (primeira e última) |
| `--radius-surface` | comprimento, 0–3rem | `var(--radius)` | `rounded-lg` | blocos das seções: cards de serviço, galeria, TextImage, FAQ, LeadForm, depoimentos, mapa do contato, quadro de ícone dos benefícios, imagem principal da ImageGallery; CtaBanner por `rounded-surface-lg` (× 1.4, hoje `rounded-xl`) |
| `--radius-field` | comprimento, 0–9999px | `calc(var(--radius) * 0.8)` | `rounded-md` | campos do LeadForm, miniaturas da ImageGallery |
| `--radius-card-compact` | comprimento, 0–3rem | `0.125rem` | `rounded-xs` (`--radius-xs` do Tailwind 4.3) | CatalogMiniCard e a imagem dele |
| `--border-width` | comprimento, 0–4px | `1px` | `border` | controles (`border-control`: Button, campos, gatilhos do Accordion e das Tabs, botões redondos) e separadores (`divider-*`, inclusive `divider-between-y` na lista de especificações do produto, hoje `divide-y`) |
| `--surface-border-width` | comprimento, 0–4px | `1px` | `border` | contorno dos blocos com borda (`border-surface`): cards de serviço, CatalogMiniCard, FAQ, LeadForm, depoimentos, mapa do contato, imagem principal da ImageGallery |
| `--card-ring-width` | comprimento, 0–4px | `1px` | `ring-1` | contorno do Card e do popup do menu de navegação |
| `--card-ring-color` | cor CSS | `color-mix(in oklab, var(--foreground) 5%, transparent)` | `ring-foreground/5` | contorno do Card |
| `--popover-ring-color` | cor CSS | `color-mix(in oklab, var(--foreground) 10%, transparent)` | `ring-foreground/10` | contorno do popup do menu de navegação (`surface-popover`) |
| `--shadow-card` | sombra CSS ou `none` | `var(--shadow-sm)` | `shadow-sm` | Card em repouso, depoimentos |
| `--shadow-card-hover` | sombra CSS ou `none` | `var(--shadow-md)` | `hover:shadow-md` | Card de produto e serviço em hover, listas de rolagem |
| `--shadow-overlay` | sombra CSS ou `none` | `var(--shadow-md)` | `shadow-md` | Sheet, menu de navegação, popovers, botões de rolagem da lista de produtos |
| `--shadow-control` | sombra CSS ou `none` | `var(--shadow-xs)` | `shadow-xs` (LeadForm) | campos e botões |
| `--surface-alpha` | porcentagem, 0–100% | `100%` | fundo opaco | Card, Sheet, popovers |
| `--blur` | comprimento, 0–24px | `0px` | sem blur | superfícies (só tem efeito com alpha < 100%) |
| `--header-alpha` | porcentagem, 0–100% | `86%` | `bg-background/86` | header fixo |
| `--header-blur` | comprimento, 0–40px | `40px` | `backdrop-blur-2xl` | header fixo |
| `--overlay-alpha` | porcentagem, 0–100% | `20%` | `bg-black/20` | fundo escurecido do Sheet |
| `--overlay-blur` | comprimento, 0–24px | `8px` | `backdrop-blur-sm` (`--blur-sm: 8px` no Tailwind 4.3) | fundo escurecido do Sheet |
| `--density` | número, 0.75–1.25 | `1` | `py-12 md:py-16` | padding vertical do `SectionShell`, espaçamento do Card, gaps de grade |
| `--control-case` | `uppercase` ou `none` | `uppercase` | `uppercase` | Button, Badge |
| `--control-tracking` | comprimento em `em`, 0–0.2em | `0.1em` | `tracking-widest` | Button, Badge; × 0.5 em `case-control-compact` (botão do CatalogCard em tela estreita, hoje `tracking-wider`) |
| `--control-weight` | 400–800 | `600` | `font-semibold` | Button, Badge, TabsTrigger, gatilho do Accordion |
| `--title-case` | `uppercase` ou `none` | `uppercase` | `uppercase` | CardTitle, título do Sheet, TabsTrigger |
| `--title-tracking` | comprimento em `em`, 0–0.2em | `0.05em` | `tracking-wider` | idem |
| `--label-case` | `uppercase` ou `none` | `uppercase` | `uppercase` | breadcrumb, rótulo de categoria (CatalogCard, CatalogMiniCard) |
| `--label-tracking` | comprimento em `em`, 0–0.2em | `0.025em` | `tracking-wide` | idem |
| `--ring-width` | comprimento, 1–4px | `2px` | `ring-2` | foco visível de todos os controles; borda da miniatura escolhida da ImageGallery (`border-selected`, hoje `border-2`) |

Mais o identificador `--iris-style` (no `:root` do tema), que diz o estilo preferido do tema.

Mudança aceita no `sera`: hoje badge e tabs usam foco de 3px e o botão, de 2px. Todos passam a usar `--ring-width` (2px). O `outline-1` que tabs e menu de navegação desenham junto com o anel no foco também sai: o foco de todo controle passa a ser só `ring-focus`. As setas do `FadeCarousel` ficam fora desta mudança: o foco delas (outline de 2px com afastamento de 2px) continua igual, como `exception:carousel-focus`. O foco não aparece nas capturas de linha de base.

**Utilitários congelados**, definidos no `iris.css` do core. Os componentes usam estes nomes e nada fixo:

| Utilitário | Faz |
|---|---|
| `rounded-control`, `rounded-card`, `rounded-media`, `rounded-surface`, `rounded-field`, `rounded-card-compact` | `border-radius` pelo token |
| `rounded-surface-lg` | `border-radius: calc(var(--radius-surface) * 1.4)` (CtaBanner) |
| `shadow-card`, `shadow-card-hover`, `shadow-overlay`, `shadow-control` | `box-shadow` pelo token |
| `surface-card` | fundo `--card` com `--surface-alpha`, `backdrop-filter: blur(var(--blur))`, contorno com `--card-ring-width` e `--card-ring-color` |
| `surface-popover` | fundo `--popover` com `--surface-alpha` e `--blur`, contorno com `--card-ring-width` e `--popover-ring-color` |
| `surface-header` | fundo `--background` com `--header-alpha` e `--header-blur` |
| `surface-overlay` | fundo preto com `--overlay-alpha` e `--overlay-blur` |
| `border-control` | borda sólida com `--border-width` (a cor continua na classe de cor do componente, ex.: `border-input`) |
| `border-surface` | borda sólida com `--surface-border-width` (cor idem) |
| `border-selected` | borda sólida com `--ring-width` (cor idem) |
| `divider-t`, `divider-b`, `divider-l`, `divider-r` | borda de um lado só, com `--border-width` (separadores) |
| `divider-between-y` | borda entre filhos empilhados (como `divide-y`), com `--border-width` |
| `ring-focus` | anel de foco com `--ring-width` (só a largura: a cor do anel é do tema e continua no componente) |
| `py-section` | padding vertical da seção multiplicado por `--density` |
| `p-card`, `gap-density` | espaçamento interno do Card e gap de grade multiplicados por `--density` |
| `weight-control` | `font-weight` pelo `--control-weight` |
| `case-control`, `case-title`, `case-label` | `text-transform` e `letter-spacing` pelos tokens |
| `case-control-compact` | como `case-control`, com `letter-spacing: calc(var(--control-tracking) * 0.5)` |

**Estas tabelas saíram do inventário.** A primeira versão foi escrita à mão e, nas duas revisões, sempre sobrou alguma classe sem destino (ex.: `rounded-lg` em 11 seções, `rounded-xl` no CtaBanner, `rounded-md` e `rounded-xs` em LeadForm, ImageGallery e CatalogMiniCard, `border-2` na miniatura da galeria). O inventário por script ([§6.1](#61-iris-architect-arquitetura-e-contratos), passo 3, feito em 2026-10-20) acrescentou 5 tokens (`--radius-surface`, `--radius-field`, `--radius-card-compact`, `--surface-border-width`, `--popover-ring-color`) e os utilitários que os consomem. O processo continua valendo:

1. `scripts/style-inventory.mjs` lista cada ocorrência de classe de forma fixa em `packages/core/src` (`rounded-*`, `shadow-*`, `backdrop-blur*`, `ring-<n>`, `border-<n>`, `uppercase`, `tracking-*`, `font-(medium|semibold|bold)` em controles, `bg-*/<n>` em superfícies), com arquivo e linha. Ele lê toda string do código pelo parser do TypeScript (atributos de JSX, argumentos do `cn()`, base e variantes do `cva`, objetos, template literals) e o `@apply` de `.css`; comentários e texto de JSX não contam, nem strings que com certeza não são lista de classes (tipo literal, operando de `===`/`!==`, rótulo de `case` e, quando o valor é uma palavra só, atributo JSX cujo nome não contém `class` e valor das chaves `variant` e `size`; assim o nome de variante `variant="outline"` não vira ocorrência, mas `size: "rounded-lg h-9"` e `tw="rounded-lg h-9"` são lidos). Também lista a propriedade arbitrária de forma entre colchetes (`[border-radius:4px]`, `[box-shadow:…]`, `[backdrop-filter:…]`, `[text-transform:…]`, `[letter-spacing:…]`, `[font-weight:…]`, `[outline…]`, `[border…-width:…]`; variável CSS como `[--card-spacing:…]` não conta) e o estilo inline com propriedade de forma (`style={{ borderRadius, boxShadow, backdropFilter, textTransform, letterSpacing, fontWeight, border*Width, outline… }}`), registrado como `style:<prop>`. Para não deixar nada de fora, também lista `border` e `border-<lado>` sem número (largura de 1px implícita), `divide-x`/`divide-y` (com ou sem número) e cor de `divide` com opacidade, `blur-*`, `ring-offset-<n>`, cor de anel e de outline com opacidade, `outline` com ou sem número, `outline-offset-<n>`, as outras classes de caixa e todos os pesos `font-*`; a decisão "é controle", "é superfície" fica no JSON. Não contam os utilitários congelados nem classes sob variante `style-<id>:`.
2. O arquiteto grava em `docs/spec/style-inventory.json` o destino de cada ocorrência: um utilitário congelado ou uma exceção justificada. Cada entrada casa por arquivo e classe exata (com as variantes, ex.: `hover:shadow-md`), com `count`, e `near` (trecho da linha) quando a mesma classe do mesmo arquivo tem destinos diferentes. O iris-theme mantém os prefixos de variante ao trocar (`hover:shadow-md` → `hover:shadow-card-hover`). Token que faltar entra em `SHAPE_TOKENS` antes da tag, com o padrão do `sera` igual ao valor de hoje (ex.: `--radius-surface: var(--radius)` para os `rounded-lg` das seções).
3. `node scripts/style-inventory.mjs --check` sai com 0 só se toda ocorrência tiver destino e nenhuma entrada do JSON estiver obsoleta (entrada que acha menos ocorrências que o `count`). Entrada obsoleta é erro, não aviso: quem troca ou apaga uma classe atualiza o JSON no mesmo PR, revisado pelo arquiteto.

Depois da tag, o mesmo script, com `--after`, é o teste do `iris-theme`: nenhuma ocorrência que não seja exceção pode sobrar, e vale a mesma regra de entrada obsoleta.

**Estilos embutidos** (`STYLE_IDS`, [Q-09](./OPEN-QUESTIONS.md#q-09-estilos-embutidos)):

| `data-style` | Resumo |
|---|---|
| `sera` (padrão) | O visual de hoje: cantos retos, botões em caixa alta, sombra leve |
| `soft` | Cantos arredondados, sombras suaves, texto sem caixa alta |
| `glass` | Superfícies translúcidas (`--surface-alpha: 70%`, `--blur: 12px`), contorno claro |
| `flat` | Sem sombra, contorno de 1px, cantos retos, sem caixa alta |

**Convenção de variantes:**
- O `iris.css` declara um `@custom-variant style-<id>` por estilo embutido, que vale quando o `<html>` tem `data-style="<id>"`.
- Use variante só para o que token não resolve (ex.: brilho interno no `glass`, gradiente). No máximo 3 classes `style-*` por elemento. Mais que isso indica que falta um token.
- O `cva` fica para `variant` e `size`. Ele não escolhe estilo.
- **Proibido em componentes do core** (o teste é o grep do [§6.2](#62-iris-theme-sistema-de-temas)): `rounded-*` com valor fixo, `shadow-*` fixo, `backdrop-blur*` fixo, `ring-<n>` de superfície, `uppercase` e `tracking-*` fixos.
- **Exceções permitidas**, marcadas em `docs/spec/style-inventory.json` com `"to": "exception:<id>"`. Exceção nova é PR ao arquiteto.
  - `exception:round`: `rounded-full` em avatar, indicador e botão redondo do carrossel (inclusive os botões de rolagem da lista de produtos) e botão de ícone de rede social.
  - `exception:photo`: blur, escurecimento e transparência sobre foto no `HeroSection` e no `FadeCarousel` (texto branco sobre imagem, como a regra de cores do README).
  - `exception:state-color`: cor de estado com opacidade (hover, ativo, aberto, inválido, variante `destructive`), inclusive a cor do anel de foco. É cor do tema, não forma.
  - `exception:tint`: tom de cor com opacidade sobre fundo opaco (faixa de seção, rodapé, quadro de ícone, avatar sem foto). Não há conteúdo atrás, então não é superfície translúcida.
  - `exception:text-weight`: peso de fonte em texto que não é controle (títulos, links de texto, rótulos, preço, logo em texto). Só o peso dos controles é token (`--control-weight`). Também fica aqui o gatilho do menu de navegação: é controle, mas o peso de hoje (`font-medium`, 500) difere do `--control-weight` do `sera` (600), e trocá-lo mudaria o visual.
  - `exception:carousel-focus`: foco das setas do `FadeCarousel` (`outline`, `outline-2`, `outline-offset-2`), mantido como hoje para preservar o visual do `sera`.
  - `exception:reset`: classe que zera uma largura herdada (`border-0` no Badge, `ring-0` no foco do link dentro do menu).

**Ordem das camadas** (cada uma sobrescreve a anterior):

```
1. preset do estilo     engine/theme/styles.ts      (theme.style, ou --iris-style do tema, ou "sera")
2. tema                 themes/<nome>.css           (:root e .dark, inclusive tokens de forma)
3. marca                brand.colors e brand.shape
4. ajustes              brand.overrides             (cores, por modo)
```

**Compatibilidade de temas:** um `.css` com só `:root` e `.dark` de cores (todos os de hoje, e tudo o que o `theme:add` baixa do tweakcn) continua válido sem mudança. Os tokens de forma que faltarem vêm do preset. Um token de forma com valor fora da faixa para o sync com arquivo, token e faixa esperada. Um token desconhecido com nome de forma gera aviso.

**Acessibilidade e desempenho:**
- `@media (prefers-reduced-transparency: reduce)`: todos os `*-alpha` em 100%, todos os blurs em 0.
- O aviso de contraste mede o texto do card sobre a mistura de `--card` (com alpha) e `--background`.
- `--density` não pode deixar um controle com menos de 40px de altura.

O `IrisRootLayout` emite `data-style="<id>"` no `<html>` e as variáveis no `<style>` do `<head>`, como já faz com as cores.

### 5.5 Formato do schema de seção

Fonte: `packages/schema/src/sections/<type>.ts`, um arquivo por seção, reunidos em `sections/index.ts`.

```ts
// packages/schema/src/sections/faq.ts
import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const faq = defineSection({
  type: "faq",
  module: "core",
  label: "Perguntas frequentes",
  description: "Perguntas e respostas, com dados estruturados para o Google.",
  fields: sectionBase.extend({
    items: z
      .array(
        z.object({
          question: z.string().min(1).meta({ label: "Pergunta" }),
          answer: z.string().min(1).meta({ label: "Resposta", input: "multiline" }),
        }),
      )
      .min(1)
      .meta({ label: "Perguntas", ask: "always" }),
  }),
  presets: [
    { id: "basico", label: "3 perguntas de exemplo", value: { title: "Dúvidas frequentes", items: [/* ... */] } },
  ],
  limits: { maxPerPage: 1 },
});
```

`defineSection` devolve `{ type, module, label, description, schema, presets, limits }`, em que `schema = fields.extend({ type: z.literal(type) }).strict()`.

| Chave da definição | Tipo | Obrigatória | Uso |
|---|---|---|---|
| `type` | `string` kebab-case | sim | discriminante da união, nome do componente no registro |
| `module` | `"core" \| "products" \| "services" \| "gallery"` | sim | substitui `coreSections` e `modules[].sections` |
| `label`, `description` | `string` pt-BR | sim | lista de seções na CLI, JSON Schema, editor futuro |
| `fields` | `z.ZodObject` | sim | campos da seção. Parte de `sectionBase` (`id?`, `title?`, `subtitle?`), menos o `hero` |
| `presets` | `{ id, label, value }[]` | não | conteúdo inicial oferecido pelo `iris section add --preset` |
| `limits` | `{ maxPerPage?: number; homeOnly?: boolean }` | não | validação extra no build e na CLI |

Metadados de campo (`FieldMeta`, via `.meta()`):

| Chave | Tipo | Padrão | Uso |
|---|---|---|---|
| `label` | `string` | — | Obrigatória quando o campo é perguntado (um teste garante) |
| `description` | `string` | — | Ajuda na CLI e no hover do JSON |
| `example` | `string` | — | Placeholder da pergunta e exemplo no erro |
| `input` | `"text" \| "multiline" \| "url" \| "image" \| "number" \| "select" \| "multiselect" \| "confirm" \| "icon" \| "link"` | inferido do tipo zod | Tipo de pergunta |
| `ask` | `"always" \| "optional" \| "never"` | obrigatório → `always`; opcional → `never` | Se a CLI pergunta. `optional` = pergunta com "deixar em branco" |
| `order` | `number` | ordem do objeto | Ordem das perguntas |

Regras:
- `.meta()` vem por último, depois de `.optional()` e `.default()`, porque o zod guarda o metadado na instância.
- Todos os objetos são strict, em todos os níveis (inclusive itens de lista): sem isso, uma chave com erro de digitação dentro de `items` seria descartada sem aviso.
- `defineSection` valida na chamada e lança erro: `type` fora de kebab-case, metadado fora de `FieldMeta` (`fieldMetaSchema`), campo perguntado (`ask` diferente de `never`, inclusive dentro de listas, objetos e uniões) sem `label`, ou preset que não valida. Não há module augmentation do zod para tipar o `.meta()`: mudaria o zod de quem instala o pacote. Funções auxiliares: `fieldMeta(schema)`, `fieldAsk(schema)`.
- `limits` em uso: `hero` e `faq` com `maxPerPage: 1` (o Google aceita um FAQPage por página). `homeSchema` e `pageSchema` validam os limites.
- `widget`: o campo `html` executa no navegador (área de confiança, ver §5.3).
- Presets: um preset genérico em pt-BR (sem falar de um ramo) para cada seção com lista obrigatória (`hero`, `benefits`, `stats`, `testimonials`, `faq`). Acrescentar preset é dado, não contrato.
- O pacote exporta `sectionDefinitions`, `sectionSchema`, `getSectionDefinition(type)`, `sectionsOfModule(module)` e `SECTION_TYPES`; as definições individuais não são exportadas da raiz.
- `SectionRegistry` (`packages/schema/src/registry.ts`) não importa React (regra 5): `type SectionComponent<T> = (props: { section: SectionOf<T> }) => unknown`, que aceita componente síncrono e assíncrono; o `RenderSections` do core faz o cast para `ComponentType`.
- A união é `z.discriminatedUnion("type", definitions.map((d) => d.schema))`. `Section` e `SectionOf<T>` saem dela por `z.infer`.
- O `schema` publica `json/section.schema.json`, `page.schema.json`, `home.schema.json`, `product.schema.json` e `service.schema.json`, gerados no build ([§5.3](#53-config-e-conteúdo)).
- O `core` exporta um componente por `type` em `@cbjk_iris/core/sections/<type>`. Um teste **do core** (`packages/core/test/sections.test.ts`) falha se houver definição sem componente, ou o contrário.
- `syncRegistry()` gera `app/iris.registry.generated.tsx` com as seções `module: "core"` e as dos módulos em `siteConfig.modules`. É o `modules:sync` de hoje, com outra fonte.

O manifesto de módulos sai do `modules.json` e vai para `packages/schema/src/modules.ts`:

```ts
export const MODULES = [
  { id: "products", name: "Produtos", routes: ["produtos", "produto/[slug]"], menu: ["/produtos"],
    contentDir: "content/products" },
  { id: "services", name: "Serviços", routes: ["servicos", "servico/[slug]"], menu: ["/servicos"],
    contentDir: "content/services" },
  { id: "gallery", name: "Últimos projetos", routes: ["ultimos-projetos"], menu: ["/ultimos-projetos"],
    contentDir: "public/ultimos_projetos" },
] as const;
```

As seções de cada módulo vêm de `definition.module`, não do manifesto. Assim não há duas listas. O campo `dependencies` do `modules.json` some: com o core como pacote, `image-size` e `react-photo-album` passam a ser dependências do `@cbjk_iris/core`, e desligar a galeria não pede `npm uninstall`.

**Arquivos de seção do core:** o arquiteto cria, antes da tag, os 13 arquivos `packages/core/src/sections/<type>.tsx`, cada um só com `export { XxxSection as default } from "<caminho do componente>"`. Os das seções de módulo apontam para `products/`, `services/` e `gallery/`. Esses 13 arquivos de reexport são do arquiteto ([§5.8](#58-arquivos-de-posse-exclusiva-do-iris-architect)); os componentes para onde apontam são das frentes. O subpath `./sections/*` do `exports` aponta para `./src/sections/*.tsx`, e o registro gerado faz `import Xxx from "@cbjk_iris/core/sections/<type>"`.

### 5.6 API do `engine` usada pela CLI

A CLI e o tema andam em paralelo. Esta interface é o que os separa. Tipos em `packages/schema/src/engine-api.ts`. Implementação no `engine`: o arquiteto faz `codegen`, `modules` e `content`; o `iris-theme` faz `theme`.

```ts
export interface Diagnostic {
  level: "error" | "warning";
  file: string;           // relativo à raiz do projeto
  path?: string;          // ex.: "sections[2].items[0].answer" ou "--radius-card"
  message: string;        // pt-BR
  hint?: string;          // comando ou correção
}
export interface SyncResult { changed: string[]; upToDate: boolean; diagnostics: Diagnostic[] }
export interface ThemeInfo { name: string; source: "builtin" | "project"; style?: StyleId }
export interface StyleInfo { id: StyleId; label: string; description: string }
export interface FileChange { path: string; action: "create" | "update" | "delete" }  // também usado no envelope --json

// projeto (iris-architect)
export type LoadSiteConfig = (root: string) => Promise<SiteConfig>; // importa site.config.ts pelo Node (type stripping) e resolve

// theme (iris-theme)
export type ListThemes = (root: string) => ThemeInfo[];
export type ListStyles = () => StyleInfo[];
export type ValidateTheme = (root: string, name: string) => Diagnostic[];
export type SyncBrand = (root: string, opts: { check: boolean }) => SyncResult; // ex-brand:sync: fontes + contraste
export type ImportThemeSource =                      // exatamente uma fonte
  | { tweakcn: string; url?: never; shadcn?: never }
  | { url: string; tweakcn?: never; shadcn?: never }
  | { shadcn: string; tweakcn?: never; url?: never };
export type ImportTheme = (source: ImportThemeSource, as?: string) => Promise<{ name: string; css: string }>; // ex-theme:add, sem escrever

// codegen, modules, content (iris-architect)
export type SyncRegistry = (root: string, opts: { check: boolean }) => SyncResult;
export type SyncRoutes = (root: string, opts: { check: boolean }) => SyncResult;
export type Sync = (root: string, opts: { check: boolean }) => SyncResult;      // brand + registry + routes
export type CheckContent = (root: string) => Diagnostic[];
export type RemoveModuleContent = (root: string, id: ModuleId) => { changes: FileChange[] };
```

`LoadSiteConfig` usa o type stripping do Node, como o `brand:sync` já faz hoje. Por isso o `site.config.ts` só pode usar sintaxe apagável (sem `enum`, sem `namespace`) e `import type` para tipos. O `iris check` avisa se não for o caso.

`SyncBrand` resolve o `font-data.json` do Next com `createRequire(root).resolve("next/dist/compiled/@next/font/dist/google/font-data.json")`, nunca com caminho fixo de `node_modules`, porque no monorepo ele fica na raiz.

**Implementação mínima do arquiteto:** antes do congelamento, o arquiteto entrega todas as funções desta seção, inclusive as de tema: `ListThemes`, `ValidateTheme` (só parse e faixas), `ListStyles` (devolve os 4 ids de `STYLE_IDS`; enquanto o preset de um estilo não existe, o sync usa os valores do `sera`, emite o `data-style` pedido e dá um aviso), `SyncBrand` e `ImportTheme` (já com as regras de segurança: só `https:`, e só variáveis CSS dentro de `:root` e `.dark`, o resto descartado). Depois da tag, o `iris-theme` evolui as de tema sem mudar a assinatura. Assim a CLI nunca espera o tema.

Até a CLI existir, `apps/site/package.json` tem scripts que chamam essas funções (um `.mjs` de uma linha). É isso que `npm run sync:check` roda.

**Subpaths de `exports`, já declarados pelo arquiteto:**

| Pacote | Subpaths |
|---|---|
| `schema` | `.`, `./defaults` (sem zod: `applySiteConfigDefaults`, `resolveTexts`, `DEFAULT_TEXTS`, `DEFAULT_BUTTON_ORDER`, `DEFAULT_MODULES` e os tipos), `./json/*` |
| `engine` | `.`, `./next`, `./theme`, `./codegen`, `./content`, `./themes/*` |
| `core` | `./app/*`, `./sections/*`, `./styles/*` |

**Exports do `@cbjk_iris/schema`** (lista fechada, sem `export *`; `packages/schema/test/exports.test.ts` congela os nomes, e um nome novo é mudança de contrato):

| Grupo | Valores | Tipos |
|---|---|---|
| §5.2 catálogo | `productSchema`, `serviceSchema`, `catalogItemBase`, `installmentSchema`, `productContentSchema` e `serviceContentSchema` (formato de `content/<tipo>/<slug>.json`, sem `kind` e `slug`, para os loaders e a CLI), `PLATFORM_HOSTS`, `platformUrl`, `httpsUrl`, `PURCHASE_PLATFORMS`, `DEFAULT_BUTTON_ORDER` | `Product`, `ProductInput`, `Service`, `ServiceInput`, `CatalogItem`, `Spec`, `Installment`, `ProductFilter`, `MarketplacePlatform`, `PurchasePlatform`, `PurchaseContext`, `PurchaseButton`, `ResolvePurchaseButtons` |
| §5.3 config | `siteConfigSchema`, `resolveSiteConfig`, `SiteConfigError`, `applySiteConfigDefaults`, `COLOR_TOKENS`, `slugSchema` | `SiteConfigInput`, `SiteConfig`, `MenuItem`, `BrandConfig`, `BrandColors`, `BrandFont`, `SiteLogo`, `ContactInfo`, `LeadsConfig`, `FooterConfig`, `CommerceConfig`, `ColorMode`, `ColorToken`, `ColorTokens`, `SocialNetwork`, `SiteLink` |
| §5.3 textos | `DEFAULT_TEXTS`, `resolveTexts` | `SiteTexts`, `PurchaseButtonTexts`, `DeepPartial` |
| §5.3 conteúdo | `homeSchema`, `pageSchema`, `pageSlugSchema`, `RESERVED_PAGE_SLUGS`, `formatIssuePath` (caminho `sections[2].items[0].answer` das mensagens), `ptBRError` (mensagens do zod em pt-BR, passadas por parse: `{ error: ptBRError }`) | `Home`, `Page` |
| §5.4 forma | `SHAPE_TOKENS`, `SHAPE_TOKEN_KEYS`, `STYLE_IDS`, `DEFAULT_STYLE_ID`, `IRIS_STYLE_VAR`, `FROZEN_UTILITIES` | `ShapeTokenSpec`, `ShapeTokenName`, `ShapeTokenKey`, `ShapeTokens`, `StyleId` |
| §5.5 seções e módulos | `defineSection`, `sectionBase`, `fieldMeta`, `fieldAsk`, `fieldMetaSchema`, `sectionDefinitions`, `sectionSchema`, `getSectionDefinition`, `sectionsOfModule`, `SECTION_TYPES`, `SECTION_ICONS` (dado: ícone novo é PR ao arquiteto), `MODULES`, `MODULE_IDS`, `DEFAULT_MODULES` | `FieldMeta`, `SectionDefinition`, `SectionModule`, `SectionLimits`, `SectionPreset`, `Section`, `SectionInput`, `SectionType`, `SectionOf`, `SectionIcon`, `LeadField`, `ModuleId`, `SectionComponent`, `SectionRegistry`, e um alias por seção, usado pelo core: `HeroSection`, `HeroSlide`, `BenefitsSection`, `TextImageSection`, `CtaBannerSection`, `TestimonialsSection`, `StatsSection`, `FaqSection`, `ContactSection`, `LeadFormSection`, `WidgetSection`, `ProductsSection`, `ServicesSection`, `GallerySection` |
| §5.6 engine | — | `Diagnostic`, `SyncResult`, `ThemeInfo`, `StyleInfo`, `FileChange`, `ImportThemeSource`, `LoadSiteConfig`, `ListThemes`, `ListStyles`, `ValidateTheme`, `SyncBrand`, `ImportTheme`, `SyncRegistry`, `SyncRoutes`, `Sync`, `CheckContent`, `RemoveModuleContent` |
| §5.7 CLI | `EXIT_CODES`, `cliResultSchema` | `CliResult`, `CliError`, `CliErrorCode` |

`./defaults` exporta só `applySiteConfigDefaults`, `resolveTexts`, `DEFAULT_TEXTS`, `DEFAULT_BUTTON_ORDER` e `DEFAULT_MODULES`, e os tipos `SiteConfig`, `SiteConfigInput`, `SiteTexts`, `PurchaseButtonTexts`, `DeepPartial`, `PurchasePlatform` e `ModuleId`. Os auxiliares de validação (`urlProblem`, `siteHref`, `imageSrc`, `cssValue`, `hostnameSchema`, as listas de hosts) são internos: os testes do pacote os importam pelo caminho do arquivo.

### 5.7 Interface pública da CLI

#### Comandos

| Comando | Argumentos e flags próprias | O que faz |
|---|---|---|
| `create-iris-site [dir]` | `--name`, `--whatsapp`, `--no-example-content`, `--modules <lista>`, `--theme`, `--style`, `--color-mode`, `--home <loja\|servicos\|institucional\|em-branco>`, `--pm <npm\|pnpm\|yarn\|bun>`, `--no-install`, `--no-git` | Copia o starter, aplica as respostas, roda o sync, instala e faz o primeiro commit |
| `iris page add [slug]` | `--title`, `--description`, `--sections <tipo,...>`, `--menu`, `--menu-title` | Cria `content/pages/<slug>.json` e, com `--menu`, o item de menu |
| `iris page list` / `iris page remove <slug>` | | Lista e remove (e tira do menu) |
| `iris section add <página\|home> <tipo>` | `--preset <id>`, `--at <índice>`, `--set <caminho>=<valor>` (repetível), `--from-json <arquivo\|->` | Acrescenta uma seção validada |
| `iris product add [slug]` | uma flag por campo do schema ([regra de nomes](#nomes-das-flags-de-campo)) | Cria `content/products/<slug>.json` |
| `iris product list` / `iris product remove <slug>` | `--category` no list | |
| `iris service add [slug]` / `list` / `remove <slug>` | idem | |
| `iris theme list` | | `ListThemes` |
| `iris theme set <nome>` | `--color-mode`, `--style` | Muda `theme.*` no `site.config.ts` e roda o sync |
| `iris theme add <nome\|url>` | `--shadcn <cor>`, `--as <nome>` | `ImportTheme` e grava em `themes/`. Aceita só https e reescreve o CSS, mantendo apenas variáveis em `:root` e `.dark` |
| `iris style list` / `iris style set <id>` | | `ListStyles`; `set` muda `theme.style` |
| `iris module list` / `add <id>` / `remove <id>` | | Muda `modules` e o menu, remove seções do módulo da home e das páginas (pede confirmação, ou `--yes`) e roda o sync |
| `iris sync` | `--check` | `Sync`. Com `--check`, falha se algo estiver desatualizado |
| `iris check` | | `CheckContent` + validação do config, sem escrever nada |

`iris doctor` e `iris upgrade` estão no backlog.

Campos obrigatórios no modo não interativo:

| Comando | Obrigatórios | Padrões |
|---|---|---|
| `create-iris-site` | `[dir]`, `--name`, `--whatsapp` | `--no-example-content` desligado; `--modules` = os três; `--home` = `loja` com products, `servicos` com services sem products, senão `institucional`; `--theme neutral`; `--style sera`; `--color-mode system`; `--pm` detectado |
| `page add` | `[slug]`, `--title` | sem seções, fora do menu |
| `section add` | `<página>`, `<tipo>` e os campos `ask: "always"` da seção (ou `--preset`) | posição no fim |
| `product add`, `service add` | `[slug]` e os campos obrigatórios do schema | os `.default()` do schema |
| `theme set`, `style set`, `module add/remove`, `*remove` | o argumento posicional | — |

#### Flags globais

| Flag | Efeito |
|---|---|
| `-y, --yes` | Nunca pergunta. Opcionais ficam no padrão do schema. Confirmação destrutiva vale como aceita. Obrigatório faltando → saída 3 |
| `--json` | Saída única em JSON no stdout (envelope abaixo). Logs vão para o stderr. Implica `--yes` |
| `--dry-run` | Mostra o que mudaria e não escreve |
| `--cwd <dir>` | Raiz do projeto. Padrão: o diretório atual |
| `--no-sync` | Não roda o sync depois de escrever |
| `--force` | Sobrescreve item existente |
| `--no-interactive` | Igual a `--yes`, para quem prefere o nome explícito |
| `-v, --verbose`, `--version`, `-h, --help` | |

#### Nomes das flags de campo

Geradas do schema, nunca escritas à mão: kebab-case do nome do campo de primeiro nível.

| Campo | Flag |
|---|---|
| `mercadoLivreLink` | `--mercado-livre-link` |
| `stockQty` | `--stock-qty` |
| `whatsappButton` | `--whatsapp-button` e `--no-whatsapp-button` |
| `images` (array de texto) | `--images`, repetível |
| `installment.count` (aninhado) | `--set installment.count=10` |
| `items` (lista de objetos) | `--set items[0].question=Prazo? --set items[0].answer="2 dias"`, ou `--from-json` |

**Gramática de `--set`:** `<caminho>=<valor>`. O caminho é `campo(.campo|[n]|[])*`: `.` entra num objeto, `[n]` num índice, `[]` acrescenta um item no fim. O valor é convertido pelo tipo do campo no schema: texto fica como veio; número passa por `Number()`; booleano aceita `true` ou `false`; objeto e lista passam por `JSON.parse`. Valor que não converte → saída 2, com o caminho e o tipo esperado.

**`--from-json <arquivo|->`** (em `section add`, `product add`, `service add` e `page add`): lê o objeto inteiro de um arquivo, ou do stdin com `-`. As flags de campo e os `--set` são aplicados por cima, nessa ordem. É o caminho recomendado para agentes.

**Listas no modo interativo:** a CLI pergunta um item por vez e, depois de cada um, "Adicionar outro?", respeitando o `min` e o `max` do schema. No modo não interativo, um campo de lista obrigatório precisa vir por `--set`, `--from-json` ou `--preset`. Sem isso, saída 3.

Valores de campo com `input: "image"` (como cada item de `images`):
- começa com `/` → caminho em `public/`, precisa existir;
- começa com `https://` → URL remota, o host precisa estar em `images.remoteHosts` (senão, saída 4);
- outro caminho local → a CLI copia o arquivo para `public/<products|services>/<slug>-<n>.<ext>` e grava o caminho público.

#### Regra de interatividade

```ts
const interactive =
  !opts.yes && !opts.json && !opts.noInteractive &&
  process.env.IRIS_NONINTERACTIVE !== "1" &&
  process.stdin.isTTY === true && process.stdout.isTTY === true &&
  !isCI && !isAgent;            // std-env
```

- Toda pergunta passa por `ask()`, que lança `NonInteractiveError` quando `interactive` é falso. Nenhum outro código chama o clack.
- No modo interativo, a CLI só pergunta campos com `ask: "always"` ou `"optional"` que não vieram por flag.
- No modo não interativo, campo obrigatório faltando gera saída 3, com a lista das flags e um exemplo de comando completo.
- Confirmação de ação destrutiva no modo não interativo sem `--yes`: saída 3, com `missing: ["--yes"]`.
- Ctrl+C ou `isCancel` → saída 130, sem arquivo escrito pela metade.

#### Códigos de saída

| Código | Nome (`error.code`) | Quando |
|---|---|---|
| 0 | — | Sucesso |
| 1 | `INTERNAL` | Erro inesperado (bug) |
| 2 | `USAGE` | Flag desconhecida, valor com formato errado, argumento a mais |
| 3 | `MISSING_REQUIRED` | Campo obrigatório ou confirmação ausente sem modo interativo |
| 4 | `VALIDATION` | O resultado, ou um conteúdo já existente, não passa no schema |
| 5 | `CONFLICT` | Slug já existe (sem `--force`), item não encontrado, módulo já ativo |
| 6 | `ENVIRONMENT` | Fora de um projeto Iris, Node antigo, rede indisponível |
| 7 | `CONFIG_NOT_EDITABLE` | O trecho do `site.config.ts` a mudar não é um literal |
| 130 | `CANCELLED` | Cancelado pelo usuário |

#### Envelope `--json`

```json
{
  "schemaVersion": 1,
  "ok": false,
  "command": "product add",
  "data": null,
  "changes": [],
  "warnings": [],
  "error": {
    "code": "MISSING_REQUIRED",
    "exitCode": 3,
    "message": "Faltam campos obrigatórios: price, category.",
    "hint": "iris product add piso-x --name \"Piso X\" --price 99.9 --category Pisos --images /products/piso-x.jpg --stock-qty 5 --yes",
    "missing": ["--price", "--category"]
  }
}
```

Em sucesso, `ok: true`, `error` ausente, `data` com o item criado e `changes` com `{ "path": "content/products/piso-x.json", "action": "create" }`. `warnings` usa o tipo `Diagnostic`. O tipo `CliResult` fica em `packages/schema/src/cli.ts`, com `EXIT_CODES` (a tabela acima), `CliErrorCode`, `CliError` e `cliResultSchema` (zod), que valida um envelope em runtime, inclusive que `exitCode` corresponde ao `code`. `iris --help --json` devolve a árvore de comandos e flags no mesmo envelope.

#### Edição do `site.config.ts`

| Quem | Caminhos que pode mudar com magicast |
|---|---|
| `iris` | `theme.name`, `theme.style`, `theme.colorMode`, `menu`, `modules` |
| `create-iris-site` (só no starter recém-copiado, que é todo literal) | os de cima, mais `name`, `seo`, `whatsapp.phone`, `whatsapp.messages`, `contact`, `footer.text`, `brand.colors`, `brand.fonts`, `brand.logo`, `leads` |

Valor não literal num desses caminhos → saída 7, nada escrito.

#### Garantias de escrita

1. Monta o resultado em memória e valida com o schema. Inválido → saída 4, nada escrito.
2. Escreve de forma atômica: arquivo temporário e `rename`.
3. Roda o sync (a menos que venha `--no-sync`).
4. Mensagens em português, sempre com o comando exato para corrigir.

### 5.8 Arquivos de posse exclusiva do `iris-architect`

| Hoje | Depois da migração |
|---|---|
| `types/site-config.ts` | `packages/schema/src/site-config.ts` |
| `types/sections.ts` | `packages/schema/src/sections/**`, `packages/schema/src/define.ts` |
| `types/catalog.ts` | `packages/schema/src/catalog.ts` (inclui `PLATFORM_HOSTS` e os tipos de botão) |
| `types/section-registry.ts` | `packages/schema/src/registry.ts` |
| `modules.json` | `packages/schema/src/modules.ts` |
| textos fixos de `site.config.ts` | `packages/schema/src/texts.ts` (`SiteTexts`, `DEFAULT_TEXTS`) |
| — | `packages/schema/src/{theme/tokens.ts,cli.ts,page.ts,engine-api.ts}` |
| `scripts/modules.mjs`, `sync-modules.mjs`, `check-modules.mjs` | `packages/engine/src/{codegen,modules,content}/**`, `packages/engine/src/next.ts` (`withIris`) |
| `package.json` raiz | `package.json` raiz, `tsconfig.base.json`, `.changeset/`, `packages/*/package.json` (campos `name`, `version`, `exports`), `.github/workflows/{ci,release}.yml`, `.gitignore` |
| — | `LICENSE`, `NOTICE`, `docs/spec/**` (inclui `style-inventory.json`), `scripts/style-inventory.mjs`, `scripts/check-credits.mjs`, `apps/site/e2e/baseline/*.spec.ts`, `packages/core/src/lib/config.ts` |
| `eslint.config.mjs`, `postcss.config.mjs`, `app/favicon.ico` | `apps/site/` (mesmos nomes) |

Também do arquiteto: os 13 arquivos de reexport `packages/core/src/sections/<type>.tsx`, `apps/site/.gitignore` e `apps/site/playwright.config.ts`.

Cada frente pode acrescentar `dependencies` e `devDependencies` no `package.json` do pacote que é dela. `components.json` (config do shadcn) vai para `packages/core/components.json`, do `iris-theme`.

**Linha de base visual:** os testes em `apps/site/e2e/baseline/` são do arquiteto. As imagens em `__screenshots__/` só são geradas dentro do container `mcr.microsoft.com/playwright` da versão instalada (`npm run e2e:docker -- baseline --update-snapshots`), para não depender da máquina. Uma frente que muda o visual de propósito (ex.: o `iris-commerce` no card) regenera as imagens no próprio PR, e o arquiteto revisa as diferenças. Só um PR por vez pode mexer em `__screenshots__/`: quem chegar depois faz rebase e regenera. O `iris-theme` não regenera a linha de base, porque o `sera` não pode mudar.

Acréscimo de chave em `DEFAULT_TEXTS` pedido por uma frente (ex.: rótulo novo) é PR revisado pelo arquiteto, sem ADR.

---

## 6. Frentes de trabalho

Todas seguem o pipeline do claude-forge: `/plan` → `/tdd` → `review-loop` com `adversarial-reviewer` → `/handoff-verify` → `/commit-push-pr`. Nenhuma frente publica no npm. Publicar exige confirmação do dono.

### Comandos de verificação

O arquiteto cria estes scripts na raiz, com as dependências de teste (vitest, Playwright, `@lhci/cli`). Toda definição de pronto usa estes nomes.

| Script na raiz | Faz |
|---|---|
| `npm run typecheck` | `build:packages` e depois `tsc --noEmit` em todos os workspaces (os pacotes compilados precisam do `dist/` para os tipos) |
| `npm run lint` | ESLint em todos os workspaces |
| `npm test` | `build:packages` e depois vitest em todos os pacotes (`npm test -w <pacote>` para um só) |
| `npm run build` | build dos pacotes e `next build` do `apps/site` |
| `npm run sync:check` | Roda `npm run sync:check -w apps/site`. O script do `apps/site` chama `Sync(root, { check: true })`; quando o `iris-cli` o trocar por `iris sync --check`, o nome do script continua o mesmo |
| `npm run modules:check` | Matriz de módulos: gera cópias do `apps/site` em `<raiz>/apps/.modules-check-<cenário>/` (mesma profundidade do `apps/site`, então os caminhos relativos de `tsconfig` e `@source` continuam valendo; o padrão `apps/.*` vai no `.gitignore`), com cada módulo desligado, um de cada vez, e com todos desligados, e roda `tsc` e `next build` em cada uma |
| `npm run e2e -- <pasta>` | Playwright em `apps/site/e2e/<pasta>`, contra o `next start` do `apps/site` |
| `npm run e2e:docker -- <pasta>` | O mesmo, dentro do container oficial do Playwright (usado para gerar e conferir capturas) |
| `npm run build:packages` | tsdown de `schema`, `engine`, `cli` e `create` |
| `npm run lighthouse` | `lhci autorun` com o `lighthouserc.json` da raiz (dono: `iris-theme`), contra a variante `glass` |
| `npm run variant -- --style <id>` | Copia o `apps/site` para `apps/.variant-<id>/` com `theme.style` trocado (magicast), e faz o build. Usado pelo E2E de estilos e pelo Lighthouse, sem mexer no `sera` do `apps/site` (dono: `iris-theme`, em `scripts/variant.mjs`) |
| `npm run registry:local` | Sobe um Verdaccio e publica nele os 5 pacotes compilados (dono: `iris-cli`, em `scripts/local-registry.mjs`). Usado pelo E2E da CLI e pela verificação da doc |

Cada frente tem a sua pasta de E2E (`apps/site/e2e/{baseline,theme,commerce}`) e o seu workflow (`.github/workflows/{theme,commerce,cli,docs}.yml`). O `apps/site/playwright.config.ts` é do arquiteto. Gates de agente (`security-reviewer`, `adversarial-reviewer`) são registrados no PR, com o veredito copiado.

### Ordem e dependências

```
iris-architect ──(contratos congelados, tag contracts-v1)──┬── iris-theme ─────┐
                                                           ├── iris-commerce ──┼── iris-docs
                                                           └── iris-cli ───────┘
```

`iris-cli` depende do schema e da API do `engine` ([§5.6](#56-api-do-engine-usada-pela-cli)), não do trabalho do `iris-theme`: o arquiteto entrega todas as funções da API, inclusive as de tema em versão mínima, antes da tag.

### 6.1 `iris-architect`: arquitetura e contratos

**Ordem:** primeira, sozinha.

**Escopo:**
0. **Base:** o Q-13 já está resolvido (commit `07b91c7`). Criar `LICENSE` (MIT, titular a confirmar com o dono no PR) e `NOTICE` (temas do tweakcn, Apache-2.0, com a lista de arquivos), e pôr `"license": "MIT"` em todos os `package.json`.
1. **Spike** (descartável, num branch): provar os 7 pontos abaixo num projeto mínimo, fora do monorepo, que instala `schema`, `engine` e `core` por `npm pack`, não por workspace. Se algum falhar, abrir ADR antes de seguir.
   1. O `next.config.ts` importa `withIris` de `@cbjk_iris/engine/next` instalado e o `next build` passa.
   2. TSX de `node_modules` compila com `transpilePackages`, com componentes `"use client"` funcionando.
   3. Os aliases `@cbjk_iris/site-config` e `@cbjk_iris/site-registry` resolvem no `next build` (Turbopack) e no `tsc`.
   4. O `@source` faz o Tailwind gerar as classes usadas só dentro do core.
   5. Uma rota fina que reexporta `default` e `generateStaticParams` do core gera páginas estáticas, com `dynamicParams = false` literal no arquivo.
   6. O hover do VS Code mostra a descrição de um campo de tipo inferido por `z.infer` (se não mostrar, registrar no ADR 002 e seguir).
   7. No `next build`, o layout lê um tema embutido de `@cbjk_iris/engine/themes/` instalado. Mecanismo a provar: o `withIris` põe `@cbjk_iris/engine` em `serverExternalPackages` (o engine roda como Node puro, sem Turbopack), e o engine acha a pasta por `fileURLToPath(new URL("../themes/", import.meta.url))`.
2. Capturar a linha de base visual **antes** de mover qualquer arquivo. Depois montar o monorepo de [§5.1](#51-estrutura-do-monorepo), com os scripts de verificação e as dependências de teste, e mover o site atual conforme [§5.1.1](#511-árvore-de-packagescoresrc-e-de-onde-vem-cada-arquivo), sem mudança visual. Trocar todos os imports `@/` do core por relativos e os de `@/site.config` por `lib/config.ts`.
3. Fazer o inventário de estilo de [§5.4](#54-tokens-de-forma-e-estilos) e completar `SHAPE_TOKENS` e os utilitários com o que faltar.
4. Escrever os schemas e tipos de [§5.2](#52-tipo-product-e-botões-de-compra), [§5.3](#53-config-e-conteúdo), [§5.4](#54-tokens-de-forma-e-estilos) (só a lista), [§5.5](#55-formato-do-schema-de-seção), [§5.6](#56-api-do-engine-usada-pela-cli) e [§5.7](#57-interface-pública-da-cli) (`CliResult`).
5. Migrar o conteúdo de `apps/site` para `content/*.json` e escrever os loaders e `resolveSiteConfig`.
6. Implementar toda a API de [§5.6](#56-api-do-engine-usada-pela-cli): `LoadSiteConfig`, `SyncRegistry`, `SyncRoutes`, `Sync`, `CheckContent`, `RemoveModuleContent`, `withIris`, e a versão mínima de `ListThemes`, `ListStyles`, `ValidateTheme`, `SyncBrand` (o `brand:sync` de hoje, com o `font-data.json` por `createRequire`) e `ImportTheme` (o `theme:add` de hoje, com as regras de segurança de [§5.6](#56-api-do-engine-usada-pela-cli)).
7. Trocar o conteúdo de exemplo de reformas para assistência técnica de celulares ([§6.1.1](#611-conteúdo-de-exemplo-assistência-técnica-de-celulares)) e capturar a **linha de base v1**. Ela é a referência de todas as frentes.
8. Criar `.github/workflows/release.yml`: changesets, `npm publish --provenance` com trusted publishing (`permissions: id-token: write`), disparado só por `workflow_dispatch`. Todos os `package.json` publicáveis levam `"publishConfig": { "access": "public" }`, porque pacote com escopo sai privado por padrão. Nenhuma publicação acontece nesta frente. O primeiro lançamento segue o roteiro de [Ações do dono](./OPEN-QUESTIONS.md#ações-do-dono-fora-do-código).
9. Congelar: mudar a linha de status desta spec e criar a tag `contracts-v1`.

**Pode tocar:** tudo, até `contracts-v1`, com uma restrição: em `packages/core`, só mover arquivos e corrigir imports, sem mudar JSX nem classes. Em `packages/engine/src/theme`, só mover e acrescentar o mínimo do passo 6.

**Proibido:** mudar classes e JSX de componentes, mudar o comportamento do motor de tema, implementar comandos da CLI, escrever README.

**Passagem de posse:** na tag, os caminhos de [§5.1.1](#511-árvore-de-packagescoresrc-e-de-onde-vem-cada-arquivo) passam aos donos indicados, e o arquiteto fica só com [§5.8](#58-arquivos-de-posse-exclusiva-do-iris-architect).

**Pronto quando:**
- [ ] `docs/spec/spike-001.md` existe, com os 7 pontos e a evidência (comando e saída) de cada um.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build && npm run sync:check` passa na raiz.
- [ ] `npm run modules:check` passa nos 4 cenários (cada módulo desligado, um de cada vez, e todos desligados).
- [ ] **Migração sem mudança visual:** antes da troca de conteúdo, `npm run e2e -- baseline` passou contra a linha de base v0, tirada antes de mover qualquer arquivo. Capturas da home, de `/produtos`, de `/produto/<slug>` e de `/sobre`, em claro e escuro, com `toHaveScreenshot` e `maxDiffPixelRatio: 0.001`. O comando e a saída ficam registrados em `docs/spec/migration-001.md`.
- [ ] **Linha de base v1:** `apps/site/e2e/baseline/__screenshots__/` contém as capturas com o conteúdo de celulares, geradas por `npm run e2e:docker -- baseline --update-snapshots`, e `npm run e2e -- baseline` passa.
- [ ] Nenhum resto de reformas: `grep -riE "porcelanato|reforma|drywall|gesso|hidr[aá]ulic|el[eé]tric|acabamento|torneira|lumin[aá]ria|rodap[eé]" apps/site/content apps/site/site.config.ts` não encontra nada.
- [ ] Toda imagem de exemplo tem crédito: `node scripts/check-credits.mjs` sai com 0. Ele confere que cada arquivo em `apps/site/public/{home,products,services,ultimos_projetos}` aparece no `CREDITS.md`, e que cada linha da seção de fotos do `CREDITS.md` aponta para um arquivo que existe. A seção de ícones de marca fica fora dessa conferência.
- [ ] `test -f LICENSE && test -f NOTICE` passa, e `grep -L '"license": "MIT"' packages/*/package.json` não lista nada.
- [ ] `.github/workflows/release.yml` existe, só com o gatilho `workflow_dispatch`, com `id-token: write` e `--provenance`, e `grep -L '"access": "public"' packages/*/package.json` não lista nada.
- [ ] `apps/site/.gitignore` existe e tem `node_modules` e `.next`.
- [ ] `grep -rn 'from "@/' packages/core/src` não encontra nada.
- [ ] `grep -rln '@cbjk_iris/site-config' packages/core/src` lista só `lib/config.ts`.
- [ ] `node scripts/style-inventory.mjs --check` sai com 0.
- [ ] `npm test -w @cbjk_iris/engine` cobre a API mínima: cada função de [§5.6](#56-api-do-engine-usada-pela-cli) tem pelo menos um teste, e `ImportTheme` rejeita `http:` e descarta `@import` e `url()`.
- [ ] `npm test -w @cbjk_iris/schema` cobre `resolveTexts` (merge profundo e fallback de `buyOnWhatsapp`).
- [ ] `npm test -w @cbjk_iris/schema` cobre: campo perguntado sem `label` falha; cada JSON de `apps/site/content` valida; o JSON Schema gerado não exige `whatsappButton`.
- [ ] `npm test -w @cbjk_iris/engine` cobre: `$schema` é aceito pelo loader (o `schema` não pode importar o `engine`: grafo `schema ← engine`).
- [ ] `npm test -w @cbjk_iris/core` tem o teste "toda seção tem componente, e vice-versa".
- [ ] `node --input-type=module -e "import('@cbjk_iris/schema').then(m => console.log(Object.keys(m).length))"`, rodado em `apps/site`, imprime um número no Node 22.18 sem flag.
- [ ] A linha de status desta spec diz CONGELADO, e `git tag --list contracts-v1` mostra a tag.

### 6.1.1 Conteúdo de exemplo: assistência técnica de celulares

Decisão do dono ([Q-12](./OPEN-QUESTIONS.md#q-12-conteúdo-de-exemplo-do-starter)): a marca continua **cbjk**, mas o negócio passa a ser uma assistência técnica de celulares. A troca é do arquiteto, no passo 7 do [§6.1](#61-iris-architect-arquitetura-e-contratos). Ela acontece depois da migração provada contra a v0 e antes da tag, para que todas as frentes comparem contra a mesma linha de base v1.

| O que muda | Como fica |
|---|---|
| `site.config.ts` | `name: "cbjk"` mantido. `seo`, `whatsapp.messages`, `contact`, `footer.text` e os títulos do `menu` falam de conserto de celular. O item de menu da galeria passa a ser "Reparos recentes" (a rota `/ultimos-projetos` não muda) |
| `content/home.json`, `content/pages/*.json` | Mesmos tipos de seção de hoje, com textos de assistência técnica: hero, benefícios (garantia, orçamento na hora, peças de qualidade), números, depoimentos, FAQ (prazo, garantia, backup dos dados), contato |
| `content/services/*.json` | Pelo menos 4: troca de tela, troca de bateria, conector de carga, recuperação após contato com líquido |
| `content/products/*.json` | Pelo menos 4 acessórios (capa, película, carregador, cabo ou fone), cobrindo as combinações de botões: só WhatsApp, só marketplaces, todos os botões e nenhum botão |
| Links de marketplace de exemplo | Páginas de busca reais dos hosts permitidos (ex.: `https://lista.mercadolivre.com.br/capinha-iphone-15`), nunca um anúncio inventado |
| Fotos em `public/{home,products,services,ultimos_projetos}/` | Trocadas por fotos CC0 de celulares, bancada de reparo e acessórios (StockSnap, Unsplash com licença verificada, ou equivalente). Cada uma com origem no `CREDITS.md`. Até ~300KB por arquivo |
| `public/logo.svg`, `public/cbjk_logo.svg` | Mantidos. Se os dois ficam, o arquiteto confirma no PR qual o `brand.logo` usa |
| Seções `products`, `services`, `gallery` e o comportamento dos módulos | Sem mudança |

Na tag, **todo o conteúdo de exemplo** passa para o `iris-commerce`: `apps/site/content/**`, `apps/site/public/{home,products,services,ultimos_projetos}/**` e as chaves de `apps/site/site.config.ts` que não são `theme`, `brand.shape` nem `modules` (essas ficam com o `iris-theme` e o arquiteto). Os modelos de home do `create` (`loja`, `servicos`, `institucional`, `em-branco`) continuam com textos genéricos e `{name}`, sem depender do ramo de celulares.

### 6.2 `iris-theme`: sistema de temas

**Ordem:** depois de `contracts-v1`, em paralelo.

**Escopo:** o motor de tema no `engine` (camadas, presets, validação de tokens, contraste com alpha, `ListThemes`, `ListStyles`, `ValidateTheme`, `SyncBrand`, `ImportTheme`), o `iris.css` do core (`@theme inline`, utilitários e variantes congelados), os 4 estilos embutidos, o `data-style` no layout, e a troca de toda classe de forma fixa nos componentes por utilitário ou variante.

**Pode tocar:** `packages/engine/src/theme/**`, `packages/engine/themes/**`, `packages/core/styles/**`, `packages/core/components.json`, os caminhos de `packages/core/src` marcados `iris-theme` em [§5.1.1](#511-árvore-de-packagescoresrc-e-de-onde-vem-cada-arquivo), só as classes de estilo nos caminhos marcados `iris-commerce`, `apps/site/themes/**` (temas próprios do site de exemplo, se houver), as chaves `theme` e `brand.shape` de `apps/site/site.config.ts`, `apps/site/e2e/theme/**`, `lighthouserc.json`, `scripts/variant.mjs`, `.github/workflows/theme.yml`.

**Proibido:** `packages/schema/**` (token novo = pedido ao arquiteto), lógica e JSX estrutural de catálogo e botões, `packages/cli/**`, README.

**Depende de:** `SHAPE_TOKENS`, `STYLE_IDS`, os utilitários de [§5.4](#54-tokens-de-forma-e-estilos) e os tipos de [§5.6](#56-api-do-engine-usada-pela-cli).

**Pronto quando:**
- [ ] `npm test -w @cbjk_iris/engine` cobre: ordem das camadas, tema sem tokens de forma, token fora da faixa (erro com arquivo e token), `theme.style` sobrepondo `--iris-style`, contraste com `--surface-alpha` abaixo de 100%, `ImportTheme` continuando a descartar `@import` e `url()`. Cobertura do diretório `theme/` ≥ 80%.
- [ ] `node scripts/style-inventory.mjs --after` sai com 0: só sobram ocorrências marcadas como exceção.
- [ ] Um teste do `engine` roda `ValidateTheme` nos 10 temas embutidos, sem mudança nos arquivos, e não há erro.
- [ ] No estilo `sera`, `npm run e2e -- baseline` continua passando.
- [ ] `npm run e2e -- theme` captura home e `/produto/<slug>` nos 4 estilos (cada um numa variante gerada por `npm run variant -- --style <id>`), em claro e escuro, e confere que `border-radius` e `box-shadow` do card diferem entre `sera`, `soft` e `glass`.
- [ ] `npm run e2e -- theme` tem um teste que roda `next dev`, troca `theme.style` no `site.config.ts` e confere, sem reiniciar o servidor, que o `data-style` do `<html>` mudou depois de recarregar a página.
- [ ] `npm run lighthouse` passa com as asserções do `lighthouserc.json`: Performance ≥ 0,9 e CLS < 0,1, mobile, home no estilo `glass`.
- [ ] Com `prefers-reduced-transparency: reduce` emulado, o card do `glass` tem fundo opaco. O Playwright não tem essa opção em `emulateMedia`: o teste usa CDP no Chromium (`Emulation.setEmulatedMedia` com `features: [{ name: "prefers-reduced-transparency", value: "reduce" }]`).

### 6.3 `iris-commerce`: catálogo e botões de marketplace

**Ordem:** depois de `contracts-v1`, em paralelo.

**Escopo:** `resolvePurchaseButtons`, os botões no card e no detalhe, ícones das plataformas, conteúdo de exemplo cobrindo as combinações, créditos dos ícones.

**Pode tocar:** os caminhos de `packages/core/src` marcados `iris-commerce` em [§5.1.1](#511-árvore-de-packagescoresrc-e-de-onde-vem-cada-arquivo) (JSX e lógica, usando só os utilitários de forma congelados), `apps/site/content/**`, `apps/site/public/{home,products,services,ultimos_projetos}/**`, as chaves de conteúdo de `apps/site/site.config.ts` ([§6.1.1](#611-conteúdo-de-exemplo-assistência-técnica-de-celulares)), `apps/site/e2e/commerce/**`, `apps/site/e2e/baseline/__screenshots__/**` (só pelo protocolo de [§5.8](#58-arquivos-de-posse-exclusiva-do-iris-architect)), `CREDITS.md`, `.github/workflows/commerce.yml`.

**Proibido:** `packages/schema/**` (inclusive `PLATFORM_HOSTS` e `DEFAULT_TEXTS`, que mudam por PR ao arquiteto), `packages/engine/**`, `packages/core/src/ui/**` e tokens, `packages/cli/**`, README.

**Depende de:** `productSchema`, `PurchaseContext`, `PurchaseButton`, `ResolvePurchaseButtons` e as chaves de `texts.products`.

**Pronto quando:**
- [ ] `npm test -w @cbjk_iris/core` cobre `resolvePurchaseButtons`: ordem nativa, `ctx.order` personalizado (ex.: Shopee primeiro vira o `primary`), `whatsappButton: false`, `whatsappUrl: null`, só marketplaces, todos, nenhum, variante do primeiro (WhatsApp e não WhatsApp). Cobertura ≥ 80% de `catalog/purchase.ts`.
- [ ] Um teste do core confere que o card e o detalhe passam `siteConfig.commerce.buttonOrder` resolvido para o `ctx.order`. Com a ordem trocada num config de teste, o card mostra a plataforma nova como primária.
- [ ] Os produtos de exemplo de [§6.1.1](#611-conteúdo-de-exemplo-assistência-técnica-de-celulares) continuam cobrindo as 4 combinações de botões, e `npm test -w @cbjk_iris/schema` (validação de conteúdo) passa.
- [ ] `npm run e2e -- commerce`: em cada produto de exemplo, aparecem exatamente os botões esperados, cada um com `target="_blank"`, `rel="noopener noreferrer"` e o `href` do JSON. O card mostra só o primeiro.
- [ ] No mesmo E2E, cada botão do detalhe é achado por nome acessível com a plataforma (`getByRole("link", { name: "Comprar na Shopee" })`), e o botão único do card é achado pelo nome "Comprar agora (<plataforma>)".
- [ ] Os rótulos vêm de `texts`: um teste do core renderiza os botões com `texts.products.buttons` trocados por valores de teste e confere que aparecem esses valores.
- [ ] `npm run modules:check` continua passando.
- [ ] `CREDITS.md` tem, para cada ícone de marketplace, a URL do kit de marca oficial, a data do download e um resumo das regras de uso (cor, área de respiro, uso por lojistas). Se alguma regra proibir o uso, o PR para e o dono é avisado.
- [ ] Gate de agente: `security-reviewer` sem achado CRITICAL ou HIGH sobre links externos e URLs vindas do conteúdo.

### 6.4 `iris-cli`: `create-iris-site` e CLI `iris`

**Ordem:** depois de `contracts-v1`, em paralelo.

**Escopo:** os pacotes `cli` e `create`, as perguntas e flags geradas do schema, a edição do `site.config.ts` com magicast, o starter dentro do `create` com as reescritas de [§5.1.4](#514-de-appssite-para-o-starter), os modelos de home do `create`, e a troca dos scripts do `apps/site` pela CLI.

**Pode tocar:** `packages/cli/**`, `packages/create/**`, os scripts de `apps/site/package.json` (mantendo o nome `sync:check`), os arquivos gerados em `apps/site/app/` (só rodando o sync), `scripts/local-registry.mjs`, `.github/workflows/cli.yml`.

**Proibido:** `packages/schema/**` e o formato de qualquer arquivo de conteúdo, `packages/core/**`, `packages/engine/**` (chama, não altera), README.

**Depende de:** [§5.3](#53-config-e-conteúdo), [§5.5](#55-formato-do-schema-de-seção), [§5.6](#56-api-do-engine-usada-pela-cli) e [§5.7](#57-interface-pública-da-cli).

**Pronto quando:**
- [ ] `npm test -w @cbjk_iris/cli` tem, para cada comando, um caso interativo (prompts simulados) e um não interativo. Cobertura ≥ 80%.
- [ ] Teste de não travamento: cada comando que pode perguntar (`create-iris-site`, `page add`, `section add`, `product add`, `service add`, `theme set`, `style set`, `module add`, `module remove`, `page remove`, `product remove`, `service remove`), rodado com um obrigatório ou confirmação faltando, `stdin` fechado (`</dev/null`) e `CLAUDECODE=1`, termina em menos de 5s com saída 3 e envelope válido contra `CliResult`.
- [ ] Um teste confere que as flags de `iris product add --help` saem do `productSchema`: um campo novo num schema de teste aparece no help sem mudança na CLI.
- [ ] Conteúdo inválido nunca é escrito: `iris product add x ... --price -1 --yes` sai com 4, e o diretório fica igual (comparado por hash).
- [ ] `iris theme set` num config cujo `theme.name` é uma variável sai com 7 e não altera o arquivo. Num config literal, o `git diff` mostra só a linha mudada.
- [ ] Um teste do `create` confere as regras do `template/` de [§5.1.4](#514-de-appssite-para-o-starter).
- [ ] No projeto gerado pelo E2E, `.gitignore` existe com `node_modules` e `.next`, e `git ls-files | grep -cE '^(node_modules|\.next)/'` dá 0 depois do primeiro commit.
- [ ] Com `--no-example-content`, `content/products/` e `content/services/` ficam vazios, e `npm run build` passa. Sem a flag, `iris check` termina com 0 e lista os avisos de conteúdo de exemplo.
- [ ] `iris section add home faq --yes` sem itens sai com 3. Com `--set items[0].question=A --set items[0].answer=B`, ou com `--from-json` do mesmo objeto, sai com 0 e grava a seção. `--set items[0].question` sem `=` sai com 2.
- [ ] Um teste confere que `iris product add` sem `--order` grava `order` = maior + 10.
- [ ] E2E na CI (`.github/workflows/cli.yml`): `npm run registry:local` sobe o Verdaccio e publica os 5 pacotes, roda `npm_config_registry=http://localhost:4873 npx create-iris-site@<versão> /tmp/x --yes --name Teste --whatsapp 5511999999999 ...` para as 4 combinações de [§6.4.1](#641-matriz-do-create), e em cada projeto `npm run build && npm run lint` passa.
- [ ] `iris theme add` com um `ImportTheme` falso (injetado no teste) grava o CSS devolvido em `themes/<nome>.css`, recusa nome de arquivo fora do padrão de slug, e propaga um erro do `ImportTheme` como saída 6 ou 4. A regra de segurança do download é testada no `engine`, não aqui.
- [ ] Gate de agente: `security-reviewer` sem achado CRITICAL ou HIGH sobre caminhos vindos de argumentos, nome do projeto, comandos externos e conteúdo baixado.

#### 6.4.1 Matriz do create

| `--modules` | `--home` | `--theme` | `--style` |
|---|---|---|---|
| `products,services,gallery` | `loja` | `neutral` | `sera` |
| (vazio) | `institucional` | `caffeine` | `flat` |
| `services` | `servicos` | `ocean-breeze` | `soft` |
| `products,gallery` | `loja` | `modern-minimal` | `glass` |

A matriz não baixa temas da rede, para a CI não depender do tweakcn. `iris theme add` é testado com uma resposta gravada.

### 6.5 `iris-docs`: documentação e AGENTS.md dos projetos gerados

**Ordem:** por último, depois das três frentes paralelas.

**Escopo:** README do monorepo (quem desenvolve), README do projeto gerado (quem usa), guias de CLI, temas e catálogo, `CONTRIBUTING.md`, `AGENTS.md` e `CLAUDE.md` do starter (com o `@AGENTS.md` e o aviso da doc do Next, como o `create-next-app` gera), skills do starter, e os scripts que verificam a doc contra o código.

**Pode tocar:** `README.md`, `AGENTS.md` e `CLAUDE.md` da raiz do monorepo, `docs/**` exceto `docs/spec/**`, `CONTRIBUTING.md`, `CREDITS.md` (texto), `apps/site/{README.md,AGENTS.md,CLAUDE.md}`, `apps/site/.claude/skills/**`, `scripts/docs-check/**`, `.github/workflows/docs.yml`.

**Proibido:** código de produto (pacotes, componentes, schemas, temas, CLI). Divergência entre doc e código vira pendência para a frente dona.

**Pronto quando:**
- [ ] `node scripts/docs-check/cli.mjs` sai com 0: compara `iris --help --json` com os comandos e flags citados nos guias, nos dois sentidos.
- [ ] `node scripts/docs-check/schema.mjs` sai com 0: cada campo de `productSchema`, cada `type` de seção e cada token de `SHAPE_TOKENS` aparece na doc de usuário.
- [ ] `node scripts/docs-check/run-snippets.mjs` sai com 0: sobe o registro local com `npm run registry:local`, gera um projeto com o `create` e roda nele cada bloco `bash` dos guias. Blocos marcados como ` ```bash no-run ` (ex.: `npx create-iris-site@latest`, que depende do npm público) não rodam, e o script lista quantos pulou.
- [ ] `wc -l < apps/site/AGENTS.md` dá no máximo 80, e o arquivo cita as regras de ouro e os comandos de verificação.
- [ ] `grep -c "Dicas para quem está começando" apps/site/README.md` dá 1 ou mais.
- [ ] Gate de agente: `adversarial-reviewer` responde APPROVE para "um iniciante consegue criar um site, um produto e trocar o tema sem abrir um componente?".

### 6.6 Mapeamento para as instruções 02 a 06

As sessões que criam os agentes devem usar os caminhos e nomes desta spec. Onde as instruções divergem:

| Nas instruções | Nesta spec |
|---|---|
| `npx create-iris-project` | `npx create-iris-site` ([Q-02](./OPEN-QUESTIONS.md#q-02-nomes-no-npm-decisão-do-dono)) |
| `@iris/core` | `@cbjk_iris/core` |
| `types/site-config.ts`, `types/sections.ts`, `types/catalog.ts` | `packages/schema/src/{site-config.ts,sections/**,catalog.ts}` |
| `modules.json`, `scripts/modules-*` | `packages/schema/src/modules.ts`, `packages/engine/src/{codegen,modules}/**` |
| `components/ui/`, `components/sections/`, `components/header/`... | `packages/core/src/{ui,sections,header,...}/**` ([§5.1.1](#511-árvore-de-packagescoresrc-e-de-onde-vem-cada-arquivo)) |
| `lib/brand.ts`, `lib/theme-file.ts` | `packages/engine/src/theme/**` |
| `themes/`, `app/globals.css` | `packages/engine/themes/`, `packages/core/styles/iris.css` |
| `data/products.ts`, `data/services.ts` | `apps/site/content/{products,services}/*.json` |
| Conteúdo de exemplo de reformas | Assistência técnica de celulares ([§6.1.1](#611-conteúdo-de-exemplo-assistência-técnica-de-celulares)) |
| "Ordem de botões configurável" no backlog | Entra nesta rodada, só global (`commerce.buttonOrder`) |
| `npm run modules:sync -- --check`, `sync-brand.mjs --check` | `npm run sync:check` |
| `npx tsc --noEmit` | `npm run typecheck` |
| `iris-commerce` pode tocar `lib/whatsapp*` | Pode, em `packages/core/src/lib/whatsapp.ts` |
| Sem linha sobre `iris-docs` e scripts | `iris-docs` escreve `scripts/docs-check/**` |

---

## 7. Backlog (fora desta rodada)

Sem detalhe de implementação, para o dono priorizar.

| Prioridade | Item |
|---|---|
| Alta | Orçamento com vários produtos numa única mensagem de WhatsApp |
| Alta | Rastreamento de cliques por canal (GA4, Pixel ou Umami), com consentimento LGPD |
| Alta | SEO local: JSON-LD `LocalBusiness` e `Product`, sitemap, OG por produto |
| Alta | Tag de afiliado global, com `rel="sponsored noopener"` (a ordem global dos botões já entra nesta rodada) |
| Alta | Promoções com data de início e fim |
| Média | `iris product import <csv>` |
| Média | Feed para Google Merchant Center e Meta |
| Média | Busca e filtros no catálogo |
| Média | Blog em MDX |
| Média | `iris doctor` e `iris upgrade` |
| Média | `iris eject <componente>`: copiar um componente do core para o projeto (só na opção A) |
| Depois | Keystatic como painel |
| Depois | Editor visual com Puck |
| Depois | i18n |
| Depois | Backend próprio (`provider: "backend"`) |
| Depois | Troca de estilo pelo visitante, no navegador |

---

## 8. Glossário

| Termo | Significado |
|---|---|
| Core | O pacote `@cbjk_iris/core`, com os componentes e as páginas |
| Engine | O pacote `@cbjk_iris/engine`: tema, sync, loaders, `withIris` |
| Starter | O projeto que o `create-iris-site` copia. Vem do `apps/site` |
| Rota fina | Arquivo em `app/(iris)/` que só reexporta a página do core |
| Sync | `Sync()` do engine: fontes, registro e rotas. Chamado por `iris sync` e, antes da CLI, por `npm run sync:check` |
| Tema | Cores e fontes (`themes/*.css`, formato do tweakcn) |
| Estilo | Forma dos componentes (`data-style`, tokens de forma) |
| Token de forma | Variável CSS de [§5.4](#54-tokens-de-forma-e-estilos) |
| Contrato | Item de [§5](#5-contratos). Muda só com ADR novo |
| Modo não interativo | Execução sem perguntas: `--yes`, `--json`, CI, agente ou sem TTY |
