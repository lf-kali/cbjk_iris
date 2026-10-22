import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importTheme, MAX_THEME_BYTES, writeThemeFile } from "../src/theme/import";

// ImportTheme (SPEC §5.6): o ex-theme:add, sem escrever. Só https:, CSS reconstruído só com variáveis
// permitidas em :root e .dark. O fetch é simulado: nenhum teste vai à internet.

type Reply = { status?: number; location?: string; body?: string | Uint8Array[] };
let replies: Record<string, Reply>;
let calls: string[];

function bodyStream(body: string | Uint8Array[]): ReadableStream<Uint8Array> {
  const chunks = typeof body === "string" ? [new TextEncoder().encode(body)] : body;
  return new ReadableStream({
    pull(controller) {
      const next = chunks.shift();
      if (next) controller.enqueue(next);
      else controller.close();
    },
  });
}

beforeEach(() => {
  replies = {};
  calls = [];
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    expect(init?.redirect).toBe("manual");
    const reply = replies[url];
    if (!reply) throw new TypeError("fetch failed");
    const headers = reply.location ? { location: reply.location } : undefined;
    return new Response(reply.body === undefined ? null : bodyStream(reply.body), { status: reply.status ?? 200, headers });
  });
});

afterEach(() => vi.unstubAllGlobals());

const TWEAKCN = "https://tweakcn.com/r/themes/ocean-breeze.json";
const registry = (light: Record<string, string>, dark: Record<string, string> = { background: "#000" }, theme: Record<string, string> = {}) =>
  JSON.stringify({ name: "x", cssVars: { theme, light: { background: "#fff", ...light }, dark } });

