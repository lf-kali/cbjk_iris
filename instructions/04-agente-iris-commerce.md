# Sessão 4 — Criar o agente `iris-commerce`

> Cole este arquivo como primeira mensagem de uma sessão nova do Claude Code, aberta na raiz do repositório `cbjk_iris`. Rode esta sessão **depois** que `docs/spec/SPEC.md` existir e tiver sido aprovada.

## Tarefa

Criar o arquivo `.claude/agents/iris-commerce.md`, um subagente do Claude Code dono do catálogo e dos botões de compra do Iris. Você **não implementa** os botões nesta sessão; você escreve o agente que vai implementá-los.

## Contexto

- `cbjk_iris` é um template de vitrine em Next.js 16, React 19, Tailwind v4, shadcn/ui e TypeScript estrito. Leia o `README.md`, principalmente "Catálogo e dados" e "Módulos opcionais".
- Produtos e serviços ficam em `data/products.ts` e `data/services.ts`, tipados em `types/catalog.ts`. As páginas leem pelos repositórios `productCatalog` e `serviceCatalog` (`lib/catalog/`). Hoje cada item tem só um botão que leva ao WhatsApp.
- **Decisão do dono:** o tipo `Product` ganha:
  - `mercadoLivreLink`, `shopeeLink`, `amazonLink`: cada um gera um botão com o ícone da plataforma;
  - `externalLink`: botão com ícone genérico de sacola, para outra plataforma;
  - `whatsappButton: boolean`: controla se o botão de compra pelo WhatsApp aparece.
- O tipo em si é contrato do `iris-architect`. Leia `docs/spec/SPEC.md`: ela define os campos, a validação de URL por plataforma e a ordem padrão dos botões.

## O que o agente faz

- Implementa os botões de compra no detalhe e no card do produto, usando o tipo definido pelo arquiteto.
- Mantém a regra do README: o núcleo (`components/catalog`) não importa nada de `components/products`; o que muda por módulo entra por props (como o `CatalogDetail`, que recebe `price`, `badge` e `action` prontos). Os botões de marketplace devem seguir o mesmo padrão.
- Ícones das plataformas: confere se Mercado Livre, Shopee e Amazon existem no simple-icons e com que restrição de uso de marca; registra em `CREDITS.md`. Sacola genérica vem do lucide.
- Links externos com `target="_blank"` e `rel` adequado (`noopener`; `sponsored` quando for link de afiliado, conforme a spec).
- Rótulos dos botões em `texts`, tipados em `SiteTexts`, nunca fixos no JSX.
- Atualiza os dados de exemplo em `data/products.ts` para cobrir combinações: só WhatsApp, só marketplaces, todos, nenhum.
- Preserva os repositórios (`ProductRepository`) para que uma fonte de dados externa continue possível.

## Posse de arquivos

- **Pode tocar:** `components/products/`, `components/services/`, `components/catalog/`, `lib/catalog/`, `lib/whatsapp*`, `data/`, `public/products/`, `public/services/`, `components/icons/` (ícones de plataforma), `CREDITS.md`.
- **Proibidos:** `types/catalog.ts`, `types/site-config.ts`, `types/sections.ts` (pede mudança ao `iris-architect`); tokens de tema e estilo de forma (`iris-theme`; usa só tokens existentes); CLI (`iris-cli`); README (`iris-docs`).

## Frontmatter

Confira o schema do claude-forge em `reference/agent-schema.json` e a documentação de subagentes do Claude Code. Use só campos aceitos. Sugestões, a validar:

- `name: iris-commerce`
- `description`: quando delegar (produtos, serviços, catálogo, botões de compra, WhatsApp, marketplaces, galeria) e quando não (tipos compartilhados, temas, CLI). 2 ou 3 blocos `<example>`.
- `model`: intermediário.
- `tools`: leitura, escrita, edição, bash, busca.
- `isolation: worktree`, se aceito.
- `skills`: `frontend-code-review`, `review-loop`, se aceitos.

## Corpo do agente (system prompt)

Em português, contendo:

1. Papel e escopo.
2. Fontes de verdade: spec e ADRs.
3. Posse de arquivos (acima).
4. Regras do README: cores por token (`bg-cta` para o WhatsApp), textos em `texts`, módulos não importam módulos, não apontar config para arquivos de módulo.
5. Pipeline: `/plan` → `/tdd` (normalização dos links em lista ordenada de botões, validação de URL, `whatsappButton` falso, item sem nenhum botão) → `code-reviewer` + `frontend-code-review` → `security-reviewer` (links externos, `rel`, URLs maliciosas nos dados) → `review-loop` com `adversarial-reviewer` → `e2e-runner` (Playwright: cada botão aparece só quando o campo existe e abre o destino certo) → `/handoff-verify` → `/commit-push-pr`.
6. Checklist: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run modules:check` (o módulo de produtos precisa continuar removível).
7. Acessibilidade: cada botão com nome acessível que diga a plataforma ("Comprar na Shopee"), não só o ícone.
8. Consultar context7 antes de usar APIs de bibliotecas.

## Definição de pronto desta sessão

- `.claude/agents/iris-commerce.md` existe e o frontmatter é válido.
- Em sessão nova, "esconda o botão do WhatsApp nos produtos sob encomenda" delega a esse agente; "crie um tema escuro com blur" não delega. Teste e relate.
- Rode o `adversarial-reviewer` sobre o arquivo do agente.
- Não faça commit sem confirmação do dono.
