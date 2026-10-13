# create-vitrine: plano do CLI

Gerador de sites a partir deste template, no estilo `create-next-app`:

```bash
npm create vitrine@latest meu-site     # ou: npx create-vitrine meu-site
```

Um comando faz perguntas, copia o template, aplica as respostas e entrega um projeto pronto para rodar e publicar. O projeto gerado é do cliente: ele não depende do CLI depois de criado.

Este documento é o ponto de partida da sessão que vai construir o CLI. O template (`cbjk_iris`) já expõe o contrato que o CLI usa, e quase nada nele precisa mudar.

---

## 1. Contrato do template (o que o CLI pode mexer)

O CLI **nunca edita componentes**. Ele só faz estas quatro coisas:

| O CLI faz | Onde | Como |
|---|---|---|
| Escrever a configuração | `site.config.ts` | Edição da árvore do código (AST) com `magicast`, preservando comentários |
| Remover módulos desligados | Caminhos em `modules.json` → `modules[].paths` | `rm -rf` de cada caminho, mais a limpeza de `menu` e das seções do config |
| Regenerar arquivos gerados | `components/sections/registry.tsx`, `app/fonts.generated.ts` | Rodar `npm run modules:sync` e `npm run brand:sync` no projeto novo |
| Baixar um tema do tweakcn | `themes/<nome>.css` | Rodar `npm run theme:add -- <nome>` (ou a mesma lógica dentro do CLI) |

Fontes de verdade que o CLI lê:
- `modules.json`: quais módulos existem, seus caminhos, itens de menu, seções e dependências npm;
- `themes/*.css`: a lista de temas disponíveis;
- `types/site-config.ts` e `types/sections.ts`: o formato válido do config (os tipos são a especificação).

---

## 2. Fluxo

```
1. Perguntas (ou flags no modo não interativo)
2. Baixar o template na versão fixada
3. Limpar arquivos que só existem no repo do template
4. Remover os módulos desligados (modules.json)
5. Escrever o site.config.ts com as respostas
6. Ajustar o package.json (name, version 0.1.0, dependências de módulos removidos)
7. npm run modules:sync e npm run brand:sync
8. Instalar dependências (gerenciador detectado)
9. git init com commit inicial
10. Validar (opcional, --verify): tsc e next build
11. Mostrar os próximos passos
```

### Perguntas

| # | Pergunta | Tipo | Vai para |
|---|---|---|---|
| 1 | Nome da pasta do projeto | texto (argumento) | diretório, `package.json#name` |
| 2 | Nome da empresa | texto | `name`, `seo.title`, `seo.titleTemplate` |
| 3 | WhatsApp (DDI+DDD+número) | texto validado, só dígitos | `whatsapp.phone` |
| 4 | Módulos | seleção múltipla: produtos, serviços, galeria | remoção de caminhos e limpeza do config |
| 5 | Modelo de home | uma opção: loja, serviços, institucional, em branco | `home.sections` (ver §4) |
| 6 | Tema | uma opção: lista de `themes/`, ou "outro do tweakcn" (pede o nome) | `theme.name` |
| 7 | Cores da marca | opcional: primária, CTA e destaque (hex), ou "usar as do tema" | `brand.colors` |
| 8 | Fonte | opcional: "a do tema" ou um nome do Google Fonts | `brand.fonts.sans` |
| 9 | Modo de cor | sistema / só claro / só escuro | `theme.colorMode` |
| 10 | Formulário de lead | WhatsApp / endpoint (pede a URL) | `leads` |
| 11 | Logo | caminho de um arquivo (opcional) | copia para `public/` e preenche `brand.logo` |
| 12 | Gerenciador, instalar, git | confirmações | passos 8 e 9 |

Regras:
- **O nome do Google Fonts é validado na hora**, contra a lista do `next/font` (a mesma que o `brand:sync` usa).
- **As cores são validadas** com o `culori`. O CLI já mostra o aviso de contraste antes de gerar.
- **As perguntas dependem dos módulos escolhidos.** Por exemplo, "modelo loja" sem o módulo de produtos não deve ser oferecido, ou deve cair para outro modelo.

### Modo não interativo

