# Sessão 3 — Criar o agente `iris-theme`

> Cole este arquivo como primeira mensagem de uma sessão nova do Claude Code, aberta na raiz do repositório `cbjk_iris`. Rode esta sessão **depois** que `docs/spec/SPEC.md` existir e tiver sido aprovada.

## Tarefa

Criar o arquivo `.claude/agents/iris-theme.md`, um subagente do Claude Code dono do sistema de temas do Iris. Você **não implementa** o sistema de temas nesta sessão; você escreve o agente que vai implementá-lo.

## Contexto

- `cbjk_iris` é um template de vitrine em Next.js 16, React 19, Tailwind v4, shadcn/ui (`base-sera` sobre `@base-ui/react`) e TypeScript estrito. Leia o `README.md`, principalmente "Temas e marca" e "Customizando o código sem quebrar".
- Hoje as cores vêm em três camadas: tema (`themes/<nome>.css`) → `brand.colors` → `brand.overrides`. Só cores e fontes mudam entre temas.
- **Decisão do dono:** os temas passam a variar o estilo dos componentes predefinidos: cores, forma, raio, opacidade, `backdrop-blur`, sombra, cor e espessura da borda e demais atributos visuais.
- Referência: o `npx shadcn create` oferece estilos (Vega, Nova, Maia, Lyra, Mira) que reescrevem o código dos componentes na instalação. O Iris precisa permitir a troca depois, via `iris theme set`.
- Leia `docs/spec/SPEC.md` e o ADR sobre temas em `docs/spec/adr/`. A lista de tokens de forma e a convenção de variantes vêm de lá. Proposta da spec: tokens como `--radius`, `--shadow-card`, `--surface-alpha`, `--blur`, `--border-width`, `--density`, e variantes `cva` escolhidas por `data-style` no `<html>` para o que tokens não resolvem.

## O que o agente faz

- Estende o formato de `themes/*.css` com os tokens de forma, mantendo compatibilidade com temas existentes (`:root` e `.dark`) e com o que o `theme:add` baixa do tweakcn.
- Adapta os componentes predefinidos (seções, `components/ui`, header, footer, catálogo) para consumir os tokens e as variantes.
- Atualiza `brand:sync` e `lib/brand.ts` para validar e aplicar os tokens novos, incluindo o aviso de contraste.
- Cria ou ajusta temas de exemplo que demonstrem estilos bem diferentes (por exemplo, um "glass" com blur e superfície translúcida e um "flat" sem sombra e cantos retos).

## Posse de arquivos

- **Pode tocar:** `themes/`, `app/globals.css`, `lib/brand.ts`, `lib/theme-file.ts`, `components/ui/`, `components/sections/` (só estilo), `components/header/`, `components/footer/`, `components/theme/`, `scripts/` de marca e tema.
- **Proibidos:** `types/site-config.ts`, `types/sections.ts`, `types/catalog.ts`, `modules.json` (pede mudança ao `iris-architect`); lógica de catálogo e botões de marketplace (`iris-commerce`); CLI (`iris-cli`); README (`iris-docs`).
- Se um token novo for necessário, ele entra em `COLOR_TOKENS` ou na lista de tokens de forma **via pedido ao arquiteto**, não por edição direta.

## Frontmatter

Confira o schema de frontmatter do claude-forge em `reference/agent-schema.json` e a documentação de subagentes do Claude Code. Use só campos aceitos. Sugestões, a validar:

- `name: iris-theme`
- `description`: quando delegar (temas, tokens, aparência dos componentes, modo escuro, contraste) e quando não (tipos, CLI, catálogo). 2 ou 3 blocos `<example>`.
- `model`: intermediário é suficiente; o mais capaz se a adaptação de componentes for extensa.
- `tools`: leitura, escrita, edição, bash, busca.
- `isolation: worktree`, se aceito.
- `skills`: `frontend-code-review`, `review-loop`, se aceitos.

## Corpo do agente (system prompt)

Em português, contendo:

1. Papel e escopo.
2. Fontes de verdade: spec e ADR de temas.
3. Posse de arquivos (acima).
4. Regras do README: cores sempre por token (`bg-primary`, `text-muted-foreground`, `bg-cta`; nunca `bg-blue-600` ou `#hex` em componentes, exceto texto branco sobre foto); depois de `npx shadcn add`, apagar as variáveis de cor que ele escreve no `globals.css`; `lib/brand.ts` e `lib/theme-file.ts` com imports relativos `.ts`.
5. Regra nova: estilo de forma também sempre por token ou variante; nada de `rounded-xl`, `shadow-lg` ou `backdrop-blur-md` fixos em componentes predefinidos.
6. Pipeline: `/plan` → `/tdd` (resolução de tema, merge de camadas, validação de tokens) → `code-reviewer` + `frontend-code-review` → `review-loop` com `adversarial-reviewer` → `e2e-runner` (Playwright: capturas de cada tema em claro e escuro, comparando que a forma muda) → `/handoff-verify` → `/commit-push-pr`.
7. Usar o MCP chrome-devtools (Lighthouse) para garantir que blur e sombras não derrubam a performance em mobile.
8. Checklist: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `node --experimental-strip-types --no-warnings scripts/sync-brand.mjs --check`.
9. Consultar context7 para Tailwind v4, shadcn e `cva` antes de usar.

## Definição de pronto desta sessão

- `.claude/agents/iris-theme.md` existe e o frontmatter é válido.
- Em sessão nova, "deixe os cards mais arredondados no tema ocean-breeze" delega a esse agente; "adicione o campo shopeeLink" não delega. Teste e relate.
- Rode o `adversarial-reviewer` sobre o arquivo do agente.
- Não faça commit sem confirmação do dono.
