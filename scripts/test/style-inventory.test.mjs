import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FAMILIES,
  classify,
  evaluate,
  main,
  scanDir,
  scanSource,
} from "../style-inventory.mjs";

// Teste de scripts/style-inventory.mjs (SPEC §5.4, passos 1 a 3).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FIXTURE = path.join(HERE, "fixtures/style-inventory/src");
const SPEC = readFileSync(path.join(ROOT, "docs/spec/SPEC.md"), "utf8");
const INVENTORY = JSON.parse(readFileSync(path.join(ROOT, "docs/spec/style-inventory.json"), "utf8"));

const UTILS = ["rounded-control", "shadow-card", "surface-card", "ring-focus"];

// roda o main com saída capturada
function run(argv) {
  const out = [];
  const code = main(argv, { cwd: ROOT, log: (line) => out.push(line) });
  return { code, out: out.join("\n") };
}

describe("classify", () => {
  it.each([
    ["rounded-none", "rounded"],
    ["rounded", "rounded"],
    ["rounded-t-lg", "rounded"],
    ["shadow-md", "shadow"],
    ["backdrop-blur", "blur"],
    ["backdrop-blur-2xl", "blur"],
    ["blur-sm", "blur"],
    ["ring-1", "ring"],
    ["ring", "ring"],
    ["ring-[3px]", "ring"],
    ["ring-offset-2", "ring"],
    ["ring-foreground/5", "ring"],
    ["border", "border"],
    ["border-t", "border"],
    ["border-2", "border"],
    ["border-x-0", "border"],
    ["border-[3px]", "border"],
    ["outline-2", "outline"],
    ["outline-offset-2", "outline"],
    ["outline", "outline"],
    ["outline-ring/50", "outline"],
    ["divide-y", "divide"],
    ["divide-x-2", "divide"],
    ["divide-border/50", "divide"],
    ["uppercase", "case"],
    ["tracking-widest", "tracking"],
    ["tracking-[0.2em]", "tracking"],
    ["font-medium", "weight"],
    ["font-semibold", "weight"],
    ["font-bold", "weight"],
    ["bg-black/20", "bg-alpha"],
    ["bg-background/86", "bg-alpha"],
  ])("%s é da família %s", (cls, family) => {
    expect(classify(cls, []).family).toBe(family);
  });

  it.each([
    "transition-shadow",
    "border-border",
    "border-transparent",
    "border-white/70",
    "ring-ring",
    "outline-none",
    "outline-ring",
    "divide-border",
    "font-heading",
    "font-sans",
    "bg-card",
    "bg-primary",
    "text-xs",
    "rounded-control",
    "shadow-card",
  ])("%s não é ocorrência", (cls) => {
    expect(classify(cls, UTILS)).toBeNull();
  });

  it("tira os prefixos de variante, inclusive com colchetes", () => {
    expect(classify("*:[img:first-child]:rounded-none", []).base).toBe("rounded-none");
    expect(classify("data-[side=bottom]:border-t", []).base).toBe("border-t");
    expect(classify("supports-backdrop-filter:backdrop-blur-sm", []).base).toBe("backdrop-blur-sm");
    expect(classify("hover:!shadow-md", []).base).toBe("shadow-md");
  });

  it("variante style-<id> é o mecanismo permitido e não conta", () => {
    expect(classify("style-glass:bg-card/60", [])).toBeNull();
    expect(classify("dark:style-soft:rounded-xl", [])).toBeNull();
  });

  it("utilitário congelado não conta, com ou sem variante", () => {
    expect(classify("hover:shadow-card", UTILS)).toBeNull();
    expect(classify("focus-visible:ring-focus", UTILS)).toBeNull();
  });
});

