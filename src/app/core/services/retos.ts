import { Observable } from 'rxjs';
import { Reto, RetoDetalle } from '../models/entrenamiento.models';

export abstract class RetoService {
  abstract listar(): Observable<Reto[]>;
  abstract detalle(id: number): Observable<RetoDetalle>;
}
