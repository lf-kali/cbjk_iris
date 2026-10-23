import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LIFECYCLE_SCRIPTS, packFilename, publishOrder, rangeProblem, releaseProblems, REPOSITORY_URL } from "../lib/release-check.mjs";

// Conferências do release.yml antes de empacotar (SPEC §6.1 passo 8, Q-11: lockstep com changesets).

const NAMES = ["@cbjk_iris/schema", "@cbjk_iris/engine", "@cbjk_iris/core", "@cbjk_iris/cli", "create-iris-site"];
const DIRS = ["packages/schema", "packages/engine", "packages/core", "packages/cli", "packages/create"];
const DEPS = {
  "@cbjk_iris/schema": {},
  "@cbjk_iris/engine": { "@cbjk_iris/schema": "V" },
  "@cbjk_iris/core": { "@cbjk_iris/engine": "V", "@cbjk_iris/schema": "V" },
  "@cbjk_iris/cli": { "@cbjk_iris/engine": "V", "@cbjk_iris/schema": "V" },
  "create-iris-site": { "@cbjk_iris/cli": "V" },
};

function manifests(version = "0.1.0") {
  return NAMES.map((name, i) => ({
    dir: DIRS[i],
    json: {
      name,
      version,
      description: `Pacote ${name}`,
      license: "MIT",
      publishConfig: { access: "public" },
      repository: { type: "git", url: REPOSITORY_URL, directory: DIRS[i] },
      dependencies: Object.fromEntries(Object.entries(DEPS[name]).map(([dep]) => [dep, version])),
    },
  }));
}

function input(overrides = {}) {
  return { manifests: manifests(), fixed: [NAMES], changesets: [], ...overrides };
}

function edit(list, name, change) {
  return list.map((m) => (m.json.name === name ? { ...m, json: change(m.json) } : m));
}

