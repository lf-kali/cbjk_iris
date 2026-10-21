import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "../lib/config";
import { cn } from "../lib/utils";

// Logo + texto vindos de siteConfig.brand. SVG monocromático vira máscara
// pintada com a cor do texto, então acompanha o modo escuro sem precisar de duas versões.
export function SiteLogo({
  logoClassName,
  textClassName,
}: {
  /** altura do logo, ex.: "h-16" (a largura segue a proporção) */
  logoClassName?: string;
  textClassName?: string;
}) {
  const { logo, logoText } = siteConfig.brand;
  const text = logoText ?? (logo ? undefined : siteConfig.name);

  return (
    <Link href="/" className="flex flex-row items-end gap-1 text-foreground" aria-label={siteConfig.name}>
      {logo &&
        (logo.monochrome ? (
          <span
            aria-hidden
            className={cn("block bg-current", logoClassName)}
            style={{
              aspectRatio: `${logo.width} / ${logo.height}`,
              mask: `url(${logo.src}) center / contain no-repeat`,
              WebkitMask: `url(${logo.src}) center / contain no-repeat`,
            }}
          />
        ) : (
          <Image
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            className={cn("w-auto", logoClassName)}
            priority
          />
        ))}
      {text && <span className={cn("font-heading font-extrabold", textClassName)}>{text}</span>}
    </Link>
  );
}
