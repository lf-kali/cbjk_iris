import Image from "next/image";
import { FadeCarousel } from '../components/FadeCarousel';
import { ProductScrollList } from "@/components/product/ProductScrollList"

export default function Home() {
  return (
    <div className="flex flex-col overflow-x-hidden flex-1 items-center justify-center font-mont font-[700]">
      <FadeCarousel
        slides={[
          {
            id: 1,
            image: "https://www.seuprodutonaweb.com.br/fotos/20240429_122606_empreiteiro-de-obras-alto-padrao.jpg",
            alt:"",
            content: (
              <div className="text-white">
                <h2 className="text-3xl font-bold">Acabamentos de precisão</h2>
                <p className="mt-2">Do projeto à entrega, sem retrabalho.</p>
              </div>
            )
          },
          {
            id: 2,
            image: "https://www.seuprodutonaweb.com.br/fotos/20240429_122606_empreiteiro-de-obras-alto-padrao.jpg",
            alt:"",
            content: (
              <div className="text-white">
                <h2 className="text-3xl font-bold">Acabamentos de precisão</h2>
                <p className="mt-2">Do projeto à entrega, sem retrabalho.</p>
              </div>
            )
          },
        ]}
      />

      <ProductScrollList className="p-4.5"/>
    </div>
  );
}
