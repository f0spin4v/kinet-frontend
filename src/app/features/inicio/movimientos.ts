import { Component, inject } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { MovimientoXp } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { fechaRelativa } from '../../core/utils/fechas';
import { etiqueta } from '../../core/utils/formato';
import { ListaPaginada } from '../../core/utils/lista-paginada';
import { RefrescarComponent } from '../../shared/components/refrescar/refrescar';
import { PieListaComponent } from '../../shared/components/pie-lista/pie-lista';

/** Libro de XP: cada suma o resta con su origen (entrenamiento, reto, logro, evidencia, competencia, ajuste). */
@Component({
  selector: 'app-movimientos',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, PieListaComponent, RefrescarComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/inicio" text=""></ion-back-button></ion-buttons>
        <ion-title>Movimientos de XP</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        <div class="acciones barra"><app-refrescar [cargando]="lista.cargando()" (refrescar)="lista.recargar()" /></div>
        <ul class="lista tarjeta">
          @for (m of lista.items(); track m.id) {
            <li class="item">
              <div class="item__texto">
                <p class="item__titulo">{{ etiqueta(m.origen) }}</p>
                <p class="item__detalle">{{ m.motivo || '—' }}</p>
                <p class="texto-tenue">{{ fechaRelativa(m.fecha) }}</p>
              </div>
              <span class="chip" [class.chip--ok]="m.cantidad >= 0" [class.chip--error]="m.cantidad < 0">
                {{ m.cantidad >= 0 ? '+' : '' }}{{ m.cantidad }} XP
              </span>
            </li>
          }
        </ul>
        <app-pie-lista [lista]="lista" vacio="Todavía no tienes movimientos de XP." />
      </div>
    </ion-content>
  `,
  styles: `ul.tarjeta:empty { display: none; } .barra { margin-bottom: 12px; } .barra app-refrescar { margin-left: 0; }`,
})
export class MovimientosPage implements ViewWillEnter {
  private jugador = inject(JugadorService);

  lista = new ListaPaginada<MovimientoXp>((p, t) => this.jugador.movimientos(p, t));
  etiqueta = etiqueta;
  fechaRelativa = fechaRelativa;

  ionViewWillEnter(): void {
    this.lista.recargar();
  }
}
