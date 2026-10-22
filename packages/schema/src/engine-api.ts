// Interface do @cbjk_iris/engine usada pela CLI (SPEC §5.6). Só tipos.
// Implementação: o arquiteto faz projeto, codegen, modules e content; o iris-theme faz theme.
import type { ModuleId } from "./modules";
import type { SiteConfig } from "./site-config";
import type { StyleId } from "./theme/tokens";

export interface Diagnostic {
  level: "error" | "warning";
  /** relativo à raiz do projeto */
  file: string;
  /** ex.: "sections[2].items[0].answer" ou "--radius-card" */
  path?: string;
  /** pt-BR */
  message: string;
  /** comando ou correção */
  hint?: string;
}

export interface SyncResult {
  changed: string[];
  upToDate: boolean;
  diagnostics: Diagnostic[];
}

export interface ThemeInfo {
  name: string;
  source: "builtin" | "project";
  style?: StyleId;
}

export interface StyleInfo {
  id: StyleId;
  label: string;
  description: string;
}

/** Também usado no envelope --json da CLI. */
export interface FileChange {
  path: string;
  action: "create" | "update" | "delete";
}

/** De onde o ImportTheme baixa o tema: exatamente uma fonte. */
export type ImportThemeSource =
  | { tweakcn: string; url?: never; shadcn?: never }
  | { url: string; tweakcn?: never; shadcn?: never }
  | { shadcn: string; tweakcn?: never; url?: never };

// projeto (iris-architect)
/** Importa site.config.ts pelo Node (type stripping) e resolve. */
export type LoadSiteConfig = (root: string) => Promise<SiteConfig>;

// theme (iris-theme)
export type ListThemes = (root: string) => ThemeInfo[];
export type ListStyles = () => StyleInfo[];
export type ValidateTheme = (root: string, name: string) => Diagnostic[];
/** ex-brand:sync: fontes + contraste */
export type SyncBrand = (root: string, opts: { check: boolean }) => SyncResult;
/** ex-theme:add, sem escrever. Só https:, e só variáveis CSS dentro de :root e .dark */
export type ImportTheme = (source: ImportThemeSource, as?: string) => Promise<{ name: string; css: string }>;

// codegen, modules, content (iris-architect)
export type SyncRegistry = (root: string, opts: { check: boolean }) => SyncResult;
export type SyncRoutes = (root: string, opts: { check: boolean }) => SyncResult;
/** brand + registry + routes */
export type Sync = (root: string, opts: { check: boolean }) => SyncResult;
export type CheckContent = (root: string) => Diagnostic[];
/** Tira as seções do módulo de content/home.json e content/pages/*.json. dryRun: só devolve as mudanças (P-4). */
export type RemoveModuleContent = (root: string, id: ModuleId, opts?: { dryRun?: boolean }) => { changes: FileChange[] };
