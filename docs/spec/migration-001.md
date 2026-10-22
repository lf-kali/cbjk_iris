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

## 6. E5: conteúdo em JSON (2026-10-21)

`packages/core/src/catalog/data/{products,services}.ts` e as chaves `home` e `pages` do `apps/site/site.config.ts` viraram 11 arquivos em `apps/site/content/`: `home.json`, `pages/{sobre,contato}.json`, 4 em `products/` e 4 em `services/`. Os arquivos foram gerados por um script de uma vez (não commitado), com estas regras: sem `kind` e sem `slug`; sem `whatsappButton` (o padrão `true` do schema dá o mesmo resultado que o `?? true` antigo); `order` de 10 em 10 na ordem do array; `$schema` relativo, calculado por `createRequire(apps/site).resolve("@cbjk_iris/schema/json/<tipo>.schema.json")`. Perdeu-se só um comentário: o exemplo de widget do TripAdvisor que ficava em `pages[sobre]`, porque JSON não aceita comentário.

### Equivalência, provada antes de apagar as fontes antigas

O teste temporário `packages/engine/test/migration-e5.test.ts` comparou a saída dos loaders com os objetos antigos, por `toEqual`:
- produtos e serviços iguais a `data/*.ts`, mais `order: (i + 1) * 10`;
- home igual a `siteConfig.home`;
- páginas iguais a `siteConfig.pages`, ordenadas por slug.

```
$ npx vitest run test/migration-e5.test.ts --reporter=verbose      # em packages/engine; exit 0
 ✓ produtos: iguais aos de data/products.ts, com order de 10 em 10 na ordem do array
 ✓ serviços: iguais aos de data/services.ts, com order de 10 em 10 na ordem do array
 ✓ home: igual a siteConfig.home
 ✓ páginas: iguais a siteConfig.pages (ordenadas por slug)
      Tests  4 passed (4)
```

Controle negativo: trocar "Sobre nós" por "Sobre nos" em `content/pages/sobre.json` faz o teste de páginas falhar (1 failed | 3 passed). Depois disso, o teste e as fontes antigas foram apagados.

**Como refazer:** recrie os dois arquivos com `git show main:packages/core/src/catalog/data/products.ts` (e `services.ts`) no caminho antigo e o `home`/`pages` com `git show main:apps/site/site.config.ts`, e rode o mesmo teste.

### HTML pré-renderizado igual ao do `main`

Cada build passa por um script de uma vez, que tira de cada `.next/server/app/**/*.html` o texto visível e os atributos `href`, `src`, `alt`, `srcset`, `aria-label` e `content`. Ele ignora scripts e estilos, descarta as URLs de `/_next/static/` e normaliza o `BUILD_ID`. Os dois builds foram feitos com `npm run build`: o do `main` (63b4012) antes de qualquer edição e o do branch.

```
$ diff html-main.txt html-e5.txt      # 16 páginas (index, sobre, contato, 4 produtos, 4 serviços, listas, galeria, 404); exit 0, sem diferença
```

### Tabela de rotas

O conjunto de rotas e os símbolos (`○` estático, `●` SSG) são iguais aos do `main`. Só mudou a ordem de listagem dos parâmetros de `/[slug]`: antes `/sobre`, `/contato` (ordem do array), agora `/contato`, `/sobre` (o `loadPages` ordena por slug). A ordem do `generateStaticParams` não afeta nada no site. `/produto/[slug]` e `/servico/[slug]` ganharam `dynamicParams = false`: com isso nenhuma rota lê `content/` em tempo de execução, e o slug desconhecido continua dando 404.

### Achado: aviso de tracing do Turbopack

No monorepo, o Turbopack empacota o engine (seção 2). Com o `path.resolve(root ?? process.cwd())` dos loaders, o build passou a mostrar `Encountered unexpected file in NFT list ... the whole project was traced unintentionally`. A correção foi o comentário `/* turbopackIgnore: true */` dentro do `path.resolve`, que a doc do Next oferece (`08-turbopack.md`, tabela de comentários mágicos) e que o tsdown preserva no `dist`. Depois disso, o build não tem mais esse aviso. No projeto do cliente, o engine é externo (`serverExternalPackages`) e o Turbopack não o analisa.

