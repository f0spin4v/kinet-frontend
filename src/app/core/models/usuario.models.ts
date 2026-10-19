export interface ActualizarPerfilRequest {
  nombres: string;
  apellidos: string;
  nickname: string;
  fechaNacimiento: string | null; // "2006-05-21"
  avatarUrl: string | null;
}
