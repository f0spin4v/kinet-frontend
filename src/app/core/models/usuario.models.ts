export interface ActualizarPerfilRequest {
  nombre: string;
  nickname: string;
  fechaNacimiento: string | null; // "2006-05-21"
  ciudad: string | null;
  deporteFavorito: string | null;
}
