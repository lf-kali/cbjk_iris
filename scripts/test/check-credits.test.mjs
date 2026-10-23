import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, PHOTO_DIRS, checkCredits, parsePhotoCredits } from "../lib/credits-check.mjs";

// SPEC §6.1, "Pronto quando": toda foto de exemplo tem crédito no CREDITS.md, toda linha da seção
// de fotos aponta para um arquivo que existe, e nenhum arquivo passa de 300 KB.

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(REPO, "scripts/check-credits.mjs");

let root;
beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-credits-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(rel, content = "x") {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const row = (file, extra = "Título | Autor | https://commons.wikimedia.org/wiki/File:X.jpg | CC0") => `| \`${file}\` | ${extra} |`;

function credits(rows, { after = "## Temas\n\n| `apps/site/public/logo.svg` | fora da conferência |\n" } = {}) {
  return [
    "# Créditos",
    "",
    "## Fotos",
    "",
    "| Arquivo | Título | Autor | Página | Licença |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    after,
  ].join("\n");
}

describe("parsePhotoCredits", () => {
  it("lê só as linhas da seção ## Fotos, sem cabeçalho nem separador", () => {
    const { files, problems } = parsePhotoCredits(credits([row("apps/site/public/home/a.jpg"), row("apps/site/public/products/b.jpg")]));
    expect(files).toEqual(["apps/site/public/home/a.jpg", "apps/site/public/products/b.jpg"]);
    expect(problems).toEqual([]);
  });

  it("sem a seção ## Fotos é problema", () => {
    expect(parsePhotoCredits("# Créditos\n\n## Temas\n").problems).toEqual([expect.stringMatching(/seção "## Fotos"/)]);
  });

  it("linha da tabela sem caminho entre crases é problema", () => {
    const { problems } = parsePhotoCredits(credits(["| home/a.jpg | T | A | P | CC0 |"]));
    expect(problems).toEqual([expect.stringMatching(/linha 7: .*caminho/)]);
  });

  it("linha com célula vazia (título, autor, página ou licença) é problema", () => {
    const { problems } = parsePhotoCredits(credits([row("apps/site/public/home/a.jpg", "T |  | P | CC0")]));
    expect(problems).toEqual([expect.stringMatching(/linha 7: .*5 colunas preenchidas/)]);
  });

  it("linha com 4 ou com 6 colunas, todas preenchidas, é problema", () => {
    const four = parsePhotoCredits(credits([row("apps/site/public/home/a.jpg", "T | A | P")]));
    expect(four.problems).toEqual([expect.stringMatching(/linha 7: .*5 colunas preenchidas/)]);
    const six = parsePhotoCredits(credits([row("apps/site/public/home/a.jpg", "T | A | P | CC0 | extra")]));
    expect(six.problems).toEqual([expect.stringMatching(/linha 7: .*5 colunas preenchidas/)]);
  });

  it("linha repetida é problema", () => {
    const { problems } = parsePhotoCredits(credits([row("apps/site/public/home/a.jpg"), row("apps/site/public/home/a.jpg")]));
    expect(problems).toEqual([expect.stringMatching(/linha 8: .*repetid/)]);
  });
});

describe("checkCredits", () => {
  function setup(rows, files) {
    write("CREDITS.md", credits(rows));
    for (const f of files) write(f);
  }

  it("cada foto com crédito e cada crédito com arquivo: sem problema", () => {
    const files = PHOTO_DIRS.map((d) => `${d}/a.jpg`);
    setup(files.map((f) => row(f)), files);
    expect(checkCredits(root)).toEqual({ photos: 4, credits: 4, problems: [] });
  });

  it("foto sem crédito é problema, em qualquer uma das 4 pastas e em subpasta", () => {
    setup([], ["apps/site/public/ultimos_projetos/x/b.webp", "apps/site/public/services/c.PNG"]);
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(/apps\/site\/public\/services\/c\.PNG: sem crédito/),
      expect.stringMatching(/apps\/site\/public\/ultimos_projetos\/x\/b\.webp: sem crédito/),
    ]);
  });

  it("arquivo oculto também precisa de crédito e respeita o limite de tamanho", () => {
    setup([], []);
    write("apps/site/public/home/.hidden.jpg", Buffer.alloc(900 * 1024));
    const { photos, problems } = checkCredits(root);
    expect(photos).toBe(1);
    expect(problems).toEqual([
      expect.stringMatching(/\.hidden\.jpg: 921600 bytes, acima do limite de 307200 bytes \(300 KB\)/),
      expect.stringMatching(/\.hidden\.jpg: sem crédito/),
    ]);
  });

  it("só o .gitkeep dispensa crédito", () => {
    setup([], ["apps/site/public/home/.gitkeep", "apps/site/public/products/sub/.gitkeep"]);
    expect(checkCredits(root)).toEqual({ photos: 0, credits: 0, problems: [] });
  });

  it.each(["heic", "bmp", "tif", "ico", "txt"])("arquivo .%s nas pastas de fotos precisa de crédito e é recusado por não ser imagem", (ext) => {
    setup([], [`apps/site/public/products/x.${ext}`]);
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(new RegExp(`x\\.${ext}: não é imagem`)),
      expect.stringMatching(new RegExp(`x\\.${ext}: sem crédito`)),
    ]);
  });

  it("crédito que aponta para uma pasta é problema", () => {
    setup([row("apps/site/public/home/pasta")], []);
    mkdirSync(path.join(root, "apps/site/public/home/pasta"), { recursive: true });
    expect(checkCredits(root).problems).toEqual([expect.stringMatching(/home\/pasta: está no CREDITS\.md, mas não é um arquivo comum/)]);
  });

  it("crédito que aponta para um arquivo que não é imagem é problema", () => {
    setup([row("apps/site/public/home/leia.txt")], ["apps/site/public/home/leia.txt"]);
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(/leia\.txt: não é imagem/),
      expect.stringMatching(/leia\.txt: está no CREDITS\.md, mas não é imagem/),
    ]);
  });

  it("crédito de arquivo que não existe é problema", () => {
    setup([row("apps/site/public/home/sumiu.jpg")], []);
    expect(checkCredits(root).problems).toEqual([expect.stringMatching(/apps\/site\/public\/home\/sumiu\.jpg: .*não existe/)]);
  });

  it("crédito fora das 4 pastas (ou com ..) é problema, mesmo que o arquivo exista", () => {
    setup([row("apps/site/public/logo.svg"), row("apps/site/public/home/../logo.svg")], ["apps/site/public/logo.svg"]);
    const { problems } = checkCredits(root);
    expect(problems).toHaveLength(2);
    for (const p of problems) expect(p).toMatch(/fora das pastas de fotos/);
  });

  it("crédito com .. ou . que volta para dentro das pastas é problema (caminho não normalizado)", () => {
    setup([row("apps/site/public/home/a.jpg"), row("apps/site/public/home/../home/a.jpg"), row("apps/site/public/home/./a.jpg")], ["apps/site/public/home/a.jpg"]);
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(/home\/\.\.\/home\/a\.jpg: fora das pastas de fotos/),
      expect.stringMatching(/home\/\.\/a\.jpg: fora das pastas de fotos/),
    ]);
  });

  it("pasta vizinha com o mesmo prefixo (home-antiga) não conta como pasta de fotos", () => {
    setup([row("apps/site/public/home-antiga/a.jpg")], ["apps/site/public/home-antiga/a.jpg"]);
    expect(checkCredits(root).problems).toEqual([expect.stringMatching(/home-antiga\/a\.jpg: fora das pastas de fotos/)]);
  });

  it("arquivo acima de 300 KB é problema, com o tamanho em bytes; exatamente 300 KB passa", () => {
    setup([row("apps/site/public/home/grande.jpg"), row("apps/site/public/home/limite.jpg")], []);
    write("apps/site/public/home/grande.jpg", Buffer.alloc(MAX_PHOTO_BYTES + 1));
    write("apps/site/public/home/limite.jpg", Buffer.alloc(MAX_PHOTO_BYTES));
    expect(checkCredits(root).problems).toEqual([expect.stringMatching(/grande\.jpg: 307201 bytes, acima do limite de 307200 bytes/)]);
  });

  it("link simbólico para arquivo nas pastas de fotos é problema", () => {
    setup([row("apps/site/public/home/a.jpg")], ["fora.jpg"]);
    mkdirSync(path.join(root, "apps/site/public/home"), { recursive: true });
    symlinkSync(path.join(root, "fora.jpg"), path.join(root, "apps/site/public/home/a.jpg"));
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(/a\.jpg: link simbólico/),
      expect.stringMatching(/a\.jpg: o caminho passa por link simbólico/),
    ]);
  });

  it("subpasta que é link simbólico não é seguida e é problema", () => {
    setup([row("apps/site/public/home/sub/a.jpg")], ["fora/a.jpg"]);
    mkdirSync(path.join(root, "apps/site/public/home"), { recursive: true });
    symlinkSync(path.join(root, "fora"), path.join(root, "apps/site/public/home/sub"));
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(/home\/sub: link simbólico/),
      expect.stringMatching(/home\/sub: sem crédito/),
      expect.stringMatching(/home\/sub\/a\.jpg: o caminho passa por link simbólico/),
    ]);
  });

  it("pasta de fotos que é link simbólico é recusada, sem ler o que tem dentro", () => {
    setup([], ["fora/grande.jpg"]);
    write("fora/grande.jpg", Buffer.alloc(MAX_PHOTO_BYTES + 1));
    mkdirSync(path.join(root, "apps/site/public"), { recursive: true });
    symlinkSync(path.join(root, "fora"), path.join(root, "apps/site/public/products"));
    expect(checkCredits(root)).toEqual({ photos: 0, credits: 0, problems: [expect.stringMatching(/apps\/site\/public\/products: a pasta \(ou uma pasta acima\) é link simbólico/)] });
  });

  it("pasta acima das fotos (apps/site/public) como link também é recusada", () => {
    setup([], ["outro/home/a.jpg"]);
    mkdirSync(path.join(root, "apps/site"), { recursive: true });
    symlinkSync(path.join(root, "outro"), path.join(root, "apps/site/public"));
    expect(checkCredits(root).problems).toEqual([expect.stringMatching(/apps\/site\/public\/home: a pasta \(ou uma pasta acima\) é link simbólico/)]);
  });

  it.runIf(process.platform !== "win32")("FIFO nas pastas de fotos é problema (não é arquivo comum)", () => {
    setup([], []);
    mkdirSync(path.join(root, "apps/site/public/home"), { recursive: true });
    execFileSync("mkfifo", [path.join(root, "apps/site/public/home/cano.jpg")]);
    expect(checkCredits(root).problems).toEqual([
      expect.stringMatching(/cano\.jpg: não é um arquivo comum/),
      expect.stringMatching(/cano\.jpg: sem crédito/),
    ]);
  });

  it("pasta de fotos ausente conta como vazia (módulo desligado)", () => {
    setup([row("apps/site/public/home/a.jpg")], ["apps/site/public/home/a.jpg"]);
    expect(checkCredits(root)).toEqual({ photos: 1, credits: 1, problems: [] });
  });

  it("sem CREDITS.md é problema", () => {
    expect(checkCredits(root).problems).toEqual([expect.stringMatching(/CREDITS\.md não encontrado/)]);
  });
});

describe("node scripts/check-credits.mjs", () => {
  it("no repositório: sai com 0", () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/check-credits: \d+ foto\(s\), \d+ crédito\(s\), tudo certo\./);
  });

  it("com problema: sai com 1 e lista no stderr", () => {
    write("CREDITS.md", credits([]));
    write("apps/site/public/home/a.jpg");
    const r = spawnSync(process.execPath, [CLI, root], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/apps\/site\/public\/home\/a\.jpg: sem crédito/);
  });
});
