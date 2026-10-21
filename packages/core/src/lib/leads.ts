import type { LeadField } from "@cbjk_iris/schema";
import type { LeadsConfig } from "@cbjk_iris/schema";
import { whatsappUrl } from "./whatsapp";

export type LeadData = Partial<Record<LeadField, string>>;

export type LeadResult = { kind: "sent" } | { kind: "whatsapp"; url: string };

/**
 * Envia um lead para o destino configurado em siteConfig.leads.
 * Para ligar o backend no futuro: implementar o caso "backend" (ex.: POST em /api/leads).
 */
export async function submitLead(
  config: LeadsConfig,
  data: LeadData,
  labels: Record<LeadField, string> & { intro: string },
): Promise<LeadResult> {
  switch (config.provider) {
    case "whatsapp": {
      const lines = (Object.keys(data) as LeadField[])
        .filter((field) => data[field]?.trim())
        .map((field) => `*${labels[field]}:* ${data[field]!.trim()}`);
      const message = [config.intro ?? labels.intro, "", ...lines].join("\n");
      return { kind: "whatsapp", url: whatsappUrl(message) };
    }
    case "endpoint": {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...config.extraFields, ...data }),
      });
      if (!res.ok) throw new Error(`O endpoint respondeu ${res.status}`);
      return { kind: "sent" };
    }
    case "backend":
      throw new Error('siteConfig.leads.provider "backend" ainda não está implementado.');
  }
}
