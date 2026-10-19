import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  flameOutline, medalOutline, notificationsOutline, ribbonOutline, speedometerOutline, stopwatchOutline, timeOutline,
  trendingUpOutline, trophyOutline,
} from 'ionicons/icons';
import { forkJoin } from 'rxjs';
import { Entrenamiento, Participacion, Progreso } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { etiqueta, numero, duracion } from '../../core/utils/formato';
import { RefrescarComponent } from '../../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';
import { BarraProgresoComponent } from '../../shared/components/barra-progreso/barra-progreso';
import { mensajeDeError } from '../../core/utils/http-error';
import { HttpErrorResponse } from '@angular/common/http';

/** Resumen del jugador: nivel y XP, racha, semana, cronómetro abierto, retos y temporada. */
@Component({
  selector: 'app-inicio',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, IonSpinner, RouterLink, EncabezadoComponent, RefrescarComponent, BarraProgresoComponent],
  template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar class="toolbar-kinet"><app-encabezado></app-encabezado></ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="pagina">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
          <button type="button" class="btn-secundario" (click)="cargar()">Reintentar</button>
        } @else if (progreso(); as p) {
          <div class="titulo-pagina">
            <app-refrescar (refrescar)="cargar()" />
            <div>
              <p class="eyebrow"><span class="punto"></span>Tu resumen</p>
              <h1>Hola, {{ p.gamertag }}</h1>
              <p class="titulo-pagina__lead">Nivel de habilidad: {{ etiqueta(p.nivelHabilidad) }}</p>
            </div>
          </div>

          @if (enCurso(); as e) {
            <a routerLink="/tabs/entrenar" class="tarjeta tarjeta--aviso item--enlace banner">
              <ion-icon name="stopwatch-outline" aria-hidden="true"></ion-icon>
              <div class="item__texto">
                <p class="item__titulo">Tienes un entrenamiento en curso</p>
                <p class="item__detalle">{{ e.actividad }} · {{ duracion(e.minutosTranscurridos) }} transcurridos</p>
              </div>
              <span class="chip chip--aviso">Abrir</span>
            </a>
          }

          <div class="rejilla rejilla--principal-lateral">
            <section class="tarjeta tarjeta--resalte">
              <div class="tarjeta__cabecera">
                <p class="etiqueta">Nivel {{ p.nivel }}</p>
                <span class="chip chip--info">{{ numero(p.xpTotal) }} XP</span>
              </div>
              <app-barra-progreso [valor]="p.xpTotal - p.xpInicioNivel"
                                  [meta]="(p.xpSiguienteNivel ?? p.xpTotal) - p.xpInicioNivel"
                                  [completado]="p.xpSiguienteNivel === null" />
              <p class="texto-suave">
                @if (p.xpSiguienteNivel !== null) {
                  Te faltan {{ numero(p.xpSiguienteNivel - p.xpTotal) }} XP para el nivel {{ p.nivel + 1 }}.
                } @else {
                  Alcanzaste el nivel máximo.
                }
              </p>
            </section>

            <section class="tarjeta">
              <p class="titulo-seccion">Temporada</p>
              @if (p.temporada) {
                <p class="titulo-tarjeta">{{ p.temporada }}</p>
                <p class="texto-suave">
                  {{ p.rango ? 'Rango ' + p.rango : 'Aún sin rango' }}
                  @if (p.puntosTemporada !== null) { · {{ numero(p.puntosTemporada) }} pts }
                </p>
                <a routerLink="/tabs/competir" class="btn-chico acciones-link">Ir a competir</a>
              } @else {
                <p class="texto-suave">No hay una temporada activa.</p>
              }
            </section>
          </div>

          <div class="rejilla rejilla--metricas">
            <div class="metrica-chica">
              <p class="etiqueta">Racha</p>
              <p class="valor"><ion-icon name="flame-outline"></ion-icon> {{ p.rachaActual }}<small>días (máx. {{ p.rachaMaxima }})</small></p>
            </div>
            <div class="metrica-chica">
              <p class="etiqueta">Esta semana</p>
              <p class="valor">{{ p.entrenamientosSemana }}<small>sesiones</small></p>
            </div>
            <div class="metrica-chica">
              <p class="etiqueta">Minutos</p>
              <p class="valor">{{ numero(p.minutosSemana) }}<small>min</small></p>
            </div>
            <div class="metrica-chica">
              <p class="etiqueta">Retos</p>
              <p class="valor">{{ p.retosCompletados }}<small>hechos · {{ p.retosActivos }} activos</small></p>
            </div>
          </div>

          <div class="rejilla rejilla--principal-lateral">
            <section class="tarjeta">
              <div class="tarjeta__cabecera">
                <p class="titulo-seccion">Retos en curso</p>
                <a routerLink="/tabs/retos" class="btn-chico">Ver retos</a>
              </div>
              @if (retos().length === 0) {
                <div class="vacio">
                  <ion-icon name="medal-outline" aria-hidden="true"></ion-icon>
                  <p>Aún no te unes a ningún reto.</p>
                </div>
              } @else {
                <ul class="lista">
                  @for (r of retos(); track r.id) {
                    <li>
                      <a [routerLink]="['/tabs/retos', r.idReto]" class="item item--enlace">
                        <div class="item__texto">
                          <p class="item__titulo">{{ r.reto }}</p>
                          <app-barra-progreso [valor]="r.progreso" [meta]="r.meta" />
                        </div>
                        <div class="item__lado"><span class="texto-tenue">{{ r.porcentaje }}%</span></div>
                      </a>
                    </li>
                  }
                </ul>
              }
            </section>

            <section class="tarjeta">
              <p class="titulo-seccion">Atajos</p>
              <ul class="lista">
                <li><a routerLink="/tabs/inicio/notificaciones" class="item item--enlace">
                  <div class="item__texto"><p class="item__titulo"><ion-icon name="notifications-outline"></ion-icon> Notificaciones</p></div>
                  @if (p.notificacionesSinLeer > 0) { <span class="chip chip--error">{{ p.notificacionesSinLeer }}</span> }
                </a></li>
                <li><a routerLink="/tabs/inicio/logros" class="item item--enlace">
                  <div class="item__texto"><p class="item__titulo"><ion-icon name="ribbon-outline"></ion-icon> Logros</p></div>
                  <span class="chip chip--ok">{{ p.logros }}</span>
                </a></li>
                <li><a routerLink="/tabs/inicio/xp" class="item item--enlace">
                  <div class="item__texto"><p class="item__titulo"><ion-icon name="trending-up-outline"></ion-icon> Movimientos de XP</p></div>
                </a></li>
                <li><a routerLink="/tabs/entrenar" class="item item--enlace">
                  <div class="item__texto"><p class="item__titulo"><ion-icon name="time-outline"></ion-icon> Historial de entrenamientos</p></div>
                </a></li>
              </ul>
            </section>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .banner { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; text-decoration: none; color: inherit;
      > ion-icon { font-size: 28px; color: var(--kinet-accent); } }
    .acciones-link { margin-top: 12px; text-decoration: none; }
    .valor ion-icon { font-size: 20px; vertical-align: -3px; color: var(--kinet-accent); }
    .item__titulo ion-icon { vertical-align: -3px; margin-right: 6px; color: var(--kinet-accent); }
  `,
})
export class InicioPage implements ViewWillEnter {
  private jugador = inject(JugadorService);

  progreso = signal<Progreso | null>(null);
  enCurso = signal<Entrenamiento | null>(null);
  retos = signal<Participacion[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  etiqueta = etiqueta;
  numero = numero;
  duracion = duracion;
  tieneRetos = computed(() => this.retos().length > 0);

  constructor() {
    addIcons({
      flameOutline, medalOutline, notificationsOutline, ribbonOutline, speedometerOutline, stopwatchOutline, timeOutline,
      trendingUpOutline, trophyOutline,
    });
  }

  /** Se vuelve a pedir cada vez que se entra a la pestaña (el XP cambia al entrenar). */
  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.error.set(null);
    forkJoin({
      progreso: this.jugador.progreso(),
      enCurso: this.jugador.enCurso(),
      retos: this.jugador.misRetos(0, 50),
    }).subscribe({
      next: r => {
        this.progreso.set(r.progreso);
        this.enCurso.set(r.enCurso);
        this.retos.set(r.retos.contenido.filter(x => x.estado === 'EN_CURSO').slice(0, 4));
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
