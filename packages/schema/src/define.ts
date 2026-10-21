// Formato do schema de seção (SPEC §5.5, ADR 002). Dono: iris-architect.
import { z } from "zod";
import type { ModuleId } from "./modules";

export const FIELD_INPUTS = ["text", "multiline", "url", "image", "number", "select", "multiselect", "confirm", "icon", "link"] as const;
export const FIELD_ASK = ["always", "optional", "never"] as const;

/**
 * Metadados de campo, via .meta() (por último na cadeia, depois de .optional() e .default()).
 * Validados em runtime por defineSection: não há module augmentation do zod, para não mudar
 * o zod de quem instala o pacote.
 */
export const fieldMetaSchema = z.strictObject({
  /** obrigatório quando o campo é perguntado */
  label: z.string().min(1).optional(),
  /** ajuda na CLI e no hover do JSON */
  description: z.string().min(1).optional(),
  /** placeholder da pergunta e exemplo no erro */
  example: z.string().optional(),
  /** tipo de pergunta; ausente = inferido do tipo zod (pela CLI) */
  input: z.enum(FIELD_INPUTS).optional(),
  /** se a CLI pergunta; ausente = "always" se obrigatório, "never" se opcional */
  ask: z.enum(FIELD_ASK).optional(),
  /** ordem das perguntas; ausente = ordem do objeto */
  order: z.number().optional(),
});
export type FieldMeta = z.infer<typeof fieldMetaSchema>;
export type FieldInput = (typeof FIELD_INPUTS)[number];
export type FieldAsk = (typeof FIELD_ASK)[number];

export type SectionModule = "core" | ModuleId;
export interface SectionLimits {
  maxPerPage?: number;
  homeOnly?: boolean;
}

/** Campos comuns das seções (menos o hero, que só tem id). */
export const sectionBase = z.object({
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, { error: "use letras minúsculas, números e hífens (ex.: contato)" })
    .optional()
    .meta({ label: "Âncora", description: "Identificador para links do tipo #contato" }),
  title: z.string().min(1).optional().meta({ label: "Título", ask: "optional" }),
  subtitle: z.string().min(1).optional().meta({ label: "Subtítulo", ask: "optional" }),
});

/** Metadado do campo (o registrado na própria instância). */
export function fieldMeta(schema: z.ZodType): FieldMeta | undefined {
  return z.globalRegistry.get(schema) as FieldMeta | undefined;
}

function isOptional(schema: z.ZodType): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault || schema instanceof z.ZodPrefault;
}

/** Se a CLI pergunta o campo: o ask do metadado, ou "always" se obrigatório e "never" se opcional. */
export function fieldAsk(schema: z.ZodType): FieldAsk {
  return fieldMeta(schema)?.ask ?? (isOptional(schema) ? "never" : "always");
}

// tira optional/default/nullable para chegar no tipo do valor
function unwrap(schema: z.ZodType): z.ZodType {
  let s = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault || s instanceof z.ZodPrefault || s instanceof z.ZodNullable) {
    s = s.unwrap() as z.ZodType;
  }
  return s;
}

/** Problemas de metadado nos campos de um objeto, recursivo (listas, objetos e uniões). */
export function fieldProblems(shape: Record<string, z.ZodType>, prefix = ""): string[] {
  return Object.entries(shape).flatMap(([key, field]) => {
    if (field instanceof z.ZodLiteral) return [];
    const path = prefix + key;
    const problems: string[] = [];
    const meta = fieldMeta(field);
    if (meta && !fieldMetaSchema.safeParse(meta).success) problems.push(`${path}: meta inválido (${JSON.stringify(meta)})`);
    const ask = fieldAsk(field);
    if (ask !== "never" && !meta?.label) problems.push(`${path} é perguntado (ask "${ask}") e não tem label`);
    return [...problems, ...nested(unwrap(field), path)];
  });
}

function nested(schema: z.ZodType, path: string): string[] {
  if (schema instanceof z.ZodObject) return fieldProblems(schema.shape as Record<string, z.ZodType>, `${path}.`);
  if (schema instanceof z.ZodArray) return nested(unwrap(schema.element as z.ZodType), `${path}[]`);
  if (schema instanceof z.ZodUnion) return (schema.options as z.ZodType[]).flatMap((o) => nested(unwrap(o), path));
  return [];
}

/** Monta o schema final da seção: os campos mais o type literal, strict. */
function sectionSchemaOf<T extends string, S extends z.ZodRawShape>(type: T, fields: z.ZodObject<S>) {
  return fields.extend({ type: z.literal(type) }).strict();
}

export type SectionSchemaOf<T extends string, S extends z.ZodRawShape> = ReturnType<typeof sectionSchemaOf<T, S>>;

export interface SectionPreset<V = unknown> {
  id: string;
  label: string;
  value: V;
}

export interface SectionDefinition<T extends string = string, M extends SectionModule = SectionModule, S extends z.ZodRawShape = z.ZodRawShape> {
  type: T;
  module: M;
  label: string;
  description: string;
  schema: SectionSchemaOf<T, S>;
  presets: SectionPreset<Omit<z.input<SectionSchemaOf<T, S>>, "type">>[];
  limits: SectionLimits;
}

/**
 * Define uma seção. Falha na hora (na importação do pacote) se: o type não é kebab-case,
 * um metadado é inválido, um campo perguntado não tem label, ou um preset não valida.
 */
export function defineSection<const T extends string, const M extends SectionModule, S extends z.ZodRawShape>(def: {
  type: T;
  module: M;
  label: string;
  description: string;
  fields: z.ZodObject<S>;
  presets?: SectionPreset<Omit<z.input<SectionSchemaOf<T, S>>, "type">>[];
  limits?: SectionLimits;
}): SectionDefinition<T, M, S> {
  const where = `defineSection("${def.type}")`;
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(def.type)) throw new Error(`${where}: o type precisa ser kebab-case`);
  const problems = fieldProblems(def.fields.shape as unknown as Record<string, z.ZodType>);
  if (problems.length) throw new Error(`${where}: ${problems.join("; ")}`);
  const schema = sectionSchemaOf(def.type, def.fields);
  const presets = def.presets ?? [];
  for (const preset of presets) {
    const r = schema.safeParse({ ...(preset.value as object), type: def.type });
    if (!r.success) throw new Error(`${where}: preset "${preset.id}" não valida: ${r.error.message}`);
  }
  return { type: def.type, module: def.module, label: def.label, description: def.description, schema, presets, limits: def.limits ?? {} };
}
