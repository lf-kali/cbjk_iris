import Link from "next/link";
import type { SocialNetwork } from "@/types/site-config";
import type { SiteLink } from "@/types/sections";
import { siteConfig } from "@/site.config";
import { fillTemplate } from "@/lib/format";
import { resolveLink } from "@/lib/links";
import { SiteLogo } from "@/components/brand/SiteLogo";
import { SocialIcon, SOCIAL_LABELS } from "@/components/icons/SocialIcon";

function FooterLink({ link }: { link: SiteLink }) {
  const { href, external } = resolveLink(link);
  const className = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{link.label}</a>
  ) : (
    <Link href={href} className={className}>{link.label}</Link>
  );
}

export function SiteFooter() {
  const { footer, contact, texts } = siteConfig;
  const columns = footer?.columns ?? [
    {
      title: texts.footer.menu,
      links: siteConfig.menu.filter((item) => item.path).map((item) => ({ label: item.title, href: item.path! })),
    },
  ];
  const social = Object.entries(contact?.social ?? {}) as [SocialNetwork, string][];
  const contactLines = [contact?.phone, contact?.email, contact?.address].filter(Boolean) as string[];

  return (
    <footer className="mt-auto w-full border-t border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SiteLogo logoClassName="h-12" textClassName="text-xl" />
          {footer?.text && <p className="max-w-sm text-sm text-muted-foreground">{footer.text}</p>}
          {social.length > 0 && (
            <ul className="flex gap-2">
              {social.map(([network, url]) => (
                <li key={network}>
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[network]} className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground">
                    <SocialIcon network={network} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.label}><FooterLink link={link} /></li>
              ))}
            </ul>
          </nav>
        ))}

        {contactLines.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">{texts.footer.contact}</h2>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {contactLines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        )}
      </div>
      <p className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        {fillTemplate(texts.footer.copyright, { year: new Date().getFullYear(), name: siteConfig.name })}
      </p>
    </footer>
  );
}
