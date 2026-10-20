export interface RegistroRequest {
  nombre: string;
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
  nombre: string;
  correo: string;
  rol: string;
  nickname: string | null;
  avatarUrl: string | null;
  fechaNacimiento: string | null; // "2006-05-21"
  ciudad: string | null;
  deporteFavorito: string | null;
  nivelInicial: string | null;    // null = aún no hizo la evaluación
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}
