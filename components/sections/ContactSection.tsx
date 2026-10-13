import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ContactSection as ContactSectionConfig } from "@/types/sections";
import type { SocialNetwork } from "@/types/site-config";
import { siteConfig } from "@/site.config";
import { SocialIcon, SOCIAL_LABELS } from "@/components/icons/SocialIcon";
import { SectionShell } from "./SectionShell";
import { LinkButton } from "./LinkButton";

export function ContactSection({ section }: { section: ContactSectionConfig }) {
  const contact = siteConfig.contact ?? {};
  const texts = siteConfig.texts.sections.contact;
  const social = Object.entries(contact.social ?? {}) as [SocialNetwork, string][];
  const showMap = section.showMap && contact.mapEmbedUrl;

  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle}>
      <div className={showMap ? "grid gap-8 md:grid-cols-2" : "max-w-xl"}>
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-4 text-sm">
            {contact.address && (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold text-foreground">{texts.address}</dt>
                  <dd className="text-muted-foreground">{contact.address}</dd>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold text-foreground">{texts.phone}</dt>
                  <dd><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="text-muted-foreground hover:text-foreground">{contact.phone}</a></dd>
                </div>
              </div>
            )}
            {contact.email && (
              <div className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold text-foreground">{texts.email}</dt>
                  <dd><a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-foreground">{contact.email}</a></dd>
                </div>
              </div>
            )}
            {contact.hours && contact.hours.length > 0 && (
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold text-foreground">{texts.hours}</dt>
                  {contact.hours.map((line) => (
                    <dd key={line} className="text-muted-foreground">{line}</dd>
                  ))}
                </div>
              </div>
            )}
          </dl>

          <LinkButton link={{ label: texts.whatsapp, whatsapp: true }} variant="cta" className="w-fit" />

          {social.length > 0 && (
            <ul className="flex gap-2">
              {social.map(([network, url]) => (
                <li key={network}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABELS[network]}
                    className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <SocialIcon network={network} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {showMap && (
          <iframe
            src={contact.mapEmbedUrl}
            title={texts.mapTitle}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-80 w-full rounded-lg border border-border"
          />
        )}
      </div>
    </SectionShell>
  );
}
