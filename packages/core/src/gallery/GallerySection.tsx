import Image from "next/image";
import Link from "next/link";
import type { GallerySection as GallerySectionConfig } from "@cbjk_iris/schema";
import { siteConfig } from "../lib/config";
import { getGalleryPhotos } from "./gallery";
import { SectionShell } from "../sections/SectionShell";

const GALLERY_ROUTE = "/ultimos-projetos";

// Seção "gallery": prévia das fotos mais recentes, com link para a galeria completa.
export function GallerySection({ section }: { section: GallerySectionConfig }) {
  const photos = getGalleryPhotos().slice(0, section.limit ?? 6);
  if (photos.length === 0) return null;

  return (
    <SectionShell
      id={section.id}
      title={section.title}
      subtitle={section.subtitle}
      action={<Link href={GALLERY_ROUTE} className="text-sm font-medium text-primary hover:underline">{siteConfig.texts.sections.seeAll} →</Link>}
    >
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <Image src={photo.src} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
