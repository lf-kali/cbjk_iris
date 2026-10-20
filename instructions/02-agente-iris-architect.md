# Sessão 2 — Criar o agente `iris-architect`

> Cole este arquivo como primeira mensagem de uma sessão nova do Claude Code, aberta na raiz do repositório `cbjk_iris`. Rode esta sessão **depois** que `docs/spec/SPEC.md` existir e tiver sido aprovada.

## Tarefa

Criar o arquivo `.claude/agents/iris-architect.md`, um subagente do Claude Code que será dono da arquitetura e dos contratos do framework Iris. Você **não implementa** a arquitetura nesta sessão; você escreve o agente que vai implementá-la.

## Contexto

- `cbjk_iris` é um template de vitrine em Next.js 16, React 19, Tailwind v4, shadcn/ui (`base-sera` sobre `@base-ui/react`) e TypeScript estrito. Leia o `README.md`.
- O projeto está virando um framework: `npx create-iris-project@latest <nome>`, CLI `iris`, temas que mudam o estilo dos componentes e novos botões de marketplace no `Product`.
- O desenvolvimento usa o claude-forge (agentes `planner`, `architect`, `tdd-guide`, `adversarial-reviewer`, `verify-agent`; skills `review-loop`, `team-orchestrator`, `blind-spot-pass`; comandos `/plan`, `/tdd`, `/handoff-verify`, `/commit-push-pr`).
- Leia `docs/spec/SPEC.md`, os ADRs em `docs/spec/adr/` e `docs/spec/OPEN-QUESTIONS.md`. **Se houver pergunta aberta sobre template copiado vs. `@iris/core` no npm, pare e avise o dono: o corpo deste agente depende dessa resposta.**

## O que o agente faz

- Monta a estrutura do monorepo definida na spec (workspaces, pacotes, nomes no npm).
- Implementa e congela os contratos: tipo `Product` (com `mercadoLivreLink`, `shopeeLink`, `amazonLink`, `externalLink`, `whatsappButton`), formato do schema zod por seção, lista de tokens de forma, interface pública da CLI.
- Migra `modules:sync` e `modules:check` para o novo formato de schema.
- Responde a pedidos de mudança de contrato vindos das outras frentes.

## Posse de arquivos

Escreva no corpo do agente, de forma explícita:

- **Exclusivos dele:** `types/site-config.ts`, `types/sections.ts`, `types/catalog.ts`, os equivalentes no core, a raiz do monorepo (`package.json` raiz, config de workspaces), `modules.json`, `scripts/modules-*`.
- **Proibidos:** componentes visuais, `themes/`, implementação da CLI, README. Esses são de `iris-theme`, `iris-commerce`, `iris-cli` e `iris-docs`.
- Mudança de contrato depois de congelado exige registro num ADR novo em `docs/spec/adr/`.

## Frontmatter

Confira o schema de frontmatter do claude-forge em `reference/agent-schema.json` (no repositório do forge, ou via symlink em `~/.claude/`) e a documentação de subagentes do Claude Code. Use só campos que o schema aceita. Sugestões, a validar:

- `name: iris-architect`
- `description`: diga quando delegar a ele (estrutura do monorepo, tipos compartilhados, schema de seção, contratos, ADRs) e quando **não** delegar (UI, temas, CLI, docs). Inclua 2 ou 3 blocos `<example>` com pedido do usuário e comentário explicando a escolha.
- `model`: o mais capaz disponível (decisões de arquitetura).
- `tools`: leitura, escrita, edição, bash, busca. Inclua a ferramenta de delegar a outros agentes só se ele for chamar `tdd-guide` e `adversarial-reviewer`.
- `isolation: worktree`, se o schema aceitar.
- `skills`: `blind-spot-pass`, `review-loop`, `cache-components`, se o schema aceitar.

## Corpo do agente (system prompt)

O corpo deve conter, em português:

1. Papel e escopo em 2 ou 3 frases.
2. Fontes de verdade: `docs/spec/SPEC.md` e ADRs. Nunca decide contra a spec sem novo ADR.
3. Posse de arquivos (acima).
4. Pipeline: `/plan` (aguarda aprovação) → `/tdd` → `review-loop` com `adversarial-reviewer` até `APPROVE` → `/handoff-verify` → `/commit-push-pr`.
5. Regras herdadas do README: arquivos gerados não se editam à mão; `lib/brand.ts` e `lib/theme-file.ts` usam imports relativos com `.ts`; módulos não importam outros módulos.
6. Checklist antes de entregar: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run modules:sync -- --check`, `npm run modules:check`.
7. Como sinalizar que os contratos estão congelados para as outras frentes (por exemplo, uma linha de status em `docs/spec/SPEC.md` e uma tag git).
8. Consultar context7 para APIs do Next 16, zod e workspaces do npm antes de usar.

## Definição de pronto desta sessão

- `.claude/agents/iris-architect.md` existe e o frontmatter é válido contra o schema do forge.
- Abrindo uma sessão nova e pedindo "ajuste o tipo Product", o Claude delega a esse agente; pedindo "mude a cor do botão", não delega. Teste os dois e relate.
- Rode o `adversarial-reviewer` sobre o arquivo do agente.
- Não faça commit sem confirmação do dono.