describe("scanSource e scanDir (fixture com cada padrão)", () => {
  const occ = scanDir(FIXTURE, UTILS);
  const byClass = (cls) => occ.filter((o) => o.class === cls);

  it("acha as 36 ocorrências da fixture, com arquivo e linha", () => {
    expect(occ).toHaveLength(36);
    expect(byClass("rounded-none")[0]).toMatchObject({ file: "ui/Fixture.tsx", line: 6, family: "rounded" });
    expect(byClass("rounded-md")[0]).toMatchObject({ file: "extra.css", line: 3 });
  });

  it("cobre todas as famílias do §5.4 passo 1", () => {
    expect(new Set(occ.map((o) => o.family))).toEqual(new Set([...Object.keys(FAMILIES), "inline-style"]));
  });

  it("lê base e variantes do cva, objetos e argumentos do cn()", () => {
    expect(byClass("hover:bg-primary/80")[0].line).toBe(9);
    expect(byClass("border-2")[0].line).toBe(10);
    expect(byClass("backdrop-blur-sm")[0].line).toBe(16);
    expect(byClass("ring-[3px]")[0].line).toBe(24);
  });

  it("lê as partes de template literal", () => {
    expect(byClass("font-bold")[0].line).toBe(25);
    expect(byClass("tracking-wide")[0].line).toBe(25);
    expect(byClass("font-medium")[0].line).toBe(25);
  });

  it("ignora comentário, texto de JSX, congelados e style-*", () => {
    expect(byClass("rounded-lg")).toHaveLength(1);
    expect(byClass("shadow-md")).toHaveLength(0);
    expect(byClass("hover:shadow-md")).toHaveLength(1);
    expect(byClass("rounded-xl")).toHaveLength(0);
    expect(byClass("uppercase")).toHaveLength(1);
  });

  it("lê divide-* e outline sem número em lista de classes", () => {
    expect(byClass("divide-y")[0]).toMatchObject({ line: 44, family: "divide" });
    expect(byClass("divide-border/50")[0]).toMatchObject({ line: 44, family: "divide" });
    expect(byClass("divide-border")).toHaveLength(0);
    expect(byClass("focus-visible:outline")[0]).toMatchObject({ line: 44, family: "outline" });
    expect(byClass("outline").map((o) => o.line)).toEqual([44]);
  });

  it('não conta o nome de variante "outline" fora de lista de classes', () => {
    const src = [
      'type V = "outline" | "rounded-lg";',
      'const a = <Button variant="outline" aria-label="rounded-lg" />;',
      'const b = button({ variant: "outline", size: "rounded-lg" });',
      'const c = v === "outline" ? 1 : 2;',
      'switch (v) { case "outline": break; }',
      'const d = <X render={<div className="outline rounded-lg" />} variant={ok ? "outline" : "ghost"} />;',
      'const e = { outline: "outline-2 shadow-xs" };',
    ].join("\n");
    const found = scanSource(src, "v.tsx", []).map((o) => [o.class, o.line]);
    expect(found).toEqual([
      ["outline", 6],
      ["rounded-lg", 6],
      ["outline-2", 7],
      ["shadow-xs", 7],
    ]);
  });

  it("variant, size e atributo sem class: só a palavra única é descartada; lista de classes é lida", () => {
    const src = [
      'const a = button({ variant: "outline", size: "rounded-lg h-9" });',
      'const b = <X tw="rounded-lg h-9" aria-label="Fechar menu" title="shadow-md" />;',
    ].join("\n");
    const found = scanSource(src, "w.tsx", []).map((o) => [o.class, o.line]);
    expect(found).toEqual([
      ["rounded-lg", 1],
      ["rounded-lg", 2],
    ]);
  });

  it("propriedade arbitrária de forma entre colchetes é ocorrência; variável CSS e outras propriedades não", () => {
    expect(classify("[border-radius:4px]", [])).toMatchObject({ family: "arbitrary" });
    expect(classify("hover:[box-shadow:0_0_0_1px_red]", [])).toMatchObject({ family: "arbitrary" });
    for (const cls of ["[backdrop-filter:blur(4px)]", "[text-transform:uppercase]", "[letter-spacing:1px]", "[font-weight:600]", "[border-top-width:2px]", "[outline:2px_solid]"]) {
      expect(classify(cls, []), cls).toMatchObject({ family: "arbitrary" });
    }
    for (const cls of ["[--card-spacing:--spacing(8)]", "[-webkit-touch-callout:none]", "[mask-type:alpha]"]) {
      expect(classify(cls, []), cls).toBeNull();
    }
    expect(byClass("[border-radius:4px]")[0]).toMatchObject({ file: "ui/Fixture.tsx", line: 52, family: "arbitrary" });
  });

  it("estilo inline com propriedade de forma é ocorrência (style:<prop>)", () => {
    expect(byClass("style:boxShadow")[0]).toMatchObject({ file: "ui/Fixture.tsx", line: 52, family: "inline-style" });
    expect(byClass("style:maxWidth")).toHaveLength(0);
    const src = 'const a = <div style={{ borderRadius: 4, textTransform: "uppercase", "letterSpacing": 1, padding: 2 }} />;';
    expect(scanSource(src, "s.tsx", []).map((o) => o.class)).toEqual(["style:borderRadius", "style:textTransform", "style:letterSpacing"]);
  });

  it("acha a linha certa em string de várias linhas", () => {
    const src = 'const a = `p-2\n  rounded-lg\n  shadow-sm`;\n';
    const found = scanSource(src, "x.ts", []);
    expect(found.map((o) => [o.class, o.line])).toEqual([
      ["rounded-lg", 2],
      ["shadow-sm", 3],
    ]);
  });

  it("guarda o texto da linha, para o campo near", () => {
    expect(byClass("border-[3px]")[0].lineText).toContain("*:[img:first-child]");
  });
});

