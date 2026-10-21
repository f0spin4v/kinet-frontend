import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi, ultima } from './utils/api';
import { resultadoEvaluacion, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

const API_PERFIL = {
  'GET /usuarios/me': ok(usuario()),
  'GET /evaluacion': ok(resultadoEvaluacion()),
};

test.describe('Perfil', () => {
  test.beforeEach(async ({ page }) => {
    await conSesion(page);
  });

  test('muestra los datos de la cuenta y la evaluación', async ({ page }) => {
    await simularApi(page, API_PERFIL);

    await page.goto('/tabs/perfil');

    await expect(page.getByRole('heading', { name: 'Laura Gómez' })).toBeVisible();
    await expect(page.getByText('@laura_runner')).toBeVisible();
    await expect(page.locator('.kv-lista').getByText('laura@kinet.com')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Evaluación de nivel' })).toBeVisible();
  });

  test('el tema oscuro se aplica y se mantiene al recargar', async ({ page }) => {
    await simularApi(page, API_PERFIL);
    await page.goto('/tabs/perfil');

    await page.getByRole('radio', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/tema-oscuro/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/tema-oscuro/);
    await expect(page.getByRole('radio', { name: 'Oscuro' })).toHaveAttribute('aria-checked', 'true');
  });

  test('cerrar sesión borra el token y vuelve al login', async ({ page }) => {
    await simularApi(page, API_PERFIL);
    await page.goto('/tabs/perfil');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });

  test('desactivar la cuenta se puede cancelar', async ({ page }) => {
    const peticiones = await simularApi(page, API_PERFIL);
    await page.goto('/tabs/perfil');

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(page).toHaveURL(/\/tabs\/perfil$/);
    expect(ultima(peticiones, 'DELETE /usuarios/me')).toBeUndefined();
  });

  test('desactivar la cuenta confirmada cierra la sesión', async ({ page }) => {
    const peticiones = await simularApi(page, {
      ...API_PERFIL,
      'DELETE /usuarios/me': ok({ mensaje: 'Tu cuenta quedó inactiva.' }),
    });
    await page.goto('/tabs/perfil');

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Desactivar' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Tu cuenta quedó inactiva')).toBeVisible();
    expect(ultima(peticiones, 'DELETE /usuarios/me')).toBeDefined();
    expect(await tokenGuardado(page)).toBeNull();
  });

  test('si falla la desactivación avisa y mantiene la sesión', async ({ page }) => {
    await simularApi(page, {
      ...API_PERFIL,
      'DELETE /usuarios/me': fallo(500, 'No pudimos desactivar tu cuenta.'),
    });
    await page.goto('/tabs/perfil');

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Desactivar' }).click();

    await expect(page.getByText('No pudimos desactivar tu cuenta.')).toBeVisible();
    await expect(page).toHaveURL(/\/tabs\/perfil$/);
    expect(await tokenGuardado(page)).not.toBeNull();
  });
});

test.describe('Editar perfil', () => {
  test.beforeEach(async ({ page }) => {
    await conSesion(page);
  });

  test('carga los datos actuales y guarda los cambios', async ({ page }) => {
    const peticiones = await simularApi(page, {
      ...API_PERFIL,
      'PUT /usuarios/me': ok(usuario({ gamertag: 'laura_trail' })),
    });
    await page.goto('/tabs/perfil/editar');

    await expect(page.getByLabel('Nombres')).toHaveValue('Laura');
    await page.getByLabel('Gamertag').fill('laura_trail');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Perfil actualizado')).toBeVisible();
    expect(ultima(peticiones, 'PUT /usuarios/me')?.cuerpo).toEqual({
      nombres: 'Laura',
      apellidos: 'Gómez',
      gamertag: 'laura_trail',
      avatarUrl: null,
      fechaNacimiento: '2001-04-15',
    });
  });

  test('valida los campos antes de enviar', async ({ page }) => {
    const peticiones = await simularApi(page, API_PERFIL);
    await page.goto('/tabs/perfil/editar');

    await page.getByLabel('Nombres').fill('');
    await page.getByLabel('Imagen de perfil (enlace)').fill('foto.png');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Escribe tus nombres.')).toBeVisible();
    await expect(page.getByText('La imagen debe ser una dirección que empiece por http o https.')).toBeVisible();
    expect(ultima(peticiones, 'PUT /usuarios/me')).toBeUndefined();
  });

  test('muestra el error del servidor', async ({ page }) => {
    await simularApi(page, {
      ...API_PERFIL,
      'PUT /usuarios/me': fallo(409, 'Ese gamertag ya está en uso.'),
    });
    await page.goto('/tabs/perfil/editar');

    await page.getByLabel('Gamertag').fill('carlos_pro');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('alert')).toHaveText('Ese gamertag ya está en uso.');
  });
});
