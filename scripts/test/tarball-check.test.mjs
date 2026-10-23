import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LIFECYCLE_SCRIPTS } from "../lib/lifecycle.mjs";
import { atLeast, findNpmDir, loadNpmModules } from "../lib/npm-modules.mjs";
import { checkArtifact, dryRunProblems, inspectTarball, manifestProblems, repoProblems, viewState } from "../lib/tarball-check.mjs";
import { entry, evilManifest, goodManifest, MALICIOUS, tgz } from "./helpers/tar-fixtures.mjs";

// Conferência dos tarballs no job "publish" do release.yml. O tarball é lido pelo node-tar e pelo
// pacote do próprio npm que vai publicar (rodada 5 da E7): um leitor de tar próprio divergia do npm.

const EXPECTED = ["@cbjk_iris/schema", "@cbjk_iris/engine", "@cbjk_iris/core", "@cbjk_iris/cli", "create-iris-site"];
// o npm que roda os testes (npm test e npx definem npm_execpath)
const NPM_BIN = process.env.npm_execpath;
const NPM_DIR = findNpmDir(NPM_BIN);
const deps = loadNpmModules(NPM_DIR);

let tmp;
let cache;
beforeAll(() => {
  cache = mkdtempSync(path.join(os.tmpdir(), "iris-pacote-cache-"));
});
afterAll(() => rmSync(cache, { recursive: true, force: true }));
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "iris-tarball-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

function file(buf, name = "x.tgz") {
  const f = path.join(tmp, name);
  writeFileSync(f, buf);
  return f;
}

describe("LIFECYCLE_SCRIPTS", () => {
  it("é exatamente a lista dos 12 scripts (tirar um tem de quebrar este teste)", () => {
    expect(LIFECYCLE_SCRIPTS).toEqual([
      "preinstall", "install", "postinstall",
      "preprepare", "prepare", "postprepare",
      "prepack", "postpack",
      "prepublish", "prepublishOnly", "publish", "postpublish",
    ]);
  });
});

describe("findNpmDir / loadNpmModules", () => {
  it("acha a pasta do npm a partir do binário e carrega tar e pacote de dentro dela", () => {
    expect(path.basename(NPM_DIR)).toBe("npm");
    expect(deps.tarPath.startsWith(path.join(NPM_DIR, "node_modules") + path.sep)).toBe(true);
    expect(deps.pacotePath.startsWith(path.join(NPM_DIR, "node_modules") + path.sep)).toBe(true);
    expect(typeof deps.tar.t).toBe("function");
    expect(typeof deps.pacote.manifest).toBe("function");
  });

  it("atLeast: versão mínima do npm para trusted publishing", () => {
    expect(atLeast("11.5.1", "11.5.1")).toBe(true);
    expect(atLeast("11.19.1", "11.5.1")).toBe(true);
    expect(atLeast("12.0.1", "11.5.1")).toBe(true);
    expect(atLeast("11.5.0", "11.5.1")).toBe(false);
    expect(atLeast("10.9.3", "11.5.1")).toBe(false);
    expect(atLeast("x", "11.5.1")).toBe(false);
    expect(atLeast(undefined, "11.5.1")).toBe(false);
  });

  it("binário inexistente ou fora de um pacote npm: falha fechado", () => {
    expect(() => findNpmDir(path.join(tmp, "nao-existe"))).toThrow(/npm/);
    writeFileSync(path.join(tmp, "npm"), "#!/bin/sh\n");
    expect(() => findNpmDir(path.join(tmp, "npm"))).toThrow(/pasta do npm/);
    expect(() => findNpmDir(undefined)).toThrow(/npm/);
  });

  it("pasta do npm sem node_modules próprio: falha fechado (não pega tar de fora)", () => {
    const fake = path.join(tmp, "npm");
    mkdirSync(fake);
    writeFileSync(path.join(fake, "package.json"), JSON.stringify({ name: "npm", version: "11.19.1" }));
    expect(() => loadNpmModules(fake)).toThrow(/tar|pacote/);
  });

  it("tar e pacote achados num node_modules acima da pasta do npm: falha fechado", () => {
    for (const mod of ["tar", "pacote"]) {
      mkdirSync(path.join(tmp, "node_modules", mod), { recursive: true });
      writeFileSync(path.join(tmp, "node_modules", mod, "package.json"), JSON.stringify({ name: mod, version: "7.0.0", main: "index.js" }));
      writeFileSync(path.join(tmp, "node_modules", mod, "index.js"), "module.exports = {};");
    }
    const fake = path.join(tmp, "npm");
    mkdirSync(fake);
    writeFileSync(path.join(fake, "package.json"), JSON.stringify({ name: "npm", version: "11.19.1" }));
    expect(() => loadNpmModules(fake)).toThrow(/veio de fora do npm/);
  });
});

