import { defineConfig, devices } from "@playwright/test";

// Config do Playwright do apps/site (dono: iris-architect, SPEC §5.8).
// Uso: `npm run e2e -- <pasta>` na raiz (ex.: `npm run e2e -- baseline`).
// Cada frente tem uma pasta em e2e/ (baseline, theme, commerce).
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

// O servidor sobe a partir deste diretório (apps/site). A linha de base v0 foi capturada antes
// da migração, com o site ainda na raiz do repositório (docs/spec/migration-001.md).
const SERVER_DIR = process.env.E2E_SERVER_DIR ?? __dirname;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  // capturas em e2e/<pasta>/__screenshots__/, sem sufixo de plataforma (SPEC §5.8)
  snapshotPathTemplate: "{testDir}/{testFileDir}/__screenshots__/{testFileName}/{arg}-{projectName}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "desktop-dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
    { name: "mobile-light", use: { ...devices["Pixel 7"], colorScheme: "light" } },
    { name: "mobile-dark", use: { ...devices["Pixel 7"], colorScheme: "dark" } },
  ],
  webServer: {
    // `next start` do build de produção; rode `npm run build` antes
    command: `npx next start -p ${PORT} -H 127.0.0.1`,
    cwd: SERVER_DIR,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
