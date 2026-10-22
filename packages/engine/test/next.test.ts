import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextConfig } from "next";
import { IRIS_ALIASES, withIris } from "../src/next";
import { siteConfigFixture } from "./fixtures/site-config";

const site = siteConfigFixture({ images: { remoteHosts: ["images.unsplash.com", "cdn.exemplo.com"] } });

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
    const config = withIris(siteConfigFixture());
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

  it("valida o config inteiro: config inválido falha com mensagem em pt-BR e o caminho do campo", () => {
    expect(() => withIris(siteConfigFixture({ images: { remoteHosts: ["**"] } }))).toThrow(
      /site\.config\.ts tem erros:[\s\S]*images\.remoteHosts\[0\]: host inválido/,
    );
    expect(() => withIris(siteConfigFixture({ whatsapp: { phone: "abc", messages: { general: "a", product: "a", service: "a" } } }))).toThrow(
      /whatsapp\.phone/,
    );
  });

  it("recusa curinga e IP em remoteHosts antes de virar remotePatterns (proxy aberto no /_next/image)", () => {
    for (const host of ["*", "**", "*.com", "127.0.0.1", "a.com/x"]) {
      expect(() => withIris(siteConfigFixture({ images: { remoteHosts: [host] } })), host).toThrow(/remoteHosts/);
    }
  });

  describe("images.dangerouslyAllowLocalIP do projeto (P-3: aviso, sem bloquear)", () => {
    afterEach(() => vi.restoreAllMocks());

    it("avisa no stderr e mantém a opção", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const config = withIris(site, { images: { dangerouslyAllowLocalIP: true } });
      expect(config.images?.dangerouslyAllowLocalIP).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/dangerouslyAllowLocalIP.*rede interna/s);
    });

    it("qualquer valor verdadeiro (o Next testa truthy) também avisa", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      for (const value of ["true", 1]) withIris(site, { images: { dangerouslyAllowLocalIP: value as never } });
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it("sem a opção, ou com false: nenhum aviso", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      withIris(site);
      withIris(site, { images: { dangerouslyAllowLocalIP: false } });
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
