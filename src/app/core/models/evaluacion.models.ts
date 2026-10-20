export type OpcionId = 'A' | 'B';

export interface Opcion {
  id: OpcionId;
  titulo: string;
  descripcion: string;
}

export interface Pregunta {
  numero: number;
  texto: string;
  opciones: Opcion[];
}

export interface EvaluacionRequest {
  respuestas: OpcionId[]; // en orden, una por pregunta
}

export interface EvaluacionResponse {
  puntaje: number;
  nivelInicial: string;
  fecha: string;
}

export interface Opcion {
  id: OpcionId;
  titulo: string;
  descripcion: string;
  etiqueta?: string; // aún no la envía el backend
}
