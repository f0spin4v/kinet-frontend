import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from './auth';

/** Lo que se guarda en el dispositivo del entrenamiento en curso. */
export interface CronometroGuardado {
  /** Id del entrenamiento en el servidor: si ya no coincide, lo guardado se descarta. */
  idEntrenamiento: number;
  /** Instante (ms desde 1970) en que arrancó el cronómetro. El tiempo siempre es "ahora - inicio", así no se desfasa. */
  inicioMs: number;
  /** Borrador del formulario de cierre. */
  borrador: {
    intensidad: string; distanciaKm: number | null; caloriasKcal: number | null;
    series: number | null; repeticiones: number | null; pesoKg: number | null; notas: string;
  };
  /** Cuándo se guardó por última vez (ms). */
  guardadoMs: number;
}

/**
 * Guarda el cronómetro en Preferences (localStorage en el navegador), siempre de forma asíncrona y sin lanzar errores:
 * si el almacenamiento falla, el cronómetro sigue funcionando con la hora del servidor. Una clave por usuario.
 */
@Injectable({ providedIn: 'root' })
export class CronometroService {
  private auth = inject(AuthService);

  private clave(): string {
    return `kinet_cronometro_${this.auth.usuario()?.id ?? 'anonimo'}`;
  }

  async leer(): Promise<CronometroGuardado | null> {
    try {
      const { value } = await Preferences.get({ key: this.clave() });
      if (!value) return null;
      const d = JSON.parse(value) as CronometroGuardado;
      return typeof d.idEntrenamiento === 'number' && typeof d.inicioMs === 'number' ? d : null;
    } catch {
      return null;
    }
  }

  async guardar(datos: Omit<CronometroGuardado, 'guardadoMs'>): Promise<void> {
    try {
      await Preferences.set({ key: this.clave(), value: JSON.stringify({ ...datos, guardadoMs: Date.now() }) });
    } catch {
      /* sin almacenamiento: se sigue con el servidor */
    }
  }

  async borrar(): Promise<void> {
    try {
      await Preferences.remove({ key: this.clave() });
    } catch {
      /* nada que limpiar */
    }
  }
}
