import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { SiteLink } from "@cbjk_iris/schema";
import { buttonVariants } from "../ui/button";
import { resolveLink } from "../lib/links";
import { cn } from "../lib/utils";

type Variant = "default" | "cta" | "outline" | "secondary" | "ghost";

// Botão a partir de um SiteLink do config. Links do WhatsApp ganham o ícone e abrem em nova aba.
export function LinkButton({
  link,
  variant = "default",
  size = "lg",
  className,
}: {
  link: SiteLink;
  variant?: Variant;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { href, external } = resolveLink(link);
  const classes = cn(buttonVariants({ variant, size }), "gap-2", className);
  const content = (
    <>
      {"whatsapp" in link && <MessageCircle className="size-4" />}
      {link.label}
    </>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
