import { expect, test } from '@playwright/test';
import { fallo, ok, simularApi, ultima } from './utils/api';

/** RN-33: el representante legal de un titular de 14 a 17 años responde el enlace del correo, sin cuenta en Kinet. */
test.describe('Autorización del representante legal', () => {
  const solicitud = {
    nombreMenor: 'Sofía', gamertag: 'sofi_run', edad: 16, nombreRepresentante: 'Andrés Ospina',
    parentesco: 'TUTOR_LEGAL', fechaExpiracion: '2026-11-17T10:00:00',
  };

  test('el representante lee la solicitud y autoriza la cuenta', async ({ page }) => {
    const peticiones = await simularApi(page, {
      'POST /autorizaciones/consulta': ok(solicitud),
      'POST /autorizaciones/respuesta': ok({ mensaje: 'Gracias. La cuenta quedó autorizada y ya se puede usar.' }),
    });
    await page.goto('/autorizacion-representante?token=enlace-123');

    await expect(page.getByText('Hola, Andrés Ospina.')).toBeVisible();
    await expect(page.getByText('de 16 años, se registró en Kinet')).toBeVisible();
    expect(ultima(peticiones, 'POST /autorizaciones/consulta')?.cuerpo).toEqual({ token: 'enlace-123' });

    // sin confirmar su calidad de representante no puede autorizar
    const autorizar = page.getByRole('button', { name: 'Autorizo su cuenta' });
    await expect(autorizar).toBeDisabled();
    await page.getByLabel(/tengo su representación legal/).check();
    await autorizar.click();

    await expect(page.getByRole('status')).toHaveText('Gracias. La cuenta quedó autorizada y ya se puede usar.');
    expect(ultima(peticiones, 'POST /autorizaciones/respuesta')?.cuerpo).toEqual({ token: 'enlace-123', autoriza: true });
  });

  test('el representante puede no autorizar', async ({ page }) => {
    const peticiones = await simularApi(page, {
      'POST /autorizaciones/consulta': ok(solicitud),
      'POST /autorizaciones/respuesta': ok({ mensaje: 'Listo. La cuenta no se autorizó y no se podrá usar.' }),
    });
    await page.goto('/autorizacion-representante?token=enlace-123');
    await page.getByRole('button', { name: 'No autorizo' }).click();

    await expect(page.getByRole('status')).toHaveText('Listo. La cuenta no se autorizó y no se podrá usar.');
    expect(ultima(peticiones, 'POST /autorizaciones/respuesta')?.cuerpo).toEqual({ token: 'enlace-123', autoriza: false });
  });

  test('un enlace vencido muestra el motivo', async ({ page }) => {
    await simularApi(page, {
      'POST /autorizaciones/consulta': fallo(400, 'El enlace de autorización no es válido o ya venció. El menor puede pedir que te lo enviemos de nuevo.'),
    });
    await page.goto('/autorizacion-representante?token=viejo');

    await expect(page.getByRole('alert')).toContainText('ya venció');
    await expect(page.getByRole('button', { name: 'Autorizo su cuenta' })).toHaveCount(0);
  });
});
