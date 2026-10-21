import { chromium, FullConfig } from '@playwright/test';

/**
 * Antes de las pruebas abre la app una vez y espera a que pinte el inicio de sesión.
 * La primera vez que arranca ng serve, Angular y Vite compilan y optimizan dependencias, y la página puede
 * quedar en blanco o recargarse sola durante varios segundos. Así ninguna prueba arranca con la app a medio cargar.
 */
export default async function calentar(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:4200';
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  // la API no importa aquí: cualquier llamada responde 404
  await pagina.route(/\/api\//, ruta => ruta.fulfill({ status: 404, json: { error: true, respuesta: 'calentando' } }));

  const limite = Date.now() + 180_000;
  let listo = false;
  while (!listo && Date.now() < limite) {
    try {
      await pagina.goto(`${baseURL}/login`, { waitUntil: 'load', timeout: 60_000 });
      await pagina.getByRole('heading', { name: 'Inicia sesión' }).waitFor({ timeout: 20_000 });
      // una segunda carga confirma que Vite ya no está recargando la página
      await pagina.reload({ waitUntil: 'load' });
      await pagina.getByRole('heading', { name: 'Inicia sesión' }).waitFor({ timeout: 20_000 });
      listo = true;
    } catch {
      // sigue compilando: se intenta de nuevo
    }
  }
  await navegador.close();
  if (!listo) throw new Error('La app no cargó en 3 minutos. Abre http://localhost:4200 y revisa la consola de ng serve.');
}
