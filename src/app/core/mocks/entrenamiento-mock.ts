import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  AvanceReto, Intensidad, RegistroEntrenamientoRequest,
  RegistroEntrenamientoResponse, ResumenJugador,
} from '../models/entrenamiento.models';
import { EntrenamientoService } from '../services/entrenamiento';
import { ETIQUETA_ACTIVIDAD, LATENCIA_MS, simulacion } from './datos-simulados';

const XP_POR_MINUTO: Record<Intensidad, number> = { BAJA: 5, MEDIA: 8, ALTA: 12 };
const MAX_SESIONES_DIA = 3;

@Injectable()
export class EntrenamientoMockService extends EntrenamientoService {
  resumen(): Observable<ResumenJugador> {
    const j = simulacion.jugador;
    return of({
      xpTotal: j.xpTotal,
      rachaActual: j.rachaActual,
      rachaRecord: j.rachaRecord,
      entrenoHoy: j.sesionesHoy > 0,
      retosActivos: simulacion.retos.filter(r => !r.completado).length,
    }).pipe(delay(LATENCIA_MS));
  }

  registrar(datos: RegistroEntrenamientoRequest): Observable<RegistroEntrenamientoResponse> {
    const j = simulacion.jugador;
    const id = simulacion.siguienteEntrenamientoId++;

    const motivo = this.antiCheat(datos);
    if (motivo) {
      return of<RegistroEntrenamientoResponse>({
        id,
        estado: 'RECHAZADO',
        motivoRechazo: motivo,
        xpSesion: 0,
        xpRetos: 0,
        xpTotal: j.xpTotal,
        rachaActual: j.rachaActual,
        rachaAumento: false,
        retos: [],
      }).pipe(delay(LATENCIA_MS));
    }

    const xpSesion = Math.round(datos.duracionMinutos * XP_POR_MINUTO[datos.intensidad]);

    const rachaAumento = j.sesionesHoy === 0;
    if (rachaAumento) {
      j.rachaActual++;
      j.rachaRecord = Math.max(j.rachaRecord, j.rachaActual);
    }
    j.sesionesHoy++;

    const avances: AvanceReto[] = [];
    let xpRetos = 0;

    for (const reto of simulacion.retos) {
      if (reto.completado) continue;
      if (reto.categoria && reto.categoria !== datos.tipo) continue;

      const aporte =
        reto.unidad === 'MINUTOS' ? datos.duracionMinutos :
          reto.unidad === 'SESIONES' ? 1 :
            datos.repeticiones ?? 0;
      if (aporte <= 0) continue;

      const anterior = reto.progreso;
      reto.progreso = Math.min(reto.meta, reto.progreso + aporte);
      reto.completado = reto.progreso >= reto.meta;
      reto.historial.unshift({
        fecha: new Date().toISOString(),
        descripcion: reto.tipo === 'GRUPAL' ? 'Tu sesión' : ETIQUETA_ACTIVIDAD[datos.tipo],
        cantidad: aporte,
      });
      if (reto.completado) xpRetos += reto.recompensaXp;

      avances.push({
        retoId: reto.id,
        titulo: reto.titulo,
        progresoAnterior: anterior,
        progresoActual: reto.progreso,
        meta: reto.meta,
        completado: reto.completado,
        recompensaXp: reto.recompensaXp,
      });
    }

    j.xpTotal += xpSesion + xpRetos;

    return of<RegistroEntrenamientoResponse>({
      id,
      estado: 'VALIDADO',
      motivoRechazo: null,
      xpSesion,
      xpRetos,
      xpTotal: j.xpTotal,
      rachaActual: j.rachaActual,
      rachaAumento,
      retos: avances,
    }).pipe(delay(LATENCIA_MS));
  }

  /** Reglas de ejemplo. Las reales las define el módulo anti-cheat del backend. */
  private antiCheat(d: RegistroEntrenamientoRequest): string | null {
    if (d.duracionMinutos > 240) {
      return 'La duración supera el máximo permitido para una sesión (4 horas).';
    }
    if (d.repeticiones && d.repeticiones / d.duracionMinutos > 40) {
      return 'La cantidad de repeticiones no es realista para la duración registrada.';
    }
    if (simulacion.jugador.sesionesHoy >= MAX_SESIONES_DIA) {
      return `Alcanzaste el máximo de ${MAX_SESIONES_DIA} sesiones por día.`;
    }
    return null;
  }
}
