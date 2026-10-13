# cbjk_iris — Diagnóstico e plano de refatoração do template

Base: projeto `jr_acabamentos` (clone raso no commit `3578df5`). Leitura estática do código; dependências não instaladas e nenhum build rodado.

## Base atual

- Estrutura plana: `app/`, `components/`, `data/`, `lib/`, `types/` (sem `src/`)
- Next 16.2.11, React 19.2.4, Tailwind v4, shadcn estilo `base-sera` (`@base-ui/react`, não Radix)
- Tema todo em variáveis CSS no `app/globals.css`
- Contrato de dados: `Product`, `Service`, `getProductBySlug`, `getServiceBySlug`, `buildWhatsappUrl`, `buildServiceQuoteUrl`
- `AGENTS.md` avisa que o Next 16 tem breaking changes: ler `node_modules/next/dist/docs/` antes de codar

## O que pode continuar

- Stack e rotas (`/produtos`, `/produto/[slug]`, `/servicos`, `/servico/[slug]`) com `generateStaticParams`
- `FadeCarousel` (genérico por props; só os `aria-label` estão em pt-BR)
- `ProductScrollList` e seus filtros (`category`, `excludeSlug`, `limit`)
- `components/ui/` (shadcn), `cn`, tokens do `globals.css`
- Fluxo WhatsApp no lugar de checkout

## O que precisa mudar

1. **`site.config.ts` central:** nome, logo, WhatsApp, locale e moeda, menu, slides da home, SEO, textos e módulos. Hoje espalhado em `menu.config.ts`, `lib/whatsapp.ts` (`WHATSAPP_PHONE` com TODO), `app/page.tsx` (slides inline) e `metadata` de várias páginas.
2. **Cores semânticas:** `emerald` → `--cta`; `amber` e `#ff741d` → `--highlight`; `stone-*` e `neutral-*` → `muted`, `border`, `card`. Ocorrências em `product-card`, `ProductMiniCard`, `ProductScrollList`, `buy-button`, `quote-button`, `service-card`, `product-gallery` e páginas de detalhe.
3. **Temas separados:** `globals.css` fica só com a base; cada tema vira `themes/<nome>.css` com sua fonte. Remover o bloco duplicado de dark mode (`@media` e `.dark`, com fundos diferentes) e o `tailwind.config.ts` (morto no Tailwind v4). O `layout.tsx` carrega Mont, Noto Sans e Playfair, mas o `globals.css` força `--font-sans` para Mont: a fonte passa a ser parte do tema.
4. **Camada de dados:** `CatalogRepository` (listar, buscar por slug, categorias) com o mock como implementação padrão. Hoje as páginas e o `ProductScrollList` importam `data/products` direto.
5. **Unificações:** `ProductCard` + `ProductMiniCard` (preço, parcelas e badges compartilhados; um usa `next/image`, outro `<img>`), `BuyButton` + `QuoteButton` → `WhatsappButton`, páginas de detalhe → `CatalogDetail`, `ProductGallery` → `ImageGallery`.
6. **Textos e moeda:** strings pt-BR ("Comprar agora", "Sob encomenda", etc.) e `formatBRL` saem do código para o config (`formatPrice` com locale e moeda).
7. **Galeria (`lib/gallery.ts`):** hoje lê `public/ultimos_projetos` via `fs` e quebra se a pasta não existir; precisa tolerar ausência por ser módulo opcional.
8. **Logo e identidade:** `import Logo from "@/public/JRiso.svg"` (estático, via SVGR) e o texto "Acabamentos" nos headers; trocar por componente alimentado pelo config, com fallback de texto.
9. **Bugs herdados:** "Débitoou Crédito" (`product-card.tsx`), `text-Foreground` (`produtos/page.tsx`), `lang="en"` no `layout.tsx`, `<a>` dentro de `<Button>` nos botões de WhatsApp.

## O que vai quebrar (riscos)

- **Visual do JR:** trocar `emerald` por token remove o botão verde. O JR vira tema próprio (`themes/jr.css` com `--cta` verde) para não regredir.
- **Dark mode:** ~~escolher estratégia~~ **Decidido:** classe `.dark` aplicada por script inline próprio (`lib/theme.ts`), sem `next-themes`. Primeiro acesso segue o sistema; o botão alterna sistema → claro → escuro e salva em `localStorage`. `theme.colorMode` no config fixa claro ou escuro (sem botão). O fundo escuro mantido é o do antigo bloco `@media`.
- **Logo:** import estático não aceita config; a regra do SVGR no `next.config.ts` só permanece se algum tema usar SVG.
- **Imagens remotas:** `next/image` exige host em `remotePatterns`. Ele precisa ler do config (`next.config.ts` pode importar TS). Migrar o `ProductMiniCard` para `next/image` falha em runtime se faltar host.
- **Imports e rotas:** mover e renomear quebra `@/...`; `getProductBySlug` e `hrefBase` somem junto com os tipos antigos.
- **Módulos desligados:** apagar rota deixa link morto no menu e na home; cada módulo precisa de manifest.
- **Dados de exemplo:** não verificado se `/products/*.jpg` e `/services/*.jpg` existem em `public/`; o template precisa de placeholders garantidos.

