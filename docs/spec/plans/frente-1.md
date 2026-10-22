# Plano: Frente 1 (iris-architect, arquitetura e contratos)

- **STATUS: APPROVED** pelo dono em 2026-10-20. Respostas: D-1 Docker instalado (29.9.1); D-2 `main` sincronizado com `origin/main`; D-3 titular do LICENSE = `lf-kali`; D-4 fotos CC0 escolhidas pela sessão principal; D-5 `brand.logo` = `cbjk_logo.svg`.
- **Data:** 2026-10-20
- **Executor:** `iris-architect` (subagente, worktree isolada). Revisores, commits e PRs ficam com a sessão principal.
- **Fonte:** [SPEC §6.1](../SPEC.md#61-iris-architect-arquitetura-e-contratos), [§6.1.1](../SPEC.md#611-conteúdo-de-exemplo-assistência-técnica-de-celulares), contratos do §5, ADRs 001–006.
- **Classificação:** XL (contratos, schema, API do engine, publicação). Duas trilhas de revisão onde há risco (ver cada etapa).

Este plano não muda a spec. Ele fatia o §6.1 em etapas com um PR cada, fixa a ordem, os critérios de aceite de cada uma (tirados do "Pronto quando") e os pontos em que o dono precisa decidir.

---

## 1. Bloqueios e decisões do dono antes de começar

Conferidos nesta sessão (comandos no fim do arquivo).

| # | Situação | Impacto | Recomendação |
|---|---|---|---|
| D-1 | **Docker não está instalado** nesta máquina (`which docker` vazio) | A spec exige gerar `__screenshots__` dentro do container do Playwright (`npm run e2e:docker`). Sem Docker, a linha de base v1 não pode ser gerada localmente | Instalar Docker antes da etapa E8. A v0 (E2) pode ser local, porque compara a mesma máquina antes e depois; só a v1 precisa do container. Alternativa: gerar a v1 num job de CI com `workflow_dispatch` e baixar o artefato |
| D-2 | `main` local está **1 commit à frente** de `origin/main`, e os 4 arquivos de agente novos (`iris-architect.md` etc.) estão fora do git | O iris-architect roda em worktree, que pode nascer de `origin/main` e ler uma spec velha (o agente para nesse caso, por regra própria) | Commitar `.claude/agents/*` e dar push no `main` antes do primeiro despacho |
| D-3 | Titular do `LICENSE` MIT | E0 precisa do nome | Informar o nome (ex.: "lf-kali" ou nome civil) |
| D-4 | Fotos CC0 de celulares (§6.1.1) | O iris-architect não tem busca na web; baixar foto e verificar licença sem ver a página de origem é frágil | Na E8, a sessão principal (ou o dono) escolhe as fotos e passa URL + licença ao agente, que baixa, redimensiona (≤ 300KB) e credita |
| D-5 | `public/logo.svg` e `public/cbjk_logo.svg` | §6.1.1 pede que o arquiteto confirme qual o `brand.logo` usa | Confirmar no PR da E8 |

Nenhum desses itens contradiz a spec. D-1 é o único que pode atrasar a frente.

---

## 2. Etapas

Cada etapa segue o pipeline do agente: plano da etapa → TDD → evidência → `PEDIDO DE REVISÃO` → `review-loop` com `adversarial-reviewer` (+ `security-reviewer` onde marcado) → `/handoff-verify` → `/commit-push-pr` com confirmação do dono. Uma etapa só começa depois do merge da anterior, porque a worktree do agente nasce do `HEAD`.

Aprovar este plano autoriza a **ordem e o escopo** das etapas. Nas etapas que escrevem contrato (E4, E5, E6), o agente ainda devolve o plano da etapa com a lista exata de arquivos e tipos antes de codar, como manda a definição dele.

### E0. Base legal

- **Faz:** `LICENSE` (MIT, titular D-3), `NOTICE` (temas do tweakcn, Apache-2.0, com a lista dos 10 arquivos de `themes/` que vierem do tweakcn), `"license": "MIT"` no `package.json` raiz.
- **Aceite:** `test -f LICENSE && test -f NOTICE`. (O grep em `packages/*/package.json` só vale a partir da E2.)
- **Revisão:** `adversarial-reviewer` (conferir quais temas são do tweakcn).
- **Risco:** baixo. Pode ir junto da E1 no mesmo PR se o dono preferir.

### E1. Spike dos 7 pontos (branch descartável)

- **Faz:** projeto mínimo **fora** do monorepo (em diretório temporário), que instala `schema`, `engine` e `core` mínimos por `npm pack`. Prova os 7 pontos do §6.1 passo 1.
- **Saída que fica:** só `docs/spec/spike-001.md`, com comando e saída de cada ponto. O código do spike não é mergeado.
- **Evidência por ponto:**
  1. `next build` com `withIris` importado de `@cbjk_iris/engine/next` instalado.
  2. Componente `"use client"` do core (TSX fonte) funcionando com `transpilePackages`.
  3. Aliases `@cbjk_iris/site-config` / `site-registry` resolvendo no `next build` (Turbopack) e no `tsc --noEmit`.
  4. Classe usada só no core aparece no CSS gerado (`grep` em `.next/static/chunks/*.css`; no Next 16 o CSS não sai em `.next/static/css`).
  5. Rota fina reexportando `default` + `generateStaticParams`, com `dynamicParams = false` literal: páginas aparecem como estáticas (`●`/SSG) no output do build.
  6. Hover de campo `z.infer`: medir pelo tsserver (`quickinfo` via script), não "olhando o VS Code". Se não mostrar a descrição, registrar no ADR 002 e seguir (a spec já prevê).
  7. Layout lê tema de `@cbjk_iris/engine/themes/` com `serverExternalPackages` e `fileURLToPath(new URL("../themes/", import.meta.url))`.
- **Antes de codar:** o agente roda `blind-spot-pass` para Turbopack `resolveAlias` + `transpilePackages` + `serverExternalPackages` e lê `node_modules/next/dist/docs/` dos três.
- **Gate:** se qualquer ponto de 1 a 5 ou 7 falhar, **para tudo** e abre ADR 007 (Proposto). A ADR 001 depende disso.
- **Revisão:** `adversarial-reviewer` reexecuta os comandos do `spike-001.md`.

### E2. Linha de base v0 + monorepo + migração sem mudança visual

O maior PR da frente. Se o diff passar de ~3k linhas fora de `git mv`, dividir em E2a (raiz + pacotes vazios + scripts) e E2b (movimentação).

1. **Antes de mover qualquer arquivo:** instalar Playwright, escrever `apps/site/e2e/baseline/*.spec.ts` contra o site atual (home, `/produtos`, `/produto/<slug>`, `/sobre`, claro e escuro, `maxDiffPixelRatio: 0.001`) e capturar a v0 local (D-1).
2. Raiz: `package.json` com workspaces `["packages/*", "apps/*"]`, `tsconfig.base.json`, `.changeset/` (lockstep), `.gitignore` com `apps/.*`, devDeps de teste (vitest, Playwright, `@lhci/cli`), tsdown.
3. Pacotes `schema`, `engine`, `core`, `cli`, `create` com `package.json` (`name`, `version 0.0.0`, `exports` do §5.6, `engines >=22.18`, `license`, `publishConfig.access: public`). `cli` e `create` ficam só com o `package.json` e um `src/index.ts` vazio (implementação é do iris-cli).
4. `git mv` conforme §5.1.1: `components/**`, `lib/**` → `packages/core/src/**`; `app/globals.css` → `packages/core/styles/iris.css`; `themes/*.css` → `packages/engine/themes/`; `lib/brand.ts`, `lib/theme-file.ts` → `packages/engine/src/theme/`; `components.json` → `packages/core/`; site → `apps/site/`.
5. Imports: todo `@/` do core vira relativo; os 17 imports de `@/site.config` em `components/` e `lib/` (+ os 8 de `app/`) passam por `packages/core/src/lib/config.ts` (único leitor do alias). Os 13 reexports `packages/core/src/sections/<type>.tsx`.
6. `withIris` mínimo, rotas finas e arquivos gerados conforme §5.1.3. `next.config.ts` do `apps/site` com `allowedDevOrigins` só quando `TAILNET_ADDRESS` existe (Q-13).
7. Scripts da raiz do §6 (`typecheck`, `lint`, `test`, `build`, `build:packages`, `sync:check`, `modules:check`, `e2e`, `e2e:docker`). `apps/site/.gitignore`, `apps/site/playwright.config.ts`, `packages/core/tsconfig.json` com fixtures.
8. `docs/spec/migration-001.md` com o comando e a saída do `npm run e2e -- baseline` contra a v0.

- **Proibido nesta etapa:** mudar JSX ou classes; mudar comportamento do motor de tema.
- **Aceite:**
  - `npm run typecheck && npm run lint && npm test && npm run build && npm run sync:check` passa.
  - `npm run e2e -- baseline` passa contra a v0.
  - `grep -rn 'from "@/' packages/core/src` vazio; `grep -rln '@cbjk_iris/site-config' packages/core/src` lista só `lib/config.ts`.
  - `grep -L '"license": "MIT"' packages/*/package.json` e `grep -L '"access": "public"' packages/*/package.json` vazios.
  - `apps/site/.gitignore` com `node_modules` e `.next`.
  - `node --input-type=module -e "import('@cbjk_iris/schema')..."` em `apps/site` imprime um número.
- **Nota:** `modules:check` (matriz de 4 cenários) depende de `siteConfig.modules`, que só existe na E4. Na E2 ele pode rodar no formato de hoje ou ficar para a E6; o plano da etapa diz qual.
- **Revisão:** `adversarial-reviewer` + `security-reviewer` (`withIris`, aliases e caminhos).

### E3. Inventário de estilo

- **Faz:** `scripts/style-inventory.mjs` (modos padrão, `--check`, `--after`), `docs/spec/style-inventory.json` com destino de cada ocorrência (utilitário congelado ou exceção justificada), tokens que faltarem acrescentados ao §5.4 com padrão `sera` igual ao valor de hoje (ex.: `--radius-surface`).
- **Aceite:** `node scripts/style-inventory.mjs --check` sai com 0; o script tem teste com um arquivo de fixture contendo cada padrão do §5.4 passo 1.
- **Contrato:** muda a lista de `SHAPE_TOKENS` e de utilitários na spec, no mesmo PR.
- **Revisão:** `adversarial-reviewer` (procurar classe de forma que o script não pega).

### E4. Schemas e tipos (`packages/schema`)

- **Faz:** `define.ts` (`defineSection`, `sectionBase`, `FieldMeta`), 13 `sections/<type>.ts`, `catalog.ts` (`productSchema`, `serviceSchema`, `PLATFORM_HOSTS`, `platformUrl`, `httpsUrl`, tipos de botão), `site-config.ts` (`siteConfigSchema`, `SiteConfigInput`, `SiteConfig`, `resolveSiteConfig`, `commerce.buttonOrder`), `texts.ts` (`SiteTexts`, `DEFAULT_TEXTS`, `resolveTexts`), `page.ts`, `modules.ts`, `theme/tokens.ts` (`SHAPE_TOKENS` da E3, `STYLE_IDS`), `cli.ts` (`CliResult`), `engine-api.ts`, `registry.ts`. Geração de `json/*.schema.json` com `io: "input"` e `$schema` declarado.
- **TDD mínimo (RED primeiro):**
  - `resolveTexts`: merge profundo; `buyOnWhatsapp` vale como `buttons.whatsapp` quando este falta.
  - Campo com `ask` perguntado sem `label` falha.
  - URLs por plataforma: host exato, sufixo com ponto, `mercadolivre.com.br.evil.com` rejeitado, userinfo rejeitado, `http:`/`javascript:`/`data:` rejeitados, > 2048 rejeitado.
  - `buttonOrder` repetido falha; plataformas faltantes vão para o fim em `DEFAULT_BUTTON_ORDER`.
  - JSON Schema gerado não exige `whatsappButton`.
- **Aceite:** `npm test -w @cbjk_iris/schema` verde, cobertura ≥ 80% em `packages/schema/src`.
- **Revisão:** `adversarial-reviewer` + `security-reviewer` (validação de URL é a defesa contra link malicioso no conteúdo).

### E5. Conteúdo em JSON + loaders

- **Faz:** migra `data/*.ts`, `home` e `pages` para `apps/site/content/**/*.json` com `$schema` relativo e `order` de 10 em 10 na ordem atual; loaders `loadHome`, `loadPage`, `loadPages`, `loadProducts`, `loadServices` no engine (removem `$schema`, validam, ordenam por `order` → sem `order` no fim → slug; erro com arquivo e caminho); repositórios do core e `app/{home,config-page}.tsx` passam a usar os loaders (sem mudar JSX nem classes); `types/*.ts` e `data/*.ts` apagados; slugs reservados.
- **TDD:** cada JSON de `apps/site/content` valida; loader aceita `$schema`; slug inválido e slug reservado falham; seção de módulo desligado dá erro com as duas saídas; ordenação.
- **Aceite:** testes verdes + `npm run e2e -- baseline` continua passando contra a v0 (ADR 004: "páginas geradas iguais").
- **Revisão:** `adversarial-reviewer` + `security-reviewer` (caminhos vindos de nome de arquivo).

### E6. API do engine (§5.6)

- **Faz:** `LoadSiteConfig`, `SyncRegistry`, `SyncRoutes`, `Sync`, `CheckContent`, `RemoveModuleContent`, `withIris` completo; versão mínima de `ListThemes`, `ListStyles`, `ValidateTheme`, `SyncBrand` (port do `brand:sync`, `font-data.json` por `createRequire`) e `ImportTheme` (port do `theme:add`, só `https:`, só variáveis em `:root`/`.dark`). Scripts `.mjs` de uma linha em `apps/site/package.json`; `scripts/*.mjs` antigos removidos. `modules:check` com os 4 cenários.
- **TDD:** ao menos um teste por função; `ImportTheme` rejeita `http:` e descarta `@import` e `url()`; `Sync --check` falha com arquivo desatualizado; teste do core "toda seção tem componente, e vice-versa".
- **Aceite:** `npm test -w @cbjk_iris/engine` e `-w @cbjk_iris/core` verdes; `npm run sync:check` e `npm run modules:check` (4 cenários) passam; baseline v0 continua passando.
- **Revisão:** `adversarial-reviewer` + `security-reviewer` (`ImportTheme` baixa da rede; `LoadSiteConfig` executa código do projeto).

### E7. `release.yml`

- **Faz:** `.github/workflows/release.yml` (só `workflow_dispatch`, `permissions: id-token: write`, changesets, `npm publish --provenance`), `ci.yml` rodando os scripts de verificação.
- **Aceite:** `grep` do gatilho, `id-token: write` e `--provenance`; `actionlint` sem erro (se disponível).
- **Nenhuma publicação.** Antes de escrever, `blind-spot-pass` em trusted publishing (OIDC) e changesets em lockstep.
- **Revisão:** `adversarial-reviewer` + `security-reviewer` (permissões, OIDC).
- **Nota:** independente de E3–E6; pode correr em paralelo com elas se a sessão principal quiser, porque toca só `.github/`.

### E8. Conteúdo de celulares + linha de base v1

- **Faz:** troca do §6.1.1 (config, `content/**`, ≥ 4 serviços, ≥ 4 produtos cobrindo só WhatsApp / só marketplaces / todos / nenhum, links de busca reais, fotos CC0 ≤ 300KB com crédito), `scripts/check-credits.mjs`, captura da v1 no container (D-1).
- **Aceite:**
  - `grep -riE "porcelanato|reforma|drywall|gesso|hidr[aá]ulic|el[eé]tric|acabamento|torneira|lumin[aá]ria|rodap[eé]" apps/site/content apps/site/site.config.ts` vazio.
  - `node scripts/check-credits.mjs` sai com 0.
  - `__screenshots__/` gerado por `npm run e2e:docker -- baseline --update-snapshots`, e `npm run e2e -- baseline` passa.
  - Testes de validação de conteúdo do schema continuam verdes.
- **Revisão:** `adversarial-reviewer` (licença das fotos, links).

### E9. Congelamento

- **Faz:** roda o checklist completo do §6.1 "Pronto quando" de ponta a ponta numa worktree limpa; ADRs 002, 003 e 005 passam de "Proposto" para "Aceito"; linha de status da spec vira `CONGELADO em <data> (tag contracts-v1)`.
- **Tag:** o agente não cria tag. A sessão principal cria `contracts-v1` depois do merge, com confirmação do dono.
- **Revisão:** `skeptical-auditor` reexecuta todo o checklist; `adversarial-reviewer` confere que nenhum contrato do §5 ficou sem implementação.

---

## 3. Ordem e paralelismo

```
E0 ─ E1 (gate) ─ E2 ─ E3 ─ E4 ─ E5 ─ E6 ─ E8 ─ E9
                        └──────── E7 ────────┘   (paralelo, só .github/)
```

E3 pode trocar de lugar com E4, mas antes da E4 é melhor: `SHAPE_TOKENS` já sai completo.

## 4. Riscos

| Nível | Risco | Mitigação |
|---|---|---|
| ALTO | Spike falha (Turbopack + alias + `transpilePackages` em pacote instalado) | Gate na E1; ADR 007 antes de qualquer migração |
| ALTO | Diferença visual escondida na migração (ordem de CSS, `@source` faltando) | v0 tirada antes de mover; `maxDiffPixelRatio: 0.001` |
| MÉDIO | Docker ausente bloqueia v1 (D-1) | Instalar antes da E8, ou job de CI |
| MÉDIO | E2 grande demais para revisar | Dividir em E2a/E2b; movimentações por `git mv` para o diff mostrar rename |
| MÉDIO | Worktree do agente nasce de commit velho (D-2) | Push antes; o agente para se não for fast-forward |
| BAIXO | Hover do `z.infer` perde JSDoc | Já previsto no ADR 002; a descrição vai no `.meta()` |

## 5. Fora do escopo desta frente

Classes e JSX de componentes, valores dos presets de estilo, comandos da CLI, README e guias, publicação no npm, criação da tag pelo agente.

## 6. Pendências registradas pelas revisões

Achados das revisões já mergeadas, distribuídos pela etapa que vai tocar no arquivo. Cada etapa lê esta tabela no plano dela.

| Origem | Achado | Severidade | Etapa |
|---|---|---|---|
| E2, security-reviewer | `images.remoteHosts` sem validação: `"**"` vira proxy aberto no `/_next/image`. Validar o host no `siteConfigSchema` (recusar `*`, `**`, curinga em TLD, `/` e `:`) | MEDIUM | Resolvido na E4a: `hostnameSchema` aceita só host exato (sem curinga, protocolo, caminho, porta ou IP; P-2 = A), e o `withIris` valida o config inteiro com `resolveSiteConfig` antes de montar `remotePatterns` |
| E2, adversarial-reviewer | `modules:check` só enxerga import relativo; import do próprio core por `@cbjk_iris/core/...` passa. Proibir por lint e tratar no isolamento | LOW | Resolvido na E4b: `no-restricted-imports` no `packages/core/eslint.config.mjs`, teste em `packages/core/test/imports.test.ts` e checagem em `scripts/check-modules.mjs` (controle negativo nos três) |
| E2, adversarial-reviewer | Tipo `SectionRegistry` no `schema` importa tipo do React (`react` como peer opcional), contra a regra "schema não importa React" | Decisão | Resolvido na E4a (P-1 = B): `SectionComponent<T> = (props: { section: SectionOf<T> }) => unknown`; peer `react` e `@types/react` saíram do `schema` |
| E2, security-reviewer | `check-modules.mjs`: `rmSync` sem conferir que o caminho fica dentro da cópia; `RegExp` sem escape | LOW | Resolvido na E6a: `removeCopy` só apaga `apps/.modules-check-<cenário>` e recusa link simbólico; `escapeRegExp` no menu (`scripts/lib/modules-check.mjs`, com teste) |
| E2, security-reviewer | `sync-brand.mjs`: valores de fonte interpolados no TS gerado sem `JSON.stringify`; `path` de fonte local aceita absoluto ou `..` | LOW | Resolvido na E4a: o schema valida nome, pesos e caminho da fonte; o `sync-brand.mjs` roda `resolveSiteConfig` antes de gerar, gera com `JSON.stringify` e consulta as fontes com `Object.hasOwn` ("constructor" dava TypeError). A E6 porta isso para o `SyncBrand` sem regredir |
| E2, adversarial-reviewer | `apps/site` sem `build:packages` falha; conferir que a mensagem manda rodar `npm run build:packages` (§5.1.4) | LOW | Resolvido na E6a: `apps/site/scripts/sync.mjs` (`predev`/`prebuild`) imprime a mensagem quando o engine não resolve (teste em `scripts/test/site-sync.test.mjs`) |
| E2, security-reviewer | `e2e-docker.mjs` monta o repo inteiro em escrita; imagem por tag, não digest. Usar `:ro` + montagens rw só de saída, `--cap-drop=ALL`, `no-new-privileges`, digest na CI | LOW | E7 |
| E2, security-reviewer | `npm audit` não rodou na revisão | — | E7 (CI) |
| E2, adversarial-reviewer | Linha de base insensível a ajuste pequeno (`text-sm` → `text-[15px]` passou com `maxDiffPixelRatio: 0.001` em página inteira). Acrescentar capturas por região ou comparação de estilos computados | LOW | Resolvido na E3: `apps/site/e2e/baseline/styles.spec.ts` compara os estilos computados de todos os elementos (controle negativo: o mesmo `text-[15px]` falha). Na E8, os `.txt` são regerados no container junto com as capturas |
| E2, iris-architect | Node 22.18 (mínimo declarado) nunca testado; só 24.18 | — | E7 (matriz da CI) |
| E3, adversarial-reviewer (2ª rodada) | `notClassList` do `style-inventory.mjs` descarta qualquer string em atributo JSX sem "class" no nome (ex.: `tw=`) e qualquer valor das chaves `variant`/`size` (ex.: `size: "rounded-lg h-9"`). Não ocorre no core hoje. Restringir o descarte de `variant`/`size` a identificadores de uma palavra, ou documentar | LOW | Resolvido na E4b: só é descartado o valor de uma palavra; `size: "rounded-lg h-9"` e `tw="rounded-lg h-9"` são lidos. Sobra documentada: `tw="rounded-lg"` (uma palavra) |
| E3, adversarial-reviewer | Estilo inline (`style={{…}}`) e propriedade arbitrária entre colchetes (`[border-radius:4px]`) não são inventariados. Nenhum caso de forma no core hoje | LOW | Resolvido na E4b: família `arbitrary` e ocorrências `style:<prop>` (família `inline-style`) no `style-inventory.mjs`; `--check` continua saindo com 0 sem entrada nova |
| E3, adversarial-reviewer | `border-selected` (miniatura escolhida da ImageGallery) usa `--ring-width`: borda acoplada à largura do foco | LOW | Aceito como está; token próprio só se um estilo precisar |
| E4, iris-architect (R-1) | Validar o config em `lib/config.ts` levava o zod ao navegador (+62,4 KB gzip) | — | Resolvido na E4a (opção B, dono em 2026-10-21): subpath `@cbjk_iris/schema/defaults` sem zod; validação no `withIris`. Medido: 279,1 → 280,1 KB gzip (+1,0 KB) |
| E4, security-reviewer | Confirmação humana quando `leads.endpoint` mudar (os dados do formulário passam a ir para outro destino) | — | iris-cli (a edição do config é da CLI) |
| E4, security-reviewer | Conferir se o `next dev` revalida o config (withIris) ao editar `site.config.ts` com o servidor rodando; se não, documentar ou revalidar no sync | — | Conferido na E6a: não revalida (o Next só observa `next.config.*`). Documentado no §5.3; o `predev` valida na partida. Observador no `dev`: iris-cli (`iris dev`, backlog) |
| E4, adversarial-reviewer | O teste `defaults-isolation` lê o `dist`: a CI precisa sempre compilar (`build:packages`) antes de testar | — | E7 |
| E4, security-reviewer | `widget.html` é área de confiança (HTML e scripts executam no site). A CLI deve exigir flag explícita e avisar quando houver `<script>` | — | Documentado no §5.3 e no §5.5 na E4; implementação: iris-cli |
| E4, security-reviewer (L2) | Restringir `contact.mapEmbedUrl` ao mapa incorporado do Google | — | Resolvido na E4a (opção b, dono em 2026-10-21): host exato `www.google.com`, caminho `/maps/embed` ou `/maps` com `output=embed`, depois das regras de link https. Na E8: trocar a URL de exemplo do `apps/site` para `/maps/embed?pb=…` e então decidir se o schema aceita só esse formato |
| E4, security-reviewer (rodada final) | `sandbox` no iframe do mapa (`packages/core/src/sections/ContactSection.tsx`): restringe o que a página incorporada pode fazer | LOW | iris-commerce, depois da tag |
| E4, security-reviewer (correção estrutural) | Hosts multi-inquilino ainda fora de `PUBLIC_SUFFIX_HOSTS`: `githubusercontent.com`, `ngrok.app`, `dyndns.org`, `blogspot.com`, `loca.lt` | LOW | Dado: PR ao arquiteto |
| E4, security-reviewer (correção estrutural) | Um `next.config` do cliente que ligue `images.dangerouslyAllowLocalIP` passa pelo `withIris` sem aviso | LOW | Resolvido na E6b: aviso no stderr a cada build, sem bloquear (P-3 = B); teste em `packages/engine/test/next.test.ts` |
| E4, security-reviewer (cssValue) | `cssValue` aceita valores sintaticamente estranhos mas inofensivos (`calc(1+)`, `rgb(#,%)`, `()`): só invalidam a própria declaração, sem perder regras. Validar a forma de cada função é opcional | LOW | Backlog |
| E4, security-reviewer (cssValue) | `brand.colors.primary: "#"` passa no schema, mas o motor de tema lança `Cor inválida: "#"` no build (fail-closed, sem a mensagem do `SiteConfigError`) | LOW | Resolvido na E6a: o `syncBrand` (que roda no `prebuild`) dá erro com `path: brand.colors.primary`, sem mudar o motor |
| E4, adversarial-reviewer (cssValue) | Teste de tempo do `cssValue` exige < 50 ms para 200000 caracteres; pode oscilar em CI lenta. Subir para ~200 ms se falhar | LOW | E7 (CI) |
| E4, adversarial-reviewer (cssValue) | `UNSAFE_CHARS` não cobre invisíveis raros (U+3164, U+FFA0). Não afeta `cssValue`; só URLs e caminhos | LOW | Backlog |
| E5, iris-architect | `next dev` não recarrega sozinho ao editar `content/*.json` (o JSON não entra no grafo de módulos); recarregar a página mostra a mudança | LOW | iris-cli (`iris dev`, backlog), junto com a revalidação do config |
| E5, iris-architect | README (e instruções antigas) mandam editar `data/*.ts` e `home`/`pages` no `site.config.ts`; agora é `content/**/*.json` | — | iris-docs |
| E5, iris-architect | O exemplo de widget do TripAdvisor (comentário em `pages[sobre]` do config) não coube no JSON; levar para a doc, se quiser | — | iris-docs |
| E5, security-reviewer | O teste transitivo da fronteira cliente/servidor (`packages/core/test/imports.test.ts`) não vê `import()` dinâmico nem `import x = require()`; o `next build` é a segunda barreira (falha com `fs` no cliente) | LOW | Resolvido na E6b: o grafo segue também `import("x")`, `require("x")` e `import x = require("x")` (controle negativo no teste) |
| E5, security-reviewer | `content/` como link simbólico é aceito por desenho (vira a base; quem cria é o dono do projeto). Documentado no §5.3 | — | Aceito |
| E5, security-reviewer | Windows não verificado: junctions e reparse points, `O_NOFOLLOW` e `O_NONBLOCK` = 0 (valem o `lstat` e o `realpath`) | LOW | E7 (matriz da CI) |
| E5, adversarial-reviewer (rodada final) | `modules-check-content.mjs`: se a escrita ou o `rename` falhar no meio, o `<arquivo>.<pid>.tmp` fica para trás (some com a cópia descartável) | LOW | Resolvido na E6b: o script saiu; `removeModuleContent` apaga o temporário se o `rename` falhar (teste com `rename` que falha) |
| E5, adversarial-reviewer (rodada final) | `readCapped`, `readText` e `jsonErrorMessage` são exportados de `read.ts` só para teste; nenhum teste congela as chaves públicas de `@cbjk_iris/engine/content` | LOW | Resolvido na E6b: `packages/engine/test/exports.test.ts` congela os 5 subpaths (valores e tipos) e a tabela está no §5.6; os auxiliares de `read.ts` continuam internos (fora do `index` de `content/`) |
| E5, coordenador | Ordem de listagem de `/[slug]` na saída do `next build` mudou (`/contato, /sobre`), porque `loadPages` ordena por slug. HTML idêntico; nada visível muda | Aceito | — |
| E6a, iris-architect | README cita `npm run brand:sync` e `modules:sync`, e o `modules.json`; agora é `npm run sync` e `siteConfig.modules` | — | iris-docs |
| E6a, iris-architect | O layout do core ainda não escreve `data-style` no `<html>` (mudança de JSX). Até lá, o `sync` só avisa quando `theme.style` não é `sera` | — | iris-theme |
| E6a, security-reviewer | O `site.config.ts` pode forjar o resultado do `loadSiteConfig` escrevendo no descritor 3 e saindo. O valor forjado ainda passa pelo `resolveSiteConfig`, e o config já é código executável | LOW | iris-cli (decide como roda os comandos) |
| E6a, security-reviewer | O processo filho do `loadSiteConfig` herda o ambiente inteiro, inclusive `NODE_OPTIONS` | LOW | iris-cli |
| E6a, security-reviewer | Um processo "neto" lançado pelo config com `detached` sobrevive ao timeout de 30 s (o `SIGKILL` só pega o filho) | LOW | iris-cli |
| E6a, adversarial/security | Teste dos ramos de timeout e `ENOBUFS` do `load-config.ts` (hoje sem teste: o timeout é de 30 s) | LOW | Backlog (não feito na E6b): exigiria tempo configurável só para teste |
| E6a, security-reviewer (rodada 2) | `stripControl` (`load-config.ts`) não remove caracteres bidi (U+202A–202E, U+2066–2069) nem U+2028/2029: a mensagem de erro do config pode aparecer invertida no terminal | LOW | Resolvido na E6b: `stripControl` remove também U+200E, U+200F, U+202A a U+202E, U+2066 a U+2069, U+2028 e U+2029 (teste) |
| E6b, security-reviewer | `removeModuleContent` regravava com `JSON.stringify` e mudava número sem exatidão em silêncio (`1e400` → `null`) | MEDIUM | Resolvido na E6b (rodada 2): o arquivo é recusado com `ContentError` antes de qualquer gravação (`modules/json-numbers.ts`, com teste) |
| E6b, security-reviewer | Regravação perdia o `mode` do arquivo; gravação seguia `content/` como link para fora do projeto; aviso do `withIris` só com `=== true` | LOW | Resolvido na E6b (rodada 2), com teste |
| E6b, adversarial-reviewer | Subpath novo no `package.json` passaria sem atualizar o `exports.test.ts`; aviso da galeria dizia "pasta ignorada" (o `public/` continua servido) | LOW | Resolvido na E6b (rodada 2) |
| E6b, security-reviewer (rodada 2) | `canonical` em `json-numbers.ts` era quadrático (`/0+$/` sem âncora): literal `0.1` + 100 mil zeros + `1` levava ~4,5 s; `mode` copiado com `0o7777` levava setuid, setgid e sticky | MEDIUM | Resolvido na E6b (rodada 3): zeros contados por laço; literal com mais de 400 caracteres é recusado sem cálculo exato (falso positivo inofensivo: `1.000…0` com centenas de zeros); `mode & 0o777`. Testes de tempo (< 100 ms para 500 mil caracteres) e de sticky |
| E6b, security-reviewer (rodada 2) | `content/` como link para a própria raiz do projeto é recusado na gravação do `removeModuleContent` (falso positivo inofensivo) | LOW | Backlog |
| E6b, security-reviewer (rodada 2) | Corrida entre o `assertWritable` e o `rename` do `removeModuleContent` (exige atacante local concorrente com escrita na pasta do projeto) | LOW | Backlog |
| E6a, security-reviewer (rodada 2) | `stripControl`: DCS/APC/PM/SOS perdem só o ESC (payload vira texto inofensivo); CSI malformado come um caractere do texto seguinte | LOW | Backlog |
| E6a, security-reviewer (rodada 2) | `IDENTIFIER` em `sync-brand.ts` aceita palavras reservadas do JS e nomes que o gerador já declara; só alcançável com `font-data.json` adulterado (o build falha) | LOW | Backlog |
| E6a, adversarial-reviewer (rodada 2) | `builtRouteProblems` olha só o primeiro segmento da rota: uma página de `content/pages/` com o mesmo slug de uma rota de módulo desligado daria falso positivo (cenário que já conflita com a rota) | LOW | Backlog |
| E6b, security-reviewer (rodada 3) | `inexactNumbers` acumula todos os achados (ex.: 1 MiB de `-` gera 1 milhão de entradas, alguns MB de heap, 72 ms) embora o `removeModuleContent` use só os 3 primeiros. Parar o laço no 3º achado | LOW | Backlog |

## 7. Fatos conferidos para este plano

| Fato | Comando |
|---|---|
| Node 24.18, npm 12.0.1 | `node -v && npm -v` |
| zod 4.4.3 em `node_modules` | `node -p "require('./node_modules/zod/package.json').version"` |
| 17 arquivos em `components/` e `lib/` importam `@/site.config` (+ 8 em `app/`) | `grep -rln '@/site.config' components lib \| wc -l` |
| 13 tipos de seção (10 core + 3 de módulo) | `modules.json` |
| Docker ausente | `which docker` (sem saída) |
| `main` 1 commit à frente de `origin/main` | `git rev-list --left-right --count main...origin/main` → `1 0` |
