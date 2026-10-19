import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, trashOutline } from 'ionicons/icons';
import { Notificacion } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { fechaRelativa } from '../../core/utils/fechas';
import { etiqueta } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';
import { ListaPaginada } from '../../core/utils/lista-paginada';
import { PieListaComponent } from '../../shared/components/pie-lista/pie-lista';
import { RefrescarComponent } from '../../shared/components/refrescar/refrescar';

interface Destino {
  ruta: string;
  pestana?: string;
  texto: string;
}

/** A dónde lleva cada tipo de notificación (el backend no guarda un id de referencia, así que se lleva a la sección). */
function destinoDe(n: Notificacion): Destino | null {
  switch (n.tipo) {
    case 'VALIDACION': return { ruta: '/tabs/entrenar', texto: 'Ver mis entrenamientos' };
    case 'RACHA': return { ruta: '/tabs/inicio', texto: 'Ver mi progreso' };
    case 'NIVEL': return { ruta: '/tabs/inicio/xp', texto: 'Ver mis movimientos de XP' };
    case 'LOGRO': return { ruta: '/tabs/inicio/logros', texto: 'Ver mis logros' };
    case 'RETO': return { ruta: '/tabs/retos', texto: 'Ver mis retos' };
    case 'CLAN': return { ruta: '/tabs/competir', pestana: 'clan', texto: 'Ver el clan' };
    case 'COMPETENCIA': return { ruta: '/tabs/competir', pestana: 'competencias', texto: 'Ver competencias' };
    case 'MATCHMAKING': case 'CAMBIO_RANGO': case 'FIN_TEMPORADA':
      return { ruta: '/tabs/competir', pestana: 'temporada', texto: 'Ver la temporada' };
    case 'RECUPERACION': case 'SEGURIDAD': return { ruta: '/tabs/perfil', texto: 'Ir a mi perfil' };
    default: return null;
  }
}

/** Bandeja de notificaciones: tocar una la marca como leída y lleva a la sección con el detalle; se pueden borrar. */
@Component({
  selector: 'app-notificaciones',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonIcon, PieListaComponent, RefrescarComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/inicio" text=""></ion-back-button></ion-buttons>
        <ion-title>Notificaciones</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        <div class="acciones barra">
          <app-refrescar [cargando]="lista.cargando()" (refrescar)="lista.recargar()" />
          @if (lista.items().length > 0) {
            <button type="button" class="btn-chico" (click)="marcarTodas()">Marcar todas como leídas</button>
            <button type="button" class="btn-chico btn-peligro" (click)="confirmarVaciar()">Vaciar bandeja</button>
          }
        </div>

        <ul class="lista tarjeta">
          @for (n of lista.items(); track n.id) {
            <li class="fila" [class.fila--nueva]="!n.leida">
              <button type="button" class="fila__cuerpo" (click)="abrir(n)">
                <div class="item__texto">
                  <p class="item__titulo">{{ n.titulo }}</p>
                  <p class="item__detalle">{{ n.mensaje }}</p>
                  <p class="texto-tenue">
                    {{ etiqueta(n.tipo) }} · {{ fechaRelativa(n.fechaCreacion) }}
                    @if (destino(n); as d) { · <span class="ver">{{ d.texto }} <ion-icon name="chevron-forward-outline"></ion-icon></span> }
                  </p>
                </div>
                @if (!n.leida) { <span class="punto" aria-label="Sin leer"></span> }
              </button>
              <button type="button" class="fila__borrar" (click)="borrar(n)" aria-label="Borrar notificación">
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </li>
          }
        </ul>
        <app-pie-lista [lista]="lista" vacio="No tienes notificaciones." />
      </div>
    </ion-content>
  `,
  styles: `
    .barra { margin-bottom: 12px; align-items: center; }
    .barra app-refrescar { margin-left: 0; order: 0; flex: 0 0 auto; }
    ul.tarjeta { padding: 4px 16px; }
    ul.tarjeta:empty { display: none; }
    .fila { display: flex; align-items: stretch; gap: 4px; border-bottom: 1px solid var(--kinet-surface-high); }
    .fila:last-child { border-bottom: 0; }
    .fila__cuerpo { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 0; background: none; border: 0; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    .fila__cuerpo:hover .item__titulo { color: var(--kinet-accent); }
    .fila--nueva .item__titulo { color: var(--kinet-accent); }
    .fila__borrar { flex: 0 0 auto; align-self: center; width: 40px; height: 40px; border: 0; background: none; border-radius: 10px;
      color: var(--kinet-text-muted); cursor: pointer; font-size: 18px; }
    .fila__borrar:hover { color: var(--ion-color-danger); background: rgba(var(--ion-color-danger-rgb), 0.1); }
    .ver { color: var(--kinet-primary-soft); font-weight: 600; }
    .ver ion-icon { vertical-align: -2px; }
  `,
})
export class NotificacionesPage implements ViewWillEnter {
  private jugador = inject(JugadorService);
  private router = inject(Router);
  private alertas = inject(AlertController);

  lista = new ListaPaginada<Notificacion>((p, t) => this.jugador.notificaciones(p, t));
  etiqueta = etiqueta;
  fechaRelativa = fechaRelativa;
  destino = destinoDe;

  constructor() {
    addIcons({ trashOutline, chevronForwardOutline });
  }

  ionViewWillEnter(): void {
    this.lista.recargar();
  }

  /** Marca la notificación como leída y va a la sección donde se ve la información completa. */
  abrir(n: Notificacion): void {
    if (!n.leida) {
      this.jugador.marcarLeida(n.id).subscribe(x => this.lista.reemplazar(i => i.id === n.id, x));
    }
    const d = destinoDe(n);
    if (d) this.router.navigate([d.ruta], d.pestana ? { queryParams: { pestana: d.pestana } } : {});
  }

  marcarTodas(): void {
    this.jugador.marcarTodasLeidas().subscribe(() => this.lista.recargar());
  }

  borrar(n: Notificacion): void {
    this.jugador.eliminarNotificacion(n.id).subscribe({
      next: () => this.lista.recargar(),
      error: (e: HttpErrorResponse) => this.lista.error.set(mensajeDeError(e)),
    });
  }

  async confirmarVaciar(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Vaciar bandeja',
      message: 'Se borrarán todas tus notificaciones y no se pueden recuperar.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Vaciar', role: 'destructive', cssClass: 'alerta-boton-peligro',
          handler: () => {
            this.jugador.vaciarNotificaciones().subscribe({
              next: () => this.lista.recargar(),
              error: (e: HttpErrorResponse) => this.lista.error.set(mensajeDeError(e)),
            });
          },
        },
      ],
    });
    await alerta.present();
  }
}
