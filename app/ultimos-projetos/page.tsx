import { getGalleryPhotos } from "@/lib/gallery";
// import { GaleriaRows } from "@/components/GaleriaRows";
import { GaleriaColumns } from "@/components/GaleriaColumns";

export const metadata = {
  title: "Últimos Projetos",
};

export default function GaleriaPage() {
  const photos = getGalleryPhotos();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <section className="text-center">
        <h2 className="text-4xl py-4 font-bold">Nossos últimos serviços</h2>
        <GaleriaColumns photos={photos} />
      </section>
    </main>
  );
}