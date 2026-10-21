# Migração 001: linha de base v0, monorepo e migração sem mudança visual (§6.1, passo 2)

- **Data:** 2026-10-20
- **Executor:** `iris-architect` (etapa E2 do [plano da Frente 1](./plans/frente-1.md))
- **Base:** `main` em `58893f1`
- **Spec:** [§5.1](./SPEC.md#51-estrutura-do-monorepo), [§5.1.1](./SPEC.md#511-árvore-de-packagescoresrc-e-de-onde-vem-cada-arquivo), [§5.1.3](./SPEC.md#513-como-o-core-acessa-o-projeto), [§6](./SPEC.md#6-frentes-de-trabalho), [§6.1](./SPEC.md#61-iris-architect-arquitetura-e-contratos)
- **Resultado:** a linha de base v0 foi capturada antes de mover qualquer arquivo e `npm run e2e -- baseline` passa contra ela depois da migração (16 capturas iguais, `maxDiffPixelRatio: 0.001`).

## Versões

| Peça | Versão |
|---|---|
| Node / npm | 24.18.0 / 12.0.1 (o Node 22.18 não foi testado: a máquina só tem o 24.18) |
| next / react | 16.2.11 / 19.2.4 |
| @playwright/test | 1.64.1 (Chromium do próprio Playwright, `chromium_headless_shell-1248`) |
| vitest / @vitest/coverage-v8 | 5.0.5 |
| tsdown | 0.23.1 |
| @changesets/cli | 3.0.3 |
| @lhci/cli | 0.15.1 |
| Docker | 29.9.1, imagem `mcr.microsoft.com/playwright:v1.64.1-noble` |

## 1. Linha de base v0 (antes de mover qualquer arquivo)

**Onde:** local, nesta máquina, não no container. A v0 só serve para comparar a mesma máquina antes e depois da migração (plano, D-1). A v1 (E8) é a que sai do container.

O teste e a config foram escritos primeiro, com o site ainda na raiz do repositório (o `webServer` subia `next start` na raiz):

- `apps/site/e2e/baseline/pages.spec.ts`: home, `/produtos`, `/produto/porcelanato-marmo-carrara-90x90` e `/sobre`, página inteira.
- `apps/site/playwright.config.ts`: 4 projetos, `desktop-light`, `desktop-dark` (Desktop Chrome) e `mobile-light`, `mobile-dark` (Pixel 7). Claro e escuro vêm de `colorScheme`, porque o site usa `colorMode: "system"`. O mobile foi acrescentado ao pedido da spec (que só exige claro e escuro) para cobrir o `MobileHeader`.
- Capturas em `apps/site/e2e/baseline/__screenshots__/pages.spec.ts/<página>-<projeto>.png`, sem sufixo de plataforma.

Estabilização (cada item quebrou uma tentativa antes):

| Problema | Solução |
|---|---|
| O `FadeCarousel` troca de slide a cada 6 s (`setInterval`) | `page.clock.install()` antes da navegação e `page.clock.pauseAt(agora + 1 s)` logo depois da carga. Com `+50 ms` houve uma corrida ("Cannot fast-forward to the past") num de 16 testes |
| Imagens `loading="lazy"` fora da viewport | Rolagem da página inteira antes da captura, com espera pelo lado do Node (o relógio pausado congela `setTimeout` e `requestAnimationFrame` da página; a primeira versão, com `requestAnimationFrame`, travou até o timeout) e espera por `img.complete && naturalWidth > 0` |
| Fontes | `document.fonts.ready` |
| Animações CSS e cursor | `animations: "disabled"`, `caret: "hide"` no `toHaveScreenshot` |

```
$ npm run build                                                   # site ainda na raiz, exit 0
$ npx playwright test -c apps/site/playwright.config.ts baseline --update-snapshots
  16 passed (15.0s)
$ npx playwright test -c apps/site/playwright.config.ts baseline  # 3 vezes seguidas, sem mudar nada
  16 passed (13.2s)
  16 passed (13.1s)
  16 passed (13.6s)
```

## 2. Migração

Tudo por `git mv`, conforme §5.1.1. Nenhum JSX nem classe mudou em `packages/core`: os arquivos do core só tiveram imports reescritos, e o layout trocou de nome (abaixo).

| De | Para |
|---|---|
| `components/{brand,catalog,footer,gallery,header,icons,products,sections,services,theme,ui}/*` | `packages/core/src/<mesmo nome>/*` |
| `components/FadeCarousel.tsx` | `packages/core/src/carousel/FadeCarousel.tsx` |
| `lib/{whatsapp,format,routes,links,leads,utils}.ts` | `packages/core/src/lib/` |
| `lib/catalog/{products,services}.ts` | `packages/core/src/catalog/` |
| `lib/gallery.ts` | `packages/core/src/gallery/gallery.ts` |
| `lib/theme.ts` | `packages/core/src/theme/theme.ts` |
| `lib/{brand,theme-file}.ts` | `packages/engine/src/theme/` |
| `app/layout.tsx` | `packages/core/src/app/layout.tsx` (`IrisRootLayout`, `irisMetadata`) |
| `app/page.tsx`, `app/[slug]/page.tsx` | `packages/core/src/app/{home,config-page}.tsx` |
| `app/{produtos,produto/[slug]}/page.tsx` | `packages/core/src/app/products/{list,detail}.tsx` |
| `app/{servicos,servico/[slug]}/page.tsx` | `packages/core/src/app/services/{list,detail}.tsx` |
| `app/ultimos-projetos/page.tsx` | `packages/core/src/app/gallery/page.tsx` |
| `app/globals.css` | `packages/core/styles/iris.css` (conteúdo igual) |
| `themes/*.css` | `packages/engine/themes/` (conteúdo igual) |
| `components.json` | `packages/core/components.json` (conteúdo igual) |
| `types/{site-config,catalog}.ts`, `types/sections.ts`, `types/section-registry.ts` | `packages/schema/src/{site-config,catalog}.ts`, `sections/index.ts`, `registry.ts` (conteúdo igual) |
| `data/{products,services}.ts` | `packages/core/src/catalog/data/` (provisório, ver decisões) |
| `components/sections/registry.tsx` | `apps/site/app/iris.registry.generated.tsx` (regenerado) |
| `app/{favicon.ico,fonts.generated.ts}`, `site.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `public/`, `modules.json` | `apps/site/` |
| `scripts/{sync-brand,modules,sync-modules,add-theme}.mjs` | `apps/site/scripts/` (até a E6) |
| `scripts/check-modules.mjs` | continua na raiz, reescrito para o monorepo |

Imports: um codemod reescreveu 171 especificadores `@/...` do core para caminhos relativos; `@/site.config` virou `../lib/config` (único leitor do alias), `@/types/*` virou `@cbjk_iris/schema` e `@/lib/brand` virou `@cbjk_iris/engine/theme`.

### Decisões desta etapa (nenhuma muda contrato)

1. **Os tipos de hoje viram o `@cbjk_iris/schema` já na E2**, movidos para os caminhos de destino do §5.8, sem mudança. Os schemas zod substituem esses arquivos na E4. Sem isso, o core e o engine não teriam de onde importar `SiteConfig`, `Product`, `COLOR_TOKENS` etc.
2. **`data/*.ts` ficam provisoriamente em `packages/core/src/catalog/data/`.** O core não pode importar o projeto fora dos dois aliases do §5.1.3, e os loaders de `content/` só chegam na E5, que apaga esses arquivos. Até lá, o conteúdo de exemplo de produtos e serviços mora dentro do core.
3. **Layout e rotas finas de `apps/site/app/` são escritos à mão nesta etapa**, sem o cabeçalho "Gerado por iris sync": quem os gera é o `SyncRoutes` da E6. Cada rota fina reexporta exatamente o que a página original exportava; `dynamicParams = false` está literal só em `[slug]`, onde já existia (a E6 decide se as outras rotas dinâmicas também ganham). Já o registro e as fontes continuam gerados, com o cabeçalho novo.
4. **`modules:check` no formato de hoje** (ver seção 4). O formato com `siteConfig.modules` fica para a E6.
5. **`readThemeFile(name, root = process.cwd())`** ganhou o parâmetro opcional `root` e procura primeiro em `themes/` do projeto e depois nos embutidos (§5.1.3). Também recusa nome de tema com pasta ou `..`, porque o nome vira caminho de arquivo e agora há duas pastas. `availableThemes(root = process.cwd())` ganhou o mesmo parâmetro e devolve a união ordenada dos temas do projeto e dos embutidos; o do projeto vence quando o nome se repete. Nomes começando com ponto também são recusados, e a mensagem de erro de tema inexistente mudou para listar as duas pastas. O resto do motor de tema não mudou.

### Achado: no monorepo o engine é empacotado, apesar do `serverExternalPackages`

O primeiro `next build` falhou:

```
Error: Turbopack build failed with 1 errors:
./.claude/worktrees/.../packages/engine/dist/theme-DrognIiA.mjs:7:42
Module not found: Can't resolve '../themes/'
> 7 | ...MES_DIR = fileURLToPath(new URL("../themes/", import.meta.url))...
```

É o mesmo erro do controle negativo do ponto 7 do [spike](./spike-001.md), mas com o `withIris` pondo o engine em `serverExternalPackages`. A diferença: no spike o engine vinha de um tarball em `node_modules`; aqui é um workspace, e `node_modules/@cbjk_iris/engine` é um symlink para `packages/engine`, fora de `node_modules`. O Turbopack só deixa de empacotar o que resolve dentro de `node_modules`. Depois da correção, `apps/site/.next/node_modules` não existe e o código do engine aparece num chunk do servidor, o que confirma que ele foi empacotado.

Correção (sem mudar contrato): `packages/engine/src/paths.ts` calcula a pasta com `path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../themes")`, que o Turbopack não trata como asset. Funciona empacotado (monorepo) e externo (pacote instalado). O `withIris` continua pondo o engine em `serverExternalPackages`, que é o que vale no projeto do cliente.

Consequência: o `apps/site` não exercita o caminho "engine externo" que os projetos do cliente usam. Quem cobre esse caminho é o E2E do `create` com o Verdaccio (§6.4), que instala os pacotes compilados. A regra "o core só importa o engine em server components" continua valendo e agora tem teste (`packages/core/test/imports.test.ts`).

### Avisos que não são erro

- `Next.js inferred your workspace root ... multiple lockfiles`: aparece porque a worktree do agente fica dentro do clone principal (`.claude/worktrees/`), que tem outro `package-lock.json`. Num clone normal do monorepo só existe o lockfile da raiz.
- `npm warn install-scripts ... sharp@0.34.5 (install: node install/check.js ...)`: o npm 12 bloqueia o script, mas os binários do `sharp` vêm nos pacotes opcionais `@img/sharp-linux-x64` e `@img/sharp-libvips-linux-x64`, e o script bloqueado só confere a instalação. Prova: `next start` respondeu `GET /_next/image?url=%2Fhome%2Fslide-1.jpg&w=640&q=75` com `status=200 type=image/webp bytes=22482` (original: 75186 bytes). Aviso para o `iris-cli`: o `create-iris-site` não precisa aprovar o script, mas vale repetir esta conferência no E2E do Verdaccio.

## 3. Linha de base depois da migração

```
$ npm run build            # exit 0; tabela de rotas igual à da v0 (17 páginas estáticas)
$ npm run e2e -- baseline  # exit 0
  ✓ 16 capturas (4 páginas x desktop/mobile x claro/escuro), contra a v0
  ✓ 2 hidratação (desktop claro e escuro); 2 pulados (mobile, de propósito)
  18 passed, 2 skipped (14.0s)
```

Controle negativo: sem a linha `@source` do `apps/site/app/globals.css`, o build passa e `npm run e2e -- baseline --project desktop-light` sai com 1 ("4015316 pixels (ratio 0.35 of all image pixels) are different"). A linha de base pega classe do core que some do CSS.

### Hidratação de um componente `"use client"` do core (ponto 2 do spike, refeito)

`apps/site/e2e/baseline/hydration.spec.ts`: o `ThemeToggle` (TSX fonte do core, em `transpilePackages`) troca o rótulo e a classe `dark` do `<html>` a cada clique, grava `localStorage.theme = "dark"` e não há `pageerror`. Sem hidratação, o clique não faz nada. Passa no host e também dentro do container (`npm run e2e:docker -- baseline -g hidrata --project desktop-light`: 1 passed).

## 4. `modules:check`

Formato de hoje, adaptado ao monorepo:

1. **Isolamento no core:** nenhum arquivo de `packages/core/src` fora de um módulo importa os arquivos do módulo (`corePaths` em `apps/site/modules.json`) nem as dependências dele (`image-size`, `react-photo-album`). Esta é a prova da regra 3 do README: os arquivos dos módulos continuam no pacote, então os builds abaixo não pegariam um import indevido.
2. **4 cenários** (cada módulo desligado e todos juntos): cópia de `apps/site` em `apps/.modules-check-<cenário>/`, rotas e fotos do módulo apagadas, menu e seções tirados do `site.config.ts`, registro regenerado, `tsc` e `next build`, e nenhum link para rota removida no HTML.

```
$ npm run modules:check     # exit 0
✓ isolamento dos módulos no core
✓ sem products (10s)
✓ sem services (13s)
✓ sem gallery (15s)
✓ sem products + services + gallery (14s)
```

Controle negativo: com `packages/core/src/lib/zz-violacao.ts` importando `../products/PriceBlock` e `image-size`, sai com 1 e lista as duas violações.

## 5. Critérios de aceite da E2

| Critério | Comando | Saída |
|---|---|---|
| Verificação da raiz | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run sync:check` | exit 0 em todos |
| Linha de base contra a v0 | `npm run e2e -- baseline` | exit 0, 18 passed, 2 skipped |
| Sem `@/` no core | `grep -rn 'from "@/' packages/core/src` | vazio |
| Só `lib/config.ts` lê o config | `grep -rln '@cbjk_iris/site-config' packages/core/src` | `packages/core/src/lib/config.ts` |
| Licença e acesso | `grep -L '"license": "MIT"' packages/*/package.json`, `grep -L '"access": "public"' packages/*/package.json` | vazios |
| `.gitignore` do site | `grep -nE '^(node_modules\|\.next)$' apps/site/.gitignore` | as duas linhas |
| `schema` pelo Node | `node --input-type=module -e "import('@cbjk_iris/schema').then(m => console.log(Object.keys(m).length))"` em `apps/site` | `2` (Node 24.18; o 22.18 não foi testado) |
