import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Actividad, Clan, ClanDetalle, Competencia, CrearCompetenciaRequest, EditarPerfilRequest,
  Enfrentamiento, Entrenamiento, Evidencia, FinalizarRequest, GuardarClanRequest, HistorialRango, Liga, Logro,
  Mensaje, MovimientoXp, NivelHabilidad, NivelProgresion, Notificacion, Pagina, Participacion, ParticipacionTemporada, PosicionRanking,
  PreguntaEvaluacion, Progreso, ResultadoEntrenamiento, ResultadoEvaluacion, Reto, Solicitud, Temporada, Usuario,
} from '../models/api.models';
import { AuthService } from './auth';

function paginacion(pagina: number, tamanio: number): HttpParams {
  return new HttpParams().set('pagina', pagina).set('tamanio', tamanio);
}

/** El backend responde 404 cuando algo no existe todavía (sin clan, sin cronómetro...): aquí eso es "null". */
function nuloSiNoExiste<T>() {
  return catchError<T, Observable<null>>((e: HttpErrorResponse) => {
    if (e.status === 404) return of(null);
    throw e;
  });
}

/** Todo lo que hace el jugador contra el backend v2. */
@Injectable({ providedIn: 'root' })
export class JugadorService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  // ---------- perfil ----------
  editarPerfil(datos: EditarPerfilRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.api}/usuarios/me`, datos).pipe(tap(u => this.auth.actualizarUsuario(u)));
  }

  cambiarContrasena(contrasenaActual: string, nuevaContrasena: string): Observable<Mensaje> {
    return this.http.put<Mensaje>(`${this.api}/usuarios/me/contrasena`, { contrasenaActual, nuevaContrasena });
  }

  desactivarCuenta(): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/usuarios/me`);
  }

  // ---------- evaluación ----------
  preguntas(): Observable<PreguntaEvaluacion[]> {
    return this.http.get<PreguntaEvaluacion[]>(`${this.api}/evaluacion/preguntas`);
  }

  responderEvaluacion(idsOpciones: number[]): Observable<ResultadoEvaluacion> {
    return this.http.post<ResultadoEvaluacion>(`${this.api}/evaluacion`, { idsOpciones }).pipe(
      tap(r => {
        const u = this.auth.usuario();
        if (u) this.auth.actualizarUsuario({ ...u, nivelHabilidad: r.nivelHabilidad });
      }),
    );
  }

  /** Mi evaluación vigente (404 si aún no la hice). */
  evaluacionVigente(): Observable<ResultadoEvaluacion | null> {
    return this.http.get<ResultadoEvaluacion>(`${this.api}/evaluacion`).pipe(nuloSiNoExiste<ResultadoEvaluacion | null>());
  }

  historialEvaluaciones(pagina = 0, tamanio = 10): Observable<Pagina<ResultadoEvaluacion>> {
    return this.http.get<Pagina<ResultadoEvaluacion>>(`${this.api}/evaluacion/historial`, { params: paginacion(pagina, tamanio) });
  }

  // ---------- progreso, logros, notificaciones ----------
  progreso(): Observable<Progreso> {
    return this.http.get<Progreso>(`${this.api}/progreso`);
  }

  movimientos(pagina = 0, tamanio = 20): Observable<Pagina<MovimientoXp>> {
    return this.http.get<Pagina<MovimientoXp>>(`${this.api}/progreso/movimientos`, { params: paginacion(pagina, tamanio) });
  }

  logros(): Observable<Logro[]> {
    return this.http.get<Logro[]>(`${this.api}/logros`);
  }

  notificaciones(pagina = 0, tamanio = 20): Observable<Pagina<Notificacion>> {
    return this.http.get<Pagina<Notificacion>>(`${this.api}/notificaciones`, { params: paginacion(pagina, tamanio) });
  }

  marcarLeida(id: number): Observable<Notificacion> {
    return this.http.patch<Notificacion>(`${this.api}/notificaciones/${id}/leida`, {});
  }

  eliminarNotificacion(id: number): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/notificaciones/${id}`);
  }

  vaciarNotificaciones(): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/notificaciones`);
  }

  marcarTodasLeidas(): Observable<Mensaje> {
    return this.http.patch<Mensaje>(`${this.api}/notificaciones/leidas`, {});
  }

  // ---------- catálogos ----------
  actividades(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.api}/catalogos/actividades`);
  }

  nivelesHabilidad(): Observable<NivelHabilidad[]> {
    return this.http.get<NivelHabilidad[]>(`${this.api}/catalogos/niveles-habilidad`);
  }

  nivelesProgresion(): Observable<NivelProgresion[]> {
    return this.http.get<NivelProgresion[]>(`${this.api}/catalogos/niveles-progresion`);
  }

  ligas(): Observable<Liga[]> {
    return this.http.get<Liga[]>(`${this.api}/catalogos/ligas`);
  }

  // ---------- entrenamientos ----------
  enCurso(): Observable<Entrenamiento | null> {
    return this.http.get<Entrenamiento>(`${this.api}/entrenamientos/en-curso`).pipe(nuloSiNoExiste<Entrenamiento | null>());
  }

  iniciar(idTipoActividad: number): Observable<Entrenamiento> {
    return this.http.post<Entrenamiento>(`${this.api}/entrenamientos/en-curso`, { idTipoActividad });
  }

  finalizar(datos: FinalizarRequest): Observable<ResultadoEntrenamiento> {
    return this.http.post<ResultadoEntrenamiento>(`${this.api}/entrenamientos/en-curso/fin`, datos);
  }

  cancelarEntrenamiento(): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/entrenamientos/en-curso`);
  }

  entrenamientos(pagina = 0, tamanio = 10): Observable<Pagina<Entrenamiento>> {
    return this.http.get<Pagina<Entrenamiento>>(`${this.api}/entrenamientos`, { params: paginacion(pagina, tamanio) });
  }

  entrenamiento(id: number): Observable<Entrenamiento> {
    return this.http.get<Entrenamiento>(`${this.api}/entrenamientos/${id}`);
  }

  subirImagen(id: number, archivo: File): Observable<Evidencia> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<Evidencia>(`${this.api}/entrenamientos/${id}/evidencia`, datos);
  }

  subirEnlace(id: number, url: string): Observable<Evidencia> {
    return this.http.post<Evidencia>(`${this.api}/entrenamientos/${id}/evidencia/enlace`, { url });
  }

  /** La evidencia del entrenamiento (404 si no tiene). */
  evidencia(id: number): Observable<Evidencia | null> {
    return this.http.get<Evidencia>(`${this.api}/entrenamientos/${id}/evidencia`).pipe(nuloSiNoExiste<Evidencia | null>());
  }

  // ---------- retos ----------
  retosDisponibles(pagina = 0, tamanio = 20): Observable<Pagina<Reto>> {
    return this.http.get<Pagina<Reto>>(`${this.api}/retos`, { params: paginacion(pagina, tamanio) });
  }

  misRetos(pagina = 0, tamanio = 20): Observable<Pagina<Participacion>> {
    return this.http.get<Pagina<Participacion>>(`${this.api}/retos/mios`, { params: paginacion(pagina, tamanio) });
  }

  reto(id: number): Observable<Reto> {
    return this.http.get<Reto>(`${this.api}/retos/${id}`);
  }

  unirseAReto(id: number): Observable<Participacion> {
    return this.http.post<Participacion>(`${this.api}/retos/${id}/participaciones`, {});
  }

  aportar(idParticipacion: number, cantidad: number, nota: string | null): Observable<Participacion> {
    return this.http.post<Participacion>(`${this.api}/retos/participaciones/${idParticipacion}/aportes`, { cantidad, nota });
  }

  abandonarReto(idParticipacion: number): Observable<Participacion> {
    return this.http.post<Participacion>(`${this.api}/retos/participaciones/${idParticipacion}/abandono`, {});
  }

  // ---------- clanes ----------
  clanes(pagina = 0, tamanio = 20): Observable<Pagina<Clan>> {
    return this.http.get<Pagina<Clan>>(`${this.api}/clanes`, { params: paginacion(pagina, tamanio) });
  }

  miClan(): Observable<ClanDetalle | null> {
    return this.http.get<ClanDetalle>(`${this.api}/clanes/mio`).pipe(nuloSiNoExiste<ClanDetalle | null>());
  }

  clan(id: number): Observable<ClanDetalle> {
    return this.http.get<ClanDetalle>(`${this.api}/clanes/${id}`);
  }

  crearClan(datos: GuardarClanRequest): Observable<ClanDetalle> {
    return this.http.post<ClanDetalle>(`${this.api}/clanes`, datos);
  }

  editarClan(id: number, datos: GuardarClanRequest): Observable<ClanDetalle> {
    return this.http.put<ClanDetalle>(`${this.api}/clanes/${id}`, datos);
  }

  unirseAClan(id: number): Observable<ClanDetalle> {
    return this.http.post<ClanDetalle>(`${this.api}/clanes/${id}/miembros`, {});
  }

  salirDelClan(): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/clanes/mio/salida`, {});
  }

  expulsar(idClan: number, idUsuario: number): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/clanes/${idClan}/miembros/${idUsuario}`);
  }

  transferirLiderazgo(idClan: number, idUsuario: number): Observable<ClanDetalle> {
    return this.http.put<ClanDetalle>(`${this.api}/clanes/${idClan}/lider`, { idUsuario });
  }

  cerrarClan(id: number): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.api}/clanes/${id}/cierre`, {});
  }

  // ---------- temporada y matchmaking ----------
  temporadaActiva(): Observable<Temporada | null> {
    return this.http.get<Temporada>(`${this.api}/temporadas/activa`).pipe(nuloSiNoExiste<Temporada | null>());
  }

  ranking(limite = 50): Observable<PosicionRanking[]> {
    return this.http.get<PosicionRanking[]>(`${this.api}/temporadas/activa/ranking`, { params: { limite } });
  }

  /** null mientras el jugador no se haya inscrito (se inscribe al pedir su primer enfrentamiento). */
  miParticipacion(): Observable<ParticipacionTemporada | null> {
    return this.http.get<ParticipacionTemporada>(`${this.api}/temporadas/activa/mia`)
      .pipe(nuloSiNoExiste<ParticipacionTemporada | null>());
  }

  historialRango(pagina = 0, tamanio = 20): Observable<Pagina<HistorialRango>> {
    return this.http.get<Pagina<HistorialRango>>(`${this.api}/temporadas/activa/mia/historial-rango`,
      { params: paginacion(pagina, tamanio) });
  }

  abandonarTemporada(): Observable<ParticipacionTemporada> {
    return this.http.post<ParticipacionTemporada>(`${this.api}/temporadas/activa/abandono`, {});
  }

  buscarEnfrentamiento(): Observable<Solicitud> {
    return this.http.post<Solicitud>(`${this.api}/matchmaking/solicitudes`, {});
  }

  cancelarBusqueda(): Observable<Mensaje> {
    return this.http.delete<Mensaje>(`${this.api}/matchmaking/solicitudes/actual`);
  }

  enfrentamientos(pagina = 0, tamanio = 10): Observable<Pagina<Enfrentamiento>> {
    return this.http.get<Pagina<Enfrentamiento>>(`${this.api}/matchmaking/enfrentamientos`, { params: paginacion(pagina, tamanio) });
  }

  enfrentamiento(id: number): Observable<Enfrentamiento> {
    return this.http.get<Enfrentamiento>(`${this.api}/matchmaking/enfrentamientos/${id}`);
  }

  // ---------- competencias ----------
  competencias(pagina = 0, tamanio = 20): Observable<Pagina<Competencia>> {
    return this.http.get<Pagina<Competencia>>(`${this.api}/competencias`, { params: paginacion(pagina, tamanio) });
  }

  invitaciones(pagina = 0, tamanio = 20): Observable<Pagina<Competencia>> {
    return this.http.get<Pagina<Competencia>>(`${this.api}/competencias/invitaciones`, { params: paginacion(pagina, tamanio) });
  }

  competencia(id: number): Observable<Competencia> {
    return this.http.get<Competencia>(`${this.api}/competencias/${id}`);
  }

  crearCompetencia(datos: CrearCompetenciaRequest): Observable<Competencia> {
    return this.http.post<Competencia>(`${this.api}/competencias`, datos);
  }

  aceptarCompetencia(id: number): Observable<Competencia> {
    return this.http.post<Competencia>(`${this.api}/competencias/${id}/aceptacion`, {});
  }

  rechazarCompetencia(id: number): Observable<Competencia> {
    return this.http.post<Competencia>(`${this.api}/competencias/${id}/rechazo`, {});
  }

  cancelarCompetencia(id: number): Observable<Competencia> {
    return this.http.post<Competencia>(`${this.api}/competencias/${id}/cancelacion`, {});
  }
}
