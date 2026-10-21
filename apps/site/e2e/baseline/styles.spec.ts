import { expect, test } from "@playwright/test";
import { PAGES, START, settle } from "./shared";

// Reforço da linha de base: estilos computados de todos os elementos da página.
// A captura de página inteira com maxDiffPixelRatio 0.001 deixa passar ajuste pequeno
// (ex.: text-sm → text-[15px] num link). Aqui qualquer mudança de tipografia, forma ou cor
// num único elemento muda o snapshot. Geometria (largura, altura, posição) fica de fora:
// depende da métrica da fonte e já é coberta pelas capturas.
//
// O snapshot é um multiconjunto: cada assinatura (tag, data-slot e propriedades) com quantas
// vezes aparece, em ordem alfabética. Assim o arquivo fica pequeno e o diff, legível.

const PROPS = [
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-decoration-line",
  "color",
  "background-color",
  "border-radius",
  "border-width",
  "border-style",
  "border-color",
  "box-shadow",
  "outline-width",
  "backdrop-filter",
  "filter",
  "padding",
  "gap",
] as const;

for (const { name, path } of PAGES) {
  test(`${name}: estilos computados iguais à linha de base`, async ({ page }) => {
    await page.clock.install({ time: START });
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await settle(page);

    const signatures = await page.evaluate((props) => {
      const counts = new Map<string, number>();
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        // partes internas de ícones SVG e scripts não têm estilo de forma
        if (el.closest("svg") !== null && el.tagName.toLowerCase() !== "svg") continue;
        if (["script", "style", "noscript", "template"].includes(el.tagName.toLowerCase())) continue;
        const cs = getComputedStyle(el);
        const slot = el.getAttribute("data-slot");
        const values = props.map((p) => `${p}:${cs.getPropertyValue(p)}`).join("; ");
        const key = `${el.tagName.toLowerCase()}${slot ? `[${slot}]` : ""} { ${values} }`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => `${n} × ${k}`);
    }, PROPS);

    expect(signatures.join("\n") + "\n").toMatchSnapshot(`${name}-styles.txt`);
  });
}