describe("importTheme: origem e rede", () => {
  it("tweakcn pelo nome: monta a URL https e devolve o CSS com :root e .dark", async () => {
    replies[TWEAKCN] = { body: registry({ primary: "oklch(0.6 0.1 250)" }, { background: "#000", primary: "#fff" }, { "font-sans": "DM Sans, sans-serif" }) };
    const { name, css } = await importTheme({ tweakcn: "ocean-breeze" });
    expect(name).toBe("ocean-breeze");
    expect(calls).toEqual([TWEAKCN]);
    expect(css).toContain(":root {\n  --font-sans: DM Sans, sans-serif;\n  --background: #fff;\n  --primary: oklch(0.6 0.1 250);\n}");
    expect(css).toContain(".dark {\n  --background: #000;\n  --primary: #fff;\n}");
    expect(css.startsWith("/* tema \"ocean-breeze\" importado de tweakcn.com */")).toBe(true);
  });

  it("shadcn pela cor: usa cssVarsV4 e põe a fonte padrão Geist", async () => {
    replies["https://ui.shadcn.com/r/colors/zinc.json"] = {
      body: JSON.stringify({ cssVarsV4: { light: { background: "oklch(1 0 0)" }, dark: { background: "oklch(0.1 0 0)" } } }),
    };
    const { name, css } = await importTheme({ shadcn: "zinc" });
    expect(name).toBe("zinc");
    expect(css).toContain("--font-sans: Geist, sans-serif;");
  });

  it("url de CSS colado: só :root e .dark sobrevivem; @import, url() e outras regras somem", async () => {
    replies["https://exemplo.com/temas/meu-tema.css"] = {
      body: `@import url("https://evil.example/x.css");
/* comentário */
:root { --background: #fff; --primary: url(https://evil.example/a.png); --card: red; --sidebar: image-set("x.png" 1x); }
.dark { --background: #000; --card: blue }
body { background: url(https://evil.example/b.png); }
@font-face { src: url(x.woff2); }`,
    };
    const { name, css } = await importTheme({ url: "https://exemplo.com/temas/meu-tema.css" });
    expect(name).toBe("meu-tema");
    expect(css).not.toMatch(/@import|url\(|image-set|evil|body|@font-face/);
    expect(css).toContain("--card: red;");
    expect(css).toContain("/* descartadas: --primary, --sidebar */");
  });

  it.each(["http://tweakcn.com/r/themes/x.json", "file:///etc/passwd", "data:text/css,:root{}", "javascript:alert(1)", "ftp://x.com/a.json"])(
    "recusa %s sem chamar o fetch",
    async (url) => {
      await expect(importTheme({ url })).rejects.toThrow(/só https/);
      expect(calls).toEqual([]);
    },
  );

  it("recusa URL com usuário e senha", async () => {
    await expect(importTheme({ url: "https://user:pass@exemplo.com/t.json" })).rejects.toThrow(/usuário/);
  });

  it("segue até 3 redirecionamentos https, revalidando cada um", async () => {
    replies["https://a.com/t.json"] = { status: 301, location: "https://b.com/t.json" };
    replies["https://b.com/t.json"] = { status: 302, location: "/c.json" };
    replies["https://b.com/c.json"] = { body: registry({}) };
    await expect(importTheme({ url: "https://a.com/t.json" })).resolves.toMatchObject({ name: "t" });
    expect(calls).toEqual(["https://a.com/t.json", "https://b.com/t.json", "https://b.com/c.json"]);
  });

  it("redirecionamento para http: é recusado sem seguir", async () => {
    replies["https://a.com/t.json"] = { status: 302, location: "http://a.com/t.json" };
    await expect(importTheme({ url: "https://a.com/t.json" })).rejects.toThrow(/só https/);
    expect(calls).toEqual(["https://a.com/t.json"]);
  });

  it("mais de 3 redirecionamentos: erro", async () => {
    for (let i = 0; i < 5; i++) replies[`https://a.com/${i}.json`] = { status: 302, location: `https://a.com/${i + 1}.json` };
    await expect(importTheme({ url: "https://a.com/0.json", }, "x")).rejects.toThrow(/redirecionamentos/);
    expect(calls).toHaveLength(4);
  });

  it("HTTP de erro: mensagem com o status, sem ecoar o corpo", async () => {
    replies[TWEAKCN] = { status: 404, body: "<script>segredo</script>" };
    const error = await importTheme({ tweakcn: "ocean-breeze" }).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/HTTP 404/);
    expect((error as Error).message).not.toMatch(/segredo|script/);
  });

  it(`corpo acima de ${MAX_THEME_BYTES / 1024} KiB: corta a leitura e recusa`, async () => {
    const chunk = new Uint8Array(64 * 1024).fill(32);
    let pulled = 0;
    const chunks = new Proxy([] as Uint8Array[], {
      get(target, prop) {
        if (prop === "shift") return () => (pulled++ < 1000 ? chunk : undefined);
        return Reflect.get(target, prop);
      },
    });
    replies[TWEAKCN] = { body: chunks };
    await expect(importTheme({ tweakcn: "ocean-breeze" })).rejects.toThrow(/256 KiB/);
    expect(pulled).toBeLessThan(10); // parou logo depois do limite, não leu os 64 MiB
  });

  it("JSON ou CSS sem :root/.dark com --background: erro, sem ecoar o conteúdo", async () => {
    replies[TWEAKCN] = { body: "<html>segredo</html>" };
    const error = await importTheme({ tweakcn: "ocean-breeze" }).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/background/);
    expect((error as Error).message).not.toMatch(/segredo|html/);
  });

  it("timeout no meio do corpo: a mesma mensagem em pt-BR, sem o texto cru em inglês", async () => {
    vi.stubGlobal("fetch", async () => {
      let sent = false;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!sent) {
            sent = true;
            controller.enqueue(new TextEncoder().encode(":root{"));
            return;
          }
          // o que o fetch do Node faz quando o AbortSignal.timeout dispara durante a leitura
          controller.error(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
        },
      });
      return new Response(body);
    });
    const error = await importTheme({ tweakcn: "ocean-breeze" }).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/15 s/);
    expect((error as Error).message).not.toMatch(/aborted/);
  });

  it.each([
    ["TypeError", new TypeError("terminated")],
    ["Error de socket", new Error("read ECONNRESET")],
    ["valor que não é Error", "boom"],
    ["undefined", undefined],
  ])("erro no meio do corpo (%s): mensagem de falha de rede em pt-BR, sem o erro cru", async (_label, reason) => {
    vi.stubGlobal("fetch", async () => {
      let sent = false;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!sent) {
            sent = true;
            controller.enqueue(new TextEncoder().encode(":root{"));
            return;
          }
          controller.error(reason);
        },
      });
      return new Response(body);
    });
    const error = await importTheme({ tweakcn: "ocean-breeze" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("não consegui baixar de tweakcn.com (falha de rede)");
  });

  it("timeout: usa um sinal de aborto", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });
    await expect(importTheme({ tweakcn: "ocean-breeze" })).rejects.toThrow(/15 s/);
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});

