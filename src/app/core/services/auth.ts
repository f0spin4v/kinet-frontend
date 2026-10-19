import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { Observable, firstValueFrom, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse, LoginRequest, RegistroRequest, SesionDto, Usuario, UsuarioDto, aUsuario,
} from '../models/auth.models';

const TOKEN_KEY = 'kinet_token';

const aSesion = (s: SesionDto): AuthResponse => ({ token: s.token, usuario: aUsuario(s.usuario) });

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
  readonly evaluado = computed(() => this._usuario()?.nivelInicial != null);

  /** Recupera la sesión guardada al abrir la app. Solo se ejecuta una vez. */
  async cargarSesion(): Promise<void> {
    if (this.sesionCargada) return;
    this.sesionCargada = true;

    const { value } = await Preferences.get({ key: TOKEN_KEY });
    if (!value) return;

    this._token.set(value);
    try {
      const dto = await firstValueFrom(this.http.get<UsuarioDto>(`${this.api}/usuarios/me`));
      this._usuario.set(aUsuario(dto));
    } catch {
      await this.cerrarSesion(); // token vencido o inválido
    }
  }

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    const cuerpo = {
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo: datos.correo,
      contrasena: datos.contrasena,
      gamertag: datos.nickname,
      aceptaPolitica: datos.aceptaDatos,
    };
    return this.http.post<SesionDto>(`${this.api}/auth/registro`, cuerpo).pipe(
      map(aSesion),
      tap(r => this.guardarSesion(r))
    );
  }

  iniciarSesion(datos: LoginRequest): Observable<AuthResponse> {
    return this.http.post<SesionDto>(`${this.api}/auth/login`, datos).pipe(
      map(aSesion),
      tap(r => this.guardarSesion(r))
    );
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

  private guardarSesion(r: AuthResponse): void {
    this._token.set(r.token);
    this._usuario.set(r.usuario);
    Preferences.set({ key: TOKEN_KEY, value: r.token });
  }
}
