// Layout fino: o layout de verdade é o IrisRootLayout do core (SPEC §5.1.3).
// Na E6 este arquivo passa a ser gerado pelo iris sync.
import "./globals.css";
import { IrisRootLayout } from "@cbjk_iris/core/app/layout";
import { fontClassName } from "./fonts.generated";

export { irisMetadata as metadata } from "@cbjk_iris/core/app/layout";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <IrisRootLayout fontClassName={fontClassName}>{children}</IrisRootLayout>;
}
