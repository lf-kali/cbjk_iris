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
- **Dark mode:** hoje segue o sistema; ao unificar, a aparência do escuro muda. Escolher estratégia (class, media ou ambos).
- **Logo:** import estático não aceita config; a regra do SVGR no `next.config.ts` só permanece se algum tema usar SVG.
- **Imagens remotas:** `next/image` exige host em `remotePatterns`. Ele precisa ler do config (`next.config.ts` pode importar TS). Migrar o `ProductMiniCard` para `next/image` falha em runtime se faltar host.
- **Imports e rotas:** mover e renomear quebra `@/...`; `getProductBySlug` e `hrefBase` somem junto com os tipos antigos.
- **Módulos desligados:** apagar rota deixa link morto no menu e na home; cada módulo precisa de manifest.
- **Dados de exemplo:** não verificado se `/products/*.jpg` e `/services/*.jpg` existem em `public/`; o template precisa de placeholders garantidos.

## Fases

### Fase 1 — Config, cores semânticas e temas
- Criar `site.config.ts` e mover menu, WhatsApp, slides, metadata e textos para ele
- Introduzir tokens `--cta` e `--highlight` e substituir as cores fixas
- Separar `themes/` (base + `jr.css` + 1 ou 2 temas de exemplo); definir estratégia de dark mode e de fontes por tema
- Remover `tailwind.config.ts` e o bloco duplicado de dark

### Fase 2 — Camada de dados e componentes unificados
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
