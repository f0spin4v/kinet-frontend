import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { Participacion, Reto } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { ETIQUETA_METRICA, claseEstado, etiqueta, fechaLarga } from '../../core/utils/formato';
import { tiempoRestante } from '../../core/utils/fechas';
import { ListaPaginada } from '../../core/utils/lista-paginada';
import { BarraProgresoComponent } from '../../shared/components/barra-progreso/barra-progreso';
import { RefrescarComponent } from '../../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../../shared/components/pie-lista/pie-lista';

type Pestana = 'disponibles' | 'mios';

/** Retos disponibles para el nivel del jugador y los retos en los que participa. */
@Component({
  selector: 'app-retos',
  imports: [IonContent, IonHeader, IonToolbar, RouterLink, EncabezadoComponent, RefrescarComponent, BarraProgresoComponent, PieListaComponent],
  template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar class="toolbar-kinet"><app-encabezado></app-encabezado></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="pagina">
        <div class="titulo-pagina">
          <app-refrescar (refrescar)="ionViewWillEnter()" />
          <div>
            <p class="eyebrow"><span class="punto"></span>Objetivos</p>
            <h1>Retos</h1>
            <p class="titulo-pagina__lead">Únete, suma progreso entrenando y gana XP al completarlos.</p>
          </div>
        </div>

        <div class="pestanas" role="tablist">
          <button type="button" role="tab" class="pestana" [class.pestana--activa]="pestana() === 'disponibles'"
                  [attr.aria-selected]="pestana() === 'disponibles'" (click)="cambiar('disponibles')">Disponibles</button>
          <button type="button" role="tab" class="pestana" [class.pestana--activa]="pestana() === 'mios'"
                  [attr.aria-selected]="pestana() === 'mios'" (click)="cambiar('mios')">Mis retos</button>
        </div>

        @if (pestana() === 'disponibles') {
          <div class="rejilla rejilla--3">
            @for (r of disponibles.items(); track r.id) {
              <a [routerLink]="['/tabs/retos', r.id]" class="tarjeta reto item--enlace">
                <div class="tarjeta__cabecera">
                  <h2 class="titulo-tarjeta">{{ r.nombre }}</h2>
                  <span class="chip chip--info">+{{ r.xpRecompensa }} XP</span>
                </div>
                <p class="texto-suave">{{ r.descripcion }}</p>
                <p class="texto-tenue">
                  Meta: {{ r.valorMeta }} {{ metrica[r.metrica] }} · {{ etiqueta(r.periodicidad) }}
                  @if (r.ambito === 'CLAN') { · En clan }
                  @if (r.actividad) { · {{ etiqueta(r.actividad) }} }
                </p>
                @if (r.participacion; as p) {
                  <app-barra-progreso [valor]="p.progreso" [meta]="p.meta" [completado]="p.estado === 'COMPLETADO'" />
                  <span class="chip" [class]="claseEstado(p.estado)">{{ etiqueta(p.estado) }}</span>
                }
              </a>
            }
          </div>
          <app-pie-lista [lista]="disponibles" vacio="No hay retos disponibles ahora mismo." />
        } @else {
          <div class="rejilla rejilla--3">
            @for (p of mios.items(); track p.id) {
              <a [routerLink]="['/tabs/retos', p.idReto]" class="tarjeta reto item--enlace">
                <div class="tarjeta__cabecera">
                  <h2 class="titulo-tarjeta">{{ p.reto }}</h2>
                  <span class="chip" [class]="claseEstado(p.estado)">{{ etiqueta(p.estado) }}</span>
                </div>
                <app-barra-progreso [valor]="p.progreso" [meta]="p.meta" [completado]="p.estado === 'COMPLETADO'" />
                <p class="texto-tenue">
                  {{ p.progreso }} / {{ p.meta }} {{ metrica[p.metrica] }} ({{ p.porcentaje }}%)
                  @if (p.estado === 'EN_CURSO') { · {{ tiempoRestante(p.fechaLimite) }} }
                  @if (p.fechaCompletado) { · Completado el {{ fechaLarga(p.fechaCompletado) }} }
                </p>
              </a>
            }
          </div>
          <app-pie-lista [lista]="mios" vacio="Todavía no participas en ningún reto." />
        }
      </div>
    </ion-content>
  `,
  styles: `.reto { display: flex; flex-direction: column; gap: 10px; text-decoration: none; color: inherit; }`,
})
export class RetosPage implements ViewWillEnter {
  private jugador = inject(JugadorService);

  pestana = signal<Pestana>('disponibles');
  disponibles = new ListaPaginada<Reto>((p, t) => this.jugador.retosDisponibles(p, t));
  mios = new ListaPaginada<Participacion>((p, t) => this.jugador.misRetos(p, t));

  metrica = ETIQUETA_METRICA;
  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;
  tiempoRestante = tiempoRestante;

  ionViewWillEnter(): void {
    this.disponibles.recargar();
    this.mios.recargar();
  }

  cambiar(p: Pestana): void {
    this.pestana.set(p);
  }
}