```bash
npx create-vitrine meu-site --yes \
  --name "Padaria Pão Bom" --whatsapp 5511999999999 \
  --modules products,gallery --home loja \
  --theme caffeine --primary "#7c2d12" --font "DM Sans" \
  --leads whatsapp --pm npm --no-git
```

`--yes` aceita os padrões em tudo que não veio por flag. Isso serve para os testes de CI (§7).

---

## 3. Escrevendo o `site.config.ts`

Recomendo o **`magicast`** (da unjs). Ele carrega o arquivo TypeScript como uma árvore de código, permite editar o objeto `siteConfig` como um objeto JS comum e grava de volta preservando formatação e comentários.

```ts
import { loadFile, writeFile } from "magicast";
const mod = await loadFile("site.config.ts");
const config = mod.exports.siteConfig;   // proxy editável
config.name = answers.name;
config.theme.name = answers.theme;
config.brand.colors = answers.colors ?? {};
config.menu = config.menu.filter((item) => !removedRoutes.includes(item.path));
config.home.sections = HOME_PRESETS[answers.home];
await writeFile(mod, "site.config.ts");
```

Alternativas descartadas:
- **Template de texto (handlebars):** duplica o config dentro do CLI, e os dois se desencontram a cada mudança no template.
- **Importar o objeto, alterar e serializar:** perde os comentários, que são a documentação do config para quem é iniciante.
- **Substituição por regex:** frágil. É o que o `modules:check` faz hoje, e só serve para teste.

Também precisa limpar no config, pelo `modules.json`:
- itens de `menu` com rota de módulo removido;
- seções `type` de módulos removidos, em `home.sections` e em `pages[].sections`;
- links de `footer.columns` para rotas removidas.

---

## 4. Modelos de home

São só listas de seções (`Section[]`), guardadas no CLI. O conteúdo de exemplo pode ser genérico, com `{name}` substituído pelo nome da empresa.

| Modelo | Seções | Precisa dos módulos |
|---|---|---|
| `loja` | hero, benefits, products, testimonials, cta-banner | products |
| `servicos` | hero, benefits, services, stats, testimonials, faq, cta-banner | services |
| `institucional` | hero, text-image, stats, testimonials, gallery (se houver), cta-banner | nenhum |
| `em-branco` | hero com um slide | nenhum |

Regras:
- Um modelo nunca põe no conteúdo links ou imagens de módulo (a regra do README, "Módulos opcionais"). Produtos, serviços e galeria entram só pelas seções dos módulos.
- As páginas `sobre` e `contato` (`pages`) podem vir sempre, porque só usam seções do núcleo.

---

## 5. Origem do template

Recomendo **baixar do GitHub numa tag fixa**, com o `giget` (`gh:lf-kali/cbjk_iris#v1.0.0`):
- o pacote do CLI fica pequeno (o template tem cerca de 2MB de imagens);
- cada versão do CLI aponta para uma versão do template (`TEMPLATE_REF` no código);
- `--template <ref>` permite testar uma branch.

O custo é precisar de internet na geração, o que é aceitável: `npm install` precisa de qualquer jeito. A alternativa seria empacotar o template dentro do pacote npm, o que funciona offline, mas faz cada mudança no template exigir um novo release do CLI.

### Arquivos que só existem no repo do template

O projeto gerado não deve levar:
- `cbjk_iris-refactor-plan.md` e `create-vitrine-plan.md`;
- `.vscode/`;
- `CREDITS.md`, se o cliente trocar todas as imagens. Talvez o melhor seja manter, com aviso;
- `scripts/check-modules.mjs`. Pode ficar, mas não tem utilidade depois que os módulos são escolhidos.

Proposta: um arquivo `template.json` na raiz do template, com `ignore: [...]`, lido pelo CLI. Ele mantém essa lista junto do template, e não no CLI.

---

## 6. Stack e estrutura do repositório

Repositório separado, `create-vitrine`. Stack:

| Uso | Biblioteca |
|---|---|
| Perguntas | `@clack/prompts` |
| Flags | `cac` |
| Download do template | `giget` |
| Edição do config | `magicast` |
| Comandos (install, scripts, git) | `tinyexec` ou `execa` |
| Gerenciador de pacotes | `package-manager-detector` |
| Validação de cor e contraste | `culori` |
| Build | `tsup` (ESM, Node 22+) |
| Testes | `vitest` |

