import { Intensidad, TipoActividad } from '../models/entrenamiento.models';
import { UnidadReto } from '../models/entrenamiento.models';


export const ACTIVIDADES: { valor: TipoActividad; etiqueta: string; icono: string }[] = [
  { valor: 'FUERZA', etiqueta: 'Fuerza', icono: 'barbell-outline' },
  { valor: 'CALISTENIA', etiqueta: 'Calistenia', icono: 'body-outline' },
  { valor: 'RUNNING', etiqueta: 'Running', icono: 'walk-outline' },
];

export const INTENSIDADES: { valor: Intensidad; etiqueta: string; descripcion: string }[] = [
  { valor: 'BAJA', etiqueta: 'Baja', descripcion: 'Puedes conversar sin esfuerzo.' },
  { valor: 'MEDIA', etiqueta: 'Media', descripcion: 'Respiras rápido, pero puedes hablar en frases cortas.' },
  { valor: 'ALTA', etiqueta: 'Alta', descripcion: 'Casi no puedes hablar mientras entrenas.' },
];

export function etiquetaActividad(tipo: TipoActividad): string {
  return ACTIVIDADES.find(a => a.valor === tipo)?.etiqueta ?? tipo;
}

export function usaRepeticiones(tipo: TipoActividad | null): boolean {
  return tipo === 'FUERZA' || tipo === 'CALISTENIA';
}
export function iconoActividad(tipo: TipoActividad | null): string {
  return ACTIVIDADES.find(a => a.valor === tipo)?.icono ?? 'flash-outline';
}

export const ETIQUETA_UNIDAD: Record<UnidadReto, string> = {
  MINUTOS: 'min',
  REPETICIONES: 'reps',
  SESIONES: 'sesiones',
};