describe("releaseProblems", () => {
  it("estado bom: nenhum problema", () => {
    expect(releaseProblems(input())).toEqual([]);
  });

  it("ignora pacote privado (apps/site e a raiz)", () => {
    const site = { dir: "apps/site", json: { name: "cbjk-site", version: "0.0.0", private: true } };
    expect(releaseProblems(input({ manifests: [...manifests(), site] }))).toEqual([]);
  });

  it("versões diferentes: falha (lockstep)", () => {
    const list = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, version: "0.2.0" }));
    expect(releaseProblems(input({ manifests: list })).join("\n")).toMatch(/mesma versão/);
  });

  it("0.0.0 é recusado: essa versão só sai à mão, no primeiro lançamento", () => {
    expect(releaseProblems(input({ manifests: manifests("0.0.0") })).join("\n")).toMatch(/0\.0\.0/);
  });

  it("pré-lançamento e versão inválida são recusados", () => {
    expect(releaseProblems(input({ manifests: manifests("0.1.0-beta.1") })).join("\n")).toMatch(/X\.Y\.Z/);
    expect(releaseProblems(input({ manifests: manifests("1.0") })).join("\n")).toMatch(/X\.Y\.Z/);
  });

  it("changeset pendente: falha (rode changeset version e faça o merge antes)", () => {
    expect(releaseProblems(input({ changesets: ["feliz-gato-azul.md"] })).join("\n")).toMatch(/changeset version/);
  });

  it("dependência interna fora da versão do lançamento: falha", () => {
    const list = edit(manifests(), "@cbjk_iris/core", (json) => ({ ...json, dependencies: { ...json.dependencies, "@cbjk_iris/engine": "^0.1.0" } }));
    expect(releaseProblems(input({ manifests: list })).join("\n")).toMatch(/@cbjk_iris\/core.*@cbjk_iris\/engine/);
  });

  it("dependência interna em peerDependencies também conta", () => {
    const list = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, peerDependencies: { "@cbjk_iris/core": "*" } }));
    expect(releaseProblems(input({ manifests: list })).join("\n")).toMatch(/@cbjk_iris\/cli.*@cbjk_iris\/core/);
  });

  it("sem publishConfig.access public, sem license MIT ou com repository errado: falha", () => {
    const noAccess = edit(manifests(), "@cbjk_iris/schema", (json) => ({ ...json, publishConfig: {} }));
    expect(releaseProblems(input({ manifests: noAccess })).join("\n")).toMatch(/access/);
    const noLicense = edit(manifests(), "@cbjk_iris/schema", (json) => ({ ...json, license: "ISC" }));
    expect(releaseProblems(input({ manifests: noLicense })).join("\n")).toMatch(/MIT/);
    const badRepo = edit(manifests(), "@cbjk_iris/schema", (json) => ({ ...json, repository: { ...json.repository, url: "https://github.com/outro/repo" } }));
    expect(releaseProblems(input({ manifests: badRepo })).join("\n")).toMatch(/repository/);
    const badDir = edit(manifests(), "@cbjk_iris/schema", (json) => ({ ...json, repository: { ...json.repository, directory: "packages/engine" } }));
    expect(releaseProblems(input({ manifests: badDir })).join("\n")).toMatch(/repository\.directory/);
  });

  it("dependência de um workspace privado (em qualquer campo): falha, porque não existe no registro", () => {
    const site = { dir: "apps/site", json: { name: "cbjk-site", version: "0.0.0", private: true } };
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
      const list = edit(manifests(), "@cbjk_iris/core", (json) => ({ ...json, [field]: { ...json[field], "cbjk-site": "*" } }));
      expect(releaseProblems(input({ manifests: [...list, site] })).join("\n")).toMatch(new RegExp(`@cbjk_iris/core: ${field}\\["cbjk-site"\\].*privado`));
    }
  });

  it("publishConfig.registry e publishConfig.tag: falha (mudariam destino ou dist-tag fora do workflow)", () => {
    const registry = edit(manifests(), "@cbjk_iris/engine", (json) => ({ ...json, publishConfig: { access: "public", registry: "https://evil.example/" } }));
    expect(releaseProblems(input({ manifests: registry })).join("\n")).toMatch(/@cbjk_iris\/engine: publishConfig\.registry/);
    const tag = edit(manifests(), "@cbjk_iris/engine", (json) => ({ ...json, publishConfig: { access: "public", tag: "next" } }));
    expect(releaseProblems(input({ manifests: tag })).join("\n")).toMatch(/@cbjk_iris\/engine: publishConfig\.tag/);
  });

  it("publishConfig por lista de permissão: só { access: public }; qualquer outra chave falha", () => {
    for (const key of ["@cbjk_iris:registry", "proxy", "https-proxy", "strict-ssl", "provenance", "ignore-scripts", "otp", "access-x"]) {
      const list = edit(manifests(), "@cbjk_iris/engine", (json) => ({ ...json, publishConfig: { access: "public", [key]: "x" } }));
      expect(releaseProblems(input({ manifests: list })).join("\n"), key).toContain(`@cbjk_iris/engine: publishConfig.${key} não é permitido`);
    }
    for (const bad of [undefined, null, "public", ["access"], { access: "restricted" }]) {
      const list = edit(manifests(), "@cbjk_iris/engine", (json) => ({ ...json, publishConfig: bad }));
      expect(releaseProblems(input({ manifests: list })).join("\n"), JSON.stringify(bad)).toMatch(/@cbjk_iris\/engine: .*publishConfig/);
    }
  });

  it("bundledDependencies e bundleDependencies: falha (código de terceiros dentro do tarball)", () => {
    for (const field of ["bundledDependencies", "bundleDependencies"]) {
      const list = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, [field]: ["x"] }));
      expect(releaseProblems(input({ manifests: list })).join("\n")).toMatch(new RegExp(`@cbjk_iris/cli: ${field}`));
    }
    const asTrue = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, bundleDependencies: true }));
    expect(releaseProblems(input({ manifests: asTrue })).join("\n")).toMatch(/bundleDependencies/);
  });

  it("lista branca de range: caminho local, git, URL, atalho do GitHub e dist-tag falham, em qualquer campo", () => {
    const ranges = [
      "file:../x", "link:../x", "git+https://github.com/a/b.git", "git://github.com/a/b.git", "github:a/b",
      "https://example.com/x.tgz", "http://example.com/x.tgz", "user/repo", ["g", "it@github.com:u/r.", "g", "it"].join(""),
      "ssh://host/r", "gitlab:a/b", "bitbucket:a/b", "gist:abc", "./x", "../x", "/abs", "~/x", "x.tgz", "latest", "workspace:*",
    ];
    for (const range of ranges) {
      for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
        const list = edit(manifests(), "@cbjk_iris/core", (json) => ({ ...json, [field]: { ...json[field], lodash: range } }));
        expect(releaseProblems(input({ manifests: list })).join("\n"), `${field} ${range}`).toMatch(new RegExp(`@cbjk_iris/core: ${field}\\["lodash"\\].*não é permitido`));
      }
    }
    const notText = edit(manifests(), "@cbjk_iris/core", (json) => ({ ...json, dependencies: { ...json.dependencies, lodash: 1 } }));
    expect(releaseProblems(input({ manifests: notText })).join("\n")).toMatch(/lodash.*não é texto/);
  });

  it("range do registro passa (exato, ^, ~, x, *, intervalo, ||)", () => {
    for (const range of ["1.2.3", "^1.6.0", "~0.7.1", "1.x", "*", ">=1 <2", "1.0.0 - 2.0.0", "^19 || ^20", " ^4 "]) {
      expect(rangeProblem(range, []), range).toBeNull();
    }
  });

  it("alias npm: para workspace privado falha, sem diferenciar maiúsculas e com espaço; alias do registro passa", () => {
    const site = { dir: "apps/site", json: { name: "cbjk-site", version: "0.0.0", private: true } };
    for (const range of ["npm:cbjk-site@*", "NPM:cbjk-site@1", " npm:cbjk-site", "Npm: cbjk-site@^1"]) {
      const bad = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, dependencies: { ...json.dependencies, site: range } }));
      expect(releaseProblems(input({ manifests: [...bad, site] })).join("\n"), range).toMatch(/@cbjk_iris\/cli: dependencies\["site"\].*privado/);
    }
    const scoped = { dir: "apps/x", json: { name: "@priv/x", version: "0.0.0", private: true } };
    const badScoped = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, dependencies: { ...json.dependencies, x: "npm:@priv/x@^1" } }));
    expect(releaseProblems(input({ manifests: [...badScoped, scoped] })).join("\n")).toMatch(/@cbjk_iris\/cli: dependencies\["x"\].*privado/);
    expect(rangeProblem("npm:string-width@^4", [])).toBeNull();
    expect(rangeProblem("npm:@scope/pkg@~1.2", [])).toBeNull();
    expect(rangeProblem("npm:string-width@github:a/b", [])).toMatch(/alias com range/);
    expect(rangeProblem("npm:../x", [])).toMatch(/nome de pacote inválido/);
    const ok = edit(manifests(), "@cbjk_iris/cli", (json) => ({ ...json, dependencies: { ...json.dependencies, s: "npm:string-width@^4" } }));
    expect(releaseProblems(input({ manifests: [...ok, site] }))).toEqual([]);
  });

  it("script de ciclo de vida (instalação, prepare, pack, publish): falha", () => {
    expect(LIFECYCLE_SCRIPTS).toEqual(expect.arrayContaining(["postpack", "prepublish", "publish", "postpublish", "preprepare", "postprepare"]));
    for (const script of LIFECYCLE_SCRIPTS) {
      const list = edit(manifests(), "@cbjk_iris/engine", (json) => ({ ...json, scripts: { build: "tsdown", [script]: "node x.js" } }));
      expect(releaseProblems(input({ manifests: list })).join("\n"), script).toMatch(new RegExp(`@cbjk_iris/engine: scripts\\.${script}\\b`));
    }
    const allowed = edit(manifests(), "@cbjk_iris/engine", (json) => ({ ...json, scripts: { build: "tsdown", test: "vitest", lint: "eslint" } }));
    expect(releaseProblems(input({ manifests: allowed }))).toEqual([]);
  });

  it("binding.gyp na pasta do pacote: falha", () => {
    const list = manifests().map((m) => (m.json.name === "@cbjk_iris/schema" ? { ...m, bindingGyp: true } : m));
    expect(releaseProblems(input({ manifests: list })).join("\n")).toMatch(/@cbjk_iris\/schema: binding\.gyp/);
  });

  it("os package.json reais dos 5 pacotes, numa versão de lançamento, não têm problema", () => {
    const ROOT = fileURLToPath(new URL("../..", import.meta.url));
    const dirs = readdirSync(path.join(ROOT, "packages")).filter((d) => existsSync(path.join(ROOT, "packages", d, "package.json")));
    const real = dirs.map((d) => {
      const text = readFileSync(path.join(ROOT, "packages", d, "package.json"), "utf8").replaceAll('"0.0.0"', '"0.1.0"');
      return { dir: `packages/${d}`, json: JSON.parse(text), bindingGyp: existsSync(path.join(ROOT, "packages", d, "binding.gyp")) };
    });
    const site = { dir: "apps/site", json: JSON.parse(readFileSync(path.join(ROOT, "apps/site/package.json"), "utf8")) };
    expect(real).toHaveLength(5);
    expect(releaseProblems({ manifests: [...real, site], fixed: [real.map((m) => m.json.name)], changesets: [] })).toEqual([]);
  });

  it("grupo fixed do changesets diferente dos pacotes publicáveis: falha", () => {
    expect(releaseProblems(input({ fixed: [NAMES.slice(0, 4)] })).join("\n")).toMatch(/fixed/);
    expect(releaseProblems(input({ fixed: [] })).join("\n")).toMatch(/fixed/);
    expect(releaseProblems(input({ fixed: [NAMES.slice(0, 2), NAMES.slice(2)] })).join("\n")).toMatch(/fixed/);
  });

  it("nenhum pacote publicável: falha", () => {
    expect(releaseProblems(input({ manifests: [] })).join("\n")).toMatch(/nenhum pacote/);
  });
});

