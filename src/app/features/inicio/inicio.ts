import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent,
  IonSkeletonText, IonToolbar, RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForward, flameOutline, flash, play, ribbonOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { ResumenJugador } from '../../core/models/entrenamiento.models';
import { AuthService } from '../../core/services/auth';
import { EntrenamientoService } from '../../core/services/entrenamiento';
import { mensajeDeError } from '../../core/utils/http-error';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.scss'],
  imports: [
    IonHeader, IonToolbar, IonContent, IonIcon, IonRefresher, IonRefresherContent,
    IonSkeletonText, RouterLink, EncabezadoComponent,
  ],
})
export class InicioPage {
  private entrenamientos = inject(EntrenamientoService);
  private usuario = inject(AuthService).usuario;

  resumen = signal<ResumenJugador | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  saludo = computed(() => {
    const u = this.usuario();
    return u?.nickname ?? u?.nombre.split(' ')[0] ?? 'atleta';
  });

  nivel = computed(() => this.usuario()?.nivelInicial?.replace(/_/g, ' ') ?? '—');

  private formato = new Intl.NumberFormat('es-CO');

  constructor() {
    addIcons({ play, arrowForward, flash, ribbonOutline, shieldCheckmarkOutline, flameOutline });
  }

  /** Ionic llama esto cada vez que la pestaña se muestra, no solo la primera. */
  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(evento?: RefresherCustomEvent): void {
    this.cargando.set(true);
    this.error.set(null);

    this.entrenamientos.resumen()
      .pipe(finalize(() => {
        this.cargando.set(false);
        evento?.target.complete();
      }))
      .subscribe({
        next: r => this.resumen.set(r),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }

  numero(valor: number): string {
    return this.formato.format(valor);
  }
}
