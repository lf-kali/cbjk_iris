"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../lib/utils"
import {
  getServerThemePreference,
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "./theme"

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
}

const LABEL: Record<ThemePreference, string> = {
  system: "sistema",
  light: "claro",
  dark: "escuro",
}

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    getServerThemePreference,
  )

  // Os ícones seguem o data-theme-pref que o script do <head> grava no <html>,
  // então aparecem certos já na primeira pintura, antes da hidratação.
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("text-foreground", className)}
      onClick={() => setThemePreference(NEXT[preference])}
      aria-label={`Tema: ${LABEL[preference]}. Mudar para ${LABEL[NEXT[preference]]}`}
      title={`Tema: ${LABEL[preference]}`}
    >
      <Monitor className="size-5 in-data-[theme-pref=light]:hidden in-data-[theme-pref=dark]:hidden" />
      <Sun className="size-5 hidden in-data-[theme-pref=light]:block" />
      <Moon className="size-5 hidden in-data-[theme-pref=dark]:block" />
    </Button>
  )
}
