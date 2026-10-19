import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosedOutline, ribbonOutline } from 'ionicons/icons';
import { Logro } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { fechaLarga } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';

/** Catálogo de logros: los obtenidos primero y el resto con su criterio. */
@Component({
  selector: 'app-logros',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonIcon, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/inicio" text=""></ion-back-button></ion-buttons>
        <ion-title>Logros</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        } @else {
          <p class="texto-suave resumen">{{ obtenidos() }} de {{ logros().length }} logros desbloqueados</p>
          <div class="rejilla rejilla--3">
            @for (l of ordenados(); track l.id) {
              <article class="tarjeta logro" [class.logro--bloqueado]="!l.obtenido">
                <ion-icon [name]="l.obtenido ? 'ribbon-outline' : 'lock-closed-outline'" aria-hidden="true"></ion-icon>
                <div class="item__texto">
                  <h2 class="titulo-tarjeta">{{ l.nombre }}</h2>
                  <p class="texto-suave">{{ l.descripcion }}</p>
                  <p class="texto-tenue">
                    @if (l.obtenido) { Obtenido el {{ fechaLarga(l.fechaObtenido) }} } @else { Criterio: {{ l.criterio }} }
                    · +{{ l.xpBonus }} XP
                  </p>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .resumen { margin-bottom: 16px; }
    .logro { display: flex; gap: 14px; align-items: flex-start; }
    .logro > ion-icon { font-size: 32px; color: var(--kinet-accent); flex-shrink: 0; }
    .logro--bloqueado { opacity: 0.6; }
    .logro--bloqueado > ion-icon { color: var(--kinet-text-muted); }
  `,
})
export class LogrosPage {
  private jugador = inject(JugadorService);

  logros = signal<Logro[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  fechaLarga = fechaLarga;

  obtenidos = computed(() => this.logros().filter(l => l.obtenido).length);
  ordenados = computed(() => [...this.logros()].sort((a, b) => Number(b.obtenido) - Number(a.obtenido)));

  constructor() {
    addIcons({ ribbonOutline, lockClosedOutline });
    this.jugador.logros().subscribe({
      next: l => {
        this.logros.set(l);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
