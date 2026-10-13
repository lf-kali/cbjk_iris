import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Link estilizado como botão: o Button do base-ui não deve renderizar <a>.
export function WhatsappButton({
  href,
  label,
  size = "lg",
  className,
}: {
  href: string;
  label: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "cta", size }), "w-full gap-2", className)}
    >
      <MessageCircle className={size === "lg" ? "size-5" : "size-4"} />
      {label}
    </a>
  );
}
