// Layout raiz do Iris (SPEC §5.1.3). O app/layout.tsx do projeto importa o globals.css,
// reexporta irisMetadata como metadata e renderiza <IrisRootLayout fontClassName={...}>.
// Server component: é o único lugar do core que importa o engine (que roda pelo Node).
import type { Metadata } from "next";
import MobileHeader from '../header/MobileHeader';
import { cn } from "../lib/utils";
import DesktopHeader from '../header/DesktopHeader';
import { siteConfig } from "../lib/config";
import { themeInitScript } from "../theme/theme";
import { renderThemeCss, resolveSiteTheme } from "@cbjk_iris/engine/theme";
import { SiteFooter } from "../footer/SiteFooter";

export const irisMetadata: Metadata = {
  title: {
    default: siteConfig.seo.title,
    template: siteConfig.seo.titleTemplate,
  },
  description: siteConfig.seo.description,
};

export function IrisRootLayout({
  children,
  fontClassName,
}: Readonly<{
  children: React.ReactNode;
  /** classes das variáveis de fonte, de app/fonts.generated.ts do projeto */
  fontClassName: string;
}>) {
  const { colorMode } = siteConfig.theme;

  return (
    <html
      lang={siteConfig.locale}
      className={cn("h-full", "bg-background", "antialiased", fontClassName, "font-sans", colorMode === "dark" && "dark")}
      // o script do tema altera class e data-theme-pref do <html> antes da hidratação
      suppressHydrationWarning={colorMode === "system"}
    >
      <head>
        {/* tema (themes/) + cores da marca viram as variáveis CSS do shadcn */}
        <style dangerouslySetInnerHTML={{ __html: renderThemeCss(resolveSiteTheme(siteConfig.theme.name, siteConfig.brand)) }} />
        {colorMode === "system" && (
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <div className="lg:hidden sticky top-0 z-50">
          <MobileHeader/>
        </div>
        <div className="hidden lg:flex sticky top-0 z-50">
          <DesktopHeader/>
        </div>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
