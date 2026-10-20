# Sessão 1 — Criar a spec do Iris

> Cole este arquivo como primeira mensagem de uma sessão nova do Claude Code, aberta na raiz do repositório `cbjk_iris`. A sessão não tem contexto anterior: tudo o que ela precisa está aqui.

## Seu papel

Você é o arquiteto responsável por escrever a **spec** que vai guiar a evolução do `cbjk_iris` de template para framework. Nesta sessão você **não escreve código de produto**. Você produz documentos de decisão e contrato que outras sessões (uma por agente) vão usar como entrada para `/plan` e `/orchestrate` do claude-forge.

## Contexto do projeto

- `cbjk_iris` é um template de site comercial (vitrine) em Next.js 16 (App Router, páginas estáticas), React 19, Tailwind v4, shadcn/ui no estilo `base-sera` sobre `@base-ui/react`, TypeScript estrito.
- Quase toda a configuração fica em `site.config.ts`. Há temas em `themes/*.css`, módulos opcionais (produtos, serviços, galeria) declarados em `modules.json`, e scripts `brand:sync`, `theme:add`, `modules:sync` e `modules:check`.
- Arquivos gerados que não se editam à mão: `app/fonts.generated.ts` e `components/sections/registry.tsx`.
- Leia o `README.md` inteiro antes de começar. Ele descreve config, temas, seções, módulos, catálogo e leads.

## Objetivo do framework (já decidido pelo dono do projeto)

1. A ferramenta serve para **criar e gerenciar sites**.
2. Comando de criação: `npx create-iris-project@latest <nome>` (nome opcional).
3. Uma CLI (`iris`) para criar páginas, produtos e serviços e trocar temas. Argumentos preenchem os atributos rapidamente; os atributos que faltarem são pedidos de forma interativa, quando fizer sentido.
4. Os temas passam a variar o **estilo dos componentes**: forma, raio, sombra, cor da borda, opacidade, `backdrop-blur` etc. Hoje só cores e fontes mudam.
5. O tipo `Product` ganha `mercadoLivreLink`, `shopeeLink`, `amazonLink` e `externalLink`. Cada um gera um botão com o ícone da plataforma; o `externalLink` usa um ícone genérico de sacola. O botão do WhatsApp continua, controlado pelo booleano `whatsappButton`.

## Decisões que a spec precisa tratar

Para cada uma: opções, trade-offs, recomendação e o que muda no código. Marque como **[DECISÃO DO DONO]** o que precisa de aprovação humana antes de qualquer implementação.

**a) Template copiado ou core como pacote** **[DECISÃO DO DONO]**
Opção recomendada: `@iris/core` publicado no npm (seções, lib, motor de tema, tipos), com o projeto do cliente contendo só config, dados e conteúdo, o que viabiliza `iris upgrade`. Alternativa: template copiado (estilo shadcn), em que o cliente é dono de todo o código. Avalie o impacto na estrutura de módulos atual (`modules.json`, `modules:check`).

**b) Schema por seção como fonte única**
Cada seção declara um schema zod. Desse schema saem os tipos TS, as perguntas da CLI, a validação do build e, no futuro, os campos de um editor visual. Defina o formato (nome, campos, presets, restrições), onde fica e como `modules:sync` passa a usá-lo.

**c) Como os temas mudam os componentes**
O tema declara tokens de forma (proposta: `--radius`, `--shadow-card`, `--surface-alpha`, `--blur`, `--border-width`, `--density`), os componentes consomem esses tokens, e o que tokens não resolvem vira variante `cva` selecionada por `data-style` no `<html>`. A troca precisa funcionar em runtime via `iris theme set`, não só na instalação (diferente do `npx shadcn create`). Defina a lista final de tokens e como um tema `.css` existente (com `:root` e `.dark`) é estendido sem quebrar.

**d) Como a CLI edita arquivos**
Edição por AST (magicast ou ts-morph) em `site.config.ts`, ou mover produtos, serviços e páginas para JSON validado por zod, deixando o `.ts` só para configuração. Recomende uma e justifique.