describe("inspectTarball (node-tar e pacote do npm)", () => {
  it("tarball bom: o manifesto é o que o npm lê, e a lista de arquivos sem o package/", async () => {
    const f = file(tgz(entry("package/package.json", goodManifest()), entry("package/dist/index.mjs", "export {}")));
    const { manifest, files } = await inspectTarball(deps, f, cache);
    expect(manifest).toMatchObject({ name: "@cbjk_iris/schema", version: "1.0.0" });
    expect(files).toEqual(["package.json", "dist/index.mjs"]);
  });

  // npm que publica (11.5.1+, tar 7): todos recusados. No npm 10 (tar 6, só no CI do Node 22.18,
  // que não publica) o "pax size" é lido sem o size do pax, igual ao próprio npm 10: o teste
  // seguinte cobre essa equivalência.
  it.each(Object.keys(MALICIOUS))("malicioso das revisões: %s é recusado pelo npm que publica", async (label) => {
    const result = inspectTarball(deps, file(MALICIOUS[label]()), cache);
    if (atLeast(deps.npmVersion, "11.5.1") || label !== "pax size") await expect(result).rejects.toThrow(/./);
    else await result.catch(() => null);
  });

  it("nenhum malicioso passa com o manifesto bom enquanto o npm lê o mau", { timeout: 60_000 }, async () => {
    for (const [label, make] of Object.entries(MALICIOUS)) {
      const f = file(make(), `${label.replace(/\W+/g, "-")}.tgz`);
      const ours = await inspectTarball(deps, f, cache).then((r) => r.manifest, () => null);
      // só compara quando a conferência aceitou: o pacote do npm 10 derruba o processo com NUL no path
      if (!ours) continue;
      const npm = await deps.pacote.manifest(`file:${f}`, { cache, fullMetadata: true, fullReadJson: true });
      expect(ours.version, label).toBe(npm.version);
      expect(ours.scripts, label).toEqual(npm.scripts);
    }
  });

  it("caminho com .., absoluto, com \\ ou só package: recusado", async () => {
    for (const name of ["package/../x", "package\\x", "x", "pkg/package.json"]) {
      await expect(inspectTarball(deps, file(tgz(entry("package/package.json", goodManifest()), entry(name, "x"))), cache), name).rejects.toThrow(/./);
    }
  });

  it("duplicado sem diferenciar maiúsculas: recusado", async () => {
    const f = file(tgz(entry("package/package.json", goodManifest()), entry("package/Package.json", "{}")));
    await expect(inspectTarball(deps, f, cache)).rejects.toThrow(/duplicad/);
  });

  it("FIFO e dispositivo: recusados", async () => {
    for (const type of ["3", "4", "6"]) {
      const f = file(tgz(entry("package/package.json", goodManifest()), entry("package/x", "", { type })));
      await expect(inspectTarball(deps, f, cache), type).rejects.toThrow(/tipo de entrada/);
    }
  });

  it("sem package/package.json, gzip inválido ou tar truncado: recusado", async () => {
    await expect(inspectTarball(deps, file(tgz(entry("package/index.js", "x"))), cache)).rejects.toThrow(/package\.json/);
    await expect(inspectTarball(deps, file(Buffer.from("não é gzip")), cache)).rejects.toThrow(/./);
    const { gzipSync } = await import("node:zlib");
    const truncated = gzipSync(entry("package/package.json", "x".repeat(600)).subarray(0, 700));
    await expect(inspectTarball(deps, file(truncated), cache)).rejects.toThrow(/./);
  });

  it("script de ciclo de vida no package.json do tarball aparece no manifesto conferido", async () => {
    const { manifest } = await inspectTarball(deps, file(tgz(entry("package/package.json", evilManifest))), cache);
    expect(manifestProblems(manifest, EXPECTED).join("\n")).toMatch(/scripts\.postinstall/);
  });
});

