import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, Mensaje, RegistroRequest, Rol, Sesion, SolicitudAutorizacion, Usuario } from '../models/api.models';

const TOKEN_KEY = 'kinet_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  private _token = signal<string | null>(null);
  private _usuario = signal<Usuario | null>(null);
  private sesionCargada = false;

  readonly token = this._token.asReadonly();
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._token() !== null);
  readonly rol = computed<Rol | null>(() => this._usuario()?.rol ?? null);
  readonly esJugador = computed(() => this.rol() === 'JUGADOR');
  readonly esStaff = computed(() => this.rol() === 'ADMINISTRADOR' || this.rol() === 'ENTRENADOR');
  /** Cuenta creada por el administrador cuyo titular aún no acepta la política de datos (Ley 1581). */
  readonly pendientePolitica = computed(() => this._usuario()?.aceptaPolitica === false);
  /** Solo los jugadores hacen la evaluación de nivel; el equipo no. */
  readonly evaluado = computed(() => !this.esJugador() || this._usuario()?.nivelHabilidad != null);
  /** "Laura Gómez" */
  readonly nombreCompleto = computed(() => {
    const u = this._usuario();
    return u ? `${u.nombres} ${u.apellidos}`.trim() : '';
  });

  /** Dónde cae cada rol al entrar. */
  rutaInicial(): string {
    if (this.pendientePolitica()) return '/aceptar-politica';
    if (this.esStaff()) return '/staff';
    return this.evaluado() ? '/tabs' : '/evaluacion';
  }

  /** Recupera la sesión guardada al abrir la app. Solo se ejecuta una vez. */
  async cargarSesion(): Promise<void> {
    if (this.sesionCargada) return;
    this.sesionCargada = true;

    const { value } = await Preferences.get({ key: TOKEN_KEY });
    if (!value) return;

    this._token.set(value);
    try {
      const usuario = await firstValueFrom(this.http.get<Usuario>(`${this.api}/usuarios/me`));
      this._usuario.set(usuario);
    } catch {
      await this.cerrarSesion(); // token vencido o inválido
    }
  }

  registrar(datos: RegistroRequest): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.api}/auth/registro`, datos).pipe(tap(r => this.guardarSesion(r)));
  }

  iniciarSesion(datos: LoginRequest): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.api}/auth/login`, datos).pipe(tap(r => this.guardarSesion(r)));
  }

  recuperarContrasena(correo: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/auth/recuperar-contrasena`, { correo });
  }

  restablecerContrasena(token: string, nuevaContrasena: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/auth/restablecer-contrasena`, { token, nuevaContrasena });
  }

  /** El titular acepta la política de tratamiento de datos. */
  aceptarPolitica(): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.api}/usuarios/me/politica`, {}).pipe(tap(u => this._usuario.set(u)));
  }

  /** Para actualizar el nivel después de la evaluación o al editar el perfil. */
  actualizarUsuario(usuario: Usuario): void {
    this._usuario.set(usuario);
  }

  async cerrarSesion(): Promise<void> {
    this._token.set(null);
    this._usuario.set(null);
    await Preferences.remove({ key: TOKEN_KEY });
  }

  /** RN-33: el menor pide que su representante reciba otra vez el correo. */
  reenviarAutorizacion(correo: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/auth/autorizacion/reenvio`, { correo });
  }

  /** El representante abre el enlace del correo (no necesita cuenta). */
  consultarAutorizacion(token: string): Observable<SolicitudAutorizacion> {
    return this.http.post<SolicitudAutorizacion>(`${this.api}/autorizaciones/consulta`, { token });
  }

  responderAutorizacion(token: string, autoriza: boolean): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/autorizaciones/respuesta`, { token, autoriza });
  }

  private guardarSesion(r: Sesion): void {
    // un menor recién registrado no recibe sesión hasta que su representante autorice
    if (!r.token) return;
    this._token.set(r.token);
    this._usuario.set(r.usuario);
    Preferences.set({ key: TOKEN_KEY, value: r.token });
  }
}
