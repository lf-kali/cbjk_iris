import type { Metadata } from "next";
import { mont } from "./fonts/fonts";
import "./globals.css";
import MobileHeader from '../components/header/MobileHeader';
import { Noto_Sans, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import DesktopHeader from '../components/header/DesktopHeader';

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "JR - Acabamentos de alto padrão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "bg-background", "antialiased", mont.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <div className="lg:hidden sticky top-0 z-50">
          <MobileHeader/>
        </div>
        <div className="hidden lg:flex sticky top-0 z-50">
          <DesktopHeader/>
        </div>
        {children}
      </body>
    </html>
  );
}
