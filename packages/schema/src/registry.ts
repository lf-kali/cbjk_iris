// Tipo do registro de seções gerado no projeto (app/iris.registry.generated.tsx).
// Sem React (regra 5: schema não importa React): o componente é qualquer função que recebe
// { section } — síncrona ou assíncrona (server component). O core faz o cast para ComponentType.
import type { SectionOf, SectionType } from "./sections";

export type SectionComponent<T extends SectionType> = (props: { section: SectionOf<T> }) => unknown;

// Parcial: um módulo desligado some do registro, mas o tipo da seção continua na união.
export type SectionRegistry = {
  [T in SectionType]?: SectionComponent<T>;
};
