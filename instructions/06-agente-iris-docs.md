# Sessão 6 — Criar o agente `iris-docs`

> Cole este arquivo como primeira mensagem de uma sessão nova do Claude Code, aberta na raiz do repositório `cbjk_iris`. Rode esta sessão **depois** que `docs/spec/SPEC.md` existir e tiver sido aprovada.

## Tarefa

Criar o arquivo `.claude/agents/iris-docs.md`, um subagente do Claude Code dono da documentação do Iris e das instruções para agentes nos projetos gerados. Você **não escreve** a documentação nesta sessão; você escreve o agente que vai escrevê-la.

## Contexto

- `cbjk_iris` é um template de vitrine em Next.js 16 que está virando framework: `npx create-iris-project@latest <nome>`, CLI `iris`, temas que mudam a forma dos componentes, botões de marketplace no `Product`.
- O `README.md` atual é parte do produto: explica config, temas, seções, módulos, catálogo, leads, dicas para iniciantes e regras de customização. Leia-o inteiro; o tom dele é o padrão (frases curtas, exemplos de código, tabelas, português do Brasil, voltado a quem está começando).
- Referência: o AstroWind já distribui um `AGENTS.md` e skills passo a passo para Claude Code, Codex e Cursor dentro do template. O Iris deve fazer o mesmo nos projetos gerados.
- Leia `docs/spec/SPEC.md` e os ADRs.

## O que o agente faz

- Mantém dois públicos separados:
  - **quem usa o framework** (README do projeto gerado, guia da CLI, guia de temas, guia de catálogo);
  - **quem desenvolve o framework** (README do monorepo, CONTRIBUTING, arquitetura).
- Gera o `AGENTS.md` (e `CLAUDE.md` que importa ele) e as skills que vão dentro de cada projeto criado pelo `create-iris-project`: como adicionar produto, página, seção e tema usando a CLI, e as regras que não podem ser quebradas.
- Mantém a documentação sincronizada com o código: cada flag da CLI, campo do `Product`, token de tema e tipo de seção documentado precisa existir, e vice-versa.
- Atualiza `CREDITS.md` quando outras frentes adicionarem ícones, temas ou imagens.

## Posse de arquivos

- **Pode tocar:** `README.md`, `docs/` (exceto `docs/spec/`, que é do `iris-architect`), `CONTRIBUTING.md`, `CREDITS.md`, os modelos de `AGENTS.md`, `CLAUDE.md` e skills que o `create-iris-project` copia.
- **Proibidos:** qualquer código de produto, tipos, temas, CLI. Se encontrar divergência entre doc e código, abre a pendência para o agente dono, não corrige o código.

## Frontmatter

Confira o schema do claude-forge em `reference/agent-schema.json` e a documentação de subagentes do Claude Code. Use só campos aceitos. Sugestões, a validar:

- `name: iris-docs`
- `description`: quando delegar (README, guias, AGENTS.md, skills dos projetos gerados, CREDITS) e quando não (código). 2 ou 3 blocos `<example>`.
- `model`: intermediário.
- `tools`: leitura, escrita, edição, busca; bash só para rodar comandos de verificação.
- `isolation: worktree`, se aceito.
- `skills`: `review-loop`, `skill-factory`, se aceitos.

## Corpo do agente (system prompt)

Em português, contendo:

1. Papel, escopo e os dois públicos.
2. Fontes de verdade: o código e a spec. A doc descreve o que existe, nunca o planejado como se existisse.
3. Posse de arquivos (acima).
4. Estilo: o do README atual. Frases curtas, um exemplo de código por conceito, tabelas para listas de opções, seção "Dicas para quem está começando" mantida.
5. Verificação: todo exemplo de código e comando da doc é executado ou compilado antes de entregar. Para comandos da CLI, gerar um projeto temporário e rodá-los.
6. Pipeline: depois que as outras frentes entregarem → `doc-updater` do forge para localizar o que mudou → escrever → `review-loop` com `adversarial-reviewer` (pergunta central: um iniciante consegue seguir isso sem abrir um componente?) → `/commit-push-pr`.
7. Para o `AGENTS.md` dos projetos gerados: curto, com as regras de ouro (cores e forma por token, textos em `texts`, arquivos gerados intocáveis, usar a CLI em vez de editar à mão) e os comandos de verificação.

## Definição de pronto desta sessão

- `.claude/agents/iris-docs.md` existe e o frontmatter é válido.
- Em sessão nova, "documente o novo comando iris theme set" delega a esse agente; "implemente o iris theme set" não delega. Teste e relate.
- Rode o `adversarial-reviewer` sobre o arquivo do agente.
- Não faça commit sem confirmação do dono.
