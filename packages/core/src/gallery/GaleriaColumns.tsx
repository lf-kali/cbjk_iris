"use client";

import { ColumnsPhotoAlbum } from "react-photo-album";
import "react-photo-album/columns.css";
import type { GalleryPhoto } from "./gallery";

export function GaleriaColumns({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <ColumnsPhotoAlbum
      photos={photos}
      columns={(containerWidth) => {
        // ajusta o número de colunas conforme a largura do container
        if (containerWidth < 480) return 1;
        if (containerWidth < 900) return 2;
        return 3;
      }}
      spacing={8}
    />
  );
}