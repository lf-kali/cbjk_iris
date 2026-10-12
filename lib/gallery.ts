import fs from "fs";
import path from "path";
import sizeOf from "image-size";

export type GalleryPhoto = {
  src: string;
  width: number;
  height: number;
};

// Pasta local com as imagens. Troque pelo caminho que preferir.
// (Quando migrar pra links externos, basta trocar essa função por
// uma que retorne o mesmo formato { src, width, height } vindo da
// sua API/CDN — o resto do código não muda.)
const GALLERY_DIR = path.join(process.cwd(), "public", "ultimos_projetos");

export function getGalleryPhotos(): GalleryPhoto[] {
  const files = fs
    .readdirSync(GALLERY_DIR)
    .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file));

  return files.map((file) => {
    const filePath = path.join(GALLERY_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const dimensions = sizeOf(buffer);

    return {
      src: `/ultimos_projetos/${file}`,
      width: dimensions.width ?? 1,
      height: dimensions.height ?? 1,
    };
  });
}