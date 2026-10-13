import type { Section } from "@/types/sections";
import { sectionRegistry } from "./registry";

// Renderiza uma lista de seções do config (home ou página). Tipo sem componente
// registrado = módulo removido sem tirar a seção do config: falha o build com aviso claro.
export function RenderSections({ sections }: { sections: Section[] }) {
  return sections.map((section, i) => {
    const Component = sectionRegistry[section.type] as React.ComponentType<{ section: Section }> | undefined;
    if (!Component) {
      throw new Error(
        `Seção "${section.type}" está no site.config.ts, mas nenhum módulo ativo a fornece. ` +
          `Remova-a do config ou rode "npm run modules:sync".`,
      );
    }
    return <Component key={`${section.type}-${i}`} section={section} />;
  });
}