describe("evaluate", () => {
  const occ = scanSource('const a = "rounded-none shadow-md";\nconst b = "rounded-none";\n', "a.ts", []);
  const base = {
    utilities: ["rounded-control", "rounded-card", "shadow-overlay"],
    exceptions: { foto: "texto branco sobre foto" },
  };

  it("sem destino é falta", () => {
    const r = evaluate(occ, { ...base, occurrences: [] });
    expect(r.missing).toHaveLength(3);
  });

  it("near separa a mesma classe no mesmo arquivo", () => {
    const r = evaluate(occ, {
      ...base,
      occurrences: [
        { file: "a.ts", class: "rounded-none", near: "const a", count: 1, to: "rounded-control" },
        { file: "a.ts", class: "rounded-none", near: "const b", count: 1, to: "rounded-card" },
        { file: "a.ts", class: "shadow-md", count: 1, to: "exception:foto" },
      ],
    });
    expect(r.missing).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(r.resolved.map((x) => x.to)).toEqual(["rounded-control", "exception:foto", "rounded-card"]);
    expect(r.pending.map((x) => x.class)).toEqual(["rounded-none", "rounded-none"]);
  });

  it("near que casa com duas entradas é erro", () => {
    const r = evaluate(occ, {
      ...base,
      occurrences: [
        { file: "a.ts", class: "rounded-none", near: "const", count: 2, to: "rounded-control" },
        { file: "a.ts", class: "rounded-none", near: "rounded", count: 2, to: "rounded-card" },
        { file: "a.ts", class: "shadow-md", count: 1, to: "shadow-overlay" },
      ],
    });
    expect(r.errors.join("\n")).toMatch(/ambígua/);
  });

  it("mais ocorrências que o count é falta", () => {
    const r = evaluate(occ, {
      ...base,
      occurrences: [
        { file: "a.ts", class: "rounded-none", count: 1, to: "rounded-control" },
        { file: "a.ts", class: "shadow-md", count: 1, to: "shadow-overlay" },
      ],
    });
    expect(r.missing.map((x) => x.line)).toEqual([2]);
  });

  it("destino que não é utilitário nem exceção conhecida é erro", () => {
    const r = evaluate(occ, {
      ...base,
      occurrences: [
        { file: "a.ts", class: "rounded-none", count: 2, to: "rounded-surface" },
        { file: "a.ts", class: "shadow-md", count: 1, to: "exception:nada" },
      ],
    });
    expect(r.errors.join("\n")).toMatch(/rounded-surface/);
    expect(r.errors.join("\n")).toMatch(/exception:nada/);
  });

  it("entrada sem ocorrência sai em stale (o main falha com ela)", () => {
    const r = evaluate([], {
      ...base,
      occurrences: [{ file: "a.ts", class: "shadow-md", count: 1, to: "shadow-overlay" }],
    });
    expect(r.errors).toEqual([]);
    expect(r.stale).toHaveLength(1);
  });
});