describe("manifestProblems", () => {
  it("manifesto bom: nenhum problema", () => {
    expect(manifestProblems({ name: "@cbjk_iris/core", version: "0.1.0", scripts: { build: "x" }, publishConfig: { access: "public" } }, EXPECTED)).toEqual([]);
  });

  it("name fora da lista, com quebra de linha ou que não é texto", () => {
    for (const name of ["evil", "evil\n@cbjk_iris/core", ["@cbjk_iris/core"], undefined]) {
      expect(manifestProblems({ name, version: "0.1.0" }, EXPECTED).join("\n"), String(name)).toMatch(/name/);
    }
  });

  it("version fora de X.Y.Z, 0.0.0, com quebra de linha ou que não é texto", () => {
    for (const version of ["0.0.0", "0.1.0-beta.1", "1.0", "0.1.0\n0.1.0", 1, undefined]) {
      expect(manifestProblems({ name: "@cbjk_iris/core", version }, EXPECTED).join("\n"), String(version)).toMatch(/version/);
    }
  });

  it("publishConfig.registry, publishConfig.tag e cada script de ciclo de vida", () => {
    const base = { name: "@cbjk_iris/core", version: "0.1.0" };
    expect(manifestProblems({ ...base, publishConfig: { registry: "https://evil.example/" } }, EXPECTED).join("\n")).toMatch(/publishConfig\.registry/);
    expect(manifestProblems({ ...base, publishConfig: { tag: "next" } }, EXPECTED).join("\n")).toMatch(/publishConfig\.tag/);
    for (const script of LIFECYCLE_SCRIPTS) {
      expect(manifestProblems({ ...base, scripts: { [script]: "x" } }, EXPECTED).join("\n"), script).toMatch(new RegExp(`scripts\\.${script}\\b`));
    }
  });

  it("manifesto que não é objeto", () => {
    expect(manifestProblems(null, EXPECTED).join("\n")).toMatch(/objeto/);
    expect(manifestProblems(["x"], EXPECTED).join("\n")).toMatch(/objeto/);
  });
});

