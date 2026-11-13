// Testes no navegador (docs/testes.md): jornadas E2E (tests/e2e) e acessibilidade com axe-core
// (tests/a11y), no Chromium, contra o site de verdade (front + Functions + D1 local) que o
// tests/e2e/servidor.mjs sobe com o modo demonstração ligado.
//   npm run test:e2e    jornadas, em tela de celular e de computador
//   npm run test:a11y   telas principais, nos temas claro e escuro
import { defineConfig, devices } from '@playwright/test'
import { dados } from './tests/e2e/dados'

const CI = Boolean(process.env.CI)
const SITE = `http://localhost:${dados.porta}`

/** Celular do docs/testes.md (TE10): 390 × 844, com toque. */
const CELULAR = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
}

export default defineConfig({
  // As jornadas mudam o mesmo banco (estoque, pontos da Ana): uma de cada vez.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [['list'], ['html', { open: 'never' }], ['github']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: SITE,
    locale: 'pt-BR',
    timezoneId: 'America/Araguaina',
    // Sem service worker: cada teste vê o site como ele está, sem cache do PWA.
    serviceWorkers: 'block',
    // O mapa é 3D (WebGL): no CI não há GPU, então o Chromium desenha por software (SwiftShader).
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'e2e-celular', testDir: 'tests/e2e', use: CELULAR },
    { name: 'e2e-computador', testDir: 'tests/e2e', use: { ...devices['Desktop Chrome'] } },
    // Movimento reduzido: o axe mede as cores no estado final, não no meio de uma animação.
    { name: 'a11y', testDir: 'tests/a11y', use: { ...CELULAR, reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: 'node tests/e2e/servidor.mjs',
    url: `${SITE}/api/saude`,
    // Na máquina, reaproveita um servidor que já esteja de pé (o banco não é refeito).
    reuseExistingServer: !CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
