# cbjk_iris

Template de site comercial (vitrine) em Next.js: catálogo de produtos e serviços, galeria, páginas montadas por seções e atendimento pelo WhatsApp. Quase tudo se configura num único arquivo, o `site.config.ts`, sem mexer em componentes.

O site de exemplo usa a marca fictícia **cbjk** e conteúdo de uma empresa de reformas. Troque pelos dados do cliente.

---

## Sumário

- [Stack](#stack)
- [Começando](#começando)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Configurando o site](#configurando-o-site)
- [Temas e marca](#temas-e-marca)
- [Seções: home e páginas](#seções-home-e-páginas)
- [Módulos opcionais](#módulos-opcionais)
- [Catálogo e dados](#catálogo-e-dados)
- [Formulário de lead](#formulário-de-lead)
- [Dicas para quem está começando](#dicas-para-quem-está-começando)
- [Customizando o código sem quebrar](#customizando-o-código-sem-quebrar)
- [Scripts](#scripts)
- [Deploy](#deploy)
- [Créditos](#créditos)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, páginas estáticas) e React 19 |
| Estilo | Tailwind CSS v4, com as cores em variáveis CSS |
| Componentes | shadcn/ui no estilo `base-sera`, sobre `@base-ui/react` (não Radix) |
| Ícones | lucide-react; redes sociais com desenhos do simple-icons (CC0) |
| Cores | `culori` (conversão OKLCH e contraste WCAG) |
| Fontes | `next/font`, com Google Fonts ou arquivos locais servidos pelo próprio site |
| Linguagem | TypeScript estrito |

> O Next 16 tem mudanças incompatíveis com versões anteriores. Antes de escrever código, consulte a documentação instalada em `node_modules/next/dist/docs/`.

---

## Começando

Requisitos: **Node.js 22.6 ou mais novo** e npm.

```bash
npm install
npm run dev      # http://localhost:3000
```

Antes do `dev` e do `build`, o `npm` roda sozinho o `brand:sync`, que prepara as fontes. Para conferir se está tudo certo antes de publicar:

```bash
npm run build && npm run lint
```

---

## Estrutura de pastas

```
site.config.ts        ← quase toda a configuração do site
themes/               ← temas (um arquivo .css por tema)
data/                 ← produtos e serviços de exemplo
public/               ← imagens, logo e fotos da galeria
modules.json          ← módulos opcionais e o que pertence a cada um

app/                  ← rotas do Next (home, catálogo, galeria, páginas do config)
components/
  sections/           ← seções da home e das páginas (hero, FAQ, contato...)
  products/ services/ gallery/   ← código de cada módulo
  catalog/            ← partes compartilhadas (detalhe, galeria de imagens, botão WhatsApp)
  header/ footer/ brand/ theme/ icons/ ui/
lib/                  ← lógica: tema e marca, links, WhatsApp, leads, catálogo
types/                ← tipos do config e das seções
scripts/              ← brand:sync, theme:add, modules:sync, modules:check
```

Dois arquivos são **gerados por scripts** e não devem ser editados à mão:
- `app/fonts.generated.ts`: gerado pelo `npm run brand:sync`;
- `components/sections/registry.tsx`: gerado pelo `npm run modules:sync`.

---

## Configurando o site

Abra o `site.config.ts`. O editor ajuda: cada campo tem tipo e comentário, e um erro de digitação aparece sublinhado em vermelho.

| Chave | Para que serve |
|---|---|
| `name`, `locale`, `currency` | Nome da empresa, idioma (ex.: `pt-BR`) e moeda (ex.: `BRL`) |
| `theme` | Tema visual (`name`) e modo de cor (`colorMode`) |
| `brand` | Logo, cores da marca, fontes e ajustes finos de cor |
| `seo` | Título padrão, modelo de título das páginas e descrição |
| `whatsapp` | Número (só dígitos, com DDI: `5511999999999`) e mensagens prontas |
| `contact` | Telefone, e-mail, endereço, horários, mapa e redes sociais |
| `menu` | Itens do menu do topo |
| `footer` | Frase do rodapé e, se quiser, colunas de links próprias |
| `leads` | Para onde vão os dados do formulário de contato |
| `home.sections` | Blocos da página inicial, na ordem |
| `pages` | Páginas extras montadas com seções (ex.: `/sobre`, `/contato`) |
| `images.remoteHosts` | Domínios de imagens externas (CDN), se você usar |
| `texts` | Todos os textos fixos da interface (botões, rótulos, avisos) |

### Logo

```ts
brand: {
  logo: { src: "/logo.svg", alt: "cbjk", width: 145, height: 86.03, monochrome: true },
}
```

- Coloque o arquivo em `public/`.
- `width` e `height` são as medidas originais do arquivo. Servem só para manter a proporção.
- `monochrome: true` é para logo SVG de uma cor só. Ele passa a seguir a cor do texto e se ajusta sozinho ao modo escuro. Para logo colorido, deixe `false`.
- `logoText` mostra um texto ao lado do logo. Sem logo e sem texto, aparece o `name`.

### Modo escuro

`theme.colorMode` aceita:
- `"system"`: o primeiro acesso segue o sistema do visitante, e o botão do topo alterna entre sistema, claro e escuro. A escolha fica salva no navegador.
- `"light"` ou `"dark"`: fixa o modo e esconde o botão.

---

## Temas e marca

As cores do site são montadas em três camadas, e cada camada sobrescreve a anterior:

```
1. tema       themes/<nome>.css         cores, raio, sombras e fonte
2. marca      brand.colors              primária, CTA e destaque (todas opcionais)
3. ajustes    brand.overrides           qualquer variável, por modo (claro e escuro)
```

### Escolhendo um tema

```ts
theme: { name: "ocean-breeze", colorMode: "system" },
```

Temas incluídos:

| Origem | Temas |
|---|---|
| shadcn/ui, neutros | `neutral`, `stone`, `zinc`, `slate`, `gray`, `taupe` |
| tweakcn, coloridos | `modern-minimal`, `ocean-breeze`, `caffeine`, `elegant-luxury` |

### Adicionando temas

**Do tweakcn**, pelo nome ou pela URL:

```bash
npm run theme:add -- amethyst-haze
npm run theme:add -- https://tweakcn.com/r/themes/amethyst-haze.json
npm run theme:add -- --shadcn mauve          # outra paleta oficial do shadcn
npm run theme:add -- caffeine --as cafe      # escolhe o nome do arquivo
```

**Colando o CSS:** em [tweakcn.com](https://tweakcn.com), monte o tema, clique em "Code" e copie. Salve num arquivo novo, por exemplo `themes/meu-tema.css`, e use `theme: { name: "meu-tema" }`. O arquivo precisa ter um bloco `:root { ... }` (claro) e um `.dark { ... }` (escuro). Se o código colado trouxer um bloco `@theme inline`, ele é ignorado sem problema.

### Cores da marca

```ts
brand: {
  colors: {
    primary: "#1d4ed8",   // botões principais
    cta: "#16a34a",       // botões de ação, como o WhatsApp
    highlight: "#f59e0b", // badges de oferta
  },
}
```

- **Todas são opcionais.** Com `colors: {}`, vale o tema inteiro. Sem `cta`, ele usa a primária. Sem `highlight`, usa o vermelho (`destructive`) do tema.
- **Formatos aceitos:** qualquer cor CSS (`#hex`, `rgb()`, `oklch()`...).
- **Contraste:** a cor do texto sobre cada cor da marca é escolhida automaticamente. No modo escuro, uma primária que sumiria no fundo é clareada.

### Ajustes finos (`overrides`)

Para trocar uma variável específica do resultado final:

```ts
brand: {
  overrides: {
    dark: { background: "oklch(16% 0 0)" },
    light: { muted: "#f4f4f5" },
  },
}
```

As variáveis disponíveis são as do shadcn (`background`, `foreground`, `card`, `muted`, `border`, `ring`...) mais `cta` e `highlight`. A lista completa está em `COLOR_TOKENS`, no arquivo `types/site-config.ts`.

### Fontes

Por padrão, o site usa a fonte `--font-sans` do tema, desde que ela exista no Google Fonts. Para usar outra:

```ts
brand: {
  fonts: {
    sans: { google: "Inter" },
    heading: { google: "Playfair Display", weights: ["600", "700"] },
    // arquivo próprio, com caminho a partir da raiz do projeto:
    // sans: { local: [{ path: "fonts/minha-fonte-regular.woff2", weight: "400" }] },
  },
}
```

- A fonte de títulos (`heading`) é aplicada em `h1`, `h2` e `h3`. Sem ela, os títulos usam a `sans`.
- Ao trocar a fonte com o `npm run dev` rodando, rode `npm run brand:sync` em outro terminal. Não precisa reiniciar o servidor. As cores atualizam sozinhas.
- O `brand:sync` confere se o nome e os pesos existem no Google Fonts e explica o erro se não existirem.

### Aviso de contraste

O `brand:sync` também mede o contraste do resultado final e avisa quando algum par texto/fundo fica abaixo de 4,5:1 (o mínimo WCAG AA para texto pequeno). É só um aviso, não impede o build. Mesmo temas prontos podem receber esse aviso.

---

## Seções: home e páginas

A home (`home.sections`) e as páginas extras (`pages`) são listas de seções. Elas aparecem na ordem da lista.

```ts
pages: [
  {
    slug: "sobre",                // vira /sobre
    title: "Sobre nós",
    description: "Texto para o Google",
    sections: [
      { type: "text-image", title: "Quem somos", text: "...", image: "/foto.jpg", imageAlt: "Equipe" },
      { type: "faq", title: "Dúvidas", items: [{ question: "...", answer: "..." }] },
    ],
  },
],
```

Lembre de pôr a página nova no `menu` se ela deve aparecer no topo.

### Seções disponíveis

| `type` | O que mostra | Campos principais |
|---|---|---|
| `hero` | Carrossel de destaque | `slides` (foto, título, subtítulo, `cta`, `secondaryCta`, `href`, `align`), `height`, `autoplay`, `interval` |
| `benefits` | Grade de ícone, título e texto | `items` (`icon`, `title`, `text`) |
| `text-image` | Texto ao lado de uma imagem | `text`, `image`, `imageAlt`, `imageSide`, `cta` |
| `cta-banner` | Faixa de chamada com botão | `text`, `cta`, `tone` (`primary`, `cta`, `muted`) |
| `testimonials` | Depoimentos | `items` (`name`, `text`, `role`, `rating`, `image`) |
| `stats` | Números de destaque | `items` (`value`, `label`) |
| `faq` | Perguntas frequentes, com dados estruturados para o Google | `items` (`question`, `answer`) |
| `contact` | Endereço, horários, WhatsApp, redes e mapa | `showMap` (os dados vêm de `contact`) |
| `lead-form` | Formulário de contato | `fields`, `submitLabel`, `consentText` |
| `widget` | Código colado de outra plataforma | `html`, `minHeight` |
| `products` | Lista de produtos (módulo) | `category`, `limit` |
| `services` | Grade de serviços (módulo) | `limit` |
| `gallery` | Prévia da galeria (módulo) | `limit` |

Quase todas aceitam `title`, `subtitle` e `id`. O `id` cria uma âncora: um link `/#beneficios` rola até a seção.

**Ícones de `benefits`:** são nomes de uma lista fixa, como `"shield-check"`, `"clock"`, `"truck"` ou `"hand-coins"`. A lista completa está em `SECTION_ICONS`, em `types/sections.ts`.

**Botões (`cta`):** um botão pode levar a uma página ou ao WhatsApp.

```ts
cta: { label: "Ver promoção", href: "/sobre" }
cta: { label: "Falar conosco", whatsapp: true }                      // mensagem padrão
cta: { label: "Agendar", whatsapp: "Olá! Quero agendar uma visita." } // mensagem própria
```

**Carrossel de campanha:** um slide com `href` e sem botões vira um banner clicável por inteiro. Serve para promoções e eventos.

**Widget:** cole o código oficial do TripAdvisor, Reclame Aqui, Trustpilot, Elfsight etc. Os scripts do código são executados no navegador. Use só código de fontes confiáveis.

---

## Módulos opcionais

Produtos, serviços e galeria são **módulos**. Cada um tem rotas, componentes, dados e uma seção para a home. O `modules.json` lista tudo o que pertence a cada módulo.

### Removendo um módulo

Para um site que não vende produtos, por exemplo:

1. Apague os caminhos listados em `paths` do módulo, no `modules.json`.
2. No `site.config.ts`:
   - tire os itens de menu listados em `menu`;
   - tire as seções desse módulo (ex.: `{ type: "products" }`) da home e das páginas.
3. Rode `npm run modules:sync`.
4. Se o módulo tiver `dependencies`, desinstale-as: `npm uninstall image-size react-photo-album`.
5. Rode `npm run build` para conferir.

Se sobrar uma seção de um módulo removido no config, o build para com uma mensagem dizendo o que remover.

### Conferindo se os módulos continuam independentes

```bash
npm run modules:check
```

O script copia o projeto e remove cada módulo, um de cada vez e depois todos juntos. Em cada cenário, roda `tsc` e `next build` e procura links para rotas removidas. Leva cerca de um minuto.

**Regra para o conteúdo do config:** não aponte botões, links ou imagens para arquivos de um módulo (ex.: `href: "/produtos"` no hero, ou uma foto de `public/ultimos_projetos`). Se o módulo for removido, sobra um link morto. Para mostrar produtos, serviços ou galeria, use as seções do próprio módulo, que já trazem o link "Ver todos".

---

## Catálogo e dados

- **Produtos e serviços** ficam em `data/products.ts` e `data/services.ts`. Os tipos estão em `types/catalog.ts`. Um produto com `stockQty: 0` aparece como "Sob encomenda". Com `originalPrice` maior que `price`, ganha o selo "Oferta".
- **Fotos** ficam em `public/products/` e `public/services/`, e entram na lista `images` do item, com caminho começando em `/`.
- **Galeria:** é só colocar as fotos em `public/ultimos_projetos/`. Elas aparecem em ordem alfabética, e o site lê as dimensões sozinho.
- **Imagens externas** (de uma CDN, por exemplo) precisam ter o domínio em `images.remoteHosts`.

**Trocando por uma API ou banco de dados:** as páginas não leem `data/` diretamente. Elas usam `productCatalog` e `serviceCatalog`, em `lib/catalog/products.ts` e `lib/catalog/services.ts`. Para mudar a fonte de dados, implemente a mesma interface (`ProductRepository` ou `ServiceRepository`) e troque a constante exportada. As páginas não mudam.

---

## Formulário de lead

A seção `lead-form` envia os dados para o destino configurado em `leads`:

```ts
// 1. WhatsApp (padrão, não precisa de conta): abre a conversa com os dados preenchidos
leads: { provider: "whatsapp" },

// 2. Serviço de formulários: envia os dados em JSON (POST)
leads: { provider: "endpoint", endpoint: "https://formspree.io/f/SEU_ID" },
leads: {
  provider: "endpoint",
  endpoint: "https://api.web3forms.com/submit",
  extraFields: { access_key: "SUA_CHAVE" }, // a chave do Web3Forms é pública por design
},

// 3. Reservado para o backend próprio, que ainda não existe
leads: { provider: "backend" },
```

- O formulário tem um campo anti-spam escondido.
- Com `consentText`, ele exige marcar uma caixa de consentimento (LGPD).
- Com `provider: "backend"`, o build falha de propósito até o backend existir. É o lugar onde ele vai entrar: o caso `"backend"` em `lib/leads.ts`.

---

## Dicas para quem está começando

- **Comece só pelo `site.config.ts`, pela pasta `data/` e pela pasta `public/`.** Dá para montar um site completo sem abrir nenhum componente.
- **Salve e olhe o navegador.** Com `npm run dev` rodando, textos, cores e seções atualizam na hora. Só a troca de fonte pede um `npm run brand:sync`.
- **Siga o editor.** Use um editor com TypeScript, como o VS Code. Um sublinhado vermelho no config quase sempre é um nome de campo errado, ou um valor fora das opções. Passe o mouse em cima para ver o que é esperado.
- **Vírgulas e aspas** são os erros mais comuns: cada item de lista termina com `,`, e textos ficam entre aspas `"..."`.
- **Imagens:** salve em `public/` e use o caminho começando em `/`. Por exemplo, `public/home/banner.jpg` vira `"/home/banner.jpg"`. Arquivos de até uns 300KB deixam o site rápido.
- **WhatsApp:** o número vai só com dígitos, com DDI e DDD: `5511999999999`.
- **Antes de publicar,** rode `npm run build`. Se ele passar, o deploy passa.
- **Quebrou?** Desfaça a última mudança. O `git` guarda o histórico: `git diff` mostra o que mudou e `git checkout -- arquivo` volta um arquivo ao último commit.

---

## Customizando o código sem quebrar

Para quem vai mexer em componentes, criar seções ou módulos.

### Regras que mantêm o template saudável

1. **Arquivos gerados não se editam à mão.** `app/fonts.generated.ts` e `components/sections/registry.tsx` são sobrescritos pelos scripts. Mude a fonte de verdade (config ou `modules.json`) e rode o script correspondente.
2. **Cores sempre por token.** Use `bg-primary`, `text-muted-foreground`, `bg-cta`, `bg-highlight`, `border-border`. Nada de `bg-blue-600` ou `#hex` em componentes, porque isso ignora o tema e o modo escuro. A exceção é texto branco sobre foto, onde o fundo é a imagem.
3. **Textos visíveis no config.** Texto que o cliente pode querer trocar vai em `texts`, tipado em `SiteTexts`, e não fixo no JSX.
4. **Módulos não importam outros módulos.** O núcleo (`components/catalog`, `components/sections`, `lib/`) não importa nada de `components/products`, `services` ou `gallery`. Partes que mudam por módulo entram por props. Veja o `CatalogDetail`, que recebe `price`, `badge` e `action` prontos.
5. **`lib/brand.ts` e `lib/theme-file.ts` usam imports relativos com extensão `.ts`.** O `brand:sync` os importa direto pelo Node, que não entende o alias `@/`.
6. **`npx shadcn add`** escreve variáveis de cor no `app/globals.css`, mas as cores deste projeto vêm do tema. Depois de adicionar um componente, apague essas variáveis do `globals.css`. Se o componente usar uma cor nova, acrescente-a em `COLOR_TOKENS` e no `@theme inline` do `globals.css`.

### Criando uma seção nova

Exemplo: uma seção `logos` com logos de parceiros.

1. **Tipo**, em `types/sections.ts`: crie o tipo e acrescente-o na união `Section`.
   ```ts
   export type LogosSection = SectionBase & { type: "logos"; items: { src: string; alt: string }[] };
   ```
2. **Componente**, em `components/sections/LogosSection.tsx`, usando o `SectionShell` para manter espaçamento e título iguais aos das outras seções:
   ```tsx
   import type { LogosSection as Config } from "@/types/sections";
   import { SectionShell } from "./SectionShell";

   export function LogosSection({ section }: { section: Config }) {
     return (
       <SectionShell id={section.id} title={section.title} subtitle={section.subtitle}>
         {/* ... */}
       </SectionShell>
     );
   }
   ```
3. **Registro**, em `modules.json`: em `coreSections`, acrescente `"logos": { "from": "@/components/sections/LogosSection", "export": "LogosSection" }`.
4. Rode `npm run modules:sync`.
5. Use no config: `{ type: "logos", items: [...] }`.

Se a seção pertence a um módulo, registre-a em `modules[].sections` em vez de `coreSections`, e coloque o componente na pasta do módulo.

### Criando um módulo novo

1. Crie as rotas em `app/<rota>/`, os componentes em `components/<módulo>/` e os dados e a lógica em `data/` e `lib/`.
2. Acrescente o módulo no `modules.json`, com estes campos:
   - `paths`: o primeiro é a rota principal, e é ele que define se o módulo está ativo;
   - `menu`: os itens de menu do módulo;
   - `sections`: as seções do módulo;
   - `dependencies`: os pacotes npm usados só por ele.
3. Rode `npm run modules:sync` e depois `npm run modules:check`. O check prova que o módulo pode ser removido sem quebrar o resto.

### Checklist antes de um commit

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run modules:sync -- --check
node --experimental-strip-types --no-warnings scripts/sync-brand.mjs --check
npm run modules:check     # ao mexer em módulos, seções ou no núcleo
```

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (roda o `brand:sync` antes) |
| `npm run build` | Build de produção (roda o `brand:sync` antes) |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run brand:sync` | Gera as fontes a partir da marca ou do tema e mostra o aviso de contraste |
| `npm run theme:add -- <nome>` | Baixa um tema do tweakcn (ou `--shadcn <cor>`) para `themes/` |
| `npm run modules:sync` | Regenera o registro de seções a partir do `modules.json` |
| `npm run modules:check` | Testa a remoção de cada módulo numa cópia do projeto |

---

## Deploy

Na [Vercel](https://vercel.com/new), importe o repositório. O Next.js é detectado sozinho, e não há variáveis de ambiente obrigatórias. A cada push na `main`, sai um deploy novo.

Em outra hospedagem, use `npm run build` e `npm run start` (Node 22.6+).

---

## Créditos

Imagens de exemplo, temas e ícones têm origem e licença listadas em [`CREDITS.md`](./CREDITS.md). Em resumo:
- fotos CC0 do StockSnap;
- temas do shadcn/ui (MIT) e do tweakcn (Apache-2.0);
- ícones do lucide e do simple-icons (CC0).
