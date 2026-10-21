import fs from "fs";
import path from "path";
import sizeOf from "image-size";

export type GalleryPhoto = {
  src: string;
  width: number;
  height: number;
};

// Pasta local com as imagens. Para usar links externos (API/CDN), troque esta
// função por uma que devolva o mesmo formato { src, width, height }.
const GALLERY_DIR = path.join(process.cwd(), "public", "ultimos_projetos");

export function getGalleryPhotos(): GalleryPhoto[] {
  // pasta ausente = galeria vazia, não erro de build
  if (!fs.existsSync(GALLERY_DIR)) return [];

  const files = fs
    .readdirSync(GALLERY_DIR)
    .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file))
    .sort();

  return files.map((file) => {
    const buffer = fs.readFileSync(path.join(GALLERY_DIR, file));
    const dimensions = sizeOf(buffer);

    return {
      src: `/ultimos_projetos/${file}`,
      width: dimensions.width ?? 1,
      height: dimensions.height ?? 1,
    };
  });
}
