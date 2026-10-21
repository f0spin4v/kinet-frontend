import { Page } from '@playwright/test';

/** Así guarda Capacitor Preferences el token en el navegador. */
export const CLAVE_TOKEN = 'CapacitorStorage.kinet_token';
export const TOKEN_DE_PRUEBA = 'token-de-prueba';

/**
 * Deja un token guardado antes de abrir la app, como si el usuario ya hubiera iniciado sesión.
 * Solo lo pone en la primera carga de la pestaña, para que cerrar sesión y recargar funcione igual que en la app real.
 * Hay que simular también GET /usuarios/me.
 */
export async function conSesion(page: Page, token = TOKEN_DE_PRUEBA): Promise<void> {
  await page.addInitScript(
    ([clave, valor]) => {
      if (!sessionStorage.getItem('e2e-sesion')) {
        localStorage.setItem(clave, valor);
        sessionStorage.setItem('e2e-sesion', '1');
      }
    },
    [CLAVE_TOKEN, token],
  );
}

/** El token guardado en el navegador, o null si no hay sesión. */
export function tokenGuardado(page: Page): Promise<string | null> {
  return page.evaluate(clave => localStorage.getItem(clave), CLAVE_TOKEN);
}
