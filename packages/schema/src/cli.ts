// Envelope --json e códigos de saída da CLI (SPEC §5.7). Implementação: iris-cli.
import { z } from "zod";
import type { Diagnostic, FileChange } from "./engine-api";

export const EXIT_CODES = {
  INTERNAL: 1,
  USAGE: 2,
  MISSING_REQUIRED: 3,
  VALIDATION: 4,
  CONFLICT: 5,
  ENVIRONMENT: 6,
  CONFIG_NOT_EDITABLE: 7,
  CANCELLED: 130,
} as const;

export type CliErrorCode = keyof typeof EXIT_CODES;

export type CliError = {
  [C in CliErrorCode]: { code: C; exitCode: (typeof EXIT_CODES)[C]; message: string; hint?: string; missing?: string[] };
}[CliErrorCode];

interface CliResultBase {
  schemaVersion: 1;
  command: string;
  changes: FileChange[];
  warnings: Diagnostic[];
}

export type CliResult<T = unknown> =
  | (CliResultBase & { ok: true; data: T })
  | (CliResultBase & { ok: false; data: null; error: CliError });

const diagnosticSchema = z.strictObject({
  level: z.enum(["error", "warning"]),
  file: z.string(),
  path: z.string().optional(),
  message: z.string(),
  hint: z.string().optional(),
});

const fileChangeSchema = z.strictObject({ path: z.string(), action: z.enum(["create", "update", "delete"]) });

const cliErrorSchema = z
  .strictObject({
    code: z.enum(Object.keys(EXIT_CODES) as [CliErrorCode, ...CliErrorCode[]]),
    exitCode: z.number().int(),
    message: z.string().min(1),
    hint: z.string().optional(),
    missing: z.array(z.string()).optional(),
  })
  .refine((e) => EXIT_CODES[e.code] === e.exitCode, { error: "exitCode não corresponde ao code", path: ["exitCode"] });

const base = {
  schemaVersion: z.literal(1),
  command: z.string(),
  changes: z.array(fileChangeSchema),
  warnings: z.array(diagnosticSchema),
};

/** Valida um envelope --json em runtime (usado pelos testes de não travamento da CLI). */
export const cliResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ...base, ok: z.literal(true), data: z.unknown() }),
  z.strictObject({ ...base, ok: z.literal(false), data: z.null(), error: cliErrorSchema }),
]);
