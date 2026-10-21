import { describe, expect, it } from "vitest";
import type { NextConfig } from "next";
import { IRIS_ALIASES, withIris } from "../src/next";

const site = { images: { remoteHosts: ["images.unsplash.com", "cdn.exemplo.com"] } };

describe("withIris", () => {
  it("põe o core em transpilePackages e mantém os pacotes do projeto", () => {
    const config = withIris(site, { transpilePackages: ["minha-lib"] });
    expect(config.transpilePackages).toEqual(["minha-lib", "@cbjk_iris/core"]);
  });

  it("põe o engine em serverExternalPackages e mantém os pacotes do projeto", () => {
    const config = withIris(site, { serverExternalPackages: ["pg"] });
    expect(config.serverExternalPackages).toEqual(["pg", "@cbjk_iris/engine"]);
  });

  it("não repete pacote que o projeto já listou", () => {
    const config = withIris(site, {
      transpilePackages: ["@cbjk_iris/core"],
      serverExternalPackages: ["@cbjk_iris/engine"],
    });
    expect(config.transpilePackages).toEqual(["@cbjk_iris/core"]);
    expect(config.serverExternalPackages).toEqual(["@cbjk_iris/engine"]);
  });

  it("nenhum pacote fica ao mesmo tempo em transpilePackages e serverExternalPackages", () => {
    const config = withIris(site, { transpilePackages: ["a"], serverExternalPackages: ["b"] });
    const transpiled = new Set(config.transpilePackages);
    const both = (config.serverExternalPackages ?? []).filter((p) => transpiled.has(p));
    expect(both).toEqual([]);
  });

  it("falha com mensagem clara se o projeto puser um pacote nas duas listas", () => {
    expect(() => withIris(site, { serverExternalPackages: ["@cbjk_iris/core"] })).toThrow(
      /@cbjk_iris\/core.*transpilePackages.*serverExternalPackages/,
    );
    expect(() => withIris(site, { transpilePackages: ["@cbjk_iris/engine"] })).toThrow(
      /@cbjk_iris\/engine/,
    );
    expect(() =>
      withIris(site, { transpilePackages: ["x"], serverExternalPackages: ["x"] }),
    ).toThrow(/"x"/);
  });

  it("configura os dois aliases do projeto em turbopack.resolveAlias", () => {
    const config = withIris(site);
    expect(config.turbopack?.resolveAlias).toEqual({
      "@cbjk_iris/site-config": "./site.config.ts",
      "@cbjk_iris/site-registry": "./app/iris.registry.generated.tsx",
    });
    expect(IRIS_ALIASES).toEqual(config.turbopack?.resolveAlias);
  });

  it("mantém aliases e opções de turbopack do projeto, e os do Iris prevalecem", () => {
    const config = withIris(site, {
      turbopack: {
        root: "/x",
        resolveAlias: { lodash: "lodash-es", "@cbjk_iris/site-config": "./outro.ts" },
      },
    });
    expect(config.turbopack?.root).toBe("/x");
    expect(config.turbopack?.resolveAlias).toEqual({
      lodash: "lodash-es",
      "@cbjk_iris/site-config": "./site.config.ts",
      "@cbjk_iris/site-registry": "./app/iris.registry.generated.tsx",
    });
  });

  it("transforma images.remoteHosts em remotePatterns https, depois dos padrões do projeto", () => {
    const config = withIris(site, {
      images: { unoptimized: false, remotePatterns: [{ protocol: "https", hostname: "a.com" }] },
    });
    expect(config.images?.unoptimized).toBe(false);
    expect(config.images?.remotePatterns).toEqual([
      { protocol: "https", hostname: "a.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.exemplo.com" },
    ]);
  });

  it("aceita site sem hosts remotos", () => {
    const config = withIris({ images: { remoteHosts: [] } });
    expect(config.images?.remotePatterns).toEqual([]);
  });

  it("nunca define webpack (o Next 16 falha o build com essa chave)", () => {
    const config = withIris(site, { reactStrictMode: true });
    expect("webpack" in config).toBe(false);
    expect(config.reactStrictMode).toBe(true);
  });

  it("repassa as outras opções do projeto, como allowedDevOrigins", () => {
    const config = withIris(site, { allowedDevOrigins: ["minha-maquina.tailnet.ts.net"] });
    expect(config.allowedDevOrigins).toEqual(["minha-maquina.tailnet.ts.net"]);
  });

  it("não altera os objetos recebidos", () => {
    const input: NextConfig = {
      transpilePackages: ["a"],
      serverExternalPackages: ["b"],
      turbopack: { resolveAlias: { c: "d" } },
      images: { remotePatterns: [{ protocol: "https", hostname: "e.com" }] },
    };
    const snapshot = structuredClone(input);
    const siteSnapshot = structuredClone(site);
    withIris(site, input);
    expect(input).toEqual(snapshot);
    expect(site).toEqual(siteSnapshot);
  });
});
