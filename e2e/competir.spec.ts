import { expect, Page, test } from '@playwright/test';
import { fallo, ok, simularApi, ultima } from './utils/api';
import { apiDeInicio } from './utils/datos';
import { conSesion } from './utils/sesion';

/**
 * Proceso 3 · Gestión de Ligas, Temporadas y Rangos desde la interfaz del jugador: buscar y cancelar un
 * enfrentamiento, abandonar la temporada, crear un duelo y responder o cancelar competencias (RF-50 a RF-60).
 * El usuario de la sesión es laura_runner (id 3).
 */
const temporada = { id: 1, nombre: 'Temporada 1', fechaInicio: '2026-09-01', fechaFin: '2026-12-15', porcentajeConservado: 30, estado: 'ACTIVA' };
const participacion = {
  temporada, puntosIniciales: 1000, puntosActuales: 1520, rangoInicial: 'BRONCE', rangoActual: 'PLATA', posicion: 2,
  puntosFinales: null, estado: 'ACTIVA', fechaInscripcion: '2026-09-02',
};
const ranking = [
  { posicion: 1, idUsuario: 5, gamertag: 'carlos_pro', puntos: 1840, rango: 'ORO' },
  { posicion: 2, idUsuario: 3, gamertag: 'laura_runner', puntos: 1520, rango: 'PLATA' },
  { posicion: 3, idUsuario: 6, gamertag: 'diego_lift', puntos: 1300, rango: 'PLATA' },
];
const vacia = { contenido: [], pagina: 0, tamanio: 20, totalElementos: 0, totalPaginas: 0 };
const pagina = (contenido: unknown[]) => ({ contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 });

function competencia(id: number, extra: Record<string, unknown> = {}) {
  return {
    id, tipo: 'DUELO', nombre: `Duelo ${id}`, estado: 'PENDIENTE', idCreador: 5, creador: 'carlos_pro', actividad: null,
    duracionRondaHoras: 24, rondaActual: 0, premioXp: 30, fechaCreacion: '2026-11-10T10:00:00', fechaInicio: null, fechaFin: null,
    participantes: [
      { idUsuario: 5, gamertag: 'carlos_pro', estadoInvitacion: 'ACEPTADA', fechaRespuesta: null, puntaje: 0, eliminadoEnRonda: null, posicion: null, resultado: null },
      { idUsuario: 3, gamertag: 'laura_runner', estadoInvitacion: 'INVITADO', fechaRespuesta: null, puntaje: 0, eliminadoEnRonda: null, posicion: null, resultado: null },
    ],
    ...extra,
  };
}

/** Pestaña Competir con temporada activa, sin competencias ni clan, más lo que cada prueba agregue. */
async function abrirCompetir(page: Page, extra: Parameters<typeof simularApi>[1] = {}) {
  await conSesion(page);
  const peticiones = await simularApi(page, {
    ...apiDeInicio(),
    'GET /temporadas/activa': ok(temporada),
    'GET /temporadas/activa/ranking': ok(ranking),
    'GET /temporadas/activa/mia': ok(participacion),
    'GET /temporadas/activa/mia/historial-rango': ok(vacia),
    'GET /matchmaking/enfrentamientos': ok(vacia),
    'GET /competencias': ok(vacia),
    'GET /competencias/invitaciones': ok(vacia),
    'GET /clanes': ok(vacia),
    'GET /clanes/mio': fallo(404, 'No perteneces a un clan.'),
    'GET /catalogos/actividades': ok([{ id: 1, nombre: 'RUNNING', estado: 'ACTIVA', reglasVigentes: [] }]),
    ...extra,
  });
  return peticiones;
}

