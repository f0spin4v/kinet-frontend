import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EvaluacionResponse, OpcionId, Pregunta, PreguntaDto, ResultadoEvaluacionDto,
} from '../models/evaluacion.models';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/evaluacion`;

  preguntas(): Observable<Pregunta[]> {
    return this.http.get<PreguntaDto[]>(`${this.api}/preguntas`).pipe(
      map(lista => [...lista]
        .sort((a, b) => a.orden - b.orden)
        .map(p => ({ numero: p.orden, texto: p.enunciado, opciones: p.opciones })))
    );
  }

  /** Una opción por pregunta, en el mismo orden en que se mostraron. */
  registrar(idsOpciones: OpcionId[]): Observable<EvaluacionResponse> {
    return this.http.post<ResultadoEvaluacionDto>(this.api, { idsOpciones }).pipe(
      map(r => ({ nivelInicial: r.nivelHabilidad, fecha: r.fecha })),
      tap(r => {
        const usuario = this.auth.usuario();
        if (usuario) {
          this.auth.actualizarUsuario({ ...usuario, nivelInicial: r.nivelInicial });
        }
      })
    );
  }
}
