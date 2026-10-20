// Contrato del backend v2 (/api). Todas las respuestas llegan envueltas en { error, respuesta }; el interceptor
// `respuestaApiInterceptor` entrega solo "respuesta", así que los servicios devuelven estos tipos directamente.

export type Rol = 'JUGADOR' | 'ADMINISTRADOR' | 'ENTRENADOR';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
export type Intensidad = 'BAJA' | 'MEDIA' | 'ALTA';
export type EstadoValidacion = 'EN_CURSO' | 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO';
export type EstadoEvidencia = 'SIN_REVISAR' | 'ACEPTADA' | 'RECHAZADA';
export type MetricaReto = 'REPETICIONES' | 'MINUTOS' | 'SESIONES';
export type Periodicidad = 'UNICA' | 'DIARIA' | 'SEMANAL' | 'TEMPORADA';
export type AmbitoReto = 'INDIVIDUAL' | 'CLAN';
export type EstadoReto = 'BORRADOR' | 'ACTIVO' | 'FINALIZADO';
export type TipoCompetencia = 'DUELO' | 'GRUPAL' | 'TORNEO';

export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamanio: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface Mensaje {
  mensaje: string;
}

// ---------- cuenta ----------
export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Rol;
  estado: EstadoUsuario;
  gamertag: string | null;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
  nivelHabilidad: string | null; // null = aún no hizo la evaluación
  fechaRegistro: string;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface RegistroRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  gamertag: string;
  fechaNacimiento: string | null;
  aceptaPolitica: boolean;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface EditarPerfilRequest {
  nombres: string;
  apellidos: string;
  gamertag: string;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
}

// ---------- evaluación ----------
export interface OpcionEvaluacion {
  id: number;
  titulo: string;
  descripcion: string;
}

export interface PreguntaEvaluacion {
  id: number;
  orden: number;
  enunciado: string;
  opciones: OpcionEvaluacion[];
}

export interface ResultadoEvaluacion {
  id: number;
  nivelHabilidad: string;
  votos: Record<string, number>;
  versionAlgoritmo: string;
  fecha: string;
  puedeRepetirDesde: string | null;
}

// ---------- progreso ----------
export interface Progreso {
  gamertag: string;
  xpTotal: number;
  nivel: number;
  xpInicioNivel: number;
  xpSiguienteNivel: number | null;
  porcentajeNivel: number;
  rachaActual: number;
  rachaMaxima: number;
  entrenamientosSemana: number;
  minutosSemana: number;
  retosActivos: number;
  retosCompletados: number;
  logros: number;
  notificacionesSinLeer: number;
  nivelHabilidad: string | null;
  temporada: string | null;
  rango: string | null;
  puntosTemporada: number | null;
}

export interface MovimientoXp {
  id: number;
  origen: string;
  cantidad: number;
  motivo: string | null;
  idReferencia: number | null;
  fecha: string;
}

// ---------- entrenamientos ----------
export interface Entrenamiento {
  id: number;
  idTipoActividad: number;
  actividad: string;
  fechaHoraInicio: string;
  fechaHoraFin: string | null;
  duracionMin: number | null;
  minutosTranscurridos: number | null;
  intensidad: Intensidad | null;
  distanciaKm: number | null;
  caloriasKcal: number | null;
  series: number | null;
  repeticiones: number | null;
  pesoKg: number | null;
  notas: string | null;
  estado: EstadoValidacion;
  motivoRechazo: string | null;
  xpOtorgado: number;
  evidencia: EstadoEvidencia | null;
}

export interface FinalizarRequest {
  intensidad: Intensidad;
  distanciaKm: number | null;
  caloriasKcal: number | null;
  series: number | null;
  repeticiones: number | null;
  pesoKg: number | null;
  notas: string | null;
}

