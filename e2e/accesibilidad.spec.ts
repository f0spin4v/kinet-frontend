import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { ok, simularApi } from './utils/api';
import { apiDeInicio } from './utils/datos';
import { conSesion } from './utils/sesion';

/**
 * RNF-15 · Accesibilidad WCAG 2.1 AA (Plan de Gestión de la Calidad v3.0).
 * Revisa con axe-core las pantallas de autenticación, entrenamientos y temporadas: ninguna debe tener
 * infracciones de las reglas WCAG 2.0 y 2.1, niveles A y AA. Si una falla, el reporte dice qué regla y qué elemento.
 */
const REGLAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function revisar(page: Page, pantalla: string) {
  const resultado = await new AxeBuilder({ page }).withTags(REGLAS_WCAG).analyze();
  const resumen = resultado.violations.map(v =>
    `${v.id} (${v.impact}) · ${v.help} → ${v.nodes.map(n => `${n.target.join(' ')}: ${(n.failureSummary ?? '').split('\n').slice(1).join(' ').trim()}`).join(' | ')}`);
  test.info().annotations.push({ type: 'axe', description: `${pantalla}: ${resultado.passes.length} reglas cumplidas, ${resultado.violations.length} infracciones` });
  expect(resumen, `Infracciones WCAG 2.1 AA en ${pantalla}`).toEqual([]);
}

test.describe('Accesibilidad WCAG 2.1 AA (RNF-15)', () => {
  test('inicio de sesión', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await revisar(page, 'Inicio de sesión');
  });

  test('registro', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByRole('button', { name: /crear/i }).first()).toBeVisible();
    await revisar(page, 'Registro');
  });

  test('política de datos', async ({ page }) => {
    await page.goto('/politica-datos');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await revisar(page, 'Política de datos');
  });

  test('inicio del jugador', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, apiDeInicio());
    await page.goto('/tabs/inicio');
    await expect(page.getByRole('heading', { name: /Hola, laura_runner/ })).toBeVisible();
    await revisar(page, 'Inicio del jugador');
  });

  test('entrenar', async ({ page }) => {
    await conSesion(page);
    await simularApi(page, {
      ...apiDeInicio(),
      'GET /catalogos/actividades': ok([{ id: 1, nombre: 'RUNNING', estado: 'ACTIVA', reglasVigentes: [] }]),
      'GET /entrenamientos': ok([]),
    });
    await page.goto('/tabs/entrenar');
    await page.waitForLoadState('networkidle');
    await revisar(page, 'Entrenar');
  });

  test('competir (temporada y ranking)', async ({ page }) => {
    await conSesion(page);
    const temporada = { id: 1, nombre: 'Temporada 1', fechaInicio: '2026-09-01', fechaFin: '2026-12-15', porcentajeConservado: 30, estado: 'ACTIVA' };
    await simularApi(page, {
      ...apiDeInicio(),
      'GET /temporadas/activa': ok(temporada),
      'GET /temporadas/activa/ranking': ok([
        { posicion: 1, idUsuario: 2, gamertag: 'carlos_pro', puntos: 1840, rango: 'ORO' },
        { posicion: 2, idUsuario: 1, gamertag: 'laura_runner', puntos: 1520, rango: 'PLATA' },
      ]),
      'GET /temporadas/activa/mia': ok({ temporada, puntosIniciales: 1000, puntosActuales: 1520, rangoInicial: 'BRONCE', rangoActual: 'PLATA', posicion: 2, puntosFinales: null, estado: 'ACTIVA', fechaInscripcion: '2026-09-02' }),
      'GET /matchmaking/enfrentamientos': ok({ contenido: [], pagina: 0, tamanio: 10, totalElementos: 0, totalPaginas: 0 }),
    });
    await page.goto('/tabs/competir');
    await expect(page.getByText('carlos_pro').first()).toBeVisible();
    await revisar(page, 'Competir');
  });
});
