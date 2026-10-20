import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IonContent, IonHeader, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { ResumenAnalitica } from '../core/models/api.models';
import { StaffService } from '../core/services/staff';
import { etiqueta, numero } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';
import { RefrescarComponent } from '../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../shared/components/encabezado/encabezado';
import { BarraProgresoComponent } from '../shared/components/barra-progreso/barra-progreso';

interface Grupo {
  titulo: string;
  unidad: string;
  filas: { nombre: string; valor: number }[];
  maximo: number;
}

const GRUPOS: { clave: keyof ResumenAnalitica; titulo: string; unidad: string }[] = [
  { clave: 'usuariosPorEstado', titulo: 'Usuarios por estado', unidad: '' },
  { clave: 'usuariosPorRol', titulo: 'Usuarios por rol', unidad: '' },
  { clave: 'jugadoresPorNivelHabilidad', titulo: 'Jugadores por nivel de habilidad', unidad: '' },
  { clave: 'entrenamientosPorEstado30Dias', titulo: 'Entrenamientos por estado (30 días)', unidad: '' },
  { clave: 'minutosPorActividad30Dias', titulo: 'Minutos por actividad (30 días)', unidad: 'min' },
  { clave: 'xpPorOrigen30Dias', titulo: 'XP por origen (30 días)', unidad: 'XP' },
  { clave: 'retosCompletados30Dias', titulo: 'Retos completados (30 días)', unidad: '' },
  { clave: 'jugadoresPorLigaTemporadaActiva', titulo: 'Jugadores por liga (temporada activa)', unidad: '' },
  { clave: 'competenciasPorTipo', titulo: 'Competencias por tipo', unidad: '' },
  { clave: 'notificacionesPorEstadoEnvio', titulo: 'Notificaciones por estado de envío', unidad: '' },
];

/** Resumen de la plataforma (administrador): los conteos que entrega /api/analitica/resumen. */
@Component({
  selector: 'app-analitica',
  imports: [IonContent, IonHeader, IonToolbar, IonSpinner, EncabezadoComponent, RefrescarComponent, BarraProgresoComponent, RefrescarComponent],
  template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar class="toolbar-kinet"><app-encabezado></app-encabezado></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="pagina">
        <div class="titulo-pagina">
          <app-refrescar [cargando]="cargando()" (refrescar)="ionViewWillEnter()" />
          <div>
            <p class="eyebrow"><span class="punto"></span>Administración</p>
            <h1>Analítica</h1>
            <p class="titulo-pagina__lead">Cómo se usa Kinet: cuentas, entrenamientos, XP, retos y competencias.</p>
          </div>
        </div>

        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        } @else {
          <div class="rejilla rejilla--3">
            @for (g of grupos(); track g.titulo) {
              <section class="tarjeta">
                <p class="titulo-seccion">{{ g.titulo }}</p>
                @for (f of g.filas; track f.nombre) {
                  <div class="fila">
                    <div class="fila__cab"><span>{{ etiqueta(f.nombre) }}</span><strong>{{ numero(f.valor) }} {{ g.unidad }}</strong></div>
                    <app-barra-progreso [valor]="f.valor" [meta]="g.maximo" />
                  </div>
                } @empty {
                  <p class="texto-tenue">Sin datos todavía.</p>
                }
              </section>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .fila { margin-bottom: 12px; }
    .fila__cab { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; font-size: 14px; }
  `,
})
export class AnaliticaPage implements ViewWillEnter {
  private staff = inject(StaffService);

  resumen = signal<ResumenAnalitica | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  grupos = computed<Grupo[]>(() => {
    const r = this.resumen();
    if (!r) return [];
    return GRUPOS.map(g => {
      const filas = Object.entries(r[g.clave] ?? {}).map(([nombre, valor]) => ({ nombre, valor }));
      return { titulo: g.titulo, unidad: g.unidad, filas, maximo: Math.max(1, ...filas.map(f => f.valor)) };
    });
  });

  etiqueta = etiqueta;
  numero = numero;

  ionViewWillEnter(): void {
    this.staff.analitica().subscribe({
      next: r => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