export interface ResultadoEntrenamiento {
  entrenamiento: Entrenamiento;
  xpGanado: number;
  xpTotal: number;
  nivel: number;
  subioNivel: boolean;
  rachaActual: number;
  retosCompletados: string[];
  logrosObtenidos: string[];
}

export interface Evidencia {
  id: number;
  idEntrenamiento: number;
  idUsuario: number;
  gamertag: string;
  actividad: string;
  duracionMin: number | null;
  estadoEntrenamiento: EstadoValidacion;
  tipo: 'IMAGEN' | 'ENLACE';
  nombreArchivo: string | null;
  tipoContenido: string | null;
  tamanoBytes: number | null;
  url: string | null;
  plataforma: string | null;
  estadoRevision: EstadoEvidencia;
  notaRevision: string | null;
  fechaSubida: string;
  fechaRevision: string | null;
}

// ---------- catálogos ----------
export interface Regla {
  id: number;
  idTipoActividad: number;
  actividad: string;
  intensidad: Intensidad;
  xpPorMinuto: number;
  duracionMinimaMin: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface Actividad {
  id: number;
  nombre: string;
  estado: string;
  reglasVigentes: Regla[];
}

export interface NivelHabilidad {
  id: number;
  nombre: string;
  orden: number;
  descripcion: string;
}

export interface NivelProgresion {
  numeroNivel: number;
  xpRequerido: number;
}

export interface Rango {
  id: number;
  nombre: string;
  liga: string;
  division: string | null;
  orden: number;
  puntosMinimo: number;
}

export interface Liga {
  id: number;
  nombre: string;
  orden: number;
  cuposAscenso: number;
  cuposDescenso: number;
  rangos: Rango[];
}

// ---------- retos ----------
export interface Participacion {
  id: number;
  idReto: number;
  reto: string;
  metrica: MetricaReto;
  ambito: AmbitoReto;
  periodo: string;
  fechaLimite: string;
  progreso: number;
  progresoClan: number | null;
  meta: number;
  porcentaje: number;
  estado: string;
  fechaInscripcion: string;
  fechaCompletado: string | null;
}

export interface Reto {
  id: number;
  nombre: string;
  descripcion: string;
  condiciones: string | null;
  imagenUrl: string | null;
  metrica: MetricaReto;
  valorMeta: number;
  xpRecompensa: number;
  periodicidad: Periodicidad;
  ambito: AmbitoReto;
  actividad: string | null;
  nivelHabilidad: string | null;
  temporada: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoReto;
  participacion: Participacion | null;
}

export interface GuardarRetoRequest {
  nombre: string;
  descripcion: string;
  condiciones: string | null;
  imagenUrl: string | null;
  metrica: MetricaReto;
  valorMeta: number;
  xpRecompensa: number;
  periodicidad: Periodicidad;
  ambito: AmbitoReto;
  idTipoActividad: number | null;
  idNivelHabilidad: number | null;
  idTemporada: number | null;
  fechaInicio: string;
  fechaFin: string | null;
}

// ---------- clanes ----------
export interface Clan {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidadMax: number;
  miembros: number;
  lider: string | null;
  estado: string;
  fechaCreacion: string;
}

export interface Miembro {
  idUsuario: number;
  gamertag: string;
  rolClan: 'LIDER' | 'MIEMBRO';
  fechaIngreso: string;
}

export interface ClanDetalle {
  clan: Clan;
  miembros: Miembro[];
}

export interface GuardarClanRequest {
  nombre: string;
  descripcion: string | null;
  capacidadMax: number;
}

// ---------- temporada y matchmaking ----------
export interface Temporada {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  porcentajeConservado: number;
  estado: string;
}

export interface ParticipacionTemporada {
  temporada: Temporada;
  puntosIniciales: number;
  puntosActuales: number;
  rangoInicial: Rango;
  rangoActual: Rango;
  posicion: number | null;
  puntosFinales: number | null;
  estado: string;
  fechaInscripcion: string;
}

export interface PosicionRanking {
  posicion: number;
  idUsuario: number;
  gamertag: string;
  puntos: number;
  rango: string;
}

export interface HistorialRango {
  rangoAnterior: string | null;
  rangoNuevo: string;
  puntos: number;
  causa: string;
  fecha: string;
}

export interface ParticipanteEnfrentamiento {
  idUsuario: number;
  gamertag: string;
  puntaje: number;
  resultado: string | null;
}

export interface Enfrentamiento {
  id: number;
  temporada: string;
  tipo: 'COLOCACION' | 'ESTANDAR';
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  participantes: ParticipanteEnfrentamiento[];
}

export interface Solicitud {
  id: number;
  estado: string;
  fechaSolicitud: string;
  enfrentamiento: Enfrentamiento | null;
  mensaje: string;
}

// ---------- competencias ----------
export interface ParticipanteCompetencia {
  idUsuario: number;
  gamertag: string;
  estadoInvitacion: string;
  fechaRespuesta: string | null;
  puntaje: number;
  eliminadoEnRonda: number | null;
  posicion: number | null;
  resultado: string | null;
}

export interface Competencia {
  id: number;
  tipo: TipoCompetencia;
  nombre: string;
  estado: string;
  idCreador: number;
  creador: string;
  actividad: string | null;
  duracionRondaHoras: number;
  rondaActual: number;
  premioXp: number;
  fechaCreacion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  participantes: ParticipanteCompetencia[];
}

export interface CrearCompetenciaRequest {
  tipo: TipoCompetencia;
  nombre: string;
  idsInvitados: number[];
  idTipoActividad: number | null;
  duracionRondaHoras: number;
  fechaInicio: string | null;
}

// ---------- logros y notificaciones ----------
export interface Logro {
  id: number;
  nombre: string;
  descripcion: string;
  criterio: string;
  xpBonus: number;
  iconoUrl: string | null;
  obtenido: boolean;
  fechaObtenido: string | null;
}

export interface Notificacion {
  id: number;
  tipo: string;
  canal: string;
  titulo: string;
  mensaje: string;
  estadoEnvio: string;
  leida: boolean;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaLectura: string | null;
}

// ---------- equipo ----------
export interface EntrenamientoPendiente {
  idUsuario: number;
  gamertag: string;
  entrenamiento: Entrenamiento;
}

export interface ResumenAnalitica {
  usuariosPorEstado: Record<string, number>;
  usuariosPorRol: Record<string, number>;
  jugadoresPorNivelHabilidad: Record<string, number>;
  entrenamientosPorEstado30Dias: Record<string, number>;
  minutosPorActividad30Dias: Record<string, number>;
  xpPorOrigen30Dias: Record<string, number>;
  retosCompletados30Dias: Record<string, number>;
  jugadoresPorLigaTemporadaActiva: Record<string, number>;
  competenciasPorTipo: Record<string, number>;
  notificacionesPorEstadoEnvio: Record<string, number>;
}

export interface GuardarTemporadaRequest {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  porcentajeConservado: number;
}

// ---------- administración de catálogos ----------
export interface CrearReglaRequest {
  idTipoActividad: number;
  intensidad: Intensidad;
  xpPorMinuto: number;
  duracionMinimaMin: number;
  vigenteDesde: string;
}

export interface GuardarLogroRequest {
  nombre: string;
  descripcion: string;
  criterio: string;
  xpBonus: number;
  iconoUrl: string | null;
}

export interface OpcionAdmin {
  id: number;
  titulo: string;
  descripcion: string | null;
  nivelHabilidad: string;
  puntaje: number;
}

export interface PreguntaAdmin {
  id: number;
  orden: number;
  enunciado: string;
  activa: boolean;
  opciones: OpcionAdmin[];
}

export interface GuardarPreguntaRequest {
  enunciado: string;
  orden: number;
  opciones: { titulo: string; descripcion: string | null; nivelHabilidad: string; puntaje: number }[];
}
