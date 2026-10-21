# Pruebas funcionales de Kinet

Guía para ejecutar y ampliar las pruebas funcionales del backend (Spring Boot) y del frontend (Angular + Ionic). Este mismo archivo está en `kinet-backend` y en `kinet-frontend`.

## Inicio rápido

Por defecto se corren solo los **escenarios principales** (`@principal`), con su paso a paso. El resto de pruebas sigue en el proyecto y se corre con otro comando.

| | Principales | Todas |
|---|---|---|
| **Backend** (desde `kinet-backend`) | `.\pruebas-funcionales.cmd` (7 escenarios) | `.\todas-las-pruebas.cmd` |
| **Frontend** (desde `kinet-frontend`) | `npm run e2e` (2 escenarios, **con el navegador visible**) | `npm run e2e:todas` |

| Lado | Escenarios principales |
|---|---|
| Backend | Humo · Seguridad (un jugador no entra a administración) · Registro de un jugador · Evaluación de nivel · Bloqueo de una cuenta · Actualizar perfil · Entrenamiento que da XP |
| Frontend | Un jugador evaluado inicia sesión y entra a la app · Un registro válido lleva a la evaluación |

En el backend, el primer escenario tarda alrededor de un minuto en aparecer mientras compila y levanta la aplicación en memoria. La primera vez también descarga Maven y las dependencias. En el frontend se abre Chrome y escribe en cámara lenta para que se vea cada paso.

Ninguno necesita Oracle ni el backend encendido. El backend no necesita Maven instalado (usa `backend\mvnw.cmd`), solo Java 17 o superior.

---

| | Backend | Frontend |
|---|---|---|
| Herramienta | Cucumber (BDD) + JUnit 5 + MockMvc | Playwright |
| Dónde están | BDD: `backend/src/test/resources/features/` y `backend/src/test/java/co/edu/uniquindio/kinet/bdd/` · JUnit: `backend/src/test/java/co/edu/uniquindio/kinet/` | `kinet-frontend/e2e/` |
| Base de datos | H2 en memoria en modo Oracle (se crea sola) | No usa: la API se simula |
| ¿Necesita Oracle o el servidor encendido? | No | No (Playwright levanta `ng serve` solo) |

Para marcar otro escenario como principal: en un `.feature`, pon `@principal` en la línea de arriba del `Escenario`; en Playwright, agrega `{ tag: '@principal' }` después del título del `test`.

---

## 1. Requisitos

**Backend**
- Java 17 o superior (`java -version`). Si no está en el `PATH`, define `JAVA_HOME`.
- Internet la primera vez: `mvnw.cmd` descarga Maven 3.9.9 en `%USERPROFILE%\.m2\wrapper` y luego las dependencias. Otra opción es IntelliJ IDEA, que trae Maven integrado.

**Frontend**
- Node.js 22.22.3 o superior (lo pide Angular 22).
- Una sola vez, desde `kinet-frontend`:
  ```powershell
  npm install
  npx playwright install chromium
  ```

---

## 2. Backend

### 2.1 Qué son

Son pruebas de integración: cada una levanta la aplicación completa, con controladores, servicios, seguridad JWT y JPA, y le hace peticiones HTTP reales a través de MockMvc. Así se prueban los procesos de punta a punta: registro → evaluación → entrenamiento → XP → logros, etc.

Hay dos formas de escribirlas, que comparten la misma base:

- **Escenarios BDD (Cucumber)**, en español, en `src/test/resources/features/`. Se leen como una historia (`Dado`, `Cuando`, `Entonces`) y son los que se muestran en la presentación. Los pasos están en `bdd/PasosKinet.java` y `bdd/PruebasFuncionalesTest.java` los ejecuta.
- **Pruebas JUnit**, una clase por módulo, para los casos de detalle.

Piezas comunes:

