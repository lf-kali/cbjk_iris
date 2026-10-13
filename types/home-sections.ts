import type { ComponentType } from "react";
import type { HomeSection } from "./site-config";

type SectionOf<T extends HomeSection["type"]> = Extract<HomeSection, { type: T }>;

// Parcial: um módulo removido some do registro, mas o tipo da seção continua na união.
export type HomeSectionRegistry = {
  [T in HomeSection["type"]]?: ComponentType<{ section: SectionOf<T> }>;
};
