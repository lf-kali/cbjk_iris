// Fixture do teste de scripts/style-inventory.mjs: um caso de cada padrão do SPEC §5.4, passo 1.
// Comentário com rounded-lg e shadow-md não conta: o script lê só strings.
import { cva } from "class-variance-authority";
import { cn } from "../lib/utils";

const button = cva("inline-flex rounded-none border font-semibold uppercase tracking-widest focus-visible:ring-2", {
  variants: {
    variant: {
      default: "bg-primary hover:bg-primary/80",
      outline: "border-2 shadow-xs",
    },
  },
});

const tones = {
  dark: { box: "bg-black/20 backdrop-blur-sm" },
};

export function Fixture({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg shadow-sm ring-1 ring-foreground/5 border-t outline-2 outline-offset-2",
        active && "ring-[3px] backdrop-blur-2xl",
        `font-bold ${active ? "tracking-wide" : "font-medium"}`,
      )}
    >
      <span className="*:[img:first-child]:rounded-none hover:shadow-md dark:bg-input/30 border-[3px] ring-0">
        texto rounded-xl uppercase em JSX não conta
      </span>
      {/* utilitários congelados e variantes style-* não contam */}
      <span className="rounded-control shadow-card style-glass:bg-card/60 style-soft:rounded-xl" />
      <span className={button({ variant: "outline" })} />
      <span className={tones.dark.box} />
    </div>
  );
}

// nome de variante "outline" em tipo, em atributo que não é de classe e em comparação não conta
type Variant = "outline" | "rounded-lg";

export function Extra({ variant }: { variant: Variant }) {
  return (
    <dl className="divide-y divide-border divide-border/50 focus-visible:outline outline" aria-label="rounded-lg">
      <Fixture active={variant === "outline"} variant="outline" />
    </dl>
  );
}