- **`PruebaIntegracion.java`** es la clase base. Antes de cada prueba (y de cada escenario) borra los datos de juego (usuarios, entrenamientos, clanes…) y deja los catálogos como en `data.sql`. Trae atajos:
  - Cuentas: `registrar(correo, gamertag)` devuelve un token de jugador; `cuentaConRol(correo, gamertag, "ADMINISTRADOR" | "ENTRENADOR")`; `iniciarSesion(correo, contrasena)`.
  - Evaluación: `evaluar(token, "INTERMEDIO")`.
  - Entrenamientos: `entrenar(token, "FUERZA", minutos, "MEDIA", inicio, km)` y `entrenarConEvidencia(...)`.
  - HTTP: `get`, `post`, `put`, `patch`, `delete(url, cuerpo, token)`; `respuesta(resultado)` lee `$.respuesta`.
- **`RelojDePrueba.java`** es el reloj del servidor que las pruebas pueden fijar en cualquier fecha. Así se simula "empezó a las 8:00 y terminó a las 8:40", o "hace 40 días", sin esperar.
- **`src/test/resources/application.properties`** configura H2, la clave JWT de pruebas, notificaciones síncronas y tareas programadas apagadas.
- **`src/test/resources/data.sql`** carga los catálogos: roles, niveles, preguntas, actividades, reglas de XP, ligas, rangos, temporada activa, logros y retos.
- **`src/test/resources/junit-platform.properties`** hace que Cucumber muestre cada paso en la consola y deje el reporte en `target/cucumber.html`.

### 2.2 Escenarios BDD

| Archivo | Escenarios (★ = principal) |
|---|---|
| `01_humo_y_seguridad.feature` | ★ Humo: la aplicación arranca y responde con los catálogos · ★ Seguridad: un jugador no entra a administración · Sin sesión no se puede consultar el perfil |
| `02_cuenta.feature` (proceso 1) | ★ Registro de un jugador · No se puede registrar un correo que ya existe · Una contraseña equivocada no inicia sesión · ★ Evaluación de nivel · ★ Bloqueo de una cuenta · ★ Actualizar perfil |
| `03_entrenamientos.feature` (proceso 2) | ★ Entrenamiento que da XP · El anti-trampa rechaza un entrenamiento más corto que el mínimo |

Ejemplo:

```gherkin
@principal
Escenario: Entrenamiento que da XP
  Dado un jugador evaluado como "INTERMEDIO" con el correo "ana@kinet.com" y el gamertag "ana_gg"
  Cuando "ana@kinet.com" entrena "FUERZA" durante 40 minutos con intensidad "MEDIA"
  Entonces la respuesta tiene el estado 200
  Y el entrenamiento queda "VALIDADO" y otorga 120 XP
  Y gana en total 140 XP con el logro "Primeros pasos"
  Y el progreso de "ana@kinet.com" muestra 140 XP y el nivel 2
```

### 2.3 Qué cubre cada clase JUnit

| Módulo | Clase | Qué verifica |
|---|---|---|
| Cuenta | `AuthIntegracionTest` | Registro y validaciones, unicidad de correo/gamertag, login, cuentas bloqueadas o inactivas, recuperación de contraseña, rutas sin token. |
| Permisos y administración | `StaffIntegracionTest` | Cada rol solo entra a su zona; búsqueda de cuentas, bloqueo, ajustes de XP, roles, reglas y logros. |
| Perfil | `PerfilIntegracionTest` | Editar perfil, cambiar contraseña, desactivar cuenta. |
| Evaluación | `EvaluacionIntegracionTest` | Preguntas sin revelar el nivel, cálculo del nivel, una respuesta por pregunta, repetición cada 30 días. |
| Entrenamientos | `EntrenamientoIntegracionTest` | Cronómetro en el servidor, anti-trampa, tope diario, moderación, evidencia (imagen o enlace) y bonus, racha, historial. |
| Enlaces deportivos | `EnlaceDeporteTest` | Reconocimiento de enlaces de Strava, Garmin y otras apps. |
| Progreso | `ProgresoIntegracionTest` | Dashboard, bandeja de notificaciones, XP vigente por actividad. |
| Reglas de juego | `ReglasJuegoTest` | Cálculos puros: XP, colocación, racha, criterios de logros. |
| Retos | `RetoIntegracionTest` | Retos por nivel, avance, aportes manuales, retos de clan, abandono, vencimiento, gestión por el administrador. |
| Clanes | `ClanIntegracionTest` | Crear, capacidad, liderazgo, expulsión, cierre. |
| Competencias | `CompetenciaIntegracionTest` | Duelos, grupales y torneos; reglas de creación y cancelación. |
| Competitivo | `CompetitivoIntegracionTest` | Matchmaking, enfrentamientos, cierre de temporada, historial de rango, abandono, descalificación. |
| Notificaciones | `NotificacionAsincronaTest` | Se generan en segundo plano y no se crean si la operación se deshace. |
| Rendimiento | `ConsultasPorPeticionTest` | Cada endpoint usa pocas consultas a la base (evita el problema N+1). |

