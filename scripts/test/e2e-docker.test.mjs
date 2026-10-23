import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CACHE_DIR, DOCKER_OUTPUT_DIR, LIMITS, PINNED_IMAGE, dockerArgs, ensureRealDirs, hostUser, imageFor, prepareRun, writableDirs } from "../lib/e2e-docker.mjs";

// Pendência do E2 (security-reviewer), resolvida na E8: repositório só para leitura, gravação só nas
// pastas de saída (sem link no caminho), cache em tmpfs, sem capacidades, sem novos privilégios, sem
// rede, com limites e imagem fixada por digest.

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(REPO, "package.json"));
const INSTALLED = require("@playwright/test/package.json").version;
const LINUX = { platform: "linux", getuid: () => 1234, getgid: () => 5678 };

let root;
let outside;
beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-e2e-docker-"));
  outside = mkdtempSync(path.join(os.tmpdir(), "iris-e2e-docker-fora-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

/** Valores das opções repetidas (ex.: todos os --mount). */
const values = (args, flag) => args.flatMap((a, i) => (args[i - 1] === flag ? [a] : []));

describe("imageFor", () => {
  it("a imagem fixada é a da versão instalada do @playwright/test", () => {
    expect(PINNED_IMAGE.version).toBe(INSTALLED);
    expect(imageFor(INSTALLED)).toBe(`mcr.microsoft.com/playwright:v${INSTALLED}-noble@${PINNED_IMAGE.digest}`);
  });

  it("versão instalada diferente da fixada é erro, com o que fazer", () => {
    expect(() => imageFor("9.9.9")).toThrow(/instalado é 9\.9\.9.*fixada.*1\.64\.1.*Atualize PINNED_IMAGE/);
  });

  it("digest malformado é erro", () => {
    expect(() => imageFor("1.0.0", { version: "1.0.0", digest: "sha256:abc" })).toThrow(/Digest inválido/);
    expect(() => imageFor("1.0.0", { version: "1.0.0", digest: `md5:${"a".repeat(64)}` })).toThrow(/Digest inválido/);
  });
});

describe("writableDirs", () => {
  it("test-results e um __screenshots__ por pasta de e2e (sem ocultas nem arquivos); o cache não entra", () => {
    for (const d of ["baseline", "theme", ".tmp"]) mkdirSync(path.join(root, "apps/site/e2e", d), { recursive: true });
    writeFileSync(path.join(root, "apps/site/e2e/README.md"), "x");
    expect(writableDirs(root)).toEqual(["apps/site/test-results", "apps/site/e2e/baseline/__screenshots__", "apps/site/e2e/theme/__screenshots__"]);
  });

  it("sem apps/site/e2e: só test-results", () => {
    expect(writableDirs(root)).toEqual(["apps/site/test-results"]);
  });
});

describe("hostUser", () => {
  it("lê uid e gid do processo", () => {
    expect(hostUser(LINUX)).toEqual({ uid: 1234, gid: 5678 });
  });

  it("no Windows nativo, sem getuid: falha fechado, mandando usar o WSL2", () => {
    expect(() => hostUser({ platform: "win32" })).toThrow(/não roda no Windows nativo.*WSL2/);
  });

  it("fora do Windows, sem getuid é erro (o container gravaria como root)", () => {
    expect(() => hostUser({ platform: "linux" })).toThrow(/uid e o gid/);
  });

  it("padrão: o process atual", () => {
    if (process.platform === "win32") expect(() => hostUser()).toThrow(/WSL2/);
    else expect(hostUser()).toEqual({ uid: process.getuid(), gid: process.getgid() });
  });
});

describe("ensureRealDirs", () => {
  it("cria as pastas que faltam e devolve a raiz real", () => {
    const real = ensureRealDirs(root, ["a/b/c", "d"]);
    expect(lstatSync(path.join(root, "a/b/c")).isDirectory()).toBe(true);
    expect(lstatSync(path.join(root, "d")).isDirectory()).toBe(true);
    expect(real).toBe(path.resolve(real));
  });

  it("a pasta final como link é recusada, e nada é criado fora", () => {
    mkdirSync(path.join(root, "apps/site"), { recursive: true });
    symlinkSync(outside, path.join(root, "apps/site/test-results"));
    expect(() => ensureRealDirs(root, ["apps/site/test-results"])).toThrow(/apps\/site\/test-results é link simbólico/);
  });

  it("uma pasta no meio do caminho como link é recusada antes de criar qualquer coisa dentro", () => {
    mkdirSync(path.join(root, "apps/site"), { recursive: true });
    symlinkSync(outside, path.join(root, "apps/site/.next"));
    expect(() => ensureRealDirs(root, ["apps/site/.next/cache"])).toThrow(/apps\/site\/\.next é link simbólico/);
    expect(existsSync(path.join(outside, "cache"))).toBe(false);
  });

  it("link quebrado também é recusado", () => {
    mkdirSync(path.join(root, "apps"), { recursive: true });
    symlinkSync(path.join(outside, "nao-existe"), path.join(root, "apps/site"));
    expect(() => ensureRealDirs(root, ["apps/site/test-results"])).toThrow(/apps\/site é link simbólico/);
  });

  it("arquivo no lugar da pasta é recusado", () => {
    mkdirSync(path.join(root, "apps"), { recursive: true });
    writeFileSync(path.join(root, "apps/site"), "x");
    expect(() => ensureRealDirs(root, ["apps/site/x"])).toThrow(/apps\/site existe e não é pasta/);
  });

  it.each(["../fora", "/etc", "a/./b", "a//b"])("caminho %s é recusado", (rel) => {
    expect(() => ensureRealDirs(root, [rel])).toThrow(/fora do repositório/);
  });

  it.each([
    ["a,b", /vírgula/],
    ["x:y", /dois-pontos/],
    ["../fora", /fora do repositório/],
  ])("nome %s recusado antes de criar qualquer pasta, inclusive as válidas da lista", (bad, message) => {
    expect(() => ensureRealDirs(root, ["primeira/sub", bad])).toThrow(message);
    expect(existsSync(path.join(root, "primeira"))).toBe(false);
    expect(existsSync(path.join(root, "a,b"))).toBe(false);
    expect(existsSync(path.join(root, "x:y"))).toBe(false);
  });
});

describe("dockerArgs", () => {
  const base = () => ({
    root: "/repo",
    image: "img@sha256:x",
    writable: ["apps/site/test-results", "apps/site/e2e/baseline/__screenshots__"],
    tmpfs: ["apps/site/.next/cache"],
    user: { uid: 1000, gid: 1001 },
    playwrightArgs: ["baseline", "--update-snapshots"],
  });

  it("repositório só para leitura; graváveis do host só as pastas de saída", () => {
    const args = dockerArgs(base());
    expect(values(args, "--mount")).toEqual([
      "type=bind,source=/repo,target=/work,readonly",
      "type=bind,source=/repo/apps/site/test-results,target=/work/apps/site/test-results",
      "type=bind,source=/repo/apps/site/e2e/baseline/__screenshots__,target=/work/apps/site/e2e/baseline/__screenshots__",
    ]);
    expect(args).not.toContain("-v");
  });

  it("cache do next start em tmpfs, com o dono do host e sem exec", () => {
    expect(values(dockerArgs(base()), "--tmpfs")).toEqual([
      `/work/apps/site/.next/cache:rw,noexec,nosuid,nodev,size=${LIMITS.cacheSize},mode=0700,uid=1000,gid=1001`,
    ]);
  });

  it("sem capacidades, sem novos privilégios, sem rede, sem o IPC do host e com limites", () => {
    const args = dockerArgs(base());
    expect(args).toEqual(
      expect.arrayContaining([
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--network=none",
        `--shm-size=${LIMITS.shm}`,
        `--pids-limit=${LIMITS.pids}`,
        `--memory=${LIMITS.memory}`,
        `--memory-swap=${LIMITS.memory}`,
      ]),
    );
    expect(args).not.toContain("--ipc=host");
    expect(args.some((a) => a.startsWith("--privileged") || a.startsWith("--cap-add"))).toBe(false);
  });

  it("usuário do host, imagem antes do comando e argumentos do playwright no fim", () => {
    const args = dockerArgs(base());
    expect(values(args, "--user")).toEqual(["1000:1001"]);
    const at = args.indexOf("img@sha256:x");
    expect(args.slice(at + 1)).toEqual([
      "node", "node_modules/@playwright/test/cli.js", "test", "-c", "apps/site/playwright.config.ts",
      "--output", "apps/site/test-results/docker",
      "baseline", "--update-snapshots",
    ]);
    // a saída é subpasta de uma pasta gravável (o Playwright apaga a pasta de saída, e um ponto de montagem não sai)
    expect(DOCKER_OUTPUT_DIR.startsWith("apps/site/test-results/")).toBe(true);
  });

  it("variáveis de ambiente do container: HOME, CI e telemetria desligada", () => {
    // CI=1: o playwright.config.ts liga o forbidOnly (test.only esquecido faz a captura falhar)
    expect(values(dockerArgs(base()), "-e")).toEqual(["HOME=/tmp", "CI=1", "NEXT_TELEMETRY_DISABLED=1"]);
  });

  it("sem usuário, ou com uid que não é inteiro, é erro (nada roda como root nem com tmpfs sem dono)", () => {
    expect(() => dockerArgs({ ...base(), user: undefined })).toThrow(/uid e do gid/);
    expect(() => dockerArgs({ ...base(), user: { uid: "0,mode=777", gid: 0 } })).toThrow(/uid e do gid/);
  });

  it("vírgula em qualquer caminho, dois-pontos em pasta, ou pasta fora do repositório é erro", () => {
    expect(() => dockerArgs({ ...base(), root: "/a,readonly=false" })).toThrow(/vírgula/);
    expect(() => dockerArgs({ ...base(), writable: ["apps/x,y"] })).toThrow(/vírgula/);
    expect(() => dockerArgs({ ...base(), tmpfs: ["apps/x:exec"] })).toThrow(/dois-pontos/);
    expect(() => dockerArgs({ ...base(), writable: ["../fora"] })).toThrow(/fora do repositório/);
    expect(() => dockerArgs({ ...base(), tmpfs: ["/etc"] })).toThrow(/fora do repositório/);
    expect(dockerArgs({ ...base(), root: "C:\\repo" })[0]).toBe("run");
  });
});

describe("prepareRun", () => {
  it("cria as pastas, monta a partir da raiz real e passa o usuário do processo", () => {
    mkdirSync(path.join(root, "apps/site/e2e/baseline"), { recursive: true });
    const args = prepareRun({ root, version: INSTALLED, playwrightArgs: ["baseline"], proc: LINUX });
    for (const rel of ["apps/site/test-results", "apps/site/e2e/baseline/__screenshots__", CACHE_DIR]) {
      expect(lstatSync(path.join(root, rel)).isDirectory()).toBe(true);
    }
    expect(values(args, "--user")).toEqual(["1234:5678"]);
    expect(values(args, "--tmpfs")[0]).toMatch(/^\/work\/apps\/site\/\.next\/cache:.*uid=1234,gid=5678$/);
    expect(values(args, "--mount")[0]).toBe(`type=bind,source=${ensureRealDirs(root, [])},target=/work,readonly`);
    expect(args).toContain(imageFor(INSTALLED));
    expect(args.at(-1)).toBe("baseline");
  });

  it("raiz acessada por link: monta o caminho real (o link da raiz é aceito, os de dentro não)", () => {
    const viaLink = path.join(outside, "atalho");
    symlinkSync(root, viaLink);
    const args = prepareRun({ root: viaLink, version: INSTALLED, playwrightArgs: [], proc: LINUX });
    const real = ensureRealDirs(root, []);
    expect(real).not.toBe(viaLink);
    expect(values(args, "--mount")[0]).toBe(`type=bind,source=${real},target=/work,readonly`);
    expect(values(args, "--mount")[1]).toBe(`type=bind,source=${path.join(real, "apps/site/test-results")},target=/work/apps/site/test-results`);
  });

  it("__screenshots__ como link é recusado (o container gravaria fora do repositório)", () => {
    mkdirSync(path.join(root, "apps/site/e2e/baseline"), { recursive: true });
    symlinkSync(outside, path.join(root, "apps/site/e2e/baseline/__screenshots__"));
    expect(() => prepareRun({ root, version: INSTALLED, playwrightArgs: [], proc: LINUX })).toThrow(/__screenshots__ é link simbólico/);
  });

  it("apps/site/.next como link é recusado (ponto de montagem do tmpfs)", () => {
    mkdirSync(path.join(root, "apps/site"), { recursive: true });
    symlinkSync(outside, path.join(root, "apps/site/.next"));
    expect(() => prepareRun({ root, version: INSTALLED, playwrightArgs: [], proc: LINUX })).toThrow(/\.next é link simbólico/);
  });

  it("pasta de e2e com vírgula no nome: erro antes de criar qualquer pasta", () => {
    mkdirSync(path.join(root, "apps/site/e2e/a,b"), { recursive: true });
    expect(() => prepareRun({ root, version: INSTALLED, playwrightArgs: [], proc: LINUX })).toThrow(/vírgula/);
    expect(existsSync(path.join(root, "apps/site/test-results"))).toBe(false);
    expect(existsSync(path.join(root, "apps/site/e2e/a,b/__screenshots__"))).toBe(false);
    expect(existsSync(path.join(root, "apps/site/.next"))).toBe(false);
  });

  it("raiz real com vírgula: erro antes de criar qualquer pasta", () => {
    const comma = path.join(outside, "a,b");
    mkdirSync(comma);
    expect(() => prepareRun({ root: comma, version: INSTALLED, playwrightArgs: [], proc: LINUX })).toThrow(/vírgula/);
    expect(existsSync(path.join(comma, "apps"))).toBe(false);
  });

  it("no Windows nativo, falha antes de criar qualquer pasta", () => {
    expect(() => prepareRun({ root, version: INSTALLED, playwrightArgs: [], proc: { platform: "win32" } })).toThrow(/WSL2/);
    expect(existsSync(path.join(root, "apps"))).toBe(false);
  });

  it("sem uid fora do Windows é erro; versão diferente da fixada também", () => {
    expect(() => prepareRun({ root, version: INSTALLED, playwrightArgs: [], proc: { platform: "linux" } })).toThrow(/uid e o gid/);
    expect(() => prepareRun({ root, version: "0.0.1", playwrightArgs: [], proc: LINUX })).toThrow(/Atualize PINNED_IMAGE/);
  });
});

describe("scripts/e2e-docker.mjs", () => {
  it("delega a montagem ao prepareRun e não monta nada por conta própria", () => {
    const src = readFileSync(path.join(REPO, "scripts/e2e-docker.mjs"), "utf8");
    expect(src).toMatch(/prepareRun\(\{ root: ROOT, version: require\("@playwright\/test\/package\.json"\)\.version, playwrightArgs: process\.argv\.slice\(2\) \}\)/);
    expect(src).not.toMatch(/"-v"|--mount|--user|getuid/);
  });
});
