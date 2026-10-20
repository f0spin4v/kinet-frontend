import { Page } from '@playwright/test';
import { TOKEN } from './datos';

/**
 * En el navegador, Capacitor Preferences guarda en localStorage con el prefijo "CapacitorStorage.".
 * Ver TOKEN_KEY en src/app/core/services/auth.ts y TEMA_KEY en tema.ts.
 */
export const CLAVE_TOKEN = 'CapacitorStorage.kinet_token';
export const CLAVE_TEMA = 'CapacitorStorage.kinet_tema';

/**
 * Deja un token guardado antes de que cargue la app, como si el usuario ya hubiera iniciado sesión.
 * La prueba debe simular "GET /usuarios/me", que AuthService.cargarSesion llama al arrancar.
 * Solo se escribe una vez por pestaña: así cerrar sesión y recargar no lo vuelve a poner.
 */
export async function conSesion(page: Page, token = TOKEN): Promise<void> {
  await page.addInitScript(([clave, valor]) => {
    try {
      if (!sessionStorage.getItem('e2e-sesion-puesta')) {
        localStorage.setItem(clave, valor);
        sessionStorage.setItem('e2e-sesion-puesta', '1');
      }
    } catch {
      // about:blank no tiene almacenamiento; se escribe en la siguiente página.
    }
  }, [CLAVE_TOKEN, token]);
}

export async function tokenGuardado(page: Page): Promise<string | null> {
  return page.evaluate(clave => localStorage.getItem(clave), CLAVE_TOKEN);
}
