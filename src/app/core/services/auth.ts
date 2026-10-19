import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegistroRequest, Usuario } from '../models/auth.models';

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
  readonly evaluado = computed(() => this._usuario()?.nivelInicial != null);

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

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/registro`, datos)
      .pipe(tap(r => this.guardarSesion(r)));
  }

  iniciarSesion(datos: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, datos)
      .pipe(tap(r => this.guardarSesion(r)));
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
