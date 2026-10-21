import { expect, Page, test } from '@playwright/test';
import { fallo, ok, simularApi, ultima } from './utils/api';
import { PREGUNTAS, sesion } from './utils/datos';
import { escribir, pausa } from './utils/demo';

/** Llena el formulario de registro con datos válidos; `cambios` reemplaza algún campo. */
async function llenarRegistro(page: Page, cambios: Partial<Record<string, string>> = {}): Promise<void> {
  const datos = {
    Nombres: 'Mateo',
    Apellidos: 'Ríos',
    Gamertag: 'mateo_run',
    Correo: 'mateo@kinet.com',
    'Contraseña': 'Kinet2026',
    ...cambios,
  };
  for (const [campo, valor] of Object.entries(datos)) {
    await escribir(page.getByLabel(campo, { exact: true }), valor ?? '');
  }
}

test.describe('Registro', () => {
  test('un registro válido lleva a la evaluación', { tag: '@principal' }, async ({ page }) => {
    const peticiones = await simularApi(page, {
      'POST /auth/registro': ok(sesion({ nombres: 'Mateo', apellidos: 'Ríos', gamertag: 'mateo_run', correo: 'mateo@kinet.com', nivelHabilidad: null }), 201),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
    });

    // 1. Abre el registro
    await page.goto('/registro');
    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
    await pausa(page);

    // 2. Llena sus datos y acepta la política de datos
    await llenarRegistro(page);
    await page.getByLabel('Acepto la política de tratamiento de datos personales.').check();
    await pausa(page);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    // 3. Queda dentro y lo manda a la evaluación de nivel
    await expect(page).toHaveURL(/\/evaluacion$/);
    await expect(page.getByText('Pregunta 1 de 5')).toBeVisible();
    await expect(page.getByRole('heading', { name: '¿Pregunta 1 de la evaluación?' })).toBeVisible();
    await pausa(page);

    // 4. El backend recibió los datos del formulario
    expect(ultima(peticiones, 'POST /auth/registro')?.cuerpo).toEqual({
      nombres: 'Mateo',
      apellidos: 'Ríos',
      gamertag: 'mateo_run',
      correo: 'mateo@kinet.com',
      contrasena: 'Kinet2026',
      fechaNacimiento: null,
      aceptaPolitica: true,
    });
  });

  test('los campos obligatorios vacíos muestran sus errores', async ({ page }) => {
    const peticiones = await simularApi(page, {});
    await page.goto('/registro');

    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Escribe tus nombres.')).toBeVisible();
    await expect(page.getByText('Escribe tus apellidos.')).toBeVisible();
    await expect(page.getByText('Elige un gamertag.')).toBeVisible();
    await expect(page.getByText('Escribe tu correo.')).toBeVisible();
    await expect(page.getByText('Escribe una contraseña.')).toBeVisible();
    await expect(page.getByText('Debes aceptar la política de tratamiento de datos.')).toBeVisible();
    expect(ultima(peticiones, 'POST /auth/registro')).toBeUndefined();
  });

  test('el gamertag solo admite letras, números y guion bajo', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/registro');

    await llenarRegistro(page, { Gamertag: 'mateo run!' });
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('El gamertag solo puede tener letras, números y guion bajo.')).toBeVisible();
  });

  test('la contraseña necesita letras y números', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/registro');

    await llenarRegistro(page, { 'Contraseña': 'solamenteletras' });
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('La contraseña debe incluir al menos una letra y un número.')).toBeVisible();
  });

  test('la contraseña corta se rechaza', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/registro');

    await llenarRegistro(page, { 'Contraseña': 'Ab1' });
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('La contraseña debe tener entre 8 y 72 caracteres.')).toBeVisible();
  });

  test('un correo ya registrado muestra el mensaje del servidor', async ({ page }) => {
    await simularApi(page, { 'POST /auth/registro': fallo(409, 'Ya existe una cuenta con ese correo.') });
    await page.goto('/registro');

    await llenarRegistro(page);
    await page.getByLabel('Acepto la política de tratamiento de datos personales.').check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('alert')).toHaveText('Ya existe una cuenta con ese correo.');
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('los errores de validación del servidor se muestran', async ({ page }) => {
    await simularApi(page, {
      'POST /auth/registro': fallo(400, [{ campo: 'gamertag', mensaje: 'Ese gamertag ya está en uso.' }]),
    });
    await page.goto('/registro');

    await llenarRegistro(page);
    await page.getByLabel('Acepto la política de tratamiento de datos personales.').check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('alert')).toHaveText('Ese gamertag ya está en uso.');
  });

  test('el enlace vuelve al inicio de sesión', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/registro');

    await page.getByRole('link', { name: 'Inicia sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