test.describe('Competir (proceso 3)', () => {
  test('buscar enfrentamiento deja al jugador en la cola y puede cancelar la búsqueda', async ({ page }) => {
    const peticiones = await abrirCompetir(page, {
      'POST /matchmaking/solicitudes': ok({ id: 9, estado: 'EN_COLA', fechaSolicitud: '2026-11-10T10:00:00', enfrentamiento: null,
        mensaje: 'Estás en la cola: te avisaremos cuando encontremos un rival de tu rango.' }),
      'DELETE /matchmaking/solicitudes/actual': ok({ mensaje: 'Saliste de la cola.' }),
    });
    await page.goto('/tabs/competir');
    await expect(page.getByRole('heading', { name: 'Temporada 1' })).toBeVisible();
    await expect(page.getByText('carlos_pro').first()).toBeVisible();

    await page.getByRole('button', { name: 'Buscar enfrentamiento' }).click();
    await expect(page.getByRole('status')).toHaveText('Estás en la cola: te avisaremos cuando encontremos un rival de tu rango.');
    expect(ultima(peticiones, 'POST /matchmaking/solicitudes')).toBeDefined();
    // mientras espera no puede volver a buscar
    await expect(page.getByRole('button', { name: 'Buscar enfrentamiento' })).toBeDisabled();

    await page.getByRole('button', { name: 'Cancelar búsqueda' }).click();
    await expect(page.getByRole('status')).toHaveText('Saliste de la cola.');
    expect(ultima(peticiones, 'DELETE /matchmaking/solicitudes/actual')).toBeDefined();
    await expect(page.getByRole('button', { name: 'Cancelar búsqueda' })).toHaveCount(0);
  });

  test('abandonar la temporada pide confirmación', async ({ page }) => {
    const peticiones = await abrirCompetir(page, {
      'POST /temporadas/activa/abandono': ok({ ...participacion, estado: 'ABANDONADA' }),
    });
    await page.goto('/tabs/competir');
    await page.getByRole('button', { name: 'Abandonar temporada' }).click();

    const alerta = page.locator('ion-alert');
    await expect(alerta.getByText('Dejarás de participar en el ranking de esta temporada.')).toBeVisible();
    await alerta.getByRole('button', { name: 'Cancelar' }).click();
    expect(ultima(peticiones, 'POST /temporadas/activa/abandono')).toBeUndefined();

    await page.getByRole('button', { name: 'Abandonar temporada' }).click();
    await page.locator('ion-alert').last().getByRole('button', { name: 'Abandonar' }).click();
    await expect.poll(() => ultima(peticiones, 'POST /temporadas/activa/abandono')).toBeDefined();
  });

  test('crear un duelo exige elegir un rival y envía la invitación', async ({ page }) => {
    const creada = competencia(7, { idCreador: 3, creador: 'laura_runner', nombre: 'Reto del martes' });
    const peticiones = await abrirCompetir(page, {
      'POST /competencias': ok(creada, 201),
      'GET /competencias/7': ok(creada),
    });
    await page.goto('/tabs/competir/competencias/nueva');
    await page.getByLabel('Nombre').fill('Reto del martes');

    // sin rival no se envía
    await page.getByRole('button', { name: 'Enviar invitaciones' }).click();
    await expect(page.getByRole('alert')).toHaveText('Elige 1 jugador.');
    expect(ultima(peticiones, 'POST /competencias')).toBeUndefined();

    // el propio jugador no aparece como candidato
    await expect(page.locator('.candidato', { hasText: 'laura_runner' })).toHaveCount(0);
    await page.locator('.candidato', { hasText: 'carlos_pro' }).click();
    await page.getByRole('button', { name: 'Enviar invitaciones' }).click();

    await expect(page.getByRole('heading', { name: 'Reto del martes' })).toBeVisible();
    expect(ultima(peticiones, 'POST /competencias')?.cuerpo).toMatchObject({
      tipo: 'DUELO', nombre: 'Reto del martes', idsInvitados: [5], duracionRondaHoras: 24, fechaInicio: null,
    });
  });

  test('las invitaciones pendientes se aceptan o se rechazan', async ({ page }) => {
    const peticiones = await abrirCompetir(page, {
      'GET /competencias/invitaciones': ok(pagina([competencia(10), competencia(11, { nombre: 'Duelo nocturno' })])),
      'POST /competencias/10/aceptacion': ok(competencia(10, { estado: 'EN_CURSO' })),
      'POST /competencias/11/rechazo': ok(competencia(11, { estado: 'CANCELADA' })),
    });
    await page.goto('/tabs/competir');
    await page.getByRole('tab', { name: /Competencias/ }).click();
    await expect(page.getByRole('heading', { name: 'Invitaciones pendientes' })).toBeVisible();

    const primera = page.locator('article', { hasText: 'Duelo 10' });
    await expect(primera.getByText('Te invita carlos_pro')).toBeVisible();
    await primera.getByRole('button', { name: 'Aceptar' }).click();
    await expect.poll(() => ultima(peticiones, 'POST /competencias/10/aceptacion')).toBeDefined();

    await page.locator('article', { hasText: 'Duelo nocturno' }).getByRole('button', { name: 'Rechazar' }).click();
    await expect.poll(() => ultima(peticiones, 'POST /competencias/11/rechazo')).toBeDefined();
  });

  test('solo el creador ve «Cancelar competencia» y debe confirmarlo', async ({ page }) => {
    const mia = competencia(7, { idCreador: 3, creador: 'laura_runner' });
    const peticiones = await abrirCompetir(page, {
      'GET /competencias/7': ok(mia),
      'GET /competencias/8': ok(competencia(8)),
      'POST /competencias/7/cancelacion': ok({ ...mia, estado: 'CANCELADA' }),
    });
    // de otro jugador: puede responder la invitación, no cancelar
    await page.goto('/tabs/competir/competencias/8');
    await expect(page.getByRole('button', { name: 'Aceptar invitación' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar competencia' })).toHaveCount(0);

    await page.goto('/tabs/competir/competencias/7');
    await page.getByRole('button', { name: 'Cancelar competencia' }).click();
    await page.locator('ion-alert').getByRole('button', { name: 'Cancelar competencia' }).click();
    await expect.poll(() => ultima(peticiones, 'POST /competencias/7/cancelacion')).toBeDefined();
  });
});