**e) CLI para agentes e CI**
commander + `@clack/prompts`, com modo não interativo: `--yes`, detecção de CI, de agente e de ausência de TTY. Nenhum comando pode travar esperando prompt quando rodado por um agente.

## Contratos que a spec precisa congelar

Estes contratos são de posse exclusiva do `iris-architect`. As frentes paralelas só começam depois deles:

- Estrutura do monorepo (pastas, pacotes, nomes publicados no npm, workspaces).
- Tipo `Product` completo, com os campos novos, regras de validação de URL por plataforma e ordem padrão dos botões.
- Formato do schema de seção.
- Lista de tokens de forma e convenção de variantes.
- Interface pública da CLI: comandos, subcomandos, flags, comportamento não interativo, códigos de saída.
- Arquivos de posse exclusiva: `types/site-config.ts`, `types/sections.ts`, `types/catalog.ts` e equivalentes no core.

## Frentes de trabalho e definição de pronto

Escreva uma seção por frente com escopo, arquivos que ela pode tocar, arquivos proibidos, dependências e definição de pronto mensurável:

| Frente | Agente | Ordem |
|---|---|---|
| Arquitetura e contratos | `iris-architect` | 1ª, sozinha |
| Sistema de temas | `iris-theme` | Paralela, após contratos |
| Catálogo e botões de marketplace | `iris-commerce` | Paralela, após contratos |
| `create-iris-project` e CLI `iris` | `iris-cli` | Paralela, após o schema |
| Documentação e AGENTS.md dos projetos gerados | `iris-docs` | Por último |

Cada frente segue o pipeline do claude-forge: `/plan` → `/tdd` → `review-loop` (com `adversarial-reviewer`) → `/handoff-verify` → `/commit-push-pr`.

## Backlog de features (fora do escopo desta rodada)

Liste em uma seção à parte, sem detalhar implementação, para o dono priorizar depois:

- Alta: orçamento com vários produtos numa única mensagem de WhatsApp; rastreamento de cliques por canal (GA4, Pixel ou Umami) com consentimento LGPD; SEO local (JSON-LD `LocalBusiness` e `Product`, sitemap, OG por produto); tag de afiliado global com `rel="sponsored noopener"` e ordem de botões configurável; promoções com data de início e fim.
- Média: `iris product import <csv>`; feed para Google Merchant Center e Meta; busca e filtros no catálogo; blog em MDX; `iris doctor` e `iris upgrade`.
- Depois: Keystatic como painel, editor visual com Puck, i18n, backend próprio (`provider: "backend"`).

## Entregáveis

1. `docs/spec/SPEC.md`: visão, decisões (a–e), contratos, frentes, definição de pronto, backlog.
2. `docs/spec/adr/`: um ADR curto por decisão (contexto, decisão, consequências), no formato `NNN-titulo.md`.
3. `docs/spec/OPEN-QUESTIONS.md`: tudo o que precisa de resposta do dono, começando pela decisão (a).

Escreva em português do Brasil. Frases curtas, tabelas quando houver itens com atributos.

## Como trabalhar

- Use `blind-spot-pass` antes de escrever sobre publicação no npm e CLIs.
- Use o MCP context7 para conferir a documentação atual do Next 16 (também em `node_modules/next/dist/docs/`), do shadcn e do `@clack/prompts`. Não assuma APIs de memória.
- Leia o código real (`types/`, `lib/`, `scripts/`, `modules.json`) antes de propor contratos. A spec precisa partir do que existe.
- Ao terminar, rode o `adversarial-reviewer` sobre a spec: ela precisa permitir que cada frente comece sem perguntas ao arquiteto.

## Fora do escopo

- Não altere código de produto, `package.json` nem a estrutura de pastas.
- Não crie os arquivos de agente em `.claude/agents/`: outras sessões fazem isso.
- Não faça commit sem confirmação do dono.

## Definição de pronto desta sessão

- Os três entregáveis existem e passaram por revisão adversarial.
- Toda decisão marcada [DECISÃO DO DONO] aparece em `OPEN-QUESTIONS.md` com recomendação.
- Cada frente tem arquivos permitidos, arquivos proibidos e critérios de pronto verificáveis por comando.
- Resumo final em até 10 linhas, listando o que precisa de aprovação.