### 2.4 Cómo ejecutarlas

Desde `kinet-backend`:

```powershell
.\pruebas-funcionales.cmd     # solo los 7 escenarios principales, paso a paso
.\todas-las-pruebas.cmd       # todo: escenarios BDD + JUnit + cobertura
```

Para elegir pruebas sueltas, desde `kinet-backend/backend`:

```powershell
# Todos los escenarios BDD (principales y el resto)
.\mvnw.cmd test -Dtest=PruebasFuncionalesTest

# Una clase JUnit
.\mvnw.cmd test -Dtest=AuthIntegracionTest

# Un método de una clase
.\mvnw.cmd test -Dtest=AuthIntegracionTest#elLoginRechazaCredencialesYCuentasNoActivas

# Varias clases por patrón
.\mvnw.cmd test -Dtest="*IntegracionTest"
```

**Desde IntelliJ:** clic derecho en `src/test/java` (o en una clase o un método) → **Run Tests**. Con el plugin *Cucumber for Java*, también se puede ejecutar un `.feature` o un escenario con el ícono verde.

### 2.5 Resultados y cobertura

- La consola muestra cada escenario con sus pasos y al final `Tests run: X, Failures: Y, Errors: Z`.
- Reporte de los escenarios: `backend/target/cucumber.html`.
- Detalle de cada clase: `backend/target/surefire-reports/`.
- Cobertura con JaCoCo (se genera con `todas-las-pruebas.cmd`): abre `backend/target/site/jacoco/index.html`. Muestra el porcentaje de líneas y ramas cubiertas por paquete y por clase.

### 2.6 Cómo escribir una prueba nueva

**Un escenario BDD:** agrégalo a un `.feature` usando las frases que ya existen en `PasosKinet.java`. Si necesitas una frase nueva, créala ahí con `@Dado`, `@Cuando` o `@Entonces` y los atajos de `PruebaIntegracion`. Si la escribes en el `.feature` sin paso, Cucumber te muestra el método que falta para que lo copies.

**Una prueba JUnit:**

1. Crea una clase en el mismo paquete que extienda `PruebaIntegracion`.
2. Usa los atajos para preparar el escenario y verifica la respuesta con `status()` y `jsonPath()`.
3. Si la prueba cambia un catálogo que `PruebaIntegracion` no restaura (niveles, preguntas, actividades nuevas), deshaz el cambio en un `@AfterEach`.

```java
class MiModuloIntegracionTest extends PruebaIntegracion {

    @Test
    void unJugadorNoEntraAAdministracion() throws Exception {
        String jugador = registrar("leo@kinet.com", "leo_run");
        get("/api/admin/retos", jugador).andExpect(status().isForbidden());
    }
}
```

---

## 3. Frontend

### 3.1 Qué son

Son pruebas de interfaz con Playwright. Abren la app en un navegador real (Chromium), escriben en los formularios, pulsan botones y verifican lo que ve el usuario y la URL a la que llega.

**La API se simula:** cada prueba intercepta las llamadas a `/api/...` y responde lo que necesita, con el mismo formato `{ error, respuesta }` del backend. Así las pruebas son rápidas, no dependen de datos y pueden reproducir errores (401, 403, 500, sin conexión) que con el backend real serían difíciles de provocar.

