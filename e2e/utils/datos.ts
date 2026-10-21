import { fallo, ok, Respuesta } from './api';

/** Datos de ejemplo con la misma forma de los DTO del backend. */

export interface UsuarioPrueba {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: 'JUGADOR' | 'ENTRENADOR' | 'ADMINISTRADOR';
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  gamertag: string | null;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
  nivelHabilidad: string | null;
  fechaRegistro: string;
}

/** Un jugador evaluado. usuario({ nivelHabilidad: null }) es un jugador que aún no hizo la evaluación. */
export function usuario(cambios: Partial<UsuarioPrueba> = {}): UsuarioPrueba {
  return {
    id: 3,
    nombres: 'Laura',
    apellidos: 'Gómez',
    correo: 'laura@kinet.com',
    rol: 'JUGADOR',
    estado: 'ACTIVO',
    gamertag: 'laura_runner',
    avatarUrl: null,
    fechaNacimiento: '2001-04-15',
    nivelHabilidad: 'INTERMEDIO',
    fechaRegistro: '2026-09-24T10:00:00',
    ...cambios,
  };
}

/** Lo que devuelven el registro y el inicio de sesión. */
export function sesion(cambios: Partial<UsuarioPrueba> = {}, token = 'token-de-prueba') {
  return { token, usuario: usuario(cambios) };
}

/** Cuestionario de la evaluación de nivel: 5 preguntas con 2 opciones. */
export const PREGUNTAS = [1, 2, 3, 4, 5].map(n => ({
  id: n,
  orden: n,
  enunciado: `¿Pregunta ${n} de la evaluación?`,
  opciones: [
    { id: n * 10 + 1, titulo: `Opción A de la pregunta ${n}`, descripcion: 'Poca actividad' },
    { id: n * 10 + 2, titulo: `Opción B de la pregunta ${n}`, descripcion: 'Mucha actividad' },
  ],
}));

export function resultadoEvaluacion(nivel = 'INTERMEDIO') {
  return {
    id: 1,
    nivelHabilidad: nivel,
    votos: { [nivel]: 3, INICIACION: 2 },
    versionAlgoritmo: 'v1',
    fecha: '2026-10-21T08:00:00',
    puedeRepetirDesde: '2026-11-20T08:00:00',
  };
}

export function progreso() {
  return {
    gamertag: 'laura_runner',
    xpTotal: 1000,
    nivel: 6,
    xpInicioNivel: 900,
    xpSiguienteNivel: 1350,
    porcentajeNivel: 22,
    rachaActual: 3,
    rachaMaxima: 3,
    entrenamientosSemana: 4,
    minutosSemana: 195,
    retosActivos: 1,
    retosCompletados: 2,
    logros: 3,
    notificacionesSinLeer: 0,
    nivelHabilidad: 'INTERMEDIO',
    temporada: 'Temporada 1',
    rango: 'BRONCE III',
    puntosTemporada: 25,
  };
}

const PAGINA_VACIA = { contenido: [], pagina: 0, tamanio: 20, totalElementos: 0, totalPaginas: 0 };

/** Lo que pide la pantalla de Inicio, para que cargue completa después de entrar. */
export function apiDeInicio(cambios: Partial<UsuarioPrueba> = {}): Record<string, Respuesta> {
  return {
    'GET /usuarios/me': ok(usuario(cambios)),
    'GET /progreso': ok(progreso()),
    'GET /entrenamientos/en-curso': fallo(404, 'No tienes un entrenamiento en curso.'),
    'GET /retos/mios': ok(PAGINA_VACIA),
  };
}
