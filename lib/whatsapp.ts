import type { Product } from "@/types/product";
import type { Service } from "@/types/service";

// TODO: substituir pelo número real da JR Acabamentos, formato internacional sem espaços/símbolos
const WHATSAPP_PHONE = "5551999999999";

function buildWhatsappLink(message: string): string {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${WHATSAPP_PHONE}?${params.toString()}`;
}

export function buildWhatsappUrl(product: Product): string {
  const price = product.price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const message = [
    `Olá! Tenho interesse no produto abaixo:`,
    ``,
    `*${product.name}*`,
    `Valor: ${price}`,
    ``,
    `Podem me passar mais informações e condições?`,
  ].join("\n");

  return buildWhatsappLink(message);
}

export function buildServiceQuoteUrl(service: Service): string {
  const message = [
    `Olá! Gostaria de pedir um orçamento para o serviço abaixo:`,
    ``,
    `*${service.name}*`,
    ``,
    `Podem me passar mais informações sobre prazo e valores?`,
  ].join("\n");

  return buildWhatsappLink(message);
}