`npm run e2e` corre solo las 2 pruebas `@principal`, con el navegador visible y en cámara lenta (proyecto `visual`). `npm run e2e:todas` corre todas, dos veces cada una: en escritorio (`escritorio`) y en un celular emulado (`movil`, un Pixel 7).

### 3.2 Qué cubre cada archivo

| Archivo | Pantalla o pieza | Qué verifica |
|---|---|---|
| `login.spec.ts` | Inicio de sesión | Login correcto (a la app, a la evaluación o al panel del equipo), campos vacíos, correo inválido, credenciales incorrectas, cuenta bloqueada, sin conexión, mostrar/ocultar contraseña, enlace al registro. |
| `registro.spec.ts` | Registro | Datos enviados al backend, campos obligatorios, reglas de gamertag y contraseña, política de datos, correo duplicado, errores de validación del servidor. |
| `evaluacion.spec.ts` | Evaluación de nivel | Flujo completo hasta el resultado, volver a la pregunta anterior, reintentar si fallan la carga o el envío, cuestionario vacío, salir. |
| `perfil.spec.ts` | Perfil y edición | Datos mostrados, tema oscuro persistente, cerrar sesión, desactivar cuenta (cancelar, confirmar, error), editar perfil (validaciones, guardado, error del servidor). |
| `guards.spec.ts` | Protección de rutas | A dónde lleva cada ruta sin sesión, con sesión sin evaluación y con evaluación; el jugador no entra al panel del equipo; el entrenador no abre páginas del administrador; token vencido. |
| `interceptores.spec.ts` | Comunicación con la API | Envío del token, 401 a mitad de uso, error sin formato, sin conexión. |

En total son 45 pruebas (90 ejecuciones con escritorio y móvil).

### 3.3 Cómo ejecutarlas

Todos los comandos se ejecutan desde `kinet-frontend`. No hace falta tener `ng serve` abierto: Playwright lo levanta solo y, si ya está corriendo en el puerto 4200, lo reutiliza.

```powershell
# Solo las 2 principales (@principal), viendo el navegador
npm run e2e

# Todas, en escritorio y móvil
npm run e2e:todas

# Modo visual: lista de pruebas, paso a paso, capturas de cada acción (el mejor para revisar o depurar)
npm run e2e:ui

# Ver el navegador mientras prueba
npx playwright test --project=escritorio --headed

# Un archivo
npx playwright test e2e/login.spec.ts --project=escritorio

# Una prueba por su nombre (o parte de él)
npx playwright test -g "cuenta bloqueada" --project=escritorio

# Reporte HTML de la última ejecución
npm run e2e:reporte
```

### 3.4 Resultados

- La consola lista cada prueba con ✓ o ✘.
- `npm run e2e:reporte` abre el reporte HTML. Cuando una prueba falla, incluye la captura de pantalla y la traza: una línea de tiempo con el DOM, la red y la consola de cada paso.
- Los archivos generados quedan en `test-results/` y `playwright-report/`, que están en `.gitignore`.

### 3.5 Cómo escribir una prueba nueva

Las utilidades están en `e2e/utils/`:

| Utilidad | Para qué |
|---|---|
| `simularApi(page, rutas)` (`api.ts`) | Define qué responde cada endpoint. La clave es `"MÉTODO /ruta"` sin el `/api`. Devuelve la lista de peticiones recibidas, para revisar cuerpo y token (`ultima(peticiones, "POST /auth/login")`). Una ruta no definida responde 404. |
| `ok(datos, status?)` / `fallo(status, mensaje)` / `sinConexion` | Respuestas con el formato del backend, o una caída de red. |
| `conSesion(page)` (`sesion.ts`) | Deja un token guardado antes de abrir la app, como si el usuario ya hubiera iniciado sesión. Hay que simular también `GET /usuarios/me`. |
| `tokenGuardado(page)` | Lee el token guardado, para comprobar que se guardó o se borró. |
| `usuario({...})`, `sesion({...})`, `PREGUNTAS`, `apiDeInicio()` (`datos.ts`) | Datos de ejemplo con la forma de los DTO del backend. `usuario({ nivelHabilidad: null })` es un jugador sin evaluación; `apiDeInicio()` simula lo que pide la pantalla de Inicio. |