describe("main", () => {
  it("modo padrão lista arquivo, linha, classe e destino, e sai com 0", () => {
    const { code, out } = run([]);
    expect(code).toBe(0);
    expect(out).toMatch(/ui\/button\.tsx:\d+ +rounded-none +→ rounded-control/);
  });

  it("--check passa no repositório: toda ocorrência do core tem destino", () => {
    const { code, out } = run(["--check"]);
    expect(out).not.toMatch(/SEM DESTINO|ERRO/);
    expect(code).toBe(0);
  });

  it("--check falha com a fixture e um inventário vazio", () => {
    const { code, out } = run(["--check", "--src", FIXTURE, "--inventory", path.join(HERE, "fixtures/style-inventory/empty.json")]);
    expect(code).toBe(1);
    expect(out).toMatch(/SEM DESTINO/);
  });

  it("--after lista o que o iris-theme vai trocar e falha enquanto sobrar alguma", () => {
    const { code, out } = run(["--after"]);
    expect(code).toBe(1);
    expect(out).toMatch(/→ rounded-control/);
    expect(out).not.toMatch(/→ exception:/);
  });

  it("--after passa quando só sobram exceções", () => {
    const { code } = run([
      "--after",
      "--src",
      path.join(HERE, "fixtures/style-inventory/only-exceptions"),
      "--inventory",
      path.join(HERE, "fixtures/style-inventory/only-exceptions.json"),
    ]);
    expect(code).toBe(0);
  });

  it.each(["--check", "--after"])("%s falha com entrada obsoleta no JSON", (mode) => {
    const { code, out } = run([
      mode,
      "--src",
      path.join(HERE, "fixtures/style-inventory/only-exceptions"),
      "--inventory",
      path.join(HERE, "fixtures/style-inventory/stale.json"),
    ]);
    expect(code).toBe(1);
    expect(out).toMatch(/OBSOLETA: Avatar\.tsx shadow-md: esperado 1, achado 0/);
  });

  it("opção desconhecida sai com 2", () => {
    expect(run(["--nada"]).code).toBe(2);
  });
});

describe("docs/spec/style-inventory.json bate com a spec", () => {
  // tabela "Utilitários congelados" do §5.4: primeira coluna
  const start = SPEC.indexOf("**Utilitários congelados**");
  const section = SPEC.slice(start, SPEC.indexOf("\n\n**", start + 1));
  const specUtils = [...section.matchAll(/^\| (.+?) \|/gm)]
    .flatMap((m) => [...m[1].matchAll(/`([^`]+)`/g)].map((x) => x[1]))
    .sort();

  it("utilities é a tabela de utilitários congelados do §5.4", () => {
    expect(specUtils.length).toBeGreaterThan(15);
    expect([...INVENTORY.utilities].sort()).toEqual(specUtils);
  });

  it("cada exceção do JSON aparece nas exceções permitidas do §5.4", () => {
    const allowed = SPEC.slice(SPEC.indexOf("**Exceções permitidas**"), SPEC.indexOf("**Ordem das camadas**"));
    for (const id of Object.keys(INVENTORY.exceptions)) expect(allowed).toContain(`\`exception:${id}\``);
  });
});
