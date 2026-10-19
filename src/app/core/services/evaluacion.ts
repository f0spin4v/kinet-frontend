import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluacionResponse, OpcionId, Pregunta } from '../models/evaluacion.models';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/evaluacion`;

  preguntas(): Observable<Pregunta[]> {
    return this.http.get<Pregunta[]>(`${this.api}/preguntas`);
  }

  registrar(respuestas: OpcionId[]): Observable<EvaluacionResponse> {
    return this.http.post<EvaluacionResponse>(this.api, { respuestas }).pipe(
      tap(r => {
        const usuario = this.auth.usuario();
        if (usuario) {
          this.auth.actualizarUsuario({ ...usuario, nivelInicial: r.nivelInicial });
        }
      })
    );
  }
}
