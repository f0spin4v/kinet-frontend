import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario, UsuarioDto, aUsuario } from '../models/auth.models';
import { ActualizarPerfilRequest } from '../models/usuario.models';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/usuarios/me`;

  actualizarPerfil(datos: ActualizarPerfilRequest): Observable<Usuario> {
    const cuerpo = {
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      gamertag: datos.nickname,
      avatarUrl: datos.avatarUrl,
      fechaNacimiento: datos.fechaNacimiento,
    };
    return this.http.put<UsuarioDto>(this.api, cuerpo).pipe(
      map(aUsuario),
      tap(usuario => this.auth.actualizarUsuario(usuario))
    );
  }

  /** El backend desactiva la cuenta (queda INACTIVA); no se necesita la contraseña. */
  eliminarCuenta(): Observable<void> {
    return this.http.delete<void>(this.api);
  }
}
