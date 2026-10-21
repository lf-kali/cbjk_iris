import { expect, test } from "@playwright/test";

// Componente "use client" do core (TSX fonte em transpilePackages) hidrata no apps/site
// (SPEC §6.1 passo 1, ponto 2, refeito depois da migração). Sem hidratação, o clique não faz nada.
test("ThemeToggle do core hidrata e troca o tema", async ({ page, isMobile }) => {
  test.skip(isMobile, "no celular o botão fica dentro do menu lateral; basta o desktop");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/", { waitUntil: "networkidle" });
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^Tema: / });

  await expect(toggle).toHaveAttribute("aria-label", "Tema: sistema. Mudar para claro");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-label", "Tema: claro. Mudar para escuro");
  await expect(html).not.toHaveClass(/\bdark\b/);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-label", "Tema: escuro. Mudar para sistema");
  await expect(html).toHaveClass(/\bdark\b/);
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  expect(errors).toEqual([]);
});
