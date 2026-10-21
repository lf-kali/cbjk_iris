import { expect, test } from "@playwright/test";
import { PAGES, START, settle } from "./shared";

// Linha de base visual (SPEC §6.1, "Migração sem mudança visual" e "Linha de base v1").
// Claro e escuro vêm dos projetos do playwright.config.ts (colorScheme), porque o site usa colorMode "system".

for (const { name, path } of PAGES) {
  test(`${name} igual à linha de base`, async ({ page }) => {
    await page.clock.install({ time: START });
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