### Outras medições

| O quê | Comando | Resultado |
|---|---|---|
| Linha de base v0 | `npm run e2e -- baseline` | 34 passaram, 2 pulados (hidratação no celular, por desenho); exit 0 |
| gzip dos chunks do cliente | soma de `gzip -9` de `apps/site/.next/static/chunks/**/*.js` | `main` 279,6 KB → E5 278,1 KB (−1,5 KB: o `site.config.ts`, que vai ao navegador, perdeu `home` e `pages`) |
| Engine e zod fora do navegador | `grep -rlE "ZodError\|ContentError\|readdirSync" apps/site/.next/static` | vazio |
| Erro de conteúdo no build | cópia com `answer` faltando em `content/pages/sobre.json`, `next build` | exit 1: `content/pages/sobre.json → sections[2].items[0].answer: Entrada inválida: esperava um texto, recebeu um valor "undefined"` |
| Catálogo vazio | cópia com só `content/products/.gitkeep`, `next build` | exit 0; `● /produto/[slug]` sem páginas |
| `next dev` | `curl /sobre`, editar o JSON, `curl /sobre` de novo | o texto novo aparece sem reiniciar (não há recarga automática no navegador) |

## 7. E6a: arquivos gerados pelo sync (2026-10-22)

Os 9 arquivos escritos à mão na E2 (`apps/site/app/layout.tsx` e as 8 rotas de `app/(iris)/`) foram apagados e regenerados por `npm run sync` (`Sync` do engine, §5.6). Junto com `fonts.generated.ts` e `iris.registry.generated.tsx`, a diferença para o `main` está só nos comentários: todos começam com `// Gerado por iris sync. Não edite à mão.` e a segunda linha diz de onde vêm. O `apps/site/modules.json` saiu. `siteConfig.modules` é a fonte de verdade, declarada no `apps/site/site.config.ts`.

### Site igual ao do `main`

A referência é o build de `c269444` (o `main`), feito na mesma worktree **antes de qualquer edição**: é o mesmo código que um `git archive c269444` daria. Depois, o build do branch. Os dois com `npm run build`, e o HTML passou pelo mesmo extrator da E5 (texto visível e `href`, `src`, `alt`, `srcset`, `aria-label` e `content`, sem scripts e estilos, sem URLs de `/_next/static/`, `BUILD_ID` normalizado).

| O quê | Comando | Resultado |
|---|---|---|
| Tabela de rotas | `diff` do trecho `Route (app)` das duas saídas do `next build` | exit 0, sem diferença |
| HTML pré-renderizado | `diff html-main.txt html-e6a.txt` (16 páginas) | exit 0, sem diferença |
| Linha de base v0 | `npm run e2e -- baseline` (pages, styles, hydration) | 34 passaram, 2 pulados (hidratação no celular, por desenho); exit 0 |
| Código do sync fora do navegador | `grep -rlE "spawnSync\|SiteConfigLoadError\|child_process" apps/site/.next/static` | vazio (exit 1) |
| gzip dos chunks do cliente | soma de `gzip -9` de `apps/site/.next/static/chunks/**/*.js` | `main` 284.551 bytes → E6a 284.563 bytes (+12 bytes) |
| `sync:check` | `npm run sync:check` | exit 0 |
| Controle negativo | um espaço a mais em `app/(iris)/produtos/page.tsx`, `npm run sync:check` | exit 1: `Desatualizado: app/(iris)/produtos/page.tsx. Rode: npm run sync` |

### `modules:check` no formato final

`scripts/check-modules.mjs`: os 4 cenários gravam `siteConfig.modules` na cópia, tiram o menu e as seções do módulo e rodam o `Sync`, que apaga as rotas do módulo. Não se apaga mais nada à mão. O `rm` da cópia só aceita `apps/.modules-check-<cenário>` e recusa link simbólico. As rotas do menu entram na `RegExp` com escape (`scripts/lib/modules-check.mjs`, com teste).

