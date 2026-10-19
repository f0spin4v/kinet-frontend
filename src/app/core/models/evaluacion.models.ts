export type OpcionId = number;

export interface Opcion {
  id: OpcionId;
  titulo: string;
  descripcion: string;
  etiqueta?: string; // aún no la envía el backend
}

export interface Pregunta {
  numero: number;
  texto: string;
  opciones: Opcion[];
}

export interface EvaluacionResponse {
  nivelInicial: string;
  fecha: string;
}

/** PreguntaDTO del backend. */
export interface PreguntaDto {
  id: number;
  orden: number;
  enunciado: string;
  opciones: { id: number; titulo: string; descripcion: string }[];
}

/** ResultadoEvaluacionDTO del backend. */
export interface ResultadoEvaluacionDto {
  nivelHabilidad: string;
  fecha: string;
}
