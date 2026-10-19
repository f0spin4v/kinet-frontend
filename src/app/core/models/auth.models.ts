export interface RegistroRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  nickname: string;
  aceptaDatos: boolean;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  nombre: string;                 // nombres + apellidos, para mostrar
  correo: string;
  rol: string;
  nickname: string | null;        // gamertag
  avatarUrl: string | null;
  fechaNacimiento: string | null; // "2006-05-21"
  nivelInicial: string | null;    // nivel de habilidad; null = aún no hizo la evaluación
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

/** UsuarioDTO tal como lo envía el backend. */
export interface UsuarioDto {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  estado: string;
  gamertag: string | null;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
  nivelHabilidad: string | null;
  fechaRegistro: string;
}

/** SesionDTO del backend: respuesta de login y registro. */
export interface SesionDto {
  token: string;
  usuario: UsuarioDto;
}

export function aUsuario(dto: UsuarioDto): Usuario {
  return {
    id: dto.id,
    nombres: dto.nombres,
    apellidos: dto.apellidos,
    nombre: `${dto.nombres} ${dto.apellidos}`.trim(),
    correo: dto.correo,
    rol: dto.rol,
    nickname: dto.gamertag,
    avatarUrl: dto.avatarUrl,
    fechaNacimiento: dto.fechaNacimiento,
    nivelInicial: dto.nivelHabilidad,
  };
}

/** Solo los jugadores hacen la evaluación de nivel; administrador y entrenador entran directo. */
export function evaluacionCompleta(usuario: Usuario): boolean {
  return usuario.rol !== 'JUGADOR' || usuario.nivelInicial != null;
}
