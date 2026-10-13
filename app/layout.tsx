import type { Metadata } from "next";
import "./globals.css";
import { fontClassName } from "./fonts.generated";
import MobileHeader from '../components/header/MobileHeader';
import { cn } from "@/lib/utils";
import DesktopHeader from '../components/header/DesktopHeader';
import { siteConfig } from "@/site.config";
import { themeInitScript } from "@/lib/theme";
import { renderThemeCss, resolveSiteTheme } from "@/lib/brand";
import { SiteFooter } from "@/components/footer/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: siteConfig.seo.title,
    template: siteConfig.seo.titleTemplate,
  },
  description: siteConfig.seo.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
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
