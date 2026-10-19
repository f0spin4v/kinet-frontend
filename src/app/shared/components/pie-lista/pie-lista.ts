import { Component, input } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { fileTrayOutline } from 'ionicons/icons';
import { ListaPaginada } from '../../../core/utils/lista-paginada';

/** Cierre común de una ListaPaginada: cargando, error, "vacío" y botón "Ver más". */
@Component({
  selector: 'app-pie-lista',
  imports: [IonIcon, IonSpinner],
  template: `
    @if (lista().error(); as e) {
      <p class="alert-error" role="alert">{{ e }}</p>
    }
    @if (lista().cargando()) {
      <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
    } @else if (lista().cargada() && lista().items().length === 0 && !lista().error()) {
      <div class="vacio">
        <ion-icon name="file-tray-outline" aria-hidden="true"></ion-icon>
        <p>{{ vacio() }}</p>
      </div>
    } @else if (lista().hayMas()) {
      <div class="acciones acciones--completo">
        <button type="button" class="btn-secundario" (click)="lista().masResultados()">Ver más</button>
      </div>
    }
  `,
})
export class PieListaComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lista = input.required<ListaPaginada<any>>();
  vacio = input('No hay nada para mostrar todavía.');

  constructor() {
    addIcons({ fileTrayOutline });
  }
}
