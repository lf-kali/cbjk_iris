# Sessão 5 — Criar o agente `iris-cli`

> Cole este arquivo como primeira mensagem de uma sessão nova do Claude Code, aberta na raiz do repositório `cbjk_iris`. Rode esta sessão **depois** que `docs/spec/SPEC.md` existir e tiver sido aprovada.

## Tarefa

Criar o arquivo `.claude/agents/iris-cli.md`, um subagente do Claude Code dono do `create-iris-project` e da CLI `iris`. Você **não implementa** a CLI nesta sessão; você escreve o agente que vai implementá-la.

## Contexto

- `cbjk_iris` é um template de vitrine em Next.js 16 e TypeScript estrito, configurado por `site.config.ts`, com dados em `data/`, temas em `themes/` e módulos em `modules.json`. Leia o `README.md`, principalmente "Configurando o site", "Seções", "Módulos opcionais" e "Scripts".
- Scripts existentes que a CLI deve absorver ou chamar: `brand:sync`, `theme:add`, `modules:sync`, `modules:check`.
- **Decisões do dono:**
  - criação: `npx create-iris-project@latest <nome>`, com o nome opcional;
  - CLI `iris` para criar páginas, produtos e serviços, trocar temas e afins;
  - argumentos preenchem atributos rapidamente; os que faltarem são pedidos interativamente, quando fizer sentido (páginas, produtos, serviços).
- Leia `docs/spec/SPEC.md` e os ADRs. Eles definem: a interface pública da CLI (comandos, flags, códigos de saída), se a CLI edita `site.config.ts` por AST ou escreve JSON validado por zod, e o formato do schema de seção do qual as perguntas da CLI derivam.

## O que o agente faz

- Implementa o pacote `create-iris-project` (scaffold, escolha de tema, nome, WhatsApp, módulos, git e instalação).
- Implementa a CLI `iris` com, no mínimo, os comandos que a spec listar (por exemplo, `iris page add`, `iris product add`, `iris service add`, `iris theme set`, `iris theme add`, `iris module remove`).
- Gera as perguntas a partir do schema zod das seções e do `Product`: nunca mantém uma segunda lista de campos à mão.
- Modo não interativo obrigatório: `--yes`, detecção de CI, de agente e de ausência de TTY. Nesses casos, campo obrigatório faltando gera erro claro e código de saída diferente de zero, nunca um prompt pendurado.
- Validação antes de escrever: o arquivo só é alterado se o resultado passar no schema. Depois de escrever, roda o sync necessário (`modules:sync`, `brand:sync`).
- Saída legível por máquina opcional (`--json`), para agentes consumirem.

## Posse de arquivos

- **Pode tocar:** os pacotes da CLI e do `create-iris-project` definidos na spec, os testes deles, e `scripts/` que forem migrados para a CLI.
- **Proibidos:** `types/` e o formato do schema (`iris-architect`); componentes e temas (`iris-theme`, `iris-commerce`); README (`iris-docs`).
- A CLI **escreve** em `site.config.ts`, `data/` e `themes/` dos projetos gerados, mas não define o formato desses arquivos: segue o contrato.

## Frontmatter

Confira o schema do claude-forge em `reference/agent-schema.json` e a documentação de subagentes do Claude Code. Use só campos aceitos. Sugestões, a validar:

- `name: iris-cli`
- `description`: quando delegar (scaffold, comandos `iris`, prompts, flags, publicação no npm) e quando não (tipos, UI, temas). 2 ou 3 blocos `<example>`.
- `model`: intermediário; o mais capaz se a edição por AST estiver no escopo.
- `tools`: leitura, escrita, edição, bash, busca.
- `isolation: worktree`, se aceito.
- `skills`: `blind-spot-pass`, `review-loop`, `loop-forge`, se aceitos.

## Corpo do agente (system prompt)

Em português, contendo:

1. Papel e escopo.
2. Fontes de verdade: spec e ADRs.
3. Posse de arquivos (acima).
4. Stack: commander + `@clack/prompts` (ou o que a spec definir). Consultar context7 antes de usar qualquer API.
5. Regras: nunca travar em prompt sem TTY; nunca escrever arquivo inválido; nunca editar à mão `app/fonts.generated.ts` ou `components/sections/registry.tsx` (rodar os scripts); mensagens em português, com o comando exato para corrigir o erro.
6. Pipeline: `blind-spot-pass` antes de começar a parte de publicação no npm → `/plan` → `/tdd` (cada comando, interativo e não interativo; testes de fumaça que geram um projeto num diretório temporário e rodam `npm run build` nele) → `code-reviewer` → `security-reviewer` (caminhos de arquivo vindos de argumentos, nomes de projeto, execução de comandos externos, conteúdo baixado do tweakcn) → `review-loop` com `adversarial-reviewer` → `/handoff-verify` → `/commit-push-pr`.
7. Checklist: testes da CLI, `npx create-iris-project` local (via `npm pack` ou link) gerando um projeto que passa `npm run build` e `npm run lint`.
8. Publicação no npm só com confirmação do dono, nunca automática.

## Definição de pronto desta sessão

- `.claude/agents/iris-cli.md` existe e o frontmatter é válido.
- Em sessão nova, "adicione uma flag --price ao iris product add" delega a esse agente; "mude o espaçamento do hero" não delega. Teste e relate.
- Rode o `adversarial-reviewer` sobre o arquivo do agente.
- Não faça commit sem confirmação do dono.
