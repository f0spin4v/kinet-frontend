import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';

/**
 * Botón "Actualizar": avisa con (refrescar) y gira mientras se cargan los datos. Si la pantalla no informa cuándo
 * termina, gira un momento para que se note que se pidió la información otra vez.
 */
@Component({
  selector: 'app-refrescar',
  imports: [IonIcon],
  template: `
    <button type="button" class="btn-chico" [class.btn-chico--ocupado]="girando()" [attr.aria-busy]="girando()" (click)="pedir()" aria-label="Actualizar">
      <ion-icon name="refresh-outline" [class.gira]="girando()" aria-hidden="true"></ion-icon>
      <span class="texto">Actualizar</span>
    </button>
  `,
  styles: `
    :host { margin-left: auto; order: 99; }
    .texto { display: none; }
    @media (min-width: 768px) { .texto { display: inline; } }
    ion-icon { font-size: 18px; }
    .btn-chico--ocupado { opacity: 0.7; cursor: progress; }
    .gira { animation: girar 0.8s linear infinite; }
    @keyframes girar { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .gira { animation: none; } }
  `,
})
export class RefrescarComponent implements OnDestroy {
  /** true mientras la pantalla está cargando. Opcional. */
  cargando = input(false);
  refrescar = output<void>();

  /** Gira (y se desactiva) mientras la pantalla carga o durante el instante mínimo tras pulsar. */
  private pulsando = signal(false);
  girando = computed(() => this.cargando() || this.pulsando());
  private pulso: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    addIcons({ refreshOutline });
  }

  pedir(): void {
    if (this.girando()) return;
    this.refrescar.emit();
    this.pulsando.set(true);
    this.pulso = setTimeout(() => this.pulsando.set(false), 800);
  }

  ngOnDestroy(): void {
    if (this.pulso) clearTimeout(this.pulso);
  }
}
