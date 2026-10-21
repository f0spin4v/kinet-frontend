import { expect, Page, test } from '@playwright/test';
import { fallo, ok, simularApi, sinConexion, ultima } from './utils/api';
import { apiDeInicio, PREGUNTAS, resultadoEvaluacion, usuario } from './utils/datos';
import { conSesion, tokenGuardado } from './utils/sesion';

/** Toca la opción indicada (A o B) de la pregunta que está en pantalla. */
async function responder(page: Page, numero: number, opcion: 'A' | 'B'): Promise<void> {
  await expect(page.getByText(`Pregunta ${numero} de 5`)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`Opción ${opcion} de la pregunta ${numero}`) }).click();
}

test.describe('Evaluación de nivel', () => {
  test.beforeEach(async ({ page }) => {
    await conSesion(page);
  });

  test('el flujo completo termina con el nivel y entra a la app', async ({ page }) => {
    const peticiones = await simularApi(page, {
      ...apiDeInicio(),
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
      'POST /evaluacion': ok(resultadoEvaluacion('INTERMEDIO'), 201),
    });

    await page.goto('/evaluacion');
    for (const [i, opcion] of (['B', 'A', 'B', 'B', 'A'] as const).entries()) {
      await responder(page, i + 1, opcion);
    }

    await expect(page.getByRole('heading', { name: 'Tu nivel inicial' })).toBeVisible();
    await expect(page.locator('.resultado__nivel')).toHaveText('Intermedio');
    expect(ultima(peticiones, 'POST /evaluacion')?.cuerpo).toEqual({ idsOpciones: [12, 21, 32, 42, 51] });

    await page.getByRole('button', { name: 'Entrar a KINET' }).click();
    await expect(page).toHaveURL(/\/tabs\/inicio$/);
  });

  test('se puede volver a la pregunta anterior y cambiar la respuesta', async ({ page }) => {
    const peticiones = await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
      'POST /evaluacion': ok(resultadoEvaluacion(), 201),
    });

    await page.goto('/evaluacion');
    await responder(page, 1, 'A');
    await responder(page, 2, 'A');
    await expect(page.getByText('Pregunta 3 de 5')).toBeVisible();
    await page.getByRole('button', { name: 'Pregunta anterior' }).click();
    await responder(page, 2, 'B');
    for (const n of [3, 4, 5]) await responder(page, n, 'A');

    await expect(page.getByRole('heading', { name: 'Tu nivel inicial' })).toBeVisible();
    expect(ultima(peticiones, 'POST /evaluacion')?.cuerpo).toEqual({ idsOpciones: [11, 22, 31, 41, 51] });
  });

  test('si falla la carga de preguntas se puede reintentar', async ({ page }) => {
    let intentos = 0;
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': () => (++intentos === 1 ? sinConexion : ok(PREGUNTAS)),
    });

    await page.goto('/evaluacion');
    await expect(page.getByRole('alert')).toHaveText('No hay conexión con el servidor. Revisa tu internet.');

    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Pregunta 1 de 5')).toBeVisible();
  });

  test('si falla el envío se reintenta con las mismas respuestas', async ({ page }) => {
    let intentos = 0;
    const peticiones = await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
      'POST /evaluacion': () => (++intentos === 1 ? fallo(500, 'No pudimos calcular tu nivel.') : ok(resultadoEvaluacion('AVANZADO'), 201)),
    });

    await page.goto('/evaluacion');
    for (const n of [1, 2, 3, 4, 5]) await responder(page, n, 'B');
    await expect(page.getByRole('alert')).toHaveText('No pudimos calcular tu nivel.');

    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('.resultado__nivel')).toHaveText('Avanzado');
    const envios = peticiones.filter(p => p.clave === 'POST /evaluacion');
    expect(envios).toHaveLength(2);
    expect(envios[1].cuerpo).toEqual(envios[0].cuerpo);
  });

  test('un cuestionario vacío muestra un aviso', async ({ page }) => {
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok([]),
    });

    await page.goto('/evaluacion');

    await expect(page.getByRole('alert')).toHaveText('No hay preguntas disponibles. Intenta más tarde.');
  });

  test('salir cierra la sesión y vuelve al inicio de sesión', async ({ page }) => {
    await simularApi(page, {
      'GET /usuarios/me': ok(usuario({ nivelHabilidad: null })),
      'GET /evaluacion/preguntas': ok(PREGUNTAS),
    });

    await page.goto('/evaluacion');
    await expect(page.getByText('Pregunta 1 de 5')).toBeVisible();
    await page.getByRole('button', { name: 'Salir' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBeNull();
  });
});
