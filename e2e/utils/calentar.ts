import { FullConfig, chromium } from '@playwright/test';

/**
 * Se ejecuta una vez antes de las pruebas. En la primera visita, el servidor de Angular compila las
 * pantallas y optimiza dependencias (a veces recargando la página), lo que hacía fallar por tiempo
 * las primeras pruebas. Abrir cada ruta aquí deja todo listo.
 */
export default async function calentar(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:4200';
  const navegador = await chromium.launch();
  const page = await navegador.newPage();
  await page.route('**/api/**', route => route.fulfill({ status: 401, json: { error: true, respuesta: '' } }));

  for (const ruta of ['/login', '/registro', '/evaluacion', '/tabs/inicio', '/tabs/perfil', '/tabs/perfil/editar']) {
    await page.goto(baseURL + ruta, { waitUntil: 'networkidle', timeout: 120_000 });
  }
  // con sesión simulada, para que también carguen las pantallas internas
  await page.evaluate(() => localStorage.setItem('CapacitorStorage.kinet_token', 'calentamiento'));
  await page.unroute('**/api/**');
  await page.route('**/api/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type' },
    json: {
      error: false,
      respuesta: {
        id: 1, nombres: 'A', apellidos: 'B', correo: 'a@b.co', rol: 'JUGADOR', estado: 'ACTIVO', gamertag: 'ab',
        avatarUrl: null, fechaNacimiento: null, nivelHabilidad: 'INTERMEDIO', fechaRegistro: '2026-01-01T00:00:00',
      },
    },
  }));
  for (const ruta of ['/tabs/inicio', '/tabs/perfil', '/tabs/perfil/editar']) {
    await page.goto(baseURL + ruta, { waitUntil: 'networkidle', timeout: 120_000 });
  }

  await navegador.close();
}
