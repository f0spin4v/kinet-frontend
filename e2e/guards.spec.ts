import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi } from './utils/api';
import { PREGUNTAS, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

/** Reglas de src/app/core/guards/auth-guard.ts. */
test.describe('Acceso a las rutas', () => {
  test.describe('sin sesión', () => {
    test.beforeEach(async ({ page }) => {
      await simularApi(page, {});
    });

    for (const ruta of ['/tabs/perfil', '/tabs/inicio', '/evaluacion', '/']) {
      test(`${ruta} lleva al login`, async ({ page }) => {
        await page.goto(ruta);
        await expect(page).toHaveURL(/\/login$/);
      });
    }

    test('el registro está disponible', async ({ page }) => {
      await page.goto('/registro');
      await expect(page).toHaveURL(/\/registro$/);
      await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
    });
  });

  test.describe('con sesión, sin evaluación', () => {
    test.beforeEach(async ({ page }) => {
      await conSesion(page);
      await simularApi(page, {
        'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
        'GET /evaluacion/preguntas': ok(PREGUNTAS),
      });
    });

    for (const ruta of ['/tabs', '/tabs/perfil', '/login', '/registro']) {
      test(`${ruta} lleva a la evaluación`, async ({ page }) => {
        await page.goto(ruta);
        await expect(page).toHaveURL(/\/evaluacion$/);
      });
    }
  });

  test.describe('con sesión y evaluación hecha', () => {
    test.beforeEach(async ({ page }) => {
      await conSesion(page);
      await simularApi(page, { 'GET /usuarios/me': ok(usuario()) });
    });

    for (const ruta of ['/login', '/registro', '/evaluacion']) {
      test(`${ruta} lleva a la app`, async ({ page }) => {
        await page.goto(ruta);
        await expect(page).toHaveURL(/\/tabs/);
      });
    }

    test('puede entrar al perfil', async ({ page }) => {
      await page.goto('/tabs/perfil');
      await expect(page).toHaveURL(/\/tabs\/perfil$/);
    });
  });

  test('el equipo (administrador, entrenador) va a su panel sin hacer la evaluación', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, { 'GET /usuarios/me': ok(usuario({ rol: 'ADMINISTRADOR', nivelHabilidad: null })) });

    await page.goto('/evaluacion');
    await expect(page).toHaveURL(/\/staff/);
  });

  test('un jugador no puede entrar al panel del equipo', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, { 'GET /usuarios/me': ok(usuario()) });

    await page.goto('/staff');
    await expect(page).toHaveURL(/\/tabs/);
  });

  test('un token vencido se descarta y lleva al login', async ({ page }) => {
    await conSesion(page, 'token-vencido');
    await simularApi(page, { 'GET /usuarios/me': fallo(401, 'Token inválido o vencido.') });

    await page.goto('/tabs/perfil');

    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => tokenGuardado(page)).toBeNull();
  });
});
