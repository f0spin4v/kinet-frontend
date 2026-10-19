import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type Tema = 'sistema' | 'claro' | 'oscuro';

const TEMA_KEY = 'kinet_tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private document = inject(DOCUMENT);

  readonly tema = signal<Tema>('sistema');

  /** Aplica el tema guardado. Se ejecuta una vez al arrancar la app. */
  async iniciar(): Promise<void> {
    const { value } = await Preferences.get({ key: TEMA_KEY });
    if (value === 'sistema' || value === 'claro' || value === 'oscuro') {
      this.aplicar(value);
    }
  }

  cambiar(tema: Tema): void {
    this.aplicar(tema);
    Preferences.set({ key: TEMA_KEY, value: tema });
  }

  private aplicar(tema: Tema): void {
    this.tema.set(tema);
    const html = this.document.documentElement;
    html.classList.toggle('tema-claro', tema === 'claro');
    html.classList.toggle('tema-oscuro', tema === 'oscuro');
  }
}
