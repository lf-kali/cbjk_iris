export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

// Roda no <head> antes da primeira pintura: aplica a preferência salva ou o tema do sistema.
// A lógica precisa ficar igual à de applyTheme.
export const themeInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.dataset.themePref=p}catch(_){}})()`;

function readStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

// Uma única MediaQueryList: o ouvinte precisa ser adicionado e removido no mesmo objeto.
let darkQuery: MediaQueryList | null = null;

function getDarkQuery(): MediaQueryList {
  if (darkQuery === null) darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  return darkQuery;
}

function prefersDark(): boolean {
  return getDarkQuery().matches;
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  const dark = preference === "dark" || (preference === "system" && prefersDark());
  root.classList.toggle("dark", dark);
  root.dataset.themePref = preference;
}

// Store mínima para useSyncExternalStore: a preferência atual, compartilhada entre os botões.
let current: ThemePreference | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getThemePreference(): ThemePreference {
  if (current === null) current = readStoredPreference();
  return current;
}

export function getServerThemePreference(): ThemePreference {
  return "system";
}

export function setThemePreference(preference: ThemePreference) {
  current = preference;
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // sem localStorage: vale só para esta visita
  }
  applyTheme(preference);
  notify();
}

export function subscribeThemePreference(listener: () => void) {
  listeners.add(listener);

  // Só o primeiro inscrito escuta o sistema e as outras abas.
  if (listeners.size === 1) {
    getDarkQuery().addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      getDarkQuery().removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    }
  };
}

function onSystemChange() {
  if (getThemePreference() === "system") applyTheme("system");
}

function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
  current = readStoredPreference();
  applyTheme(current);
  notify();
}
