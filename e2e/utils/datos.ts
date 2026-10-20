/** Datos de ejemplo con la misma forma que los DTO del backend (ver src/app/core/models). */

export const TOKEN = 'token-de-prueba';

export interface UsuarioDtoPrueba {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  estado: string;
  gamertag: string | null;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
  nivelHabilidad: string | null;
  fechaRegistro: string;
}

/** Jugador de prueba. Por defecto ya hizo la evaluación; usar { nivelHabilidad: null } para uno nuevo. */
export function usuario(cambios: Partial<UsuarioDtoPrueba> = {}): UsuarioDtoPrueba {
  return {
    id: 1,
    nombres: 'Ana',
    apellidos: 'Pérez',
    correo: 'ana@kinet.com',
    rol: 'JUGADOR',
    estado: 'ACTIVO',
    gamertag: 'ana_fit',
    avatarUrl: null,
    fechaNacimiento: '2000-05-10',
    nivelHabilidad: 'INTERMEDIO',
    fechaRegistro: '2026-01-15T10:00:00',
    ...cambios,
  };
}

export function sesion(cambios: Partial<UsuarioDtoPrueba> = {}) {
  return { token: TOKEN, usuario: usuario(cambios) };
}

/** Tres preguntas, cada una con una opción por nivel. Los ids de opción son únicos. */
export const PREGUNTAS = [1, 2, 3].map(orden => ({
  id: orden,
  orden,
  enunciado: `Pregunta de prueba ${orden}`,
  opciones: [
    { id: orden * 10 + 1, titulo: `Principiante ${orden}`, descripcion: 'Empiezo desde cero' },
    { id: orden * 10 + 2, titulo: `Intermedio ${orden}`, descripcion: 'Entreno a veces' },
    { id: orden * 10 + 3, titulo: `Avanzado ${orden}`, descripcion: 'Entreno siempre' },
  ],
}));

export const RESULTADO_EVALUACION = { nivelHabilidad: 'INTERMEDIO', fecha: '2026-10-19T12:00:00' };