describe("packFilename", () => {
  it("lê a saída do npm 10/11 (array) e a do npm 12 (objeto por nome)", () => {
    expect(packFilename([{ filename: "cbjk_iris-schema-0.1.0.tgz" }])).toBe("cbjk_iris-schema-0.1.0.tgz");
    expect(packFilename({ "@cbjk_iris/schema": { filename: "cbjk_iris-schema-0.1.0.tgz" } })).toBe("cbjk_iris-schema-0.1.0.tgz");
  });

  it("saída vazia, com mais de um pacote ou sem filename: erro", () => {
    expect(() => packFilename([])).toThrow(/npm pack/);
    expect(() => packFilename([{ filename: "a.tgz" }, { filename: "b.tgz" }])).toThrow(/npm pack/);
    expect(() => packFilename({ x: {} })).toThrow(/npm pack/);
    expect(() => packFilename(null)).toThrow(/npm pack/);
  });
});

describe("publishOrder", () => {
  it("dependência antes de quem depende dela", () => {
    const order = publishOrder([...manifests()].reverse()).map((m) => m.json.name);
    const before = (a, b) => order.indexOf(a) < order.indexOf(b);
    expect(order).toHaveLength(5);
    expect(before("@cbjk_iris/schema", "@cbjk_iris/engine")).toBe(true);
    expect(before("@cbjk_iris/engine", "@cbjk_iris/core")).toBe(true);
    expect(before("@cbjk_iris/engine", "@cbjk_iris/cli")).toBe(true);
    expect(before("@cbjk_iris/cli", "create-iris-site")).toBe(true);
  });

  it("ordem estável entre pacotes independentes (por nome)", () => {
    expect(publishOrder(manifests()).map((m) => m.json.name)).toEqual([
      "@cbjk_iris/schema",
      "@cbjk_iris/engine",
      "@cbjk_iris/cli",
      "@cbjk_iris/core",
      "create-iris-site",
    ]);
  });

  it("ciclo: erro", () => {
    const list = edit(manifests(), "@cbjk_iris/schema", (json) => ({ ...json, dependencies: { "create-iris-site": "0.1.0" } }));
    expect(() => publishOrder(list)).toThrow(/ciclo/);
  });

  it("deixa os privados de fora", () => {
    const site = { dir: "apps/site", json: { name: "cbjk-site", private: true, dependencies: { "@cbjk_iris/core": "*" } } };
    expect(publishOrder([...manifests(), site]).map((m) => m.json.name)).not.toContain("cbjk-site");
  });
});