```ts
import { expect, test } from '@playwright/test';
import { ok, simularApi } from './utils/api';
import { usuario } from './utils/datos';
import { conSesion } from './utils/sesion';

test('el perfil muestra el gamertag', async ({ page }) => {
  await conSesion(page);
  await simularApi(page, { 'GET /usuarios/me': ok(usuario({ gamertag: 'leo_run' })) });

  await page.goto('/tabs/perfil');

  await expect(page.getByText('@leo_run')).toBeVisible();
});
```

Para encontrar elementos, usa `getByLabel` (campos con `<label>`), `getByRole` (botones, enlaces) y `getByText`. Si un elemento no tiene texto estable, agrégale un atributo `data-testid` y usa `getByTestId`.

---

## 4. Pruebas manuales complementarias (con el backend real)

Las pruebas automáticas no reemplazan una revisión con el sistema completo. Para eso:

1. Carga `kinet_bd.sql` en Oracle y levanta el backend (`.\mvnw.cmd spring-boot:run` desde `kinet-backend/backend`).
2. **`kinet.http`**: ábrelo en IntelliJ y ejecuta las peticiones en orden con el botón verde. Cada una guarda el token para las siguientes.
3. **Swagger**: `http://localhost:8080/swagger-ui.html`. Inicia sesión con `/api/auth/login`, copia el token y pégalo en **Authorize**.
4. Levanta el frontend (`npm start` en `kinet-frontend`) y recorre los flujos a mano, también en la app desplegada (`https://kinetapp.duckdns.org`) y en el celular.

---

## 5. Problemas comunes

| Síntoma | Solución |
|---|---|
| `[Kinet] No se encontró Java` | Instala el JDK 17 o superior y define `JAVA_HOME`, o ejecuta las pruebas desde IntelliJ. |
| `mvnw.cmd` no descarga Maven | Revisa la conexión. Detrás de un proxy, descarga a mano `apache-maven-3.9.9-bin.zip` y descomprímelo en `%USERPROFILE%\.m2\wrapper\dists`. |
| Muchas pruebas del backend fallan a la vez al arrancar | Normalmente es un error al levantar Spring (revisa el primer error de la consola). Comprueba que usas Java 17 o superior. |
| Un paso sale como `Undefined` en Cucumber | La frase del `.feature` no coincide con ningún método de `PasosKinet.java`. Copia el método que sugiere la consola o corrige la frase. |
| Fallan pruebas que buscan nombres con tildes ("Misión diaria", "Primeros pasos") y aparece `�` | `data.sql` se leyó con la codificación de Windows. Comprueba que `src/test/resources/application.properties` tenga `spring.sql.init.encoding=UTF-8`. |
| `Executable doesn't exist ... chromium` | Falta el navegador de Playwright: `npx playwright install chromium`. |
| Playwright se queda esperando el servidor o da *timeout* en `webServer` | La primera compilación de Angular puede tardar. Abre `npm start` en otra terminal, espera a que compile y vuelve a ejecutar las pruebas (se reutiliza). |
| `The Angular CLI requires a minimum Node.js version` | Actualiza Node.js a 22.22.3 o superior (o 24). |
| Puerto 4200 ocupado por otra app | Cierra esa app, o cambia el puerto en `playwright.config.ts` (`webServer.url` y `use.baseURL`). |
| Una prueba falla solo en `movil` | Revisa la captura en el reporte: suele ser un elemento tapado o fuera de pantalla en el tamaño de celular. |
| Una prueba de Playwright falla con 404 "Sin simular: ..." | La pantalla llamó a un endpoint que la prueba no simuló. Agrégalo a `simularApi`. |
