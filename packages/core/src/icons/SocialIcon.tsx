import { Link2 } from "lucide-react";
import type { SocialNetwork } from "@cbjk_iris/schema";
import { SOCIAL_ICON_PATHS } from "./social-paths";
import { cn } from "../lib/utils";

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  x: "X",
  pinterest: "Pinterest",
  threads: "Threads",
  linkedin: "LinkedIn",
};

export function SocialIcon({ network, className }: { network: SocialNetwork; className?: string }) {
  // o LinkedIn saiu do simple-icons a pedido da marca; usa um ícone genérico de link
  if (network === "linkedin") return <Link2 className={cn("size-5", className)} aria-hidden />;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-5", className)} aria-hidden>
      <path d={SOCIAL_ICON_PATHS[network]} />
    </svg>
  );
}
