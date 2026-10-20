import { Page, Request, Route } from '@playwright/test';

/** Respuesta simulada: código HTTP y cuerpo ya envuelto como lo envía el backend. */
export interface RespuestaSimulada {
  status: number;
  body?: unknown;
  /** Si es true, la petición falla sin respuesta (como un servidor caído). */
  sinConexion?: boolean;
}

/** Algo que responde una petición: una respuesta fija o una función que la calcula. */
export type Manejador = RespuestaSimulada | ((peticion: Request) => RespuestaSimulada);

/** Clave: "MÉTODO /ruta" relativa a /api, por ejemplo "POST /auth/login" o "GET /usuarios/me". */
export type RutasSimuladas = Record<string, Manejador>;

/** Respuesta exitosa con la envoltura { error, respuesta } del backend (ResponseDTO). */
export function ok(respuesta: unknown, status = 200): RespuestaSimulada {
  return { status, body: { error: false, respuesta } };
}

/** Respuesta de error: el mensaje puede ser texto o una lista de { campo, mensaje } (ValidacionDTO). */
export function fallo(status: number, respuesta: string | { campo: string; mensaje: string }[]): RespuestaSimulada {
  return { status, body: { error: true, respuesta } };
}

export const sinConexion: RespuestaSimulada = { status: 0, sinConexion: true };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'Authorization, Content-Type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

/** Peticiones a la API que recibió el servidor simulado, para verificarlas en las pruebas. */
export interface Registro {
  metodo: string;
  ruta: string;
  cuerpo: unknown;
  autorizacion: string | null;
}

/**
 * Intercepta todas las llamadas a /api/ y las responde según "rutas". Lo que no esté definido
 * responde 404, para que una llamada inesperada se note en la prueba. Devuelve la lista de
 * peticiones recibidas (se va llenando mientras corre la prueba).
 */
export async function simularApi(page: Page, rutas: RutasSimuladas): Promise<Registro[]> {
  const registro: Registro[] = [];

  await page.route('**/api/**', async (route: Route) => {
    const peticion = route.request();
    const metodo = peticion.method();

    if (metodo === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    registro.push({
      metodo,
      ruta,
      cuerpo: leerCuerpo(peticion),
      autorizacion: (await peticion.allHeaders())['authorization'] ?? null,
    });

    const manejador = rutas[`${metodo} ${ruta}`];
    const respuesta = typeof manejador === 'function' ? manejador(peticion) : manejador;

    if (!respuesta) {
      await route.fulfill({ status: 404, headers: CORS, json: { error: true, respuesta: `Sin simular: ${metodo} ${ruta}` } });
      return;
    }
    if (respuesta.sinConexion) {
      await route.abort('connectionrefused');
      return;
    }
    await route.fulfill({ status: respuesta.status, headers: CORS, json: respuesta.body ?? null });
  });

  return registro;
}

function leerCuerpo(peticion: Request): unknown {
  try {
    return peticion.postDataJSON();
  } catch {
    return peticion.postData();
  }
}
