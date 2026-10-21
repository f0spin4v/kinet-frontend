import { Locator, Page, test } from '@playwright/test';

/** true cuando la prueba corre en el proyecto "visual" (npm run e2e), el que se muestra en pantalla. */
function esVisual(): boolean {
  return test.info().project.name === 'visual' && !process.env['E2E_SIN_VENTANA'];
}

/** Escribe letra por letra en el proyecto visual, para que se vea; en los demás llena el campo de una vez. */
export async function escribir(campo: Locator, texto: string): Promise<void> {
  if (esVisual()) {
    await campo.click();
    await campo.pressSequentially(texto, { delay: 90 });
  } else {
    await campo.fill(texto);
  }
}

/** Pausa entre pasos en el proyecto visual (E2E_PAUSA en milisegundos, 1500 por defecto). */
export async function pausa(page: Page): Promise<void> {
  if (esVisual()) await page.waitForTimeout(Number(process.env['E2E_PAUSA'] ?? 1500));
}
