// ===== Entrenamientos =====
export type TipoActividad = 'FUERZA' | 'CALISTENIA' | 'RUNNING';
export type Intensidad = 'BAJA' | 'MEDIA' | 'ALTA';
export type EstadoEntrenamiento = 'VALIDADO' | 'RECHAZADO';

export interface RegistroEntrenamientoRequest {
  tipo: TipoActividad;
  duracionMinutos: number;
  intensidad: Intensidad;
  repeticiones: number | null; // solo fuerza y calistenia
  nota: string | null;
}

export interface AvanceReto {
  retoId: number;
  titulo: string;
  progresoAnterior: number;
  progresoActual: number;
  meta: number;
  completado: boolean;
  recompensaXp: number;
}

export interface RegistroEntrenamientoResponse {
  id: number;
  estado: EstadoEntrenamiento;
  motivoRechazo: string | null;
  xpSesion: number;   // XP por el entrenamiento
  xpRetos: number;    // XP extra por retos completados con esta sesión
  xpTotal: number;    // XP acumulada después de la sesión
  rachaActual: number;
  rachaAumento: boolean;
  retos: AvanceReto[];
}

export interface ResumenJugador {
  xpTotal: number;
  rachaActual: number;
  rachaRecord: number;
  entrenoHoy: boolean;
  retosActivos: number;
}

// ===== Retos y misiones =====
export type TipoReto = 'INDIVIDUAL' | 'GRUPAL';
export type Periodicidad = 'DIARIA' | 'SEMANAL'; // DIARIA = misión
export type UnidadReto = 'MINUTOS' | 'REPETICIONES' | 'SESIONES';

export interface Reto {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: TipoReto;
  periodicidad: Periodicidad;
  categoria: TipoActividad | null; // null = cuenta cualquier actividad
  unidad: UnidadReto;
  meta: number;
  progreso: number;
  recompensaXp: number;
  fechaFin: string;
  completado: boolean;
}

export interface AporteReto {
  fecha: string;
  descripcion: string;
  cantidad: number;
}

export interface RetoDetalle extends Reto {
  historial: AporteReto[];
}