```
$ npm run modules:check      # exit 0
✓ isolamento dos módulos no core
✓ sem products (10s)
✓ sem services (11s)
✓ sem gallery (11s)
✓ sem products + services + gallery (10s)
```

**Oráculo por cenário (rodada de correção da E6a):** a busca de `href` sozinha não provava o desligamento da galeria, porque nada linka `/ultimos-projetos`. Agora cada cenário também confere que as rotas geradas dos módulos desligados sumiram da cópia depois do sync e que o `next build` não gerou `.next/server/app/<rota>.html` nem a pasta `<rota>/` (`generatedRouteProblems` e `builtRouteProblems`, em `scripts/lib/modules-check.mjs`, com teste). Controles negativos, com o arquivo restaurado depois de cada um:
- com `setModules` sabotado (devolve o config sem mudar), os 4 cenários falham, inclusive "sem gallery": `app/(iris)/ultimos-projetos/page.tsx ainda existe com o módulo gallery desligado`;
- com `setModules` e `generatedRouteProblems` sabotados, os 4 falham no build: `.next/server/app/ultimos-projetos.html foi gerado com o módulo gallery desligado`.

Conferido com `--keep`: na cópia sem os três módulos, `app/(iris)/` só tem `page.tsx` e `[slug]/page.tsx`, `modules: []`, nenhum item de menu de módulo e a home sem as seções de módulo. A busca de link acha `href="/sobre"` no `index.html` dessa cópia e `href="/produtos"` na cópia sem a galeria (a checagem enxerga links reais).

### Leitura do config num processo filho

Testado no Node 22.18 (binário oficial `node-linux-x64@22.18.0`) e no 24.18: `require()` e `import()` do `site.config.ts` funcionam sem flag, mas nenhum dos dois relê o arquivo editado no mesmo processo (nem com `delete require.cache`). Só o `import()` com query nova relê, e assim mesmo não relê os arquivos que o config importa. Por isso o `loadSiteConfig` usa um processo filho a cada chamada (§5.6).

## 8. E6b: conteúdo e Next (2026-10-22)

`checkContent` e `removeModuleContent` entraram no engine (§5.6), só pela raiz. Os loaders ganharam um núcleo síncrono que devolve dados e diagnostics sem lançar (`collectHome`, `collectPages`, `collectProducts`, `collectServices`). A API pública deles não mudou. O `scripts/lib/modules-check-content.mjs` saiu: o `modules:check` usa o `removeModuleContent` do engine, o mesmo que o `iris module remove` vai usar.

| O quê | Comando | Resultado |
|---|---|---|
| HTML pré-renderizado | build de `git archive 9cbf17f` (o `main`) num diretório à parte, com `npm ci` e `npm run build`; o mesmo extrator da E5; `diff` com o build do branch | 16 páginas, exit 0, sem diferença |
| Tabela de rotas | `diff` do trecho `Route (app)` das duas saídas do `next build` | exit 0 |
| Linha de base v0 | `npm run e2e -- baseline` | 34 passaram, 2 pulados (por desenho); exit 0 |
| Código de Node fora do navegador | `grep -rlE "spawnSync\|SiteConfigLoadError\|child_process\|checkContent\|removeModuleContent" apps/site/.next/static` | vazio (exit 1) |
| Entradas que o core importa | `grep -l child_process` em `dist/content.mjs`, `dist/theme.mjs` e nos chunks que eles importam (`loaders-*.mjs`, `brand-*.mjs`) | vazio; só `codegen-*.mjs` tem `child_process` |
| gzip dos chunks do cliente | soma de `gzip -9` de `apps/site/.next/static/chunks/**/*.js` | `main` 284.531 bytes, E6b 284.516 bytes |
| `sync:check` | `npm run sync:check` | exit 0 |
| `modules:check` | `npm run modules:check` | exit 0: isolamento e os 4 cenários ✓ |
