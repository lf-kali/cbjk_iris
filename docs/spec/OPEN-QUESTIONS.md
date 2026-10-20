# Perguntas abertas para o dono

Cada pergunta tem uma recomendação. Responder "de acordo" aceita a recomendação.

| Tipo | Significado |
|---|---|
| **Bloqueante** | Sem resposta, os contratos não congelam e as frentes paralelas não começam |
| **Antes da frente** | Pode ficar para depois do congelamento, mas precisa de resposta antes da frente indicada começar |
| **Antes de publicar** | Só bloqueia a primeira publicação no npm |

Toda pergunta **Bloqueante** depende de aprovação humana e leva o rótulo **[DECISÃO DO DONO]**. O spike do `iris-architect` ([SPEC §6.1](./SPEC.md#61-iris-architect-arquitetura-e-contratos)) pode começar antes de qualquer resposta.

## Resumo

| # | Pergunta | Tipo | Recomendação |
|---|---|---|---|
| [Q-01](#q-01-core-como-pacote-ou-template-copiado-decisão-do-dono) | Core como pacote ou template copiado **[DECISÃO DO DONO]** | Bloqueante | Pacote |
| [Q-02](#q-02-nomes-no-npm-decisão-do-dono) | Nomes no npm (`create-iris-project` e `@iris` estão ocupados) **[DECISÃO DO DONO]** | Bloqueante | `create-iris-site` + org `@iris-vitrine` |
| [Q-03](#q-03-conteúdo-em-json-decisão-do-dono) | Produtos, serviços e páginas em JSON **[DECISÃO DO DONO]** | Bloqueante | Sim |
| [Q-04](#q-04-licença) | Licença do framework | Antes de publicar | MIT |
| [Q-05](#q-05-node-mínimo-decisão-do-dono) | Node mínimo 22.18 **[DECISÃO DO DONO]** | Bloqueante | Sim |
| [Q-06](#q-06-produto-sem-nenhum-botão) | Produto sem nenhum botão de compra | Antes do `iris-commerce` | Permitir, com aviso |
| [Q-07](#q-07-ordem-padrão-dos-botões) | Ordem padrão dos botões | Antes do `iris-commerce` | WhatsApp primeiro |
| [Q-08](#q-08-ícones-do-mercado-livre-e-da-amazon) | Ícones do Mercado Livre e da Amazon | Antes do `iris-commerce` | SVG oficial do kit de marca, ou sacola genérica |
| [Q-09](#q-09-estilos-embutidos) | Quais estilos embutidos | Antes do `iris-theme` | `sera`, `soft`, `glass`, `flat` |
| [Q-10](#q-10-starter-dentro-do-pacote-ou-baixado-do-github) | Starter dentro do pacote ou baixado do GitHub | Antes do `iris-cli` | Dentro do pacote |
| [Q-11](#q-11-publicação-e-versionamento) | Publicação e versionamento | Antes de publicar | Lockstep, changesets, trusted publishing |
| [Q-12](#q-12-conteúdo-de-exemplo-do-starter) | Conteúdo de exemplo do starter | Antes do `iris-cli` | Manter o cbjk, com aviso |
| [Q-13](#q-13-pendências-no-diretório-de-trabalho) | Pendências no diretório de trabalho | Antes do `iris-architect` | Reverter o `allowedDevOrigins` |

---

## Q-01. Core como pacote ou template copiado [DECISÃO DO DONO]

**Bloqueante. É a decisão (a) da spec.** Detalhe: [SPEC §4 a](./SPEC.md#a-template-copiado-ou-core-como-pacote-decisão-do-dono), [ADR 001](./adr/001-distribuicao-core-pacote.md).

| Opção | Em uma frase |
|---|---|
| A. `@iris-vitrine/core` no npm | O cliente recebe config e conteúdo. Correções chegam por `npm update`. Customizar JSX exige "ejetar" |
| B. Template copiado | O cliente recebe todo o código e pode mudar tudo. Cada site vira um fork sem atualização |

**Recomendação: A.** O objetivo é *gerenciar* sites, e sem pacote não existe `iris upgrade`. O custo extra da opção A (aliases, rotas finas, `@source`, regra de semver) é pago uma vez. O spike prova os 6 pontos de risco antes de qualquer migração.

**O que muda conforme a resposta:** o critério de módulo ativo (lista no config, ou arquivos presentes), o `create` (instala o pacote, ou copia o código), e o `iris upgrade` no backlog.

## Q-02. Nomes no npm [DECISÃO DO DONO]

**Bloqueante.** Detalhe: [ADR 006](./adr/006-nomes-e-distribuicao-npm.md).

Conferido em 2026-10-19: `create-iris-project` já existe, de outro dono, e o escopo `@iris` também é de outra pessoa. O comando pedido não pode ser publicado com esse nome.

| Opção | Comando de criação | Pacotes |
|---|---|---|
| **1 (recomendada)** | `npx create-iris-site@latest meu-site` | org nova `@iris-vitrine/*` |
| 2 | `npm create @lf-kali/iris@latest meu-site` | escopo pessoal `@lf-kali/*` (se for o seu usuário no npm) |
| 3 | `npx create-iris-vitrine@latest meu-site` | org nova `@iris-vitrine/*` |
| 4 | Pedir o `create-iris-project` pela política de disputas do npm | Lento e sem garantia: o pacote está ativo |

**Recomendação: opção 1.** É o mais próximo do pedido, e o nome está livre. Confirme criando a org `iris-vitrine` em npmjs.com. Se ela não estiver livre, diga qual escopo usar.

## Q-03. Conteúdo em JSON [DECISÃO DO DONO]

**Bloqueante.** Detalhe: [SPEC §4 d](./SPEC.md#d-como-a-cli-edita-arquivos), [ADR 004](./adr/004-conteudo-em-json.md).

Produtos, serviços, páginas e home saem do `.ts` e vão para `content/`, um JSON por item. O `site.config.ts` fica só com a configuração.

**Recomendação: sim.** A CLI fica simples e segura, e o caminho para CSV, Merchant Center, Keystatic e Puck fica aberto. O preço: o iniciante perde os comentários de `data/products.ts` e ganha a ajuda do VS Code pelo JSON Schema.

## Q-04. Licença

**Antes de publicar.** O repositório não tem `LICENSE`, e o `package.json` não tem `license`. Pacote publicado sem licença não pode ser usado legalmente por terceiros.

**Recomendação: MIT**, com `NOTICE` para os temas do tweakcn (Apache-2.0), que exigem o aviso quando redistribuídos.

## Q-05. Node mínimo [DECISÃO DO DONO]

**Bloqueante.** O README pede Node 22.6+. commander 15 e vitest 5 exigem 22.12, e tsdown exige 22.18.

**Recomendação: Node 22.18 ou mais novo** em todos os pacotes e no projeto gerado. A alternativa é trocar o tsdown pelo `tsc` puro e ficar em 22.12, o que só adia o problema.

## Q-06. Produto sem nenhum botão

**Antes do `iris-commerce`.** Com `whatsappButton: false` e sem links, o produto não tem como ser comprado.

**Recomendação:** permitir (serve para catálogo só de exibição). O detalhe não mostra ação nem o aviso do WhatsApp, e o `iris check` dá um aviso.

Pergunta junto: o padrão de `whatsappButton` ausente é `true` (comportamento de hoje)? Recomendação: sim.

## Q-07. Ordem padrão dos botões

**Antes do `iris-commerce`.**

**Recomendação:** WhatsApp, Mercado Livre, Shopee, Amazon, site externo. O WhatsApp é a venda direta, sem comissão de marketplace. O primeiro botão da lista recebe o destaque, e o card da grade mostra só ele. A ordem configurável está no backlog.

## Q-08. Ícones do Mercado Livre e da Amazon

**Antes do `iris-commerce`.** O simple-icons 16.35 tem Shopee, mas não tem Mercado Livre nem Amazon.

| Opção | Prós | Contras |
|---|---|---|
| **SVG oficial do kit de marca de cada empresa (recomendada)** | Fiel à marca | Cada empresa tem regras de uso; o `iris-commerce` precisa ler e registrar no `CREDITS.md` |
| Sacola genérica do lucide, com o nome da plataforma no texto | Sem risco de marca | Visual menos reconhecível |

**Recomendação:** SVG oficial, se as regras de marca permitirem uso por lojistas. Se não, sacola genérica. O texto do botão já diz a plataforma nos dois casos.

## Q-09. Estilos embutidos

**Antes do `iris-theme`.**

**Recomendação:** quatro estilos. `sera` (o visual de hoje, padrão), `soft` (arredondado), `glass` (translúcido com blur) e `flat` (sem sombra). Quer outro, ou outro padrão?

## Q-10. Starter dentro do pacote ou baixado do GitHub

**Antes do `iris-cli`.** Detalhe: [ADR 006](./adr/006-nomes-e-distribuicao-npm.md).

| Opção | Prós | Contras |
|---|---|---|
| **Dentro do pacote `create` (recomendada)** | Funciona offline. Versão do starter igual à do core | Cerca de 2MB de imagens no pacote |
| Baixado de uma tag do GitHub (`giget`) | Pacote pequeno | Depende do GitHub no momento da criação, e a tag e o core podem se desencontrar |

## Q-11. Publicação e versionamento

**Antes de publicar.**

**Recomendação:**
- versões em lockstep (os cinco pacotes com o mesmo número), com changesets;
- publicação só pelo GitHub Actions, com trusted publishing (OIDC) e `--provenance`, sem token na máquina;
- 2FA obrigatório na org;
- primeira versão `0.1.0`. A `1.0.0` só depois de dois sites reais rodando com o core.

## Q-12. Conteúdo de exemplo do starter

**Antes do `iris-cli`.** O starter é o site cbjk de reformas.

**Recomendação:** manter o cbjk, porque mostra todas as seções com conteúdo real. O README do projeto gerado avisa para trocar o conteúdo, e o `iris check` avisa se o nome ainda for "cbjk". Os modelos de home do `create` (`loja`, `servicos`, `institucional`, `em-branco`) usam textos genéricos com `{name}`.

## Q-13. Pendências no diretório de trabalho

**Antes do `iris-architect`.** Há mudanças sem commit:
- `next.config.ts` tem `allowedDevOrigins` com o hostname da sua tailnet. Não pode chegar ao starter;
- `site.config.ts` está com `theme.name: "taupe"`;
- `cbjk_iris-refactor-plan.md` e `create-vitrine-plan.md` foram apagados;
- `public/cbjk_logo.svg` é novo e não está rastreado;
- `instructions/`, `docs/` (esta spec) e `.claude/` não estão rastreados.

**Recomendação:** reverter o `allowedDevOrigins`, ou movê-lo para uma variável de ambiente lida no `next.config.ts`. Decidir se `cbjk_logo.svg` entra no starter. Fazer commit do resto (inclusive `docs/spec/` e `instructions/`) antes de o arquiteto começar, para a linha de base visual ser clara.
