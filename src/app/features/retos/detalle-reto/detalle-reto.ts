import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSkeletonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline, barbellOutline, bodyOutline, flash, flashOutline,
  timerOutline, trendingUp, trophy, walkOutline,
} from 'ionicons/icons';
import { Reto, RetoDetalle, TipoActividad, UnidadReto } from '../../../core/models/entrenamiento.models';
import { RetoService } from '../../../core/services/retos';
import { ETIQUETA_UNIDAD, etiquetaActividad, iconoActividad } from '../../../core/utils/actividad';
import { fechaLimite, fechaRelativa, partesTiempoRestante } from '../../../core/utils/fechas';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraProgresoComponent } from '../../../shared/components/barra-progreso/barra-progreso';

@Component({
  selector: 'app-detalle-reto',
  templateUrl: './detalle-reto.html',
  styleUrls: ['./detalle-reto.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
    IonIcon, IonSkeletonText, RouterLink, BarraProgresoComponent,
  ],
})
export class DetalleRetoPage {
  private servicio = inject(RetoService);
  private ruta = inject(ActivatedRoute);

  reto = signal<RetoDetalle | null>(null);
  error = signal<string | null>(null);

  restante = computed(() => {
    const r = this.reto();
    return r ? partesTiempoRestante(r.fechaFin) : null;
  });

  private formato = new Intl.NumberFormat('es-CO');

  constructor() {
    addIcons({
      barbellOutline, bodyOutline, walkOutline, flashOutline, flash,
      trendingUp, timerOutline, trophy, addCircleOutline,
    });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.error.set(null);

    this.servicio.detalle(id).subscribe({
      next: r => this.reto.set(r),
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  categoria(r: Reto): string {
    return r.categoria ? etiquetaActividad(r.categoria) : 'Cualquier actividad';
  }

  pista(r: Reto): string {
    if (r.tipo === 'GRUPAL') return 'Las sesiones de todo tu clan suman a este reto.';
    const actividad = r.categoria ? `de ${etiquetaActividad(r.categoria).toLowerCase()}` : 'de cualquier actividad';
    switch (r.unidad) {
      case 'REPETICIONES': return `Suman las repeticiones que registres en sesiones ${actividad}.`;
      case 'MINUTOS': return `Suman los minutos de tus sesiones ${actividad}.`;
      case 'SESIONES': return `Cada sesión ${actividad} cuenta como una.`;
    }
  }

  parametros(r: Reto): Record<string, string> {
    return r.categoria ? { tipo: r.categoria } : {};
  }

  icono(tipo: TipoActividad | null): string {
    return iconoActividad(tipo);
  }

  unidad(u: UnidadReto): string {
    return ETIQUETA_UNIDAD[u];
  }

  fecha(f: string): string {
    return fechaRelativa(f);
  }

  limite(f: string): string {
    return fechaLimite(f);
  }

  numero(valor: number): string {
    return this.formato.format(valor);
  }
}
