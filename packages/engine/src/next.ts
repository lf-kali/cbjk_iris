// withIris: liga um projeto Next ao Iris (SPEC §5.1.3). Uso no next.config.ts do projeto:
//   export default withIris(siteConfig, { ...opções do Next });
// Só usa transpilePackages, serverExternalPackages, turbopack.resolveAlias e images.
// Nunca define "webpack": o Next 16 usa Turbopack e falha o build com essa chave.
import type { NextConfig } from "next";
import type { SiteConfig } from "@cbjk_iris/schema";

/** O que o withIris lê do config do site. */
export type WithIrisSiteConfig = Pick<SiteConfig, "images">;

const CORE = "@cbjk_iris/core";
const ENGINE = "@cbjk_iris/engine";

/**
 * Aliases que o core usa para ler o projeto. Os mesmos caminhos vão no "paths" do tsconfig.json
 * do projeto: o Turbopack resolve o build e o tsc precisa dos paths (spike-001, ponto 3).
 */
export const IRIS_ALIASES = {
  "@cbjk_iris/site-config": "./site.config.ts",
  "@cbjk_iris/site-registry": "./app/iris.registry.generated.tsx",
} as const;

function withPackage(list: readonly string[] | undefined, pkg: string): string[] {
  const current = [...(list ?? [])];
  return current.includes(pkg) ? current : [...current, pkg];
}

// O Next recusa um pacote nas duas listas; a mensagem dele não diz de onde veio o pacote.
function assertDisjoint(transpile: readonly string[], external: readonly string[]) {
  const transpiled = new Set(transpile);
  const both = external.filter((pkg) => transpiled.has(pkg));
  if (both.length) {
    throw new Error(
      `withIris: ${both.map((p) => `"${p}"`).join(", ")} não pode estar em transpilePackages e em serverExternalPackages ao mesmo tempo. ` +
        `O Iris põe ${CORE} só em transpilePackages (TSX fonte) e ${ENGINE} só em serverExternalPackages (roda no Node). ` +
        `Tire o pacote de uma das listas no next.config.ts.`,
    );
  }
}

export function withIris(siteConfig: WithIrisSiteConfig, nextConfig: NextConfig = {}): NextConfig {
  const transpilePackages = withPackage(nextConfig.transpilePackages, CORE);
  const serverExternalPackages = withPackage(nextConfig.serverExternalPackages, ENGINE);
  assertDisjoint(transpilePackages, serverExternalPackages);

  const remotePatterns = [
    ...(nextConfig.images?.remotePatterns ?? []),
    ...siteConfig.images.remoteHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
  ];

  return {
    ...nextConfig,
    transpilePackages,
    serverExternalPackages,
    turbopack: {
      ...nextConfig.turbopack,
      resolveAlias: { ...nextConfig.turbopack?.resolveAlias, ...IRIS_ALIASES },
    },
    images: { ...nextConfig.images, remotePatterns },
  };
}
