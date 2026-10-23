# Perguntas para o dono: respondidas

Todas as 13 perguntas foram respondidas pelo dono em **2026-10-20**. Nenhuma pergunta bloqueante está aberta. A spec já incorpora as respostas.

## Resumo

| # | Pergunta | Resposta do dono |
|---|---|---|
| [Q-01](#q-01-core-como-pacote-ou-template-copiado-decisão-do-dono) | Core como pacote ou template copiado **[DECISÃO DO DONO]** | **A: pacote no npm**, na org `@cbjk_iris` |
| [Q-02](#q-02-nomes-no-npm-decisão-do-dono) | Nomes no npm **[DECISÃO DO DONO]** | **Opção 1:** `create-iris-site`, com a org `@cbjk_iris` |
| [Q-03](#q-03-conteúdo-em-json-decisão-do-dono) | Conteúdo em JSON **[DECISÃO DO DONO]** | **Sim** |
| [Q-04](#q-04-licença) | Licença | **MIT**, com `NOTICE` para os temas do tweakcn (Apache-2.0) |
| [Q-05](#q-05-node-mínimo-decisão-do-dono) | Node mínimo **[DECISÃO DO DONO]** | **Node 22.18 ou mais novo** |
| [Q-06](#q-06-produto-sem-nenhum-botão) | Produto sem nenhum botão | **Permitir**. `whatsappButton` com padrão `true` |
| [Q-07](#q-07-ordem-padrão-dos-botões) | Ordem dos botões | **Configurável só no nível global**, no `site.config.ts`. Ordem nativa: WhatsApp, Mercado Livre, Shopee, Amazon, site externo |
| [Q-08](#q-08-ícones-do-mercado-livre-e-da-amazon) | Ícones das plataformas | **SVG oficial do kit de marca de cada empresa** |
| [Q-09](#q-09-estilos-embutidos) | Estilos embutidos | **Os quatro sugeridos.** Outros virão depois, com o `iris-theme` |
| [Q-10](#q-10-starter-dentro-do-pacote-ou-baixado-do-github) | Onde fica o starter | **Dentro do pacote `create`** |
| [Q-11](#q-11-publicação-e-versionamento) | Publicação e versionamento | **Conforme a sugestão** |
| [Q-12](#q-12-conteúdo-de-exemplo-do-starter) | Conteúdo de exemplo | **Manter a marca cbjk**, mas como **assistência técnica de celulares**, não reformas |
| [Q-13](#q-13-pendências-no-diretório-de-trabalho) | Pendências no diretório | **Resolvidas** (commit `07b91c7`) |

## Ações do dono fora do código

| Ação | Quando |
|---|---|
| Criar a org `cbjk_iris` em npmjs.com, com 2FA obrigatório | Antes da primeira publicação. O nome passa nas regras do npm, e `@cbjk_iris/core` dá 404 no registro em 2026-10-20. Só a criação confirma que a org está livre |
| Primeiro lançamento, uma vez só: publicar manualmente, da sua máquina e com 2FA, uma versão `0.0.0` de cada pacote, para os pacotes passarem a existir no registro. Depois, configurar o trusted publishing de cada um para `lf-kali/cbjk_iris` e o workflow `release.yml` | Antes da `0.1.0`. A configuração do trusted publisher exige que o pacote já exista (`npm help trust`, npm 12.0.1: "Package must exist"). É uma configuração por pacote, nos cinco; os passos estão no cabeçalho do `.github/workflows/release.yml` |
| Disparar o workflow de release | A cada versão depois da primeira. Nenhum agente publica sozinho |

---

## Q-01. Core como pacote ou template copiado [DECISÃO DO DONO]

**Resposta: A.** O núcleo vira o pacote `@cbjk_iris/core` no npm. Detalhe: [SPEC §4 a](./SPEC.md#a-template-copiado-ou-core-como-pacote-decisão-do-dono), [ADR 001](./adr/001-distribuicao-core-pacote.md).

Consequência: módulo ativo é o que está em `siteConfig.modules`, o `create` instala o pacote, e o `iris upgrade` continua no backlog.

## Q-02. Nomes no npm [DECISÃO DO DONO]

**Resposta: opção 1, com a org `@cbjk_iris`.** Detalhe: [ADR 006](./adr/006-nomes-e-distribuicao-npm.md).

| Uso | Nome |
|---|---|
| Comando de criação | `npx create-iris-site@latest [nome]` (sem escopo) |
| Bibliotecas | `@cbjk_iris/schema`, `@cbjk_iris/engine`, `@cbjk_iris/core`, `@cbjk_iris/cli` |
| Bin da CLI | `iris` |
| Aliases do core | `@cbjk_iris/site-config`, `@cbjk_iris/site-registry` |

Motivo de não usar `create-iris-project`: o pacote já existe no npm, de outro dono.

## Q-03. Conteúdo em JSON [DECISÃO DO DONO]

**Resposta: sim.** Produtos, serviços, páginas e home vão para `content/`, um JSON por item. Detalhe: [SPEC §4 d](./SPEC.md#d-como-a-cli-edita-arquivos), [ADR 004](./adr/004-conteudo-em-json.md).

## Q-04. Licença

**Resposta: MIT**, com `NOTICE` para os temas do tweakcn (Apache-2.0), que exigem o aviso quando redistribuídos. O arquiteto cria `LICENSE` e `NOTICE` e põe `"license": "MIT"` em todos os pacotes ([SPEC §6.1](./SPEC.md#61-iris-architect-arquitetura-e-contratos)).

## Q-05. Node mínimo [DECISÃO DO DONO]

**Resposta: Node 22.18 ou mais novo**, em todos os pacotes e no projeto gerado.

## Q-06. Produto sem nenhum botão

**Resposta: permitir. `whatsappButton` ausente vale `true`.** O detalhe não mostra ação nem o aviso do WhatsApp, e o `iris check` dá um aviso, não um erro.

## Q-07. Ordem padrão dos botões

**Resposta: configurável só no nível global.** O `site.config.ts` ganha `commerce.buttonOrder`. A ordem nativa é WhatsApp, Mercado Livre, Shopee, Amazon, site externo. Não há ordem por produto. Regras em [SPEC §5.2](./SPEC.md#52-tipo-product-e-botões-de-compra).

## Q-08. Ícones do Mercado Livre e da Amazon

**Resposta: SVG oficial do kit de marca de cada empresa**, para os três marketplaces.

O `iris-commerce` baixa o SVG do kit de marca oficial, lê as regras de uso e as registra no `CREDITS.md`. Se uma regra proibir o uso por lojistas, a frente para e avisa o dono. Ela não troca o ícone pela sacola genérica por conta própria.

## Q-09. Estilos embutidos

**Resposta: os quatro sugeridos**: `sera` (padrão, o visual de hoje), `soft`, `glass` e `flat`. Estilos novos virão depois, pelo `iris-theme`.

## Q-10. Starter dentro do pacote ou baixado do GitHub

**Resposta: dentro do pacote `create`.** Detalhe: [ADR 006](./adr/006-nomes-e-distribuicao-npm.md).

## Q-11. Publicação e versionamento

**Resposta: conforme a sugestão.**
- Versões em lockstep (os cinco pacotes com o mesmo número), com changesets.
- Publicação só pelo GitHub Actions, com trusted publishing (OIDC) e `--provenance`, sem token na máquina.
- 2FA obrigatório na org.
- Primeira versão `0.1.0`. A `1.0.0` só depois de dois sites reais rodando com o core.

## Q-12. Conteúdo de exemplo do starter

**Resposta: manter a marca cbjk, mas como assistência técnica de celulares.** Sai todo o conteúdo de reformas: produtos, serviços, textos, galeria e fotos.

O arquiteto faz a troca depois de migrar o conteúdo para JSON e antes do congelamento. Assim todas as frentes comparam contra a mesma linha de base ([SPEC §6.1](./SPEC.md#61-iris-architect-arquitetura-e-contratos), passo 7, e [§6.1.1](./SPEC.md#611-conteúdo-de-exemplo-assistência-técnica-de-celulares)).

## Q-13. Pendências no diretório de trabalho

**Resposta: resolvidas.** No commit `07b91c7`, o diretório de trabalho ficou limpo, e o `allowedDevOrigins` passou a vir de `process.env.TAILNET_ADDRESS`.

Fica um detalhe para o arquiteto, ao converter o `next.config.ts` para `withIris`: aplicar `allowedDevOrigins` só quando `TAILNET_ADDRESS` existir. Hoje, sem a variável, a lista fica `[undefined]`. A linha não vai para o starter ([SPEC §5.1.4](./SPEC.md#514-de-appssite-para-o-starter)).
