import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Actividad, CrearReglaRequest, GuardarLogroRequest, GuardarPreguntaRequest, Logro, NivelProgresion,
  PreguntaAdmin, Regla, RegistroRequest, Sesion,
  EstadoReto, EstadoEvidencia, EstadoUsuario, Evidencia, EntrenamientoPendiente, GuardarRetoRequest,
  GuardarTemporadaRequest, Mensaje, MovimientoXp, Pagina, ResultadoEntrenamiento, ResumenAnalitica, Reto, Rol,
  Temporada, Usuario,
} from '../models/api.models';

function paginacion(pagina: number, tamanio: number): HttpParams {
  return new HttpParams().set('pagina', pagina).set('tamanio', tamanio);
}

/** Moderación (entrenador y administrador) y administración (solo administrador). */
@Injectable({ providedIn: 'root' })
export class StaffService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ---------- moderación ----------
  pendientes(pagina = 0, tamanio = 20): Observable<Pagina<EntrenamientoPendiente>> {
    return this.http.get<Pagina<EntrenamientoPendiente>>(`${this.api}/moderacion/entrenamientos/pendientes`,
      { params: paginacion(pagina, tamanio) });
  }

  revisarEntrenamiento(id: number, aprobar: boolean, motivo: string | null): Observable<ResultadoEntrenamiento> {
    return this.http.post<ResultadoEntrenamiento>(`${this.api}/moderacion/entrenamientos/${id}/revision`, { aprobar, motivo });
  }

  evidencias(estado: EstadoEvidencia, pagina = 0, tamanio = 20): Observable<Pagina<Evidencia>> {
    return this.http.get<Pagina<Evidencia>>(`${this.api}/moderacion/evidencias`,
      { params: paginacion(pagina, tamanio).set('estado', estado) });
  }

  imagenDeEvidencia(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/moderacion/evidencias/${id}/archivo`, { responseType: 'blob' });
  }

  revisarEvidencia(id: number, aceptar: boolean, nota: string | null): Observable<Evidencia> {
    return this.http.post<Evidencia>(`${this.api}/moderacion/evidencias/${id}/revision`, { aceptar, nota });
  }

  cerrarClan(id: number): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/moderacion/clanes/${id}/cierre`, {});
  }

  descalificar(idUsuario: number, motivo: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/moderacion/temporadas/activa/participantes/${idUsuario}/descalificacion`, { motivo });
  }

  // ---------- soporte (administrador) ----------
  usuarios(correo: string, estado: EstadoUsuario | '', pagina = 0, tamanio = 20): Observable<Pagina<Usuario>> {
    let params = paginacion(pagina, tamanio);
    if (correo) params = params.set('correo', correo);
    if (estado) params = params.set('estado', estado);
    return this.http.get<Pagina<Usuario>>(`${this.api}/soporte/usuarios`, { params });
  }

  cambiarEstado(id: number, estado: EstadoUsuario): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.api}/soporte/usuarios/${id}/estado`, { estado });
  }

  cambiarRol(id: number, rol: Rol): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.api}/admin/usuarios/${id}/rol`, { rol });
  }

  ajustarXp(idUsuario: number, cantidad: number, motivo: string): Observable<MovimientoXp> {
    return this.http.post<MovimientoXp>(`${this.api}/soporte/ajustes-xp`, { idUsuario, cantidad, motivo });
  }

  /**
   * Alta de una cuenta de cualquier rol. El registro público solo crea jugadores, así que para entrenador o
   * administrador se registra y luego se cambia el rol. No toca la sesión del administrador.
   */
  crearCuenta(datos: RegistroRequest, rol: Rol): Observable<Usuario> {
    return this.http.post<Sesion>(`${this.api}/auth/registro`, datos).pipe(
      switchMap(s => (rol === 'JUGADOR' ? of(s.usuario) : this.cambiarRol(s.usuario.id, rol))),
    );
  }

  analitica(): Observable<ResumenAnalitica> {
    return this.http.get<ResumenAnalitica>(`${this.api}/analitica/resumen`);
  }

  // ---------- administración ----------
  temporadas(pagina = 0, tamanio = 20): Observable<Pagina<Temporada>> {
    return this.http.get<Pagina<Temporada>>(`${this.api}/admin/temporadas`, { params: paginacion(pagina, tamanio) });
  }

  crearTemporada(datos: GuardarTemporadaRequest): Observable<Temporada> {
    return this.http.post<Temporada>(`${this.api}/admin/temporadas`, datos);
  }

  editarTemporada(id: number, datos: GuardarTemporadaRequest): Observable<Temporada> {
    return this.http.put<Temporada>(`${this.api}/admin/temporadas/${id}`, datos);
  }

  activarTemporada(id: number): Observable<Temporada> {
    return this.http.post<Temporada>(`${this.api}/admin/temporadas/${id}/activacion`, {});
  }

  cerrarTemporada(id: number): Observable<Temporada> {
    return this.http.post<Temporada>(`${this.api}/admin/temporadas/${id}/cierre`, {});
  }

  retos(pagina = 0, tamanio = 20): Observable<Pagina<Reto>> {
    return this.http.get<Pagina<Reto>>(`${this.api}/admin/retos`, { params: paginacion(pagina, tamanio) });
  }

  crearReto(datos: GuardarRetoRequest): Observable<Reto> {
    return this.http.post<Reto>(`${this.api}/admin/retos`, datos);
  }

  editarReto(id: number, datos: GuardarRetoRequest): Observable<Reto> {
    return this.http.put<Reto>(`${this.api}/admin/retos/${id}`, datos);
  }

  cambiarEstadoReto(id: number, estado: EstadoReto): Observable<Reto> {
    return this.http.patch<Reto>(`${this.api}/admin/retos/${id}/estado`, { estado });
  }

  // ---------- catálogos ----------
  actividades(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.api}/admin/actividades`);
  }

  crearActividad(nombre: string): Observable<Actividad> {
    return this.http.post<Actividad>(`${this.api}/admin/actividades`, { nombre });
  }

  editarActividad(id: number, nombre: string): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.api}/admin/actividades/${id}`, { nombre });
  }

  estadoActividad(id: number, estado: 'ACTIVA' | 'INACTIVA'): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.api}/admin/actividades/${id}/estado`, { estado });
  }

  /** Sin id: las reglas vigentes. Con id: el historial de esa actividad. */
  reglas(idTipoActividad?: number): Observable<Regla[]> {
    let params = new HttpParams();
    if (idTipoActividad) params = params.set('idTipoActividad', idTipoActividad);
    return this.http.get<Regla[]>(`${this.api}/admin/reglas-puntuacion`, { params });
  }

  crearRegla(datos: CrearReglaRequest): Observable<Regla> {
    return this.http.post<Regla>(`${this.api}/admin/reglas-puntuacion`, datos);
  }

  editarNivelProgresion(numero: number, xpRequerido: number): Observable<NivelProgresion> {
    return this.http.put<NivelProgresion>(`${this.api}/admin/niveles-progresion/${numero}`, { xpRequerido });
  }

  preguntas(): Observable<PreguntaAdmin[]> {
    return this.http.get<PreguntaAdmin[]>(`${this.api}/admin/preguntas`);
  }

  crearPregunta(datos: GuardarPreguntaRequest): Observable<PreguntaAdmin> {
    return this.http.post<PreguntaAdmin>(`${this.api}/admin/preguntas`, datos);
  }

  editarPregunta(id: number, datos: GuardarPreguntaRequest): Observable<PreguntaAdmin> {
    return this.http.put<PreguntaAdmin>(`${this.api}/admin/preguntas/${id}`, datos);
  }

  estadoPregunta(id: number, activa: boolean): Observable<PreguntaAdmin> {
    return this.http.patch<PreguntaAdmin>(`${this.api}/admin/preguntas/${id}/estado`, { activa });
  }

  // ---------- logros ----------
  logros(): Observable<Logro[]> {
    return this.http.get<Logro[]>(`${this.api}/logros`);
  }

  crearLogro(datos: GuardarLogroRequest): Observable<Logro> {
    return this.http.post<Logro>(`${this.api}/admin/logros`, datos);
  }

  editarLogro(id: number, datos: GuardarLogroRequest): Observable<Logro> {
    return this.http.put<Logro>(`${this.api}/admin/logros/${id}`, datos);
  }

  eliminarLogro(id: number): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/admin/logros/${id}`);
  }
}
