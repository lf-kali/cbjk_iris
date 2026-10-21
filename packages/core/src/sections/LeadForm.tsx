"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import type { LeadField } from "@cbjk_iris/schema";
import type { LeadsConfig, SiteTexts } from "@cbjk_iris/schema";
import { buttonVariants } from "../ui/button";
import { submitLead, type LeadData } from "../lib/leads";
import { cn } from "../lib/utils";

const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const FIELD_INPUT: Record<LeadField, { type: string; autoComplete: string; required: boolean }> = {
  name: { type: "text", autoComplete: "name", required: true },
  phone: { type: "tel", autoComplete: "tel", required: true },
  email: { type: "email", autoComplete: "email", required: false },
  message: { type: "textarea", autoComplete: "off", required: false },
};

export function LeadForm({
  config,
  fields,
  texts,
  submitLabel,
  consentText,
}: {
  config: LeadsConfig;
  fields: LeadField[];
  texts: SiteTexts["leadForm"];
  submitLabel?: string;
  consentText?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const isWhatsapp = config.provider === "whatsapp";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // honeypot: robôs preenchem o campo escondido; pessoas não
    if (form.get("website")) return;

    const data: LeadData = Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? "")]));
    setStatus("sending");
    try {
      const result = await submitLead(config, data, { ...texts, intro: texts.whatsappIntro });
      if (result.kind === "whatsapp") {
        window.open(result.url, "_blank", "noopener,noreferrer");
        setStatus("idle");
      } else {
        setStatus("sent");
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-card p-6 text-card-foreground">
        <CheckCircle2 className="size-6 shrink-0 text-primary" aria-hidden />
        <p>{texts.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      {fields.map((field) => {
        const input = FIELD_INPUT[field];
        const id = `lead-${field}`;
        return (
          <div key={field} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-card-foreground">
              {texts[field]}
              {input.required && <span className="text-destructive"> *</span>}
            </label>
            {input.type === "textarea" ? (
              <textarea id={id} name={field} rows={4} required={input.required} className={INPUT} />
            ) : (
              <input id={id} name={field} type={input.type} autoComplete={input.autoComplete} required={input.required} className={INPUT} />
            )}
          </div>
        );
      })}

      <div aria-hidden className="absolute -left-[9999px]">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {consentText && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" required className="mt-0.5 accent-primary" />
          <span>{consentText}</span>
        </label>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className={cn(buttonVariants({ variant: isWhatsapp ? "cta" : "default", size: "lg" }), "gap-2")}
      >
        {isWhatsapp && <MessageCircle className="size-4" />}
        {status === "sending" ? texts.sending : (submitLabel ?? texts.submit)}
      </button>

      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">{texts.error}</p>
      )}
    </form>
  );
}