describe("dryRunProblems (npm publish <tgz> --dry-run --json, mesmo formato no npm 11 e 12)", () => {
  const out = (o) => JSON.stringify({ "@cbjk_iris/core": { id: "@cbjk_iris/core@0.1.0", name: "@cbjk_iris/core", version: "0.1.0", files: [{ path: "package.json" }, { path: "a.js" }], ...o } });

  it("bate com o que a conferência leu: nenhum problema", () => {
    expect(dryRunProblems(out(), "@cbjk_iris/core", "0.1.0", ["a.js", "package.json"])).toEqual([]);
  });

  it("name, version ou lista de arquivos diferente: problema", () => {
    expect(dryRunProblems(out({ name: "evil-pkg" }), "@cbjk_iris/core", "0.1.0", ["a.js", "package.json"]).join("\n")).toMatch(/name/);
    expect(dryRunProblems(out({ version: "6.6.6" }), "@cbjk_iris/core", "0.1.0", ["a.js", "package.json"]).join("\n")).toMatch(/version/);
    expect(dryRunProblems(out(), "@cbjk_iris/core", "0.1.0", ["package.json"]).join("\n")).toMatch(/arquivos/);
  });

  it("saída inválida, vazia ou com mais de um pacote: problema", () => {
    expect(dryRunProblems("npm error", "a", "1.0.0", []).join("\n")).toMatch(/saída/);
    expect(dryRunProblems("{}", "a", "1.0.0", []).join("\n")).toMatch(/saída/);
    expect(dryRunProblems(JSON.stringify({ a: {}, b: {} }), "a", "1.0.0", []).join("\n")).toMatch(/saída/);
  });

  // o npm 10 imprime o objeto sem a chave do nome; o job "publish" exige npm 11.5.1+, e o formato
  // com chave foi conferido no 11.19.1 e no 12.0.1
  it.runIf(atLeast(deps.npmVersion, "11.5.1"))("saída real do npm em uso, num tarball bom", { timeout: 60_000 }, async () => {
    const f = file(tgz(entry("package/package.json", JSON.stringify({ name: "@cbjk_iris/core", version: "0.1.0" })), entry("package/a.js", "x")));
    const cwd = mkdtempSync(path.join(os.tmpdir(), "iris-dry-"));
    try {
      const stdout = execFileSync(process.execPath, [NPM_BIN, "publish", f, "--dry-run", "--json", "--access", "public"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      expect(dryRunProblems(stdout, "@cbjk_iris/core", "0.1.0", ["package.json", "a.js"])).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("checkArtifact", () => {
  let dir;
  const okDryRun = async (f, item, files) => JSON.stringify({ [item.name]: { name: item.name, version: item.version, files: files.map((p) => ({ path: p })) } });

  beforeEach(() => {
    dir = path.join(tmp, "artefato");
    mkdirSync(dir);
  });

  const pkg = (name, version, over = {}) => ({ name, version, publishConfig: { access: "public" }, ...over });
  // package.json do "repositório" no mesmo commit (o que o job "pack" empacotou)
  let repo;
  function fill(version = "0.1.0", names = EXPECTED) {
    repo = new Map(EXPECTED.map((name) => [name, pkg(name, version)]));
    const files = names.map((name, i) => {
      const f = `p${i}-${version}.tgz`;
      writeFileSync(path.join(dir, f), tgz(entry("package/package.json", JSON.stringify(pkg(name, version)))));
      return f;
    });
    writeFileSync(path.join(dir, "order.txt"), `${files.join("\n")}\n`);
    return files;
  }
  const run = (opts = {}) => checkArtifact({ ...deps, cache, dryRun: okDryRun, ...opts }, dir, EXPECTED, repo);

  it("artefato bom: itens na ordem do order.txt, com versão única e sha256 de cada tarball", async () => {
    const files = fill();
    const sha = (f) => createHash("sha256").update(readFileSync(path.join(dir, f))).digest("hex");
    expect(await run()).toEqual({ version: "0.1.0", items: files.map((tarball, i) => ({ tarball, name: EXPECTED[i], version: "0.1.0", sha256: sha(tarball) })) });
  });

  it("caminho relativo da pasta do artefato não vira atalho do GitHub", async () => {
    fill();
    const rel = path.relative(process.cwd(), dir);
    expect(path.isAbsolute(rel)).toBe(false);
    const seen = [];
    await checkArtifact({ ...deps, cache, dryRun: async (f, item, files) => (seen.push(f), okDryRun(f, item, files)) }, rel, EXPECTED, repo);
    expect(seen.every((f) => path.isAbsolute(f))).toBe(true);
  });

  it("manifesto do tarball diferente do package.json do repositório no mesmo commit: recusado", async () => {
    const files = fill();
    writeFileSync(path.join(dir, files[1]), tgz(entry("package/package.json", JSON.stringify(pkg(EXPECTED[1], "0.1.0", { dependencies: { lodash: "^4" } })))));
    await expect(run()).rejects.toThrow(new RegExp(`${files[1]}: .*dependencies`));
    writeFileSync(path.join(dir, files[1]), tgz(entry("package/package.json", JSON.stringify(pkg(EXPECTED[1], "0.1.0")))));
    repo.delete(EXPECTED[3]);
    await expect(run()).rejects.toThrow(/sem package\.json no repositório/);
  });

  it("order.txt sem quebra de linha no fim e com linha vazia: aceito", async () => {
    const files = fill();
    writeFileSync(path.join(dir, "order.txt"), files.join("\n\n"));
    expect((await run()).items).toHaveLength(5);
  });

  it("arquivo extra (.npmrc), subpasta ou link: recusado", async () => {
    fill();
    writeFileSync(path.join(dir, ".npmrc"), "registry=x");
    await expect(run()).rejects.toThrow(/inesperado/);
    rmSync(path.join(dir, ".npmrc"));
    mkdirSync(path.join(dir, "sub"));
    await expect(run()).rejects.toThrow(/inesperado/);
    rmSync(path.join(dir, "sub"), { recursive: true });
    symlinkSync(path.join(dir, "p0-0.1.0.tgz"), path.join(dir, "link.tgz"));
    await expect(run()).rejects.toThrow(/inesperado/);
  });

  it("order.txt vazio, ausente, com nome inválido, tarball ausente, repetido, contagem errada ou sobra: recusado", async () => {
    const files = fill();
    writeFileSync(path.join(dir, "order.txt"), "");
    await expect(run()).rejects.toThrow(/0 tarball/);
    writeFileSync(path.join(dir, "order.txt"), [...files, "-x.tgz"].join("\n"));
    await expect(run()).rejects.toThrow(/nome inesperado/);
    writeFileSync(path.join(dir, "order.txt"), [...files.slice(0, 4), "nao-existe.tgz"].join("\n"));
    await expect(run()).rejects.toThrow(/ausente/);
    writeFileSync(path.join(dir, "order.txt"), [...files.slice(0, 4), files[0]].join("\n"));
    await expect(run()).rejects.toThrow(/repetido/);
    writeFileSync(path.join(dir, "order.txt"), files.slice(1).join("\n"));
    await expect(run()).rejects.toThrow(/4 tarball/);
    writeFileSync(path.join(dir, "order.txt"), files.join("\n"));
    writeFileSync(path.join(dir, "sobra.tgz"), "x");
    await expect(run()).rejects.toThrow(/fora do order\.txt/);
    rmSync(path.join(dir, "sobra.tgz"));
    rmSync(path.join(dir, "order.txt"));
    await expect(run()).rejects.toThrow(/order\.txt/);
  });

  it("mesmo pacote em dois tarballs, ou versões diferentes: recusado", async () => {
    fill("0.1.0", [...EXPECTED.slice(0, 4), EXPECTED[0]]);
    await expect(run()).rejects.toThrow(/repetido/);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir);
    const files = fill();
    writeFileSync(path.join(dir, files[4]), tgz(entry("package/package.json", JSON.stringify(pkg(EXPECTED[4], "0.2.0")))));
    await expect(run()).rejects.toThrow(/versões diferentes/);
  });

  it("tarball malicioso no artefato: recusado com o nome do arquivo", async () => {
    const files = fill();
    writeFileSync(path.join(dir, files[2]), MALICIOUS["bloco nulo isolado"]());
    await expect(run()).rejects.toThrow(new RegExp(files[2]));
  });

  it("segunda conferência (dry-run) diferente do que foi lido: recusado", async () => {
    fill();
    const lying = async (f, item) => JSON.stringify({ [item.name]: { name: item.name, version: "6.6.6", files: [{ path: "package.json" }] } });
    await expect(run({ dryRun: lying })).rejects.toThrow(/dry-run.*version/);
  });
});

describe("viewState (saída de npm view <spec> version --json)", () => {
  it("npm 11 (texto) e npm 12 (array): publicado", () => {
    expect(viewState('"0.1.0"\n', 0, "0.1.0")).toBe("published");
    expect(viewState('[\n  "0.1.0"\n]\n', 0, "0.1.0")).toBe("published");
  });

  it("E404 (pacote ou versão inexistente): não publicado", () => {
    expect(viewState('{"error":{"code":"E404","summary":"Not Found"}}', 1, "0.1.0")).toBe("missing");
  });

  it("outro erro, saída inválida, vazia ou versão diferente: erro", () => {
    expect(() => viewState('{"error":{"code":"ECONNRESET"}}', 1, "0.1.0")).toThrow(/ECONNRESET/);
    expect(() => viewState("npm error code E404", 1, "0.1.0")).toThrow(/inesperad/);
    expect(() => viewState("", 1, "0.1.0")).toThrow(/inesperad/);
    expect(() => viewState('"0.2.0"', 0, "0.1.0")).toThrow(/inesperad/);
    expect(() => viewState('{"error":{"code":"E404"}}', 0, "0.1.0")).toThrow(/inesperad/);
  });
});

describe("rodada 6: lacunas e lista de permissão", () => {
  it("tarball só com foo/package.json: recusado", async () => {
    await expect(inspectTarball(deps, file(tgz(entry("foo/package.json", goodManifest()))), cache)).rejects.toThrow(/fora de package\//);
  });

  it("strict: entrada com checksum inválido no meio é recusada (sem strict o tar só pularia a entrada)", async () => {
    const bad = entry("package/escondido.js", "x");
    bad[148] = 0x37;
    await expect(inspectTarball(deps, file(tgz(entry("package/package.json", goodManifest()), bad, entry("package/b.js", "y"))), cache)).rejects.toThrow(/tar inválido/);
  });

  it("manifestProblems: publishConfig só { access: public }", () => {
    const base = { name: "@cbjk_iris/core", version: "0.1.0" };
    for (const key of ["@cbjk_iris:registry", "registry", "tag", "proxy", "https-proxy", "strict-ssl", "provenance", "ignore-scripts"]) {
      expect(manifestProblems({ ...base, publishConfig: { access: "public", [key]: "x" } }, EXPECTED), key).toContain(`publishConfig.${key} não é permitido`);
    }
    for (const bad of [undefined, null, {}, { access: "restricted" }, ["access"]]) {
      expect(manifestProblems({ ...base, publishConfig: bad }, EXPECTED).join("\n"), JSON.stringify(bad)).toMatch(/publishConfig/);
    }
    expect(manifestProblems({ ...base, publishConfig: { access: "public" } }, EXPECTED)).toEqual([]);
  });

  it("repoProblems: chaves do repositório e do tarball têm de ser iguais; só o que o npm acrescenta fica de fora", () => {
    const url = ["g", "it+https://github.com/lf-kali/cbjk_iris.", "g", "it"].join("");
    const repoJson = { name: "a", version: "1.0.0", publishConfig: { access: "public" }, dependencies: { x: "^1" }, repository: { type: "git", url, directory: "packages/a" } };
    // o que o pacote.manifest do npm 11.19.1 e do 12.0.1 acrescenta aos 5 pacotes reais (medido)
    const npmLe = {
      ...repoJson,
      _id: "a@1.0.0",
      _integrity: "sha512-x",
      _resolved: "/tmp/a.tgz",
      _from: "file:/tmp/a.tgz",
      readme: "ERROR: No README data found!",
      bugs: { url: "https://github.com/lf-kali/cbjk_iris/issues" },
      homepage: "https://github.com/lf-kali/cbjk_iris#readme",
    };
    expect(repoProblems(npmLe, repoJson)).toEqual([]);
    expect(repoProblems({ ...npmLe, dependencies: { x: "^2" } }, repoJson).join("\n")).toMatch(/dependencies/);
    expect(repoProblems({ ...npmLe, config: { a: 1 } }, repoJson).join("\n")).toMatch(/config/);
    expect(repoProblems({ ...npmLe, homepage: "h2" }, { ...repoJson, homepage: "h" }).join("\n")).toMatch(/homepage/);
    // ordem das chaves não importa
    expect(repoProblems({ ...npmLe, dependencies: { y: "1", x: "^1" } }, { ...repoJson, dependencies: { x: "^1", y: "1" } })).toEqual([]);
  });

  it("repoProblems: chave _ fora da lista exata, e homepage, bugs ou readme diferentes do que o npm derivaria, são recusados", () => {
    const url = ["g", "it+https://github.com/lf-kali/cbjk_iris.", "g", "it"].join("");
    const repoJson = { name: "a", version: "1.0.0", repository: { type: "git", url, directory: "packages/a" } };
    const npmLe = { ...repoJson, _id: "a@1.0.0", _integrity: "sha512-x", _resolved: "/t/a.tgz", _from: "file:/t/a.tgz", readme: "ERROR: No README data found!", bugs: { url: "https://github.com/lf-kali/cbjk_iris/issues" }, homepage: "https://github.com/lf-kali/cbjk_iris#readme" };
    expect(repoProblems({ ...npmLe, _authToken: "npm_x" }, repoJson).join("\n")).toMatch(/_authToken/);
    expect(repoProblems({ ...npmLe, _evil: 1 }, repoJson).join("\n")).toMatch(/_evil/);
    expect(repoProblems({ ...npmLe, _id: "b@6.6.6" }, repoJson).join("\n")).toMatch(/_id/);
    expect(repoProblems({ ...npmLe, homepage: "https://evil.example/" }, repoJson).join("\n")).toMatch(/homepage/);
    expect(repoProblems({ ...npmLe, bugs: { url: "https://evil.example/" } }, repoJson).join("\n")).toMatch(/bugs/);
    expect(repoProblems({ ...npmLe, readme: "<script>" }, repoJson).join("\n")).toMatch(/readme/);
    expect(repoProblems({ ...npmLe, readmeFilename: "README.md" }, repoJson).join("\n")).toMatch(/readmeFilename/);
    expect(repoProblems({ ...npmLe, gitHead: "abc" }, repoJson).join("\n")).toMatch(/gitHead/);
    // sem repository do GitHub, o npm não derivaria homepage nem bugs
    const semRepo = { name: "a", version: "1.0.0" };
    expect(repoProblems({ ...semRepo, _id: "a@1.0.0", readme: "ERROR: No README data found!" }, semRepo)).toEqual([]);
    expect(repoProblems({ ...semRepo, _id: "a@1.0.0", homepage: "https://evil.example/" }, semRepo).join("\n")).toMatch(/homepage/);
  });

  it("dryRunProblems: entrada de pasta ({ path: \"\" }) é ignorada; mesmo tamanho com nomes diferentes falha", () => {
    const out = (files) => JSON.stringify({ a: { name: "a", version: "1.0.0", files } });
    expect(dryRunProblems(out([{ path: "" }, { path: "package.json" }, { path: "lib/" }]), "a", "1.0.0", ["package.json"])).toEqual([]);
    expect(dryRunProblems(out([{ path: "package.json" }, { path: "b.js" }]), "a", "1.0.0", ["package.json", "a.js"]).join("\n")).toMatch(/arquivos/);
  });
});

describe("rodada 6: guardas que uma mutação deixava vivas", () => {
  it("findNpmDir: package.json no caminho que não é do npm não vale", () => {
    const fake = path.join(tmp, "outro");
    mkdirSync(path.join(fake, "bin"), { recursive: true });
    writeFileSync(path.join(fake, "package.json"), JSON.stringify({ name: "outro" }));
    writeFileSync(path.join(fake, "bin", "npm"), "#!/bin/sh\n");
    expect(() => findNpmDir(path.join(fake, "bin", "npm"))).toThrow(/pasta do npm/);
  });

  it("caminho com barra invertida ou caractere de controle depois de package/: recusado", async () => {
    for (const name of ["package/a\\b.js", "package/a\u0001.js"]) {
      await expect(inspectTarball(deps, file(tgz(entry("package/package.json", goodManifest()), entry(name, "x"))), cache), JSON.stringify(name)).rejects.toThrow(/caminho inválido/);
    }
  });

  it("sem package/package.json: recusado antes de o npm ler o manifesto", async () => {
    await expect(inspectTarball(deps, file(tgz(entry("package/index.js", "x"))), cache)).rejects.toThrow(/^tarball sem package\/package\.json$/);
  });
});

describe("na CI com Node 24 ou mais novo, os testes que exigem npm 11.5.1+ não pulam em silêncio", () => {
  it("npm do ambiente", () => {
    const major = Number(process.versions.node.split(".")[0]);
    if (process.env.CI && major >= 24) expect(atLeast(deps.npmVersion, "11.5.1"), `npm do Node ${process.versions.node}`).toBe(true);
  });
});
