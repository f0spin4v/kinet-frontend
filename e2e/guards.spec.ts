import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi } from './utils/api';
import { apiDeInicio, PREGUNTAS, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

test.describe('Protección de rutas', () => {
  test('sin sesión, la app manda al inicio de sesión', async ({ page }) => {
    await simularApi(page, {});

    for (const ruta of ['/tabs/inicio', '/tabs/perfil', '/evaluacion', '/staff']) {
      await page.goto(ruta);
      await expect(page, `desde ${ruta}`).toHaveURL(/\/login$/);
    }
  });

  test('con sesión pero sin evaluación, se queda en la evaluación', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
    });

    await page.goto('/tabs/inicio');

    await expect(page).toHaveURL(/\/evaluacion$/);
  });

  test('un jugador evaluado no vuelve a la evaluación ni al login', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, apiDeInicio());

    await page.goto('/evaluacion');
    await expect(page).toHaveURL(/\/tabs\/inicio$/);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/tabs\/inicio$/);
  });

  test('un jugador no entra al panel del equipo', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, apiDeInicio());

    await page.goto('/staff/cuentas');

    await expect(page).toHaveURL(/\/tabs\/inicio$/);
  });

  test('el equipo no necesita evaluación y no entra a la app del jugador', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ rol: 'ENTRENADOR', nivelHabilidad: null })),
    });

    await page.goto('/tabs/inicio');

    await expect(page).toHaveURL(/\/staff/);
  });

  test('un entrenador no abre las páginas del administrador', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ rol: 'ENTRENADOR', nivelHabilidad: null })),
    });

    await page.goto('/staff/cuentas');

    await expect(page).toHaveURL(/\/staff\/moderacion$/);
  });

  test('con el token vencido se borra la sesión y vuelve al login', async ({ page }) => {
    await conSesion(page, 'token-vencido');
    await simularApi(page, { 'GET /usuarios/me': fallo(401, 'Tu sesión no es válida o ya venció.') });

    await page.goto('/tabs/inicio');

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });
});
