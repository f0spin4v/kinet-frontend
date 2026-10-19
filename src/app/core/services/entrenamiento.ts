import { Observable } from 'rxjs';
import {
  RegistroEntrenamientoRequest, RegistroEntrenamientoResponse, ResumenJugador,
} from '../models/entrenamiento.models';

export abstract class EntrenamientoService {
  abstract resumen(): Observable<ResumenJugador>;
  abstract registrar(datos: RegistroEntrenamientoRequest): Observable<RegistroEntrenamientoResponse>;
}
