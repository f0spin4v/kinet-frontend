import { expect, Page, test } from '@playwright/test';

/**
 * KAN-80: los tres procesos de punta a punta contra la API REAL (Spring Boot + Oracle Free con kinet_bd.sql),
 * sin simular nada. Corre en el workflow «Frontend · e2e con la API real». Las pruebas van en orden: la cuenta
 * que se registra en la primera se usa en las siguientes.
 */
test.describe.configure({ mode: 'serial' });

const sufijo = Date.now().toString(36);
const jugador = { correo: `e2e_${sufijo}@prueba.kinet`, gamertag: `e2e_${sufijo}`, contrasena: 'Prueba2026x' };
const menor = { correo: `menor_${sufijo}@prueba.kinet`, gamertag: `menor_${sufijo}` };

function haceAnios(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  d.setDate(d.getDate() - 10);
  return d.toLocaleDateString('en-CA');
}

async function registrar(page: Page, correo: string, gamertag: string, fecha: string): Promise<void> {
  await page.goto('/registro');
  await page.getByLabel('Nombres', { exact: true }).fill('Prueba');
  await page.getByLabel('Apellidos', { exact: true }).fill('Automática');
  await page.getByLabel('Gamertag', { exact: true }).fill(gamertag);
  await page.getByLabel('Correo', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(jugador.contrasena);
  await page.getByLabel('Fecha de nacimiento').fill(fecha);
  await page.getByLabel('Acepto la política de tratamiento de datos personales.').check();
}

async function iniciarSesion(page: Page, correo: string, contrasena: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('Proceso 1: registro, evaluación de nivel e inicio', async ({ page }) => {
  await registrar(page, jugador.correo, jugador.gamertag, '2000-05-20');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  // la evaluación viene de la base: se responde la primera opción de cada pregunta
  await expect(page.getByText(/Pregunta 1 de \d+/)).toBeVisible({ timeout: 15_000 });
  const total = Number((await page.getByText(/Pregunta 1 de \d+/).textContent())!.match(/de (\d+)/)![1]);
  for (let i = 1; i <= total; i++) {
    await expect(page.getByText(`Pregunta ${i} de ${total}`)).toBeVisible();
    await page.locator('button.opcion').first().click();
  }
  await expect(page.getByRole('heading', { name: 'Tu nivel inicial' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Entrar a KINET' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Hola, ${jugador.gamertag}`) })).toBeVisible();
});

test('Proceso 1: credenciales incorrectas y una cuenta de prueba', async ({ page }) => {
  await iniciarSesion(page, jugador.correo, 'Equivocada1');
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos.');
  await iniciarSesion(page, 'laura@kinet.com', 'Kinet2026');
  await expect(page.getByRole('heading', { name: /Hola, laura_runner/ })).toBeVisible();
});

test('Proceso 2: una sesión demasiado corta se rechaza con su motivo', async ({ page }) => {
  await iniciarSesion(page, jugador.correo, jugador.contrasena);
  await expect(page.getByRole('heading', { name: new RegExp(`Hola, ${jugador.gamertag}`) })).toBeVisible();
  await page.goto('/tabs/entrenar');
  await page.getByRole('button', { name: /Running/ }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('radio', { name: 'Media' }).click();
  await page.getByRole('button', { name: 'Finalizar' }).click();

  // el servidor mide el tiempo con su propio reloj: segundos después no alcanza el mínimo
  await expect(page.getByText('Sesión no válida')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Motivo:');
  await page.locator('.resultado').getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
});

test('Proceso 3: la primera búsqueda inscribe en la temporada con un enfrentamiento de colocación', async ({ page }) => {
  await iniciarSesion(page, jugador.correo, jugador.contrasena);
  await expect(page.getByRole('heading', { name: new RegExp(`Hola, ${jugador.gamertag}`) })).toBeVisible();
  await page.goto('/tabs/competir');
  await expect(page.getByText('Temporada activa')).toBeVisible();
  await expect(page.getByText('Aún no te has inscrito.')).toBeVisible();

  await page.getByRole('button', { name: 'Buscar enfrentamiento' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  // ya inscrito: al volver a la pestaña aparecen su rango y sus puntos
  await page.reload();
  await expect(page.getByText('Rango', { exact: true })).toBeVisible({ timeout: 15_000 });
});

test('RN-33: un menor queda pendiente y el administrador registra la autorización firmada', async ({ page }) => {
  await registrar(page, menor.correo, menor.gamertag, haceAnios(16));
  await page.getByLabel('Nombre completo del representante').fill('Representante De Prueba');
  await page.getByLabel('Correo del representante').fill(`rep_${sufijo}@prueba.kinet`);
  await page.getByLabel('Parentesco').selectOption('MADRE');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa con tu representante' })).toBeVisible();

  await iniciarSesion(page, menor.correo, jugador.contrasena);
  await expect(page.getByRole('alert')).toContainText('representante legal');

  await iniciarSesion(page, 'admin@kinet.com', 'Admin2026');
  await page.goto('/staff/cuentas');
  await page.getByLabel('Buscar por correo').fill(menor.correo);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('Menor de edad')).toBeVisible();
  await page.getByRole('button', { name: 'Autorización' }).click();
  await page.getByLabel('Nombre del representante').fill('Representante De Prueba');
  await page.getByLabel('Correo del representante').fill(`rep_${sufijo}@prueba.kinet`);
  await page.getByLabel('Soporte (qué documento es y dónde está guardado)').fill('Autorización firmada de prueba automática');
  await page.getByRole('button', { name: 'Registrar autorización' }).click();
  await expect(page.getByRole('status')).toContainText('quedó activa');
  // y la acción queda en la bitácora
  await expect(page.getByRole('cell', { name: /AUTORIZADA \(MADRE\)/ })).toBeVisible();
});
