import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/auth.models';
import { ActualizarPerfilRequest } from '../models/usuario.models';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/usuarios/me`;

  actualizarPerfil(datos: ActualizarPerfilRequest): Observable<Usuario> {
    return this.http.put<Usuario>(this.api, datos)
      .pipe(tap(usuario => this.auth.actualizarUsuario(usuario)));
  }

  eliminarCuenta(contrasena: string): Observable<void> {
    return this.http.request<void>('DELETE', this.api, { body: { contrasena } });
  }
}
