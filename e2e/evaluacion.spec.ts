import { Page, expect, test } from '@playwright/test';
import { RutasSimuladas, fallo, ok, simularApi } from './utils/api';
import { PREGUNTAS, RESULTADO_EVALUACION, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

/** Jugador con sesión iniciada que aún no hizo la evaluación. */
async function jugadorNuevo(page: Page, rutas: RutasSimuladas = {}) {
  await conSesion(page);
  return simularApi(page, {
    'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
    'GET /evaluacion/preguntas': ok(PREGUNTAS),
    'POST /evaluacion': ok(RESULTADO_EVALUACION, 201),
    ...rutas,
  });
}

const opcion = (page: Page, titulo: string) => page.getByRole('button', { name: new RegExp(titulo) });

test.describe('Evaluación de nivel', () => {
  test('responder todas las preguntas muestra el nivel y deja entrar a la app', async ({ page }) => {
    const peticiones = await jugadorNuevo(page);
    await page.goto('/evaluacion');

    await expect(page.getByText('Pregunta 1 de 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pregunta de prueba 1' })).toBeVisible();
    await opcion(page, 'Intermedio 1').click();

    await expect(page.getByText('Pregunta 2 de 3')).toBeVisible();
    await opcion(page, 'Avanzado 2').click();

    await expect(page.getByText('Pregunta 3 de 3')).toBeVisible();
    await opcion(page, 'Principiante 3').click();

    await expect(page.getByText('Tu nivel inicial')).toBeVisible();
    await expect(page.getByText('INTERMEDIO', { exact: true })).toBeVisible();
    const envio = peticiones.find(p => p.metodo === 'POST' && p.ruta === '/evaluacion');
    expect(envio?.cuerpo).toEqual({ idsOpciones: [12, 23, 31] });

    await page.getByRole('button', { name: 'Entrar a KINET' }).click();
    await expect(page).toHaveURL(/\/tabs/);
  });

  test('al volver a la pregunta anterior conserva la respuesta marcada', async ({ page }) => {
    await jugadorNuevo(page);
    await page.goto('/evaluacion');

    await opcion(page, 'Avanzado 1').click();
    await expect(page.getByText('Pregunta 2 de 3')).toBeVisible();

    await page.getByRole('button', { name: 'Pregunta anterior' }).click();
    await expect(page.getByText('Pregunta 1 de 3')).toBeVisible();
    await expect(opcion(page, 'Avanzado 1')).toHaveClass(/opcion--marcada/);
  });

  test('en la primera pregunta no hay botón de volver', async ({ page }) => {
    await jugadorNuevo(page);
    await page.goto('/evaluacion');

    await expect(page.getByText('Pregunta 1 de 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pregunta anterior' })).toHaveCount(0);
  });

  test('si fallan las preguntas, "Reintentar" las vuelve a pedir', async ({ page }) => {
    let intentos = 0;
    await jugadorNuevo(page, {
      'GET /evaluacion/preguntas': () => (++intentos === 1 ? fallo(500, 'Error interno del servidor.') : ok(PREGUNTAS)),
    });
    await page.goto('/evaluacion');

    await expect(page.getByRole('alert')).toHaveText('Error interno del servidor.');
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByText('Pregunta 1 de 3')).toBeVisible();
    expect(intentos).toBe(2);
  });

  test('sin preguntas activas lo avisa', async ({ page }) => {
    await jugadorNuevo(page, { 'GET /evaluacion/preguntas': ok([]) });
    await page.goto('/evaluacion');

    await expect(page.getByRole('alert')).toHaveText('No hay preguntas disponibles. Intenta más tarde.');
  });

  test('si falla el envío, "Reintentar" reenvía las mismas respuestas', async ({ page }) => {
    let envios = 0;
    const peticiones = await jugadorNuevo(page, {
      'POST /evaluacion': () => (++envios === 1 ? fallo(500, 'No se pudo guardar.') : ok(RESULTADO_EVALUACION, 201)),
    });
    await page.goto('/evaluacion');

    await opcion(page, 'Intermedio 1').click();
    await opcion(page, 'Intermedio 2').click();
    await opcion(page, 'Intermedio 3').click();
    await expect(page.getByRole('alert')).toHaveText('No se pudo guardar.');

    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Tu nivel inicial')).toBeVisible();

    const cuerpos = peticiones.filter(p => p.metodo === 'POST').map(p => p.cuerpo);
    expect(cuerpos).toEqual([{ idsOpciones: [12, 22, 32] }, { idsOpciones: [12, 22, 32] }]);
  });

  test('"Salir" cierra la sesión y vuelve al login', async ({ page }) => {
    await jugadorNuevo(page);
    await page.goto('/evaluacion');

    await page.getByRole('button', { name: 'Salir' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });
});
