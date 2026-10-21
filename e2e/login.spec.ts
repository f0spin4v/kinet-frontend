import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi, sinConexion, ultima } from './utils/api';
import { apiDeInicio, PREGUNTAS, sesion } from './utils/datos';
import { escribir, pausa } from './utils/demo';
import { tokenGuardado } from './utils/sesion';

test.describe('Inicio de sesión', () => {
  test('un jugador evaluado inicia sesión y entra a la app', { tag: '@principal' }, async ({ page }) => {
    const peticiones = await simularApi(page, {
      'POST /auth/login': ok(sesion()),
      ...apiDeInicio(),
    });

    // 1. Abre la pantalla de inicio de sesión
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await pausa(page);

    // 2. Escribe sus credenciales y envía el formulario
    await escribir(page.getByLabel('Correo'), 'laura@kinet.com');
    await escribir(page.getByLabel('Contraseña', { exact: true }), 'Kinet2026');
    await pausa(page);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // 3. Entra a Inicio con sus datos
    await expect(page).toHaveURL(/\/tabs\/inicio$/);
    await expect(page.getByRole('heading', { name: /Hola, laura_runner/ })).toBeVisible();
    await pausa(page);

    // 4. Se envió lo que escribió y quedó guardada la sesión
    expect(ultima(peticiones, 'POST /auth/login')?.cuerpo).toEqual({ correo: 'laura@kinet.com', contrasena: 'Kinet2026' });
    expect(await tokenGuardado(page)).toBe('token-de-prueba');
  });

  test('un jugador sin evaluación va a la evaluación de nivel', async ({ page }) => {
    await simularApi(page, {
      'POST /auth/login': ok(sesion({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
    });

    await page.goto('/login');
    await page.getByLabel('Correo').fill('andres@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Kinet2026');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/evaluacion$/);
    await expect(page.getByText('Pregunta 1 de 5')).toBeVisible();
  });

  test('el equipo (entrenador) entra a su panel', async ({ page }) => {
    await simularApi(page, {
      'POST /auth/login': ok(sesion({ rol: 'ENTRENADOR', correo: 'entrenador@kinet.com', nivelHabilidad: null })),
    });

    await page.goto('/login');
    await page.getByLabel('Correo').fill('entrenador@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Kinet2026');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/staff/);
  });

  test('los campos vacíos muestran sus errores y no se llama a la API', async ({ page }) => {
    const peticiones = await simularApi(page, {});
    await page.goto('/login');

    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Escribe tu correo.')).toBeVisible();
    await expect(page.getByText('Escribe tu contraseña.')).toBeVisible();
    expect(ultima(peticiones, 'POST /auth/login')).toBeUndefined();
  });

  test('un correo con formato inválido se rechaza', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/login');

    await page.getByLabel('Correo').fill('laura-sin-arroba');
    await page.getByLabel('Contraseña', { exact: true }).fill('Kinet2026');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('El correo no tiene un formato válido.')).toBeVisible();
  });

  test('las credenciales incorrectas muestran el mensaje del servidor', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': fallo(401, 'Correo o contraseña incorrectos.') });
    await page.goto('/login');

    await page.getByLabel('Correo').fill('laura@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Equivocada1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });

  test('una cuenta bloqueada no puede entrar', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': fallo(403, 'Tu cuenta está bloqueada. Escribe a soporte.') });
    await page.goto('/login');

    await page.getByLabel('Correo').fill('pedro@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Kinet2026');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByRole('alert')).toHaveText('Tu cuenta está bloqueada. Escribe a soporte.');
  });

  test('sin conexión avisa que no hay servidor', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': sinConexion });
    await page.goto('/login');

    await page.getByLabel('Correo').fill('laura@kinet.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Kinet2026');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByRole('alert')).toHaveText('No hay conexión con el servidor. Revisa tu internet.');
  });

  test('el botón del ojo muestra y oculta la contraseña', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/login');
    const campo = page.getByLabel('Contraseña', { exact: true });
    await campo.fill('Kinet2026');

    await expect(campo).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(campo).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(campo).toHaveAttribute('type', 'password');
  });

  test('el enlace lleva al registro', async ({ page }) => {
    await simularApi(page, {});
    await page.goto('/login');

    await page.getByRole('link', { name: 'Crea tu cuenta' }).click();

    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  });
});
