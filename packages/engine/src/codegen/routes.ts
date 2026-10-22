// SyncRoutes (SPEC §5.1.3 e §5.6): o app/ fino do projeto. Gera app/layout.tsx e uma rota
// app/(iris)/<rota>/page.tsx por página do core, só das rotas do núcleo e dos módulos ativos.
// Rota de módulo desligado que ainda existe (gerada) é apagada. A tabela ROUTE_PAGES é contrato:
// as páginas do core precisam exportar os nomes listados (teste no core).
import type { ModuleId, SiteConfig } from "@cbjk_iris/schema";
import { GENERATED_HEADER, type SyncPlan } from "./files";

export const LAYOUT_FILE = "app/layout.tsx";
export const ROUTES_DIR = "app/(iris)";

export interface RoutePage {
  /** caminho dentro de app/(iris)/; "" é a home */
  route: string;
  module: "core" | ModuleId;
  /** subpath de @cbjk_iris/core/app/ */
  page: string;
  exports: readonly string[];
  /** rota com [slug]: escreve dynamicParams = false literal (só os slugs de content/ existem) */
  dynamicParams: boolean;
}

const DETAIL = ["default", "generateStaticParams", "generateMetadata"] as const;
const LIST = ["default", "metadata"] as const;

export const ROUTE_PAGES: readonly RoutePage[] = [
  { route: "", module: "core", page: "home", exports: ["default"], dynamicParams: false },
  { route: "[slug]", module: "core", page: "config-page", exports: DETAIL, dynamicParams: true },
  { route: "produtos", module: "products", page: "products/list", exports: LIST, dynamicParams: false },
  { route: "produto/[slug]", module: "products", page: "products/detail", exports: DETAIL, dynamicParams: true },
  { route: "servicos", module: "services", page: "services/list", exports: LIST, dynamicParams: false },
  { route: "servico/[slug]", module: "services", page: "services/detail", exports: DETAIL, dynamicParams: true },
  { route: "ultimos-projetos", module: "gallery", page: "gallery/page", exports: LIST, dynamicParams: false },
];

export function routeFile(route: string): string {
  return `${ROUTES_DIR}/${route ? `${route}/` : ""}page.tsx`;
}

export function renderRoute(page: RoutePage): string {
  const from = `@cbjk_iris/core/app/${page.page}`;
  const lines = [
    GENERATED_HEADER,
    `// Rota fina: a página é do core (${from}). Para regenerar: npm run sync (depois, iris sync).`,
    `export { ${page.exports.join(", ")} } from "${from}";`,
  ];
  if (page.dynamicParams) {
    lines.push("// só os slugs de content/ existem: slug desconhecido é 404, sem ler content/ em tempo de execução");
    lines.push("export const dynamicParams = false;");
  }
  return `${lines.join("\n")}\n`;
}

export function renderLayout(): string {
  return `${GENERATED_HEADER}
// Layout fino: o layout de verdade é o IrisRootLayout do core (SPEC §5.1.3). Para regenerar: npm run sync (depois, iris sync).
import "./globals.css";
import { IrisRootLayout } from "@cbjk_iris/core/app/layout";
import { fontClassName } from "./fonts.generated";

export { irisMetadata as metadata } from "@cbjk_iris/core/app/layout";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <IrisRootLayout fontClassName={fontClassName}>{children}</IrisRootLayout>;
}
`;
}

export function planRoutes(config: SiteConfig): SyncPlan {
  const active = (p: RoutePage) => p.module === "core" || config.modules.includes(p.module);
  const files = new Map<string, string>([[LAYOUT_FILE, renderLayout()]]);
  for (const page of ROUTE_PAGES.filter(active)) files.set(routeFile(page.route), renderRoute(page));
  const remove = ROUTE_PAGES.filter((p) => !active(p)).map((p) => routeFile(p.route));
  return { files, remove, diagnostics: [], pruneRoot: ROUTES_DIR };
}
