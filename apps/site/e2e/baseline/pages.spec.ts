import { expect, test, type Page } from "@playwright/test";

// Linha de base visual (SPEC §6.1, "Migração sem mudança visual" e "Linha de base v1").
// Claro e escuro vêm dos projetos do playwright.config.ts (colorScheme), porque o site usa colorMode "system".

const PAGES = [
  { name: "home", path: "/" },
  { name: "produtos", path: "/produtos" },
  { name: "produto", path: "/produto/porcelanato-marmo-carrara-90x90" },
  { name: "sobre", path: "/sobre" },
] as const;

// Relógio fixo: o FadeCarousel troca de slide a cada 6 s por setInterval.
const START = new Date("2026-01-01T12:00:00Z").getTime();

async function settle(page: Page) {
  // pausa o relógio logo depois da carga, bem antes do primeiro autoplay do carrossel (6 s)
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);

  // imagens com loading="lazy" só carregam perto da viewport: rola a página inteira.
  // Os passos esperam pelo lado do Node, porque o relógio pausado congela setTimeout e rAF da página.
  const { height, step } = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    step: Math.max(200, Math.floor(window.innerHeight / 2)),
  }));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );
  await page.evaluate(() => document.fonts.ready);
}

for (const { name, path } of PAGES) {
  test(`${name} igual à linha de base`, async ({ page }) => {
    await page.clock.install({ time: START });
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
