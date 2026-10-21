# ADR 003: Tokens de forma e estilos por `data-style`

- **Status:** Proposto. Vira Aceito no congelamento dos contratos (tag `contracts-v1`).
- **Data:** 2026-10-19
- **Spec:** [§4 c](../SPEC.md#c-como-os-temas-mudam-os-componentes), [§5.4](../SPEC.md#54-tokens-de-forma-e-estilos)

## Contexto

Os temas de hoje mudam cores, fontes, `--radius`, sombras e `--tracking-normal`. A forma está fixa no código do estilo shadcn `base-sera`: `rounded-none` em 12 lugares, `shadow-md` em 13, `uppercase` e `tracking-*` em botão, badge, breadcrumb, tabs e rótulos, `ring-1 ring-foreground/5` no Card, `backdrop-blur-2xl` e `bg-background/86` no header, `bg-black/20 backdrop-blur-sm` no fundo do Sheet.

O dono quer que o tema mude a forma, e que a troca funcione depois da instalação (`iris theme set`), diferente do `npx shadcn create`, que reescreve os componentes.

A proposta original era escolher variantes `cva` por `data-style` no `<html>`. O `cva` roda em JS e precisa receber o estilo como argumento. Um server component não lê o `<html>`, então o estilo teria que descer por props até cada componente.

## Decisão

1. **Tokens de forma:** 26 variáveis CSS na lista inicial, com padrões do `sera` tirados das classes de hoje (lista em [§5.4](../SPEC.md#54-tokens-de-forma-e-estilos)), com tipo e faixa em `SHAPE_TOKENS`. Os componentes usam só utilitários congelados (`rounded-control`, `shadow-card`, `shadow-overlay`, `surface-card`, `case-label`, `py-section`...). Exceções (foto com texto branco, `rounded-full` em avatar) ficam numa lista testada. A lista de tokens da spec é a inicial: antes do congelamento, o arquiteto gera por script o inventário de toda classe de forma fixa do core (`docs/spec/style-inventory.json`) e acrescenta os tokens que faltarem, com o padrão do `sera` igual ao valor de hoje. Duas revisões mostraram que um inventário escrito à mão sempre deixa classes de fora. O inventário foi feito em 2026-10-20 e levou a lista a 31 tokens (5 novos: `--radius-surface`, `--radius-field`, `--radius-card-compact`, `--surface-border-width`, `--popover-ring-color`).
2. **Estilos:** presets de valores (`sera`, `soft`, `glass`, `flat`). O layout escreve `data-style` no `<html>`.
3. **Variantes CSS, não `cva`, para o que token não resolve:** `@custom-variant style-<id>` do Tailwind v4. `style-glass:ring-white/10` só vale com `data-style="glass"`. O `cva` continua para `variant` e `size`.
4. **Tema e estilo separados:** o tema (cores e fontes, formato do tweakcn) não muda. O estilo vem de `siteConfig.theme.style`, do `--iris-style` do tema ou do padrão `sera`.
5. **Camadas:** preset do estilo → tema → `brand.colors` e `brand.shape` → `brand.overrides`.
6. **Compatibilidade:** tema sem tokens de forma recebe os do preset. Os 10 temas de hoje continuam válidos sem mudança.

## Consequências

- **Bom:** trocar o estilo é trocar um valor no config. Funciona em server components, sem JS no navegador.
- **Bom:** qualquer tema do tweakcn combina com qualquer estilo.
- **Bom:** `sera` reproduz o visual de hoje, então a migração não muda nada para quem não escolher outro estilo. Única mudança aceita: o foco de badge e tabs passa de 3px para 2px, igual ao botão.
- **Ruim:** todos os componentes do core precisam trocar classes fixas por utilitários. É o grosso do trabalho do `iris-theme`.
- **Ruim:** transparência e blur custam desempenho no celular. Mitigação: faixa máxima de blur, `prefers-reduced-transparency`, meta de Lighthouse ≥ 90.
- **Ruim:** com alpha abaixo de 100%, o contraste depende do que está atrás. O aviso de contraste passa a medir a mistura com `--background`.
- **Regra:** token novo é mudança de contrato (ADR novo). Mais de 3 classes `style-*` num elemento é sinal de token faltando.