describe("importTheme: nomes e valores", () => {
  it.each(["../x", "a/b", "..", "X", ""])("recusa o nome %j (as) sem chamar o fetch", async (as) => {
    await expect(importTheme({ tweakcn: "ocean-breeze" }, as)).rejects.toThrow(/nome/i);
    expect(calls).toEqual([]);
  });

  it.each(["con", "prn", "aux", "nul", "com1", "com9", "lpt1", "lpt9"])("recusa o nome reservado do Windows %s", async (as) => {
    await expect(importTheme({ tweakcn: "ocean-breeze" }, as)).rejects.toThrow(/reservado/);
    await expect(importTheme({ tweakcn: as })).rejects.toThrow(/reservado/);
    expect(calls).toEqual([]);
  });

  it("nomes parecidos com os reservados continuam aceitos (con-x, com10, console)", async () => {
    replies[TWEAKCN] = { body: registry({}) };
    for (const as of ["con-x", "com10", "console", "lpt"]) await expect(importTheme({ tweakcn: "ocean-breeze" }, as)).resolves.toMatchObject({ name: as });
  });

  it("recusa nome de tweakcn ou shadcn com .. ou /", async () => {
    await expect(importTheme({ tweakcn: "../../evil" })).rejects.toThrow(/nome/i);
    await expect(importTheme({ shadcn: "a/b" })).rejects.toThrow(/nome/i);
    expect(calls).toEqual([]);
  });

  it.each([`a${" ".repeat(398)}!`, `${"a ,".repeat(133)}!`, `${"a, ".repeat(133)}!`, `${"-".repeat(399)}!`])(
    "valor de fonte malicioso é decidido rápido (sem backtracking): %#",
    async (font) => {
      replies[TWEAKCN] = { body: registry({ "font-sans": font }) };
      const started = performance.now();
      const { css } = await importTheme({ tweakcn: "ocean-breeze" });
      expect(performance.now() - started).toBeLessThan(100);
      expect(css).toContain("/* descartadas: --font-sans */");
    },
  );

  it("CSS com declaração cheia de espaços (perto do limite) é lido rápido", async () => {
    replies["https://exemplo.com/t.css"] = { body: `:root { --background: #fff; --card: a${" ".repeat(200_000)}b; }\n.dark { --background: #000; }` };
    const started = performance.now();
    const { css } = await importTheme({ url: "https://exemplo.com/t.css" });
    expect(performance.now() - started).toBeLessThan(200);
    expect(css).toContain("/* descartadas: --card */");
  });

  it("CSS com milhares de :root { sem fechar é recusado rápido", async () => {
    replies["https://exemplo.com/t.css"] = { body: " :root {".repeat(30_000) + " .dark {".repeat(2_000) };
    const started = performance.now();
    await expect(importTheme({ url: "https://exemplo.com/t.css" })).rejects.toThrow(/background/);
    expect(performance.now() - started).toBeLessThan(200);
  });

  it("exatamente uma origem", async () => {
    await expect(importTheme({ tweakcn: "a", url: "https://a.com/x.json" } as never)).rejects.toThrow(/uma origem/);
  });

  it("descarta variável fora da lista permitida, nome inválido e valor que não passa no cssValue", async () => {
    replies[TWEAKCN] = {
      body: registry({
        primary: "red; } body { color: red",
        card: "var(--x)",
        "nao-permitida": "red",
        "BAD NAME": "red",
        "font-sans": "'Segoe UI', \"Noto Sans\", sans-serif",
        "font-mono": "x\"; } :root { --a: b",
        radius: "0.5rem",
        "iris-style": "glass",
        "shadow-sm": "0 1px 2px 0 hsl(0 0% 0% / 0.05)",
        accent: "expression(alert(1))",
      }),
    };
    const { css } = await importTheme({ tweakcn: "ocean-breeze" });
    expect(css).toContain("--card: var(--x);");
    expect(css).toContain("--font-sans: 'Segoe UI', \"Noto Sans\", sans-serif;");
    expect(css).toContain("--radius: 0.5rem;");
    expect(css).toContain("--iris-style: glass;");
    expect(css).toContain("--shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.05);");
    // fora do comentário de descartadas, nenhum rastro do que foi recusado
    expect(css.replace(/\/\*[^*]*\*\//g, "")).not.toMatch(/body|nao-permitida|BAD|expression|:root \{ --a|--accent|--primary/);
    expect(css).toContain("/* descartadas: --accent, --font-mono, --nao-permitida, --primary; e 1 com nome inválido */");
  });
});

describe("importTheme: temas embutidos como referência", () => {
  const dir = fileURLToPath(new URL("../themes/", import.meta.url));
  it.each(readdirSync(dir))("%s, servido como CSS, passa sem nenhuma variável descartada", async (file) => {
    replies[`https://exemplo.com/${file}`] = { body: readFileSync(path.join(dir, file), "utf8") };
    const { css } = await importTheme({ url: `https://exemplo.com/${file}` });
    expect(css).not.toMatch(/descartadas/);
  });
});

describe("writeThemeFile", () => {
  let root: string;
  let outside: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "iris-theme-write-"));
    outside = mkdtempSync(path.join(os.tmpdir(), "iris-theme-fora-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it("cria themes/<nome>.css (e a pasta) e não sobrescreve sem force", () => {
    expect(writeThemeFile(root, "meu", ":root{}\n")).toEqual({ path: "themes/meu.css", action: "create" });
    expect(readFileSync(path.join(root, "themes/meu.css"), "utf8")).toBe(":root{}\n");
    expect(() => writeThemeFile(root, "meu", "x")).toThrow(/já existe/);
    expect(writeThemeFile(root, "meu", "y", { force: true })).toEqual({ path: "themes/meu.css", action: "update" });
  });

  it("recusa nome com .. ou /", () => {
    expect(() => writeThemeFile(root, "../x", "x")).toThrow(/nome/i);
    expect(() => writeThemeFile(root, "con", "x")).toThrow(/reservado/);
    expect(() => writeThemeFile(root, "LPT1" as string, "x")).toThrow(/nome|reservado/i);
    expect(() => writeThemeFile(root, "a/b", "x")).toThrow(/nome/i);
    expect(existsSync(path.join(root, "x.css"))).toBe(false);
  });

  it.runIf(process.platform !== "win32")("themes/ ou o arquivo como link simbólico: recusa, nada escrito fora", () => {
    symlinkSync(outside, path.join(root, "themes"));
    expect(() => writeThemeFile(root, "meu", "x")).toThrow(/link simbólico/);
    expect(existsSync(path.join(outside, "meu.css"))).toBe(false);
    rmSync(path.join(root, "themes"));
    mkdirSync(path.join(root, "themes"));
    writeFileSync(path.join(outside, "alvo.css"), "original");
    symlinkSync(path.join(outside, "alvo.css"), path.join(root, "themes/meu.css"));
    expect(() => writeThemeFile(root, "meu", "x", { force: true })).toThrow(/link simbólico/);
    expect(readFileSync(path.join(outside, "alvo.css"), "utf8")).toBe("original");
  });
});
