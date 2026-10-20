import { Page, expect, test } from '@playwright/test';
import { RutasSimuladas, fallo, ok, simularApi } from './utils/api';
import { usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

/** Jugador evaluado con sesión iniciada, en la pantalla de perfil. */
async function enPerfil(page: Page, rutas: RutasSimuladas = {}) {
  await conSesion(page);
  const peticiones = await simularApi(page, { 'GET /usuarios/me': ok(usuario()), ...rutas });
  await page.goto('/tabs/perfil');
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible();
  return peticiones;
}

async function irAEditar(page: Page) {
  await page.getByRole('link', { name: 'Editar perfil' }).click();
  await expect(page).toHaveURL(/\/tabs\/perfil\/editar$/);
}

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar cambios' });

test.describe('Perfil', () => {
  test('muestra los datos del jugador', async ({ page }) => {
    await enPerfil(page);

    await expect(page.getByText('@ana_fit')).toBeVisible();
    await expect(page.getByText('INTERMEDIO')).toBeVisible();
    await expect(page.getByText('ana@kinet.com')).toBeVisible();
  });

  test('el tema elegido se aplica y se mantiene al recargar', async ({ page }) => {
    await enPerfil(page);

    await page.getByRole('radio', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/tema-oscuro/);
    await expect(page.getByRole('radio', { name: 'Oscuro' })).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/tema-oscuro/);

    await page.getByRole('radio', { name: 'Claro' }).click();
    await expect(page.locator('html')).toHaveClass(/tema-claro/);
    await expect(page.locator('html')).not.toHaveClass(/tema-oscuro/);
  });

  test('cerrar sesión borra el token y no deja volver atrás', async ({ page }) => {
    await enPerfil(page);

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('cancelar la desactivación no llama a la API', async ({ page }) => {
    const peticiones = await enPerfil(page);

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page).toHaveURL(/\/tabs\/perfil$/);
    expect(peticiones.some(p => p.metodo === 'DELETE')).toBe(false);
  });

  test('confirmar la desactivación cierra la sesión y avisa', async ({ page }) => {
    const peticiones = await enPerfil(page, { 'DELETE /usuarios/me': { status: 204 } });

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
    await page.getByRole('button', { name: 'Desactivar', exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Tu cuenta quedó inactiva')).toBeVisible();
    expect(peticiones.some(p => p.metodo === 'DELETE' && p.ruta === '/usuarios/me')).toBe(true);
    expect(await tokenGuardado(page)).toBeNull();
  });

  test('si la desactivación falla se queda en el perfil y muestra el error', async ({ page }) => {
    await enPerfil(page, { 'DELETE /usuarios/me': fallo(500, 'No se pudo desactivar la cuenta.') });

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
    await page.getByRole('button', { name: 'Desactivar', exact: true }).click();

    await expect(page.getByText('No se pudo desactivar la cuenta.')).toBeVisible();
    await expect(page).toHaveURL(/\/tabs\/perfil$/);
  });
});

test.describe('Editar perfil', () => {
  test('el formulario viene lleno y no se puede guardar sin cambios', async ({ page }) => {
    await enPerfil(page);
    await irAEditar(page);

    await expect(page.getByLabel('Nombres')).toHaveValue('Ana');
    await expect(page.getByLabel('Apellidos')).toHaveValue('Pérez');
    await expect(page.getByLabel('Nickname')).toHaveValue('ana_fit');
    await expect(page.getByLabel('Fecha de nacimiento')).toHaveValue('2000-05-10');
    await expect(guardar(page)).toBeDisabled();
  });

  test('guardar cambios envía los datos y vuelve al perfil actualizado', async ({ page }) => {
    const peticiones = await enPerfil(page, {
      'PUT /usuarios/me': ok(usuario({ nombres: 'María', gamertag: 'maria_fit' })),
    });
    await irAEditar(page);

    await page.getByLabel('Nombres').fill('  María ');
    await page.getByLabel('Nickname').fill('maria_fit');
    await guardar(page).click();

    await expect(page).toHaveURL(/\/tabs\/perfil$/);
    await expect(page.getByRole('heading', { name: 'María Pérez' })).toBeVisible();
    await expect(page.getByText('@maria_fit')).toBeVisible();

    const envio = peticiones.find(p => p.metodo === 'PUT');
    expect(envio?.cuerpo).toEqual({
      nombres: 'María',
      apellidos: 'Pérez',
      gamertag: 'maria_fit',
      avatarUrl: null,
      fechaNacimiento: '2000-05-10',
    });
  });

  test('valida nombres, nickname y fecha de nacimiento', async ({ page }) => {
    const peticiones = await enPerfil(page);
    await irAEditar(page);

    await page.getByLabel('Nombres').fill('');
    await page.getByLabel('Nickname').fill('ana fit');
    await page.getByLabel('Fecha de nacimiento').fill('2099-01-01');
    await guardar(page).click();

    await expect(page.getByText('Escribe tus nombres.')).toBeVisible();
    await expect(page.getByText('El nickname solo puede tener letras, números y guion bajo.')).toBeVisible();
    await expect(page.getByText('La fecha de nacimiento debe ser anterior a hoy.')).toBeVisible();
    expect(peticiones.some(p => p.metodo === 'PUT')).toBe(false);
  });

  test('un error del servidor se muestra sin salir del formulario', async ({ page }) => {
    await enPerfil(page, { 'PUT /usuarios/me': fallo(409, 'El gamertag ya está en uso.') });
    await irAEditar(page);

    await page.getByLabel('Nickname').fill('ocupado');
    await guardar(page).click();

    await expect(page.getByRole('alert')).toHaveText('El gamertag ya está en uso.');
    await expect(page).toHaveURL(/\/tabs\/perfil\/editar$/);
  });
});
