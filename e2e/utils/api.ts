import { Page, Request } from '@playwright/test';

/** Lo que responde un endpoint simulado: un estado HTTP con cuerpo, o una caída de red. */
export type Respuesta = { status: number; cuerpo?: unknown } | typeof sinConexion;
type Simulacion = Respuesta | ((peticion: Request) => Respuesta);

/** Una petición que la app le hizo a la API durante la prueba. */
export interface PeticionRecibida {
  clave: string;
  cuerpo: unknown;
  token: string | null;
}

/** Respuesta correcta con el formato del backend: { error: false, respuesta }. */
export function ok(datos: unknown, status = 200): Respuesta {
  return { status, cuerpo: { error: false, respuesta: datos } };
}

/** Respuesta de error con el formato del backend: { error: true, respuesta: "mensaje" | [{ campo, mensaje }] }. */
export function fallo(status: number, mensaje: string | { campo: string; mensaje: string }[]): Respuesta {
  return { status, cuerpo: { error: true, respuesta: mensaje } };
}

/** El servidor no responde (sin internet o backend caído). */
export const sinConexion = 'sin-conexion' as const;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'Authorization, Content-Type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

/**
 * Intercepta las llamadas a /api/... y responde lo definido en `rutas`.
 * La clave es "MÉTODO /ruta" sin el /api ni los parámetros, por ejemplo "POST /auth/login".
 * Una ruta no definida responde 404 con "Sin simular: ...". Devuelve la lista de peticiones recibidas.
 */
export async function simularApi(page: Page, rutas: Record<string, Simulacion>): Promise<PeticionRecibida[]> {
  const recibidas: PeticionRecibida[] = [];

  await page.route(/\/api\//, async route => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    const ruta = new URL(peticion.url()).pathname.replace(/^.*?\/api/, '');
    const clave = `${peticion.method()} ${ruta}`;
    const autorizacion = peticion.headers()['authorization'] ?? null;
    recibidas.push({
      clave,
      cuerpo: peticion.postDataJSON?.() ?? null,
      token: autorizacion ? autorizacion.replace(/^Bearer /, '') : null,
    });

    const simulacion = rutas[clave];
    const respuesta = typeof simulacion === 'function' ? simulacion(peticion) : simulacion;

    if (!respuesta) {
      await route.fulfill({ status: 404, headers: CORS, json: { error: true, respuesta: `Sin simular: ${clave}` } });
    } else if (respuesta === sinConexion) {
      await route.abort('internetdisconnected');
    } else {
      await route.fulfill({ status: respuesta.status, headers: CORS, json: respuesta.cuerpo ?? null });
    }
  });

  return recibidas;
}

/** Atajo: la última petición recibida con esa clave. */
export function ultima(recibidas: PeticionRecibida[], clave: string): PeticionRecibida | undefined {
  return [...recibidas].reverse().find(p => p.clave === clave);
}
