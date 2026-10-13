import type { ComponentType } from "react";
import type { Section, SectionOf } from "./sections";

// Parcial: um módulo removido some do registro, mas o tipo da seção continua na união.
export type SectionRegistry = {
  [T in Section["type"]]?: ComponentType<{ section: SectionOf<T> }>;
};
