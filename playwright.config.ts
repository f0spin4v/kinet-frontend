import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas funcionales del frontend (Playwright).
 *
 * - npm run e2e        → solo las pruebas @principal, con el navegador visible y en cámara lenta (proyecto "visual").
 * - npm run e2e:todas  → todas las pruebas, en escritorio y en un celular emulado (proyectos "escritorio" y "movil").
 *
 * La API se simula en cada prueba (e2e/utils/api.ts), así que no hace falta el backend ni Oracle.
 * Playwright levanta "npm start" solo; si ya hay un ng serve en el puerto 4200, lo reutiliza.
 */
export default defineConfig({
  testDir: './e2e',
  // abre la app una vez antes de las pruebas para que Angular termine de compilar (ver e2e/utils/calentar.ts)
  globalSetup: './e2e/utils/calentar.ts',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: process.env['CI'] ? 1 : undefined,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    {
      name: 'visual',
      grep: /@principal/,
      fullyParallel: false,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        // Con E2E_SIN_VENTANA=1 corre sin abrir el navegador (servidores sin pantalla).
        headless: !!process.env['E2E_SIN_VENTANA'],
        launchOptions: { slowMo: process.env['E2E_SIN_VENTANA'] ? 0 : 350 },
      },
    },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env['E2E_SERVIDOR'] ?? 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
