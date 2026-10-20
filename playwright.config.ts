import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas funcionales de interfaz. La API se simula en cada prueba (e2e/utils/api.ts),
 * así que no hace falta el backend ni Oracle: solo el servidor de Angular.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/utils/calentar.ts',
  fullyParallel: true,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list', { printSteps: true }], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    locale: 'es-CO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
    // npm run e2e: navegador visible y en cámara lenta, para ver cómo se llena cada pantalla
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'], headless: false, launchOptions: { slowMo: 700 } },
    },
  ],
  webServer: {
    command: 'npm start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
    // salida ligera: sin los avisos de compilación de Angular
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
