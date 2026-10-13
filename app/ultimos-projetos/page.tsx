import { getGalleryPhotos } from "@/lib/gallery";
// import { GaleriaRows } from "@/components/gallery/GaleriaRows";
import { GaleriaColumns } from "@/components/gallery/GaleriaColumns";
import { siteConfig } from "@/site.config";

export const metadata = {
  title: "Últimos Projetos",
};

export default function GaleriaPage() {
  const photos = getGalleryPhotos();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <section className="text-center">
        <h1 className="text-4xl py-4 font-bold">{siteConfig.texts.gallery.title}</h1>
        {photos.length > 0 ? (
          <GaleriaColumns photos={photos} />
        ) : (
          <p className="py-10 text-muted-foreground">{siteConfig.texts.gallery.empty}</p>
        )}
      </section>
    </main>
  );
}