## Fases

### Fase 1 — Config, cores semânticas e temas

**Status: concluída.** Como ficou:
- `site.config.ts` (tipos em `types/site-config.ts`): nome, locale, SEO com `title.template`, WhatsApp, `theme.colorMode`, menu e slides
- Tokens `--cta`/`--highlight` (+ `-foreground`) e variante `cta` no `Button`; `stone`/`neutral` viraram `primary`, `muted`, `border`, `background`. Branco/preto sobre fotos (carrossel) continua fixo de propósito
- Temas em `themes/<nome>/` (`theme.css` com as variáveis claro/escuro + `fonts.ts` com next/font + `index.ts`); o ativo é escolhido em `theme.ts` na raiz. `globals.css` só tem a base (imports, `@custom-variant dark`, `@theme inline`, `@layer base`). Fontes do tema entram por `--theme-font-sans`/`--theme-font-heading`
- Temas: `jr` (visual atual) e `oceano` (exemplo, Inter + Playfair Display)
- Mudanças visuais intencionais no JR: header escuro passou de preto para a cor de fundo; badge "Sob encomenda" no escuro ficou visível (antes sumia no card); laranja de "Oferta" unificado (`#ff741d` → amber-600); link "ver serviço" de emerald-700 para o tom do CTA
- Limitações: o estilo `base-sera` fixa formatos nos componentes (`rounded-none` nos botões), então tema muda cor, fonte e `--radius`, não o formato; `npx shadcn add` escreve variáveis em `app/globals.css`, que agora não tem mais as cores (mover para o tema à mão)
- Criar `site.config.ts` e mover menu, WhatsApp, slides, metadata e textos para ele
- Introduzir tokens `--cta` e `--highlight` e substituir as cores fixas
- Separar `themes/` (base + `jr.css` + 1 ou 2 temas de exemplo); definir estratégia de dark mode e de fontes por tema
- Remover `tailwind.config.ts` e o bloco duplicado de dark

### Fase 2 — Camada de dados e componentes unificados

**Status: concluída.** Como ficou:
- `types/catalog.ts`: `CatalogItem = Product | Service` (discriminado por `kind`), base comum com slug, nome, descrições, imagens e specs
- `lib/catalog/`: interface `CatalogRepository` (async), `mockCatalog` lendo `data/`, e `catalog` (fonte ativa) em `index.ts`. Filtros de categoria/exclusão/limite saíram do `ProductScrollList` para o repositório
- `components/catalog/`: `CatalogCard`, `CatalogMiniCard` (agora `next/image`), `PriceBlock` e `ProductBadges` compartilhados, `WhatsappButton` (um `<a>` com `buttonVariants`, sem `<a>` dentro de `<button>`), `CatalogDetail` (detalhe de produto e serviço), `ImageGallery`, `ServiceCard`, `ProductScrollList`
- Config ganhou `currency`, `brand` (logo + texto), modelos de mensagem do WhatsApp, `images.remoteHosts` (vira `remotePatterns` no `next.config.ts`) e `texts` (textos comerciais visíveis). `formatPrice` e `fillTemplate` em `lib/format.ts`
- `SiteLogo`: SVG monocromático vira máscara CSS com a cor do texto (acompanha o modo escuro); logo colorido usa `next/image`. Logo agora é link para a home. Ícone do menu veio do lucide; SVGR, `@svgr/webpack` e `webpack` removidos, e o `tsc` passa num clone limpo
- CTA "Faça seu orçamento" do header agora abre o WhatsApp (antes não fazia nada)
- Bugs corrigidos de passagem: "Débitoou Crédito", `text-Foreground`, `<a>` dentro de `<Button>`, link dentro de link no card de produto, badges sobrepostos no mini card, dois `<h1>` por página vindos dos headers
- Fica em código, de propósito: textos de acessibilidade (aria-label) e rótulos do botão de tema, em pt-BR
- Corrigido depois: "Comprar agora" cortava no card estreito do mobile (agora quebra em duas linhas) e o preço "de" estourava o card em 320px; últimos projetos ganhou `<h1>` visível e a home um `<h1>` só para leitores de tela (`sr-only`), já que não tem título visível
- Pendente: imagens de exemplo de produtos e serviços (`/products/*.jpg`, `/services/*.jpg`) não existem; aguardando liberação de rede para baixar fotos de banco de imagens
- `CatalogRepository` + mock; páginas e `ProductScrollList` passam a consumir o repositório
- `CatalogCard`/`CatalogMiniCard`, `WhatsappButton`, `CatalogDetail`, `ImageGallery`
- Textos e moeda via config; logo como componente; `remotePatterns` derivado do config

### Fase 3 — Bugs e módulos com manifest
- Corrigir os bugs herdados (item 9)
- Galeria tolerante a pasta ausente
- Manifest por módulo (rotas, menu, dados) para a geração futura apagar o que for desligado
- Placeholders garantidos para os dados de exemplo

## Depois

CLI de geração (`create-vitrine`, ver `create-vitrine-blueprint.md`) e, em separado, o template de backend (Neon + Clerk + API).
