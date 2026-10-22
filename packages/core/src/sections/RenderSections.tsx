import type { Section } from "@cbjk_iris/schema";
// registro gerado no projeto (app/iris.registry.generated.tsx), lido pelo alias (SPEC §5.1.3)
import { sectionRegistry } from "@cbjk_iris/site-registry";

// Renderiza uma lista de seções do conteúdo (home ou página). Tipo sem componente
// registrado = módulo removido sem tirar a seção do conteúdo: falha o build com aviso claro.
export function RenderSections({ sections }: { sections: Section[] }) {
  return sections.map((section, i) => {
    const Component = sectionRegistry[section.type] as React.ComponentType<{ section: Section }> | undefined;
    if (!Component) {
      throw new Error(
        `Seção "${section.type}" está no conteúdo (content/home.json ou content/pages/), mas nenhum módulo ativo a fornece. ` +
          `Remova-a do conteúdo ou rode "npm run modules:sync".`,
      );
    }
    return <Component key={`${section.type}-${i}`} section={section} />;
  });
}
