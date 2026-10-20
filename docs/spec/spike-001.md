# Spike 001: core como pacote instalado (§6.1, passo 1)

- **Data:** 2026-10-20
- **Executor:** `iris-architect`
- **Spec:** [§6.1 passo 1](./SPEC.md#61-iris-architect-arquitetura-e-contratos), [ADR 001](./adr/001-distribuicao-core-pacote.md), [ADR 002](./adr/002-schema-por-secao.md)
- **Resultado:** os pontos 1 a 5 e 7 **passaram**. O ponto 6 **não mostra a descrição** no hover, e isso foi registrado no ADR 002, como a spec prevê. O gate da E1 está liberado: não há ADR 007.

## Versões

| Peça | Versão |
|---|---|
| Node | 24.18.0 |
| npm | 12.0.1 |
| next | 16.2.11 (Turbopack) |
| react / react-dom | 19.2.4 |
| zod | 4.6.7 (o `^4` mais novo no registro; o repositório hoje tem 4.4.3 como dependência indireta) |
| tsdown | 0.23.1 (rolldown 1.2.14) |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/postcss | 4.3.3 |

O Node 22.18 (o mínimo do §5.1) não foi testado: a máquina só tem o 24.18.

## Montagem

O código do spike ficou **fora do repositório**, em `/tmp/iris-spike/`, e não entra no git.

```
/tmp/iris-spike/
├─ packages/
│  ├─ schema/   @cbjk_iris/schema   zod + tipos, compilado pelo tsdown (dist/index.mjs + .d.mts)
│  ├─ engine/   @cbjk_iris/engine   readBuiltinTheme() e withIris(), compilado pelo tsdown; themes/ocean-breeze.css
│  └─ core/     @cbjk_iris/core     TSX fonte: lib/config.ts, app/{layout,home,products/detail}.tsx,
│                                    ui/{counter,hero-section}.tsx, sections/hero.tsx, styles/iris.css
├─ site/        projeto consumidor, instala os 3 pacotes pelos .tgz do `npm pack`
└─ e2e/hydrate.mjs                  playwright-core + Chrome do sistema
```

- Cada pacote foi gerado com `npm run build && npm pack`. O `site/package.json` aponta para os `.tgz` (`file:../packages/<p>/cbjk_iris-<p>-0.0.0-spike.tgz`). Nada de workspace nem symlink: `node_modules/@cbjk_iris/core/` é uma cópia extraída do tarball.
- `withIris(siteConfig, nextConfig)` (de `@cbjk_iris/engine/next`) acrescenta `@cbjk_iris/core` em `transpilePackages`, `@cbjk_iris/engine` em `serverExternalPackages` e os dois aliases em `turbopack.resolveAlias` (`./site.config.ts` e `./app/iris.registry.generated.tsx`). Não define `webpack`.
- `tsconfig.json` do site com `paths` para os dois aliases, `moduleResolution: "bundler"`.
- `app/globals.css` do site: `@import "tailwindcss"`, `@import "@cbjk_iris/core/styles/iris.css"`, `@source "../node_modules/@cbjk_iris/core/src"`.
- Rotas finas: `app/(iris)/page.tsx` (reexporta a home do core) e `app/(iris)/produto/[slug]/page.tsx` (reexporta `default` e `generateStaticParams` de `@cbjk_iris/core/app/products/detail`, com `export const dynamicParams = false` literal).
- `app/layout.tsx` fino que renderiza `IrisRootLayout` do core. O layout do core chama `readBuiltinTheme(siteConfig.theme.name)` do engine, que acha a pasta por `fileURLToPath(new URL("../themes/", import.meta.url))`, e escreve o caminho do arquivo lido em `data-theme-file` e o `--primary` do tema no `style` do `<html>`.

Para reproduzir: `cd /tmp/iris-spike/site && rm -rf .next && npx tsc --noEmit && npx next build`.

## Pontos

### 1. `next.config.ts` importa `withIris` de `@cbjk_iris/engine/next` instalado, e o `next build` passa — PASSOU

```
$ cd /tmp/iris-spike/site && cat next.config.ts
import { withIris } from "@cbjk_iris/engine/next";
import { siteConfig } from "./site.config";
export default withIris(siteConfig);

$ npx next build            # exit 0
▲ Next.js 16.2.11 (Turbopack)
✓ Compiled successfully in 1853ms
  Finished TypeScript in 1256ms ...
✓ Generating static pages using 5 workers (6/6) in 290ms
Route (app)
┌ ○ /
├ ○ /_not-found
└ ● /produto/[slug]
```

O engine é ESM-only (`dist/next.mjs`). O build passou com o `package.json` do site com `"type": "module"` e também sem ele (`build(sem type:module) exit=0`), então o formato do projeto não importa.

### 2. TSX de `node_modules` compila com `transpilePackages`, com `"use client"` funcionando — PASSOU

O `Counter` do core (`"use client"`, `useState`) entra no manifesto de referências cliente e hidrata no navegador:

```
$ grep -o '"[^"]*counter.tsx[^"]*"' '.next/server/app/(iris)/page_client-reference-manifest.js' | sort -u
"[project]/node_modules/@cbjk_iris/core/src/ui/counter.tsx"
"[project]/node_modules/@cbjk_iris/core/src/ui/counter.tsx <module evaluation>"

$ npx next start -p 3917 -H 127.0.0.1 &
$ node /tmp/iris-spike/e2e/hydrate.mjs        # exit 0: clica 2 vezes no botão
{"before":"cliques: 0","after":"cliques: 2","pageErrors":[],"produtoGerado":200,"produtoNaoGerado":404}
```

Controle negativo, com `transpilePackages: []`:

```
$ npx next build            # exit 1
Error: Turbopack build failed with 3 errors:
./node_modules/@cbjk_iris/core/src/app/home.tsx
Unknown module type
```

### 3. Aliases `@cbjk_iris/site-config` e `@cbjk_iris/site-registry` resolvem no `next build` (Turbopack) e no `tsc` — PASSOU

`tsc`:

```
$ npx tsc --noEmit -p tsconfig.json          # exit 0
$ npx tsc --noEmit -p tsconfig.json --listFiles | grep @cbjk_iris/core
.../node_modules/@cbjk_iris/core/src/lib/config.ts        ← importa @cbjk_iris/site-config
.../node_modules/@cbjk_iris/core/src/app/home.tsx          ← importa @cbjk_iris/site-registry
(+ layout.tsx, products/detail.tsx, ui/*.tsx, sections/hero.tsx)
```

Controle negativo do `tsc`, com `paths: {}`: exit 2, `TS2307: Cannot find module '@cbjk_iris/site-config'` em `core/src/lib/config.ts` e `'@cbjk_iris/site-registry'` em `core/src/app/home.tsx`.

`next build`: o HTML gerado tem o nome vindo do `site.config.ts` do projeto (alias de config) e o `Counter`, que só chega à home pelo registro do projeto (alias de registro):

```
$ grep -o 'data-testid="site-name">[^<]*' .next/server/app/index.html
data-testid="site-name">cbjk spike
$ grep -o 'data-testid="counter"[^>]*>' .next/server/app/index.html
data-testid="counter" class="tracking-[0.371em] bg-[#13a1b2]">
```

**Achado (não muda a spec):** o Turbopack também resolve os aliases pelos `paths` do `tsconfig.json`, mesmo para imports que nascem em `node_modules`. Matriz de controle:

| `turbopack.resolveAlias` | `tsconfig` `paths` | Compilação Turbopack | Etapa TypeScript do `next build` |
|---|---|---|---|
| sim | sim | ok | ok (exit 0) |
| não | sim | ok | ok (exit 0) |
| sim | não | ok ("Compiled successfully") | falha: `Cannot find module '@cbjk_iris/site-registry'` (exit 1) |
| não | não | falha: `Module not found: Can't resolve '@cbjk_iris/site-config'` e `'@cbjk_iris/site-registry'` (exit 1) | — |

Cada mecanismo resolve o bundle sozinho, e os `paths` são obrigatórios para o typecheck. A regra do §5.1.3 ("configurados em dois lugares, sempre juntos") continua certa: o `resolveAlias` garante o build mesmo se o cliente mexer no `tsconfig`, e os `paths` garantem o `tsc` e o editor.

### 4. O `@source` faz o Tailwind gerar as classes usadas só dentro do core — PASSOU

As quatro classes arbitrárias existem só em `core/src/ui/*.tsx`. No Next 16 o CSS sai em `.next/static/chunks/*.css` (não em `.next/static/css/`):

```
$ grep -o -E '\.(tracking-\\\[0\\\.371em\\\]|bg-\\\[\\#13a1b2\\\]|skew-x-\\\[7deg\\\]|text-\\\[\\#a1b2c3\\\])\{[^}]*\}' .next/static/chunks/*.css
.skew-x-\[7deg\]{--tw-skew-x:skewX(7deg);...}
.bg-\[\#13a1b2\]{background-color:#13a1b2}
.tracking-\[0\.371em\]{--tw-tracking:.371em;letter-spacing:.371em}
.text-\[\#a1b2c3\]{color:#a1b2c3}
```

Controle negativo, sem a linha `@source`: build exit 0, e `grep -c` das classes no CSS dá `0`.

### 5. Rota fina que reexporta `default` e `generateStaticParams` gera páginas estáticas, com `dynamicParams = false` literal — PASSOU

```
$ cat 'app/(iris)/produto/[slug]/page.tsx'
export { default, generateStaticParams } from "@cbjk_iris/core/app/products/detail";
export const dynamicParams = false;

$ npx next build
└ ● /produto/[slug]
  ├ /produto/capa-a
  ├ /produto/pelicula-b
  └ /produto/carregador-c
●  (SSG)     prerendered as static HTML (uses generateStaticParams)

$ node -e 'console.log(require("./.next/prerender-manifest.json").dynamicRoutes["/produto/[slug]"].fallback)'
false
$ ls .next/server/app/produto/
capa-a.html carregador-c.html pelicula-b.html (+ .rsc, .meta, .segments)
```

No `next start`, `/produto/capa-a` responde 200 e `/produto/nao-existe` responde 404 (saída do `hydrate.mjs` no ponto 2), o que confirma que o `dynamicParams = false` literal foi respeitado.

### 6. Hover de campo de tipo `z.infer` mostra a descrição — NÃO MOSTRA (registrado no ADR 002)

Medido pelo language service do TypeScript (`getQuickInfoAtPosition`, o mesmo que o tsserver usa no hover do VS Code), com o script `/tmp/iris-spike/quickinfo.mjs`. O campo tem JSDoc (`/** Nome do site... (JSDoc no campo) */`) e `.meta({ description })`.

```
$ node /tmp/iris-spike/quickinfo.mjs /tmp/iris-spike/site      # exit 0, typescript 5.9.3
{"label":"SiteConfig.name (z.output do pacote instalado)","text":"(property) name: string","documentation":"(vazia)"}
{"label":"HeroSection.title (z.infer do pacote instalado)","text":"(property) title: string","documentation":"(vazia)"}
{"label":"chave name no site.config.ts (satisfies SiteConfigInput)","text":"(property) name: string","documentation":"(vazia)"}
```

Diagnóstico: com o mesmo script apontado para o **fonte** do schema (`import type ... from "./src/index"`), o JSDoc aparece:

```
{"probe":"c.name (fonte)","text":"(property) name: string","documentation":"Nome do site, aparece no cabeçalho (JSDoc no campo)"}
{"probe":"h.title (fonte)","text":"(property) title: string","documentation":"Título grande do hero (JSDoc no campo)"}
```

Quem perde o comentário é a emissão de declarações: o `dist/index.d.mts` gerado pelo tsdown tem `name: z.ZodString;` sem o JSDoc. O `.meta({ description })` nunca aparece no hover, em nenhum dos dois casos, porque é valor em runtime e não entra no tipo. Consequência registrada no ADR 002.

### 7. O layout lê um tema embutido de `@cbjk_iris/engine/themes/` instalado — PASSOU

```
$ grep -o -E '<html[^>]*>' .next/server/app/index.html
<html lang="pt-BR" data-theme-file="/tmp/iris-spike/site/node_modules/@cbjk_iris/engine/themes/ocean-breeze.css" style="--primary:oklch(0.7227 0.1920 149.5793)">
$ grep -m1 -- '--primary' node_modules/@cbjk_iris/engine/themes/ocean-breeze.css
  --primary: oklch(0.7227 0.1920 149.5793);
```

O engine não foi empacotado: o Next cria `.next/node_modules/@cbjk_iris/engine-<hash>` como symlink para `node_modules/@cbjk_iris/engine`, e o chunk do servidor só tem a chamada `(0,e.readBuiltinTheme)(...)`. `grep -rl BUILTIN_THEMES_DIR .next/server` não acha o corpo da função em nenhum chunk.

Controle negativo, com `serverExternalPackages: []`:

```
$ npx next build            # exit 1
./node_modules/@cbjk_iris/engine/dist/index.mjs:5:42
Module not found: Can't resolve '../themes/'
> 5 | ...EMES_DIR = fileURLToPath(new URL("../themes/", import.meta.url));
Import trace:
  Server Component:
    ./node_modules/@cbjk_iris/engine/dist/index.mjs
    ./node_modules/@cbjk_iris/core/src/app/layout.tsx
```

Ou seja, o `serverExternalPackages` não é opcional: sem ele, o Turbopack trata `new URL(..., import.meta.url)` como asset e falha.

## Pontos cegos levantados antes de codar (blind-spot pass)

Lidos em `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/{transpilePackages,serverExternalPackages,turbopack}.md` e `01-app/03-api-reference/08-turbopack.md`. O context7 não estava disponível nesta sessão.

| Ponto cego | O que a doc ou o spike mostrou | Efeito nas próximas etapas |
|---|---|---|
| Um pacote não pode estar em `transpilePackages` e em `serverExternalPackages` ao mesmo tempo | A doc diz que o Next lança erro no início do build | O `withIris` põe o core só no primeiro e o engine só no segundo. Um teste do `withIris` (E6) deve garantir isso |
| `resolveAlias` só aceita a condição `browser` | Doc do Turbopack | Os aliases do Iris não usam condição; nada a fazer |
| O engine externo é carregado pelo Node em runtime | Ponto 7: só funciona porque o engine está em `serverExternalPackages` | O core só pode importar o engine em server components. Importar de um arquivo `"use client"` levaria o engine para o bundle do navegador. Vale como regra para a E2 e as frentes |
| O CSS do Next 16 sai em `.next/static/chunks/*.css` | Ponto 4 | Os greps de CSS das etapas seguintes usam esse caminho, não `.next/static/css` (como estava no plano) |
| O `next build` reescreve o `tsconfig.json` | Acrescentou `.next/dev/types/**/*.ts` ao `include` na primeira execução | No `apps/site` e no starter, o `tsconfig.json` já deve vir com esse `include`, senão o primeiro build muda um arquivo versionado |
| O npm 12 bloqueia scripts de instalação sem `allowScripts` | `sharp@0.34.5` saiu com o install bloqueado (aviso `install-scripts`), e o build passou mesmo assim | A otimização de imagem em runtime pode precisar do `sharp`. Conferir na E2 e avisar o `iris-cli` (`create-iris-site` roda `npm install`) |
| O JSDoc some na emissão de `.d.ts` | Ponto 6 | ADR 002 |

## Gate

Nenhum dos pontos 1 a 5 e 7 falhou. A E2 (linha de base v0, monorepo e migração) pode começar depois da revisão e do merge desta etapa.
