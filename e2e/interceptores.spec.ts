import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi, sinConexion } from './utils/api';
import { TOKEN, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

/** src/app/core/interceptors: authInterceptor y respuestaInterceptor. */
test.describe('Comunicación con la API', () => {
  test('con sesión, cada petición lleva el token', async ({ page }) => {
    await conSesion(page);
    const peticiones = await simularApi(page, {
      'GET /usuarios/me': ok(usuario()),
      'PUT /usuarios/me': ok(usuario({ nombres: 'María' })),
    });

    await page.goto('/tabs/perfil/editar');
    await page.getByLabel('Nombres').fill('María');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect.poll(() => peticiones.some(p => p.metodo === 'PUT')).toBe(true);

    expect(peticiones.length).toBeGreaterThanOrEqual(2);
    for (const p of peticiones) {
      expect(p.autorizacion).toBe(`Bearer ${TOKEN}`);
    }
  });

  test('sin sesión no se envía el encabezado de autorización', async ({ page }) => {
    const peticiones = await simularApi(page, { 'POST /auth/login': fallo(401, 'Credenciales inválidas') });

    await page.goto('/login');
    await page.getByLabel('Correo').fill('ana@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Segura123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    expect(peticiones[0].autorizacion).toBeNull();
  });

  test('un 401 a mitad de uso cierra la sesión y lleva al login', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario()),
      'PUT /usuarios/me': fallo(401, 'Token vencido.'),
    });

    await page.goto('/tabs/perfil/editar');
    await page.getByLabel('Nombres').fill('María');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });

  test('un error sin el formato del backend muestra un mensaje genérico', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario()),
      'PUT /usuarios/me': { status: 500, body: null },
    });

    await page.goto('/tabs/perfil/editar');
    await page.getByLabel('Nombres').fill('María');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('alert')).toHaveText('Ocurrió un error inesperado. Intenta de nuevo.');
  });

  test('si el servidor no responde se avisa de la conexión', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario()),
      'PUT /usuarios/me': sinConexion,
    });

    await page.goto('/tabs/perfil/editar');
    await page.getByLabel('Nombres').fill('María');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('alert')).toHaveText('No hay conexión con el servidor. Revisa tu internet.');
  });
});
