import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent,
  IonSkeletonText, IonToolbar, RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barbellOutline, bodyOutline, checkmarkDoneOutline, flashOutline, peopleOutline,
  personOutline, timeOutline, trophy, walkOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { Reto, TipoActividad, UnidadReto } from '../../core/models/entrenamiento.models';
import { RetoService } from '../../core/services/retos';
import { ETIQUETA_UNIDAD, iconoActividad } from '../../core/utils/actividad';
import { tiempoRestante } from '../../core/utils/fechas';
import { mensajeDeError } from '../../core/utils/http-error';
import { BarraProgresoComponent } from '../../shared/components/barra-progreso/barra-progreso';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';

type Filtro = 'activos' | 'completados';

@Component({
  selector: 'app-retos',
  templateUrl: './retos.html',
  styleUrls: ['./retos.scss'],
  imports: [
    IonHeader, IonToolbar, IonContent, IonIcon, IonRefresher, IonRefresherContent,
    IonSkeletonText, RouterLink, EncabezadoComponent, BarraProgresoComponent,
  ],
})
export class RetosPage {
  private servicio = inject(RetoService);

  retos = signal<Reto[] | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  filtro = signal<Filtro>('activos');

  misiones = computed(() => (this.retos() ?? []).filter(r => r.periodicidad === 'DIARIA' && !r.completado));
  semanales = computed(() => (this.retos() ?? []).filter(r => r.periodicidad === 'SEMANAL' && !r.completado));
  completados = computed(() => (this.retos() ?? []).filter(r => r.completado));
  totalActivos = computed(() => this.misiones().length + this.semanales().length);

  private formato = new Intl.NumberFormat('es-CO');

  constructor() {
    addIcons({
      barbellOutline, bodyOutline, walkOutline, flashOutline, peopleOutline,
      personOutline, timeOutline, trophy, checkmarkDoneOutline,
    });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(evento?: RefresherCustomEvent): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicio.listar()
      .pipe(finalize(() => {
        this.cargando.set(false);
        evento?.target.complete();
      }))
      .subscribe({
        next: retos => this.retos.set(retos),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }

  icono(tipo: TipoActividad | null): string {
    return iconoActividad(tipo);
  }

  unidad(unidad: UnidadReto): string {
    return ETIQUETA_UNIDAD[unidad];
  }

  tiempo(reto: Reto): string {
    return tiempoRestante(reto.fechaFin);
  }

  numero(valor: number): string {
    return this.formato.format(valor);
  }
}