describe("forma normalizada do package.json publicável (o pacote.manifest do npm reescreve as abreviadas)", () => {
  const one = (change) => input({ manifests: edit(manifests(), "@cbjk_iris/cli", change) });

  it("description ausente ou vazia: falha (o npm tiraria do README)", () => {
    // eslint-disable-next-line no-unused-vars
    expect(releaseProblems(one(({ description, ...rest }) => rest)).join("\n")).toMatch(/@cbjk_iris\/cli: description/);
    expect(releaseProblems(one((json) => ({ ...json, description: "" }))).join("\n")).toMatch(/@cbjk_iris\/cli: description/);
  });

  it("author em texto, contributors com texto, bin em texto, man em texto e directories.bin: falha", () => {
    expect(releaseProblems(one((json) => ({ ...json, author: "Fulano <f@x.com>" }))).join("\n")).toMatch(/@cbjk_iris\/cli: author/);
    expect(releaseProblems(one((json) => ({ ...json, contributors: ["Fulano"] }))).join("\n")).toMatch(/@cbjk_iris\/cli: contributors/);
    expect(releaseProblems(one((json) => ({ ...json, maintainers: "Fulano" }))).join("\n")).toMatch(/@cbjk_iris\/cli: maintainers/);
    expect(releaseProblems(one((json) => ({ ...json, bin: "dist/cli.mjs" }))).join("\n")).toMatch(/@cbjk_iris\/cli: bin/);
    expect(releaseProblems(one((json) => ({ ...json, man: "man/iris.1" }))).join("\n")).toMatch(/@cbjk_iris\/cli: man/);
    expect(releaseProblems(one((json) => ({ ...json, directories: { bin: "bin" } }))).join("\n")).toMatch(/@cbjk_iris\/cli: directories\.bin/);
  });

  it("formas normalizadas passam", () => {
    const ok = one((json) => ({ ...json, author: { name: "Fulano" }, contributors: [{ name: "B" }], bin: { iris: "dist/cli.mjs" }, man: ["man/iris.1"], directories: { lib: "dist" } }));
    expect(releaseProblems(ok)).toEqual([]);
  });

  it("README na pasta do pacote: falha (o npm publicaria o conteúdo como readme)", () => {
    const list = manifests().map((m) => (m.json.name === "@cbjk_iris/core" ? { ...m, readme: true } : m));
    expect(releaseProblems(input({ manifests: list })).join("\n")).toMatch(/@cbjk_iris\/core: README/);
  });
});
