import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi, sinConexion } from './utils/api';
import { PREGUNTAS, TOKEN, sesion } from './utils/datos';
import { tokenGuardado } from './utils/sesion';

test.describe('Inicio de sesión', () => {
  const correo = (page: import('@playwright/test').Page) => page.getByLabel('Correo');
  const contrasena = (page: import('@playwright/test').Page) => page.getByLabel('Contraseña', { exact: true });
  const entrar = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Iniciar sesión' });

  test('un jugador ya evaluado entra a la app y queda guardada la sesión', { tag: '@principal' }, async ({ page }) => {
    const peticiones = await simularApi(page, { 'POST /auth/login': ok(sesion()) });

    await test.step('Dado que estoy en la pantalla de inicio de sesión', async () => {
      await page.goto('/login');
    });
    await test.step('Cuando escribo mi correo y contraseña y pulso "Iniciar sesión"', async () => {
      await correo(page).fill('ana@kinet.com');
      await contrasena(page).fill('Segura123');
      await entrar(page).click();
    });
    await test.step('Entonces entro a la app', async () => {
      await expect(page).toHaveURL(/\/tabs/);
    });
    await test.step('Y se enviaron mis credenciales y quedó guardada la sesión', async () => {
      expect(peticiones[0].cuerpo).toEqual({ correo: 'ana@kinet.com', contrasena: 'Segura123' });
      expect(peticiones[0].autorizacion).toBeNull();
      await expect.poll(() => tokenGuardado(page)).toBe(TOKEN);
    });
  });

  test('un jugador sin evaluación va primero a la evaluación', async ({ page }) => {
    await simularApi(page, {
      'POST /auth/login': ok(sesion({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
    });

    await page.goto('/login');
    await correo(page).fill('ana@kinet.com');
    await contrasena(page).fill('Segura123');
    await entrar(page).click();

    await expect(page).toHaveURL(/\/evaluacion$/);
  });

  test('con los campos vacíos muestra los errores y no llama a la API', async ({ page }) => {
    const peticiones = await simularApi(page, {});

    await page.goto('/login');
    await entrar(page).click();

    await expect(page.getByText('Escribe tu correo.')).toBeVisible();
    await expect(page.getByText('Escribe tu contraseña.')).toBeVisible();
    expect(peticiones).toHaveLength(0);
  });

  test('avisa si el correo no tiene formato válido', async ({ page }) => {
    await simularApi(page, {});

    await page.goto('/login');
    await correo(page).fill('ana-sin-arroba');
    await contrasena(page).fill('Segura123');
    await entrar(page).click();

    await expect(page.getByText('El correo no tiene un formato válido.')).toBeVisible();
  });

  test('con credenciales incorrectas muestra el error y sigue en el login', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': fallo(401, 'Credenciales inválidas') });

    await page.goto('/login');
    await correo(page).fill('ana@kinet.com');
    await contrasena(page).fill('Equivocada1');
    await entrar(page).click();

    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('una cuenta bloqueada muestra el mensaje del servidor', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': fallo(403, 'Tu cuenta está bloqueada. Contacta a soporte.') });

    await page.goto('/login');
    await correo(page).fill('ana@kinet.com');
    await contrasena(page).fill('Segura123');
    await entrar(page).click();

    await expect(page.getByRole('alert')).toHaveText('Tu cuenta está bloqueada. Contacta a soporte.');
  });

  test('sin conexión con el servidor lo explica', async ({ page }) => {
    await simularApi(page, { 'POST /auth/login': sinConexion });

    await page.goto('/login');
    await correo(page).fill('ana@kinet.com');
    await contrasena(page).fill('Segura123');
    await entrar(page).click();

    await expect(page.getByRole('alert')).toHaveText('No hay conexión con el servidor. Revisa tu internet.');
  });

  test('el botón del ojo muestra y oculta la contraseña', async ({ page }) => {
    await simularApi(page, {});

    await page.goto('/login');
    await contrasena(page).fill('Segura123');
    await expect(contrasena(page)).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(contrasena(page)).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(contrasena(page)).toHaveAttribute('type', 'password');
  });

  test('el enlace lleva al registro', async ({ page }) => {
    await simularApi(page, {});

    await page.goto('/login');
    await page.getByRole('link', { name: 'Crea tu cuenta' }).click();

    await expect(page).toHaveURL(/\/registro$/);
  });
});
