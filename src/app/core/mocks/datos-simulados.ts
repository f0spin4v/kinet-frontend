import { RetoDetalle, TipoActividad } from '../models/entrenamiento.models';

/** Demora artificial para que se vean los estados de carga, como con un backend real. */
export const LATENCIA_MS = 500;

export const ETIQUETA_ACTIVIDAD: Record<TipoActividad, string> = {
  FUERZA: 'Fuerza',
  CALISTENIA: 'Calistenia',
  RUNNING: 'Running',
};

function finDeHoy(): string {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

function proximoLunes(): string {
  const d = new Date();
  const dias = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + dias);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function haceDias(dias: number, hora = 18): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 30, 0, 0);
  return d.toISOString();
}

export const simulacion = {
  jugador: {
    xpTotal: 14850,
    rachaActual: 12,
    rachaRecord: 15,
    sesionesHoy: 0,
  },
  siguienteEntrenamientoId: 101,
  retos: [
    {
      id: 1,
      titulo: 'Entrena 30 minutos hoy',
      descripcion: 'Suma 30 minutos de cualquier actividad antes de que termine el día.',
      tipo: 'INDIVIDUAL',
      periodicidad: 'DIARIA',
      categoria: null,
      unidad: 'MINUTOS',
      meta: 30,
      progreso: 0,
      recompensaXp: 100,
      fechaFin: finDeHoy(),
      completado: false,
      historial: [],
    },
    {
      id: 2,
      titulo: '50 repeticiones de fuerza',
      descripcion: 'Completa 50 repeticiones en una o varias sesiones de fuerza hoy.',
      tipo: 'INDIVIDUAL',
      periodicidad: 'DIARIA',
      categoria: 'FUERZA',
      unidad: 'REPETICIONES',
      meta: 50,
      progreso: 0,
      recompensaXp: 150,
      fechaFin: finDeHoy(),
      completado: false,
      historial: [],
    },
    {
      id: 3,
      titulo: '100 dominadas acumuladas',
      descripcion: 'Supera el volumen objetivo de repeticiones en dominadas estrictas antes del reinicio semanal.',
      tipo: 'INDIVIDUAL',
      periodicidad: 'SEMANAL',
      categoria: 'CALISTENIA',
      unidad: 'REPETICIONES',
      meta: 100,
      progreso: 64,
      recompensaXp: 750,
      fechaFin: proximoLunes(),
      completado: false,
      historial: [
        { fecha: haceDias(1), descripcion: 'Calistenia', cantidad: 18 },
        { fecha: haceDias(2), descripcion: 'Calistenia', cantidad: 22 },
        { fecha: haceDias(4), descripcion: 'Calistenia', cantidad: 24 },
      ],
    },
    {
      id: 4,
      titulo: 'Clan en movimiento',
      descripcion: 'Entre todo tu clan, completen 20 sesiones de entrenamiento esta semana.',
      tipo: 'GRUPAL',
      periodicidad: 'SEMANAL',
      categoria: null,
      unidad: 'SESIONES',
      meta: 20,
      progreso: 13,
      recompensaXp: 1200,
      fechaFin: proximoLunes(),
      completado: false,
      historial: [
        { fecha: haceDias(1, 7), descripcion: 'Sesión de un compañero', cantidad: 1 },
        { fecha: haceDias(1), descripcion: 'Tu sesión', cantidad: 1 },
      ],
    },
    {
      id: 5,
      titulo: '300 minutos de running',
      descripcion: 'Acumula 300 minutos corriendo durante la semana.',
      tipo: 'INDIVIDUAL',
      periodicidad: 'SEMANAL',
      categoria: 'RUNNING',
      unidad: 'MINUTOS',
      meta: 300,
      progreso: 300,
      recompensaXp: 900,
      fechaFin: proximoLunes(),
      completado: true,
      historial: [
        { fecha: haceDias(2, 6), descripcion: 'Running', cantidad: 120 },
        { fecha: haceDias(3, 6), descripcion: 'Running', cantidad: 180 },
      ],
    },
  ] as RetoDetalle[],
};
