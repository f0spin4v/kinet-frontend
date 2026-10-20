import { MetricaReto } from '../models/api.models';

const formatoNumero = new Intl.NumberFormat('es-CO');

export function numero(valor: number | null | undefined): string {
  return formatoNumero.format(valor ?? 0);
}

/** "INICIACION" → "Iniciacion", "BRONCE_III" → "Bronce iii" (los nombres de rango del backend ya vienen legibles). */
export function etiqueta(valor: string | null | undefined): string {
  if (!valor) return '—';
  const texto = valor.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Clase de color (chip) según el estado que devuelve el backend. */
export function claseEstado(estado: string | null | undefined): string {
  switch (estado) {
    case 'VALIDADO': case 'ACEPTADA': case 'ACEPTADO': case 'COMPLETADO': case 'ACTIVO': case 'ACTIVA':
    case 'GANADOR': case 'VICTORIA': case 'FINALIZADO': case 'FINALIZADA': case 'ENVIADA': case 'LIDER':
      return 'chip--ok';
    case 'PENDIENTE': case 'EN_COLA': case 'INVITADO': case 'SIN_REVISAR': case 'BORRADOR': case 'INACTIVO':
    case 'EMPAREJADA': case 'COMPLETADO_PARCIAL': case 'PROGRAMADO': case 'PROGRAMADA':
      return 'chip--aviso';
    case 'RECHAZADO': case 'RECHAZADA': case 'BLOQUEADO': case 'ABANDONADO': case 'ABANDONADA': case 'DERROTA':
    case 'PERDEDOR': case 'CANCELADA': case 'CANCELADO': case 'VENCIDA': case 'VENCIDO': case 'FALLIDA': case 'DESCALIFICADA':
    case 'CERRADO': case 'CERRADA':
      return 'chip--error';
    case 'EN_CURSO': case 'EMPATE':
      return 'chip--info';
    default:
      return '';
  }
}

export const ETIQUETA_METRICA: Record<MetricaReto, string> = {
  MINUTOS: 'min',
  REPETICIONES: 'reps',
  SESIONES: 'sesiones',
};

/** Ícono (ionicons) para cada actividad del catálogo. */
export function iconoActividad(nombre: string | null | undefined): string {
  switch ((nombre ?? '').toUpperCase()) {
    case 'FUERZA': return 'barbell-outline';
    case 'CALISTENIA': return 'body-outline';
    case 'RUNNING': return 'walk-outline';
    case 'CICLISMO': return 'bicycle-outline';
    case 'NATACION': return 'water-outline';
    default: return 'flash-outline';
  }
}

/** "17 oct, 16:30" */
export function fechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })}`;
}

/** "17 oct 2026" */
export function fechaLarga(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  return new Date(fecha.length <= 10 ? `${fecha}T00:00:00` : fecha)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 95 → "1 h 35 min", 40 → "40 min" */
export function duracion(minutos: number | null | undefined): string {
  if (minutos == null) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Fecha y hora para un <input type="datetime-local">: "2026-10-18T08:00". */
export function aInputFecha(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** Del input datetime-local ("2026-10-18T08:00") al formato del backend ("2026-10-18T08:00:00"). */
export function aFechaBackend(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return valor.length === 16 ? `${valor}:00` : valor;
}
