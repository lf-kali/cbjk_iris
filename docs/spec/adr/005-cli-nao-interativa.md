# ADR 005: CLI com modo não interativo para agentes e CI

- **Status:** Proposto
- **Data:** 2026-10-19
- **Spec:** [§4 e](../SPEC.md#e-cli-para-agentes-e-ci), [§5.7](../SPEC.md#57-interface-pública-da-cli)

## Contexto

A CLI vai ser rodada por pessoas, pela CI e por agentes (Claude Code, Codex, Cursor). Agentes e CI não têm terminal interativo: um prompt esperando resposta trava a execução até o timeout, sem mensagem útil.

Versões conferidas em 2026-10-19: commander 15.0 (Node ≥ 22.12), @clack/prompts 1.8, std-env 4.3. O std-env exporta `isCI`, `hasTTY`, `isAgent` e `agent`, e reconhece `CLAUDECODE`, `CODEX_*`, `CURSOR_AGENT` e `AI_AGENT`.

## Decisão

- **commander** para comandos, flags e help. **@clack/prompts** para as perguntas. **std-env** para detectar CI e agente.
- **Interativo só quando tudo indica uma pessoa:** sem `--yes`, `--json` ou `--no-interactive`, sem `IRIS_NONINTERACTIVE=1`, com stdin e stdout em TTY, fora de CI e fora de agente.
- **Uma porta só para perguntas:** a função `ask()`, que lança `NonInteractiveError` em modo não interativo. Nenhum outro código chama o clack.
- **Códigos de saída fixos** (0, 1 a 7, 130) e envelope `--json` versionado (`schemaVersion: 1`), descritos na spec.
- **Flags de campo geradas do schema** (kebab-case do campo). Campos aninhados por `--set caminho=valor`.
- **Escrita segura:** valida antes, escreve de forma atômica, roda `iris sync` depois.

## Consequências

- **Bom:** um agente pode criar um produto com um comando só, e lê o resultado em JSON.
- **Bom:** erro de campo faltando já traz o comando completo para corrigir.
- **Ruim:** o Node mínimo sobe para 22.18 (commander 15 e vitest pedem 22.12; tsdown pede 22.18). O README diz 22.6.
- **Ruim:** `npx iris` fora de um projeto baixa outro pacote (`iris`, uma lib de XHR). A doc ensina `npx iris` só dentro do projeto, onde o bin é local, ou `npm run iris --`.
- **Teste obrigatório:** cada comando que pode perguntar roda com `stdin` fechado e `CLAUDECODE=1`, e precisa terminar em menos de 5 segundos.
- **Alternativas descartadas:** cac (subcomandos aninhados desajeitados), yargs (API grande), oclif (pesado), inquirer (mais pesado que o clack), ci-info com @vercel/detect-agent (duas dependências para o que o std-env faz).