```
create-vitrine/
├─ src/
│  ├─ index.ts            # entrada: cac + fluxo
│  ├─ prompts.ts          # perguntas (clack)
│  ├─ flags.ts            # mapeamento flags -> respostas
│  ├─ template.ts         # download (giget) e limpeza (template.json)
│  ├─ modules.ts          # leitura do modules.json e remoção
│  ├─ config.ts           # escrita do site.config.ts (magicast)
│  ├─ presets/home.ts     # modelos de home
│  ├─ fonts.ts            # validação de Google Fonts
│  ├─ colors.ts           # validação e contraste
│  └─ install.ts          # pm, install, git, scripts de sync
├─ test/
│  ├─ unit/               # config, módulos, presets
│  └─ e2e/                # gera combinações e roda build
└─ package.json           # "bin": { "create-vitrine": "dist/index.js" }
```

---

## 7. Testes

**Unitários (vitest):**
- escrita do config com o `magicast`, verificando que os comentários são preservados;
- limpeza de menu e seções por módulo;
- validação de cores e fontes;
- modelos que respeitam os módulos escolhidos.

**De ponta a ponta (CI):** gerar uma matriz de combinações com `--yes` e rodar, em cada uma:
- `tsc --noEmit`;
- `next build`;
- `modules:sync --check`;
- `brand:sync --check`.

Combinações mínimas:

| Módulos | Home | Tema | Marca |
|---|---|---|---|
| todos | loja | neutral | em branco |
| nenhum | institucional | caffeine | primária + CTA |
| services | servicos | ocean-breeze | fonte do Google |
| products, gallery | loja | tweakcn baixado | tudo preenchido |

O `npm run modules:check` do template continua sendo a garantia do lado do template. A matriz do CLI garante o lado do gerador.

---

## 8. Publicação

1. Durante o desenvolvimento: `npx github:lf-kali/create-vitrine meu-site`.
2. O nome `create-vitrine` no npm **ainda não foi verificado**. Se estiver ocupado: `@lf-kali/create-vitrine`, usado como `npm create @lf-kali/vitrine`.
3. Versões: o CLI segue semver. Cada release fixa `TEMPLATE_REF` numa tag do template.

---

## 9. Etapas

| Etapa | Entrega | Pronto quando |
|---|---|---|
| 0. Preparar o template | Tag `v1.0.0`, `template.json` com `ignore` | `giget` baixa a tag e o build passa |
| 1. Esqueleto | `cac` + `@clack/prompts` + `giget`; copia o template e faz `git init` | Gera um projeto idêntico ao template, que roda |
| 2. Config | `magicast` escrevendo nome, WhatsApp, tema, marca, fonte, modo de cor e leads | Testes unitários do config passam e os comentários são preservados |
| 3. Módulos | Remoção pelos caminhos, limpeza de menu, seções e rodapé, `modules:sync`, `package.json` | Cada combinação de módulos compila |
| 4. Modelos de home | 4 modelos, com filtro por módulo | Matriz de CI verde |
| 5. Temas e fontes | Tema do tweakcn por nome, validação de fonte e aviso de contraste no CLI | Gerar com tema baixado passa no build |
| 6. Modo não interativo | Todas as flags e `--yes` | A CI usa só flags |
| 7. Publicação | README do CLI, release no npm | `npm create vitrine@latest` funciona numa máquina limpa |

---

## 10. Decisões em aberto

1. **Nome do pacote:** confirmar no npm `create-vitrine`, ou usar o escopo `@lf-kali`.
2. **Logo:** aceitar só SVG monocromático (o caso mais simples, que segue o modo escuro), ou também PNG/SVG colorido com `monochrome: false`?
3. **Conteúdo de exemplo:** o projeto gerado traz os produtos e serviços de reforma, ou dados neutros ("Produto exemplo 1")? E as fotos CC0 de interiores servem para qualquer segmento?
4. **Textos (`texts`):** o CLI pergunta o idioma (hoje só existe pt-BR), ou isso fica para depois?
5. **Template de backend:** quando existir, o `provider: "backend"` dos leads passa a ser uma opção do CLI, e ele pode gerar os dois projetos juntos.
6. **Atualização de projetos já gerados:** fora do escopo inicial. Um projeto gerado é independente, e atualizar exigiria um mecanismo de patches.
