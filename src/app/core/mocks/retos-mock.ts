import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { Reto, RetoDetalle } from '../models/entrenamiento.models';
import { RetoService } from '../services/retos';
import { LATENCIA_MS, simulacion } from './datos-simulados';

@Injectable()
export class RetoMockService extends RetoService {
  listar(): Observable<Reto[]> {
    const retos = simulacion.retos.map(({ historial, ...reto }) => reto);
    return of(structuredClone(retos)).pipe(delay(LATENCIA_MS));
  }

  detalle(id: number): Observable<RetoDetalle> {
    const reto = simulacion.retos.find(r => r.id === id);
    if (!reto) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        error: { mensaje: 'El reto no existe.' },
      }));
    }
    return of(structuredClone(reto)).pipe(delay(LATENCIA_MS));
  }
}
