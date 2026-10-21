import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi, sinConexion, ultima } from './utils/api';
import { apiDeInicio, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

test.describe('Comunicación con la API', () => {
  test('cada petición lleva el token de la sesión', async ({ page }) => {
    await conSesion(page, 'mi-token');
    const peticiones = await simularApi(page, apiDeInicio());

    await page.goto('/tabs/inicio');
    await expect(page.getByRole('heading', { name: /Hola, laura_runner/ })).toBeVisible();

    expect(ultima(peticiones, 'GET /usuarios/me')?.token).toBe('mi-token');
    expect(ultima(peticiones, 'GET /progreso')?.token).toBe('mi-token');
  });

  test('un 401 a mitad de uso cierra la sesión y manda al login', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      ...apiDeInicio(),
      'GET /progreso': fallo(401, 'Tu sesión no es válida o ya venció.'),
    });

    await page.goto('/tabs/inicio');

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });

  test('un error sin el formato del backend muestra un mensaje genérico', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      ...apiDeInicio(),
      'GET /progreso': { status: 500, cuerpo: 'Internal Server Error' },
    });

    await page.goto('/tabs/inicio');

    await expect(page.getByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeVisible();
  });

  test('sin conexión la pantalla lo avisa', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, { ...apiDeInicio(), 'GET /progreso': sinConexion });

    await page.goto('/tabs/inicio');

    await expect(page.getByText('No hay conexión con el servidor. Revisa tu internet.')).toBeVisible();
  });

  test('el login no envía token cuando no hay sesión', async ({ page }) => {
    const peticiones = await simularApi(page, { 'POST /auth/login': fallo(401, 'Correo o contraseña incorrectos.') });

    await page.goto('/login');
    await page.getByLabel('Correo').fill('laura@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Kinet2026');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    expect(ultima(peticiones, 'POST /auth/login')?.token).toBeNull();
    expect(usuario().correo).toBe('laura@kinet.com');
  });
});
