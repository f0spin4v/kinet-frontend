import { Page, expect, test } from '@playwright/test';
import { fallo, ok, simularApi } from './utils/api';
import { PREGUNTAS, sesion } from './utils/datos';

async function llenarFormulario(page: Page, cambios: Partial<Record<string, string>> = {}) {
  const datos = {
    Nombres: 'Ana',
    Apellidos: 'Pérez',
    Gamertag: 'ana_fit',
    Correo: 'ana@kinet.com',
    Contraseña: 'Segura123',
    ...cambios,
  };
  for (const [campo, valor] of Object.entries(datos)) {
    await page.getByLabel(campo, { exact: true }).fill(valor ?? '');
  }
}

const aceptar = (page: Page) => page.getByRole('checkbox');
const crear = (page: Page) => page.getByRole('button', { name: 'Crear cuenta' });

test.describe('Registro', () => {
  test('un registro válido envía los datos y lleva a la evaluación', { tag: '@principal' }, async ({ page }) => {
    const peticiones = await simularApi(page, {
      'POST /auth/registro': ok(sesion({ nivelHabilidad: null }), 201),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
    });

    await test.step('Dado que estoy en la pantalla de registro', async () => {
      await page.goto('/registro');
    });
    await test.step('Cuando lleno el formulario, acepto la política y pulso "Crear cuenta"', async () => {
      await llenarFormulario(page);
      await aceptar(page).check();
      await crear(page).click();
    });
    await test.step('Entonces paso a la evaluación de nivel', async () => {
      await expect(page).toHaveURL(/\/evaluacion$/);
    });
    await test.step('Y el backend recibió mis datos', async () => {
      expect(peticiones[0].cuerpo).toEqual({
        nombres: 'Ana',
        apellidos: 'Pérez',
        correo: 'ana@kinet.com',
        contrasena: 'Segura123',
        gamertag: 'ana_fit',
        fechaNacimiento: null,
        aceptaPolitica: true,
      });
    });
  });

  test('con el formulario vacío marca todos los campos obligatorios', async ({ page }) => {
    const peticiones = await simularApi(page, {});

    await page.goto('/registro');
    await crear(page).click();

    for (const mensaje of [
      'Escribe tus nombres.',
      'Escribe tus apellidos.',
      'Elige un gamertag.',
      'Escribe tu correo.',
      'Escribe una contraseña.',
      'Debes aceptar la política de tratamiento de datos.',
    ]) {
      await expect(page.getByText(mensaje)).toBeVisible();
    }
    expect(peticiones).toHaveLength(0);
  });

  test('valida la longitud y los caracteres del gamertag', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/registro');

    await llenarFormulario(page, { Gamertag: 'ab' });
    await crear(page).click();
    await expect(page.getByText('El gamertag debe tener entre 3 y 30 caracteres.')).toBeVisible();

    await page.getByLabel('Gamertag').fill('ana fit!');
    await expect(page.getByText('El gamertag solo puede tener letras, números y guion bajo.')).toBeVisible();
  });

  test('la contraseña necesita 8 caracteres con letra y número', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/registro');

    await llenarFormulario(page, { Contraseña: 'abc1' });
    await crear(page).click();
    await expect(page.getByText('La contraseña debe tener entre 8 y 72 caracteres.')).toBeVisible();

    await page.getByLabel('Contraseña', { exact: true }).fill('solotexto');
    await expect(page.getByText('La contraseña debe incluir al menos una letra y un número.')).toBeVisible();
  });

  test('sin aceptar la política no se envía', async ({ page }) => {
    const peticiones = await simularApi(page, {});
    await page.goto('/registro');

    await llenarFormulario(page);
    await crear(page).click();

    await expect(page.getByText('Debes aceptar la política de tratamiento de datos.')).toBeVisible();
    expect(peticiones).toHaveLength(0);
  });

  test('un correo ya registrado muestra el mensaje del servidor', async ({ page }) => {
    await simularApi(page, { 'POST /auth/registro': fallo(409, 'El correo ya está registrado.') });
    await page.goto('/registro');

    await llenarFormulario(page);
    await aceptar(page).check();
    await crear(page).click();

    await expect(page.getByRole('alert')).toHaveText('El correo ya está registrado.');
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('los errores de validación del servidor se muestran juntos', async ({ page }) => {
    await simularApi(page, {
      'POST /auth/registro': fallo(400, [
        { campo: 'correo', mensaje: 'El correo no tiene un formato válido.' },
        { campo: 'gamertag', mensaje: 'El gamertag ya está en uso.' },
      ]),
    });
    await page.goto('/registro');

    await llenarFormulario(page);
    await aceptar(page).check();
    await crear(page).click();

    await expect(page.getByRole('alert')).toHaveText('El correo no tiene un formato válido. El gamertag ya está en uso.');
  });

  test('el enlace lleva al login', async ({ page }) => {
    await simularApi(page, {});

    await page.goto('/registro');
    await page.getByRole('link', { name: 'Inicia sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
