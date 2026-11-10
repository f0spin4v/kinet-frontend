import { Component } from '@angular/core';

/** Correo al que el titular dirige consultas y reclamos (Ley 1581 de 2012, art. 14 y 15). */
export const CORREO_DATOS = 'andresf.ospinav@uqvirtual.edu.co';
export const VIGENCIA_POLITICA = '4 de noviembre de 2026';

/**
 * Texto de la Política de Tratamiento de Datos Personales de Kinet (Ley 1581 de 2012 y Decreto 1074 de 2015,
 * capítulo 25). Se usa en la página pública /politica-datos y en la aceptación del primer ingreso.
 */
@Component({
  selector: 'app-politica-texto',
  template: `
    <article class="politica">
      <p class="texto-suave">Vigente desde el {{ vigencia }}.</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Equipo Kinet, proyecto académico del curso Ingeniería de Software III de la Universidad del Quindío
        (Armenia, Quindío, Colombia). Correo para temas de datos personales:
        <a [href]="'mailto:' + correo">{{ correo }}</a>.
      </p>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li><strong>Cuenta:</strong> nombres, apellidos, correo, fecha de nacimiento, gamertag, foto de perfil (opcional) y contraseña, que se guarda cifrada con BCrypt y nadie puede leer.</li>
        <li><strong>Actividad en la app:</strong> entrenamientos (actividad, duración, intensidad, distancia o series), evidencias que subas (imagen o enlace a Strava, Garmin u otra app), XP, nivel, retos, clanes, temporadas y competencias.</li>
        <li><strong>Datos técnicos:</strong> fecha de registro, aceptación de esta política y registros de seguridad (inicios de sesión fallidos y cambios hechos por el administrador).</li>
      </ul>
      <p>Kinet no pide datos de salud, diagnósticos ni datos sensibles. No uses las notas ni las evidencias para compartirlos.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Crear y proteger tu cuenta, y recuperar tu contraseña.</li>
        <li>Calcular tu XP, nivel, rachas, retos, rangos y resultados de competencias.</li>
        <li>Mostrar tu gamertag y tu posición a otros jugadores en rankings, clanes y competencias. Tu correo, tus nombres y tu fecha de nacimiento nunca se muestran a otros jugadores.</li>
        <li>Revisar evidencias y sesiones sospechosas (entrenadores del equipo).</li>
        <li>Enviarte notificaciones de la app.</li>
        <li>Estadísticas internas del equipo, sin identificar a nadie.</li>
      </ul>
      <p>No vendemos ni compartimos tus datos con terceros para publicidad.</p>

      <h2>4. Menores de edad</h2>
      <p>Kinet es para mayores de 14 años. Si tienes entre 14 y 17, tu cuenta solo se activa cuando tu madre, tu padre o tu representante legal la autoriza (Ley 1581 de 2012, art. 7, y Decreto 1377 de 2013, art. 12). Le enviamos un correo con un enlace para autorizar o no; también puede firmar una autorización que el equipo registra en la app. Tu opinión se tiene en cuenta y tus datos se usan solo para lo descrito en esta política, respetando tu interés superior.</p>
      <p>El representante puede retirar su autorización cuando quiera escribiendo a soporte; en ese caso la cuenta queda inactiva. Si detectamos una cuenta de un menor de 14 años o de un menor sin autorización, la desactivamos y borramos sus datos.</p>

      <h2>5. Tus derechos</h2>
      <p>Como titular puedes, de forma gratuita:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos (también desde tu perfil).</li>
        <li>Pedir prueba de la autorización que nos diste.</li>
        <li>Saber qué uso le hemos dado a tus datos.</li>
        <li>Revocar la autorización o pedir que borremos tus datos, cuando no haya un deber legal de conservarlos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio después de agotar el trámite con nosotros.</li>
      </ul>

      <h2>6. Cómo ejercerlos</h2>
      <p>
        Escribe a <a [href]="'mailto:' + correo">{{ correo }}</a> desde el correo de tu cuenta.
        Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.
        También puedes desactivar tu cuenta desde tu perfil.
      </p>

      <h2>7. Seguridad y dónde se guardan</h2>
      <p>
        Los datos viajan cifrados (HTTPS) y se guardan en una base de datos Oracle en un servidor de Amazon Web
        Services (AWS), con acceso por roles y copias de seguridad diarias. Como el servidor puede estar fuera de
        Colombia, al aceptar autorizas esa transferencia, que se hace con las mismas medidas de seguridad.
      </p>

      <h2>8. Cuánto tiempo los guardamos</h2>
      <p>Mientras tu cuenta exista. Si pides borrarla, se elimina de la base de datos y desaparece de las copias de seguridad cuando estas se renuevan (máximo 7 días).</p>

      <h2>9. Cambios a esta política</h2>
      <p>Si la cambiamos, te avisaremos en la app y te pediremos aceptarla de nuevo cuando el cambio sea importante.</p>
    </article>
  `,
  styles: `
    .politica { display: flex; flex-direction: column; gap: 10px; line-height: 1.55; }
    h2 { font-size: 16px; margin: 14px 0 0; }
    ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
    p { margin: 0; }
    a { color: var(--kinet-primary); font-weight: 600; word-break: break-all; }
  `,
})
export class PoliticaTextoComponent {
  correo = CORREO_DATOS;
  vigencia = VIGENCIA_POLITICA;
}
