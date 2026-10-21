"use client";

import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import type { GalleryPhoto } from "./gallery";

export function GaleriaRows({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <RowsPhotoAlbum
      photos={photos}
      targetRowHeight={280} // altura "alvo" de cada linha do mosaico
      spacing={8}
      rowConstraints={{
        singleRowMaxHeight: 360, // evita linha única gigante com poucas fotos
      }}
    />
  );
}