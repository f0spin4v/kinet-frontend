import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { Enfrentamiento } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { claseEstado, etiqueta, fechaCorta } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';
import { tiempoRestante } from '../../core/utils/fechas';

/** Un enfrentamiento 1 contra 1 de la temporada: quién gana suma más XP de entrenamientos con evidencia. */
@Component({
  selector: 'app-enfrentamiento',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/competir" text=""></ion-back-button></ion-buttons>
        <ion-title>Enfrentamiento</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (e(); as e) {
          <section class="tarjeta tarjeta--resalte">
            <div class="tarjeta__cabecera">
              <h1 class="titulo-tarjeta">{{ e.tipo === 'COLOCACION' ? 'Enfrentamiento de colocación' : 'Enfrentamiento estándar' }}</h1>
              <span class="chip" [class]="claseEstado(e.estado)">{{ etiqueta(e.estado) }}</span>
            </div>
            <p class="texto-suave">{{ e.temporada }}</p>
            <div class="versus">
              @for (p of e.participantes; track p.idUsuario) {
                <div class="jugador" [class.jugador--yo]="p.idUsuario === miId()">
                  <p class="jugador__nombre">{{ p.gamertag }}</p>
                  <p class="jugador__puntaje">{{ p.puntaje }}<small> XP</small></p>
                  @if (p.resultado) { <span class="chip" [class]="claseEstado(p.resultado)">{{ etiqueta(p.resultado) }}</span> }
                </div>
                @if ($first && e.participantes.length > 1) { <span class="vs" aria-hidden="true">VS</span> }
              }
            </div>
            <dl class="kv-lista">
              <div class="kv"><dt>Inicio</dt><dd>{{ fechaCorta(e.fechaInicio) }}</dd></div>
              <div class="kv"><dt>Fin</dt><dd>{{ fechaCorta(e.fechaFin) }}</dd></div>
              @if (e.estado === 'EN_CURSO') { <div class="kv"><dt>Tiempo</dt><dd>{{ tiempoRestante(e.fechaFin) }}</dd></div> }
            </dl>
            @if (e.estado === 'EN_CURSO') {
              <p class="aviso-ok aviso-info">
                No hay que cerrarlo: termina solo {{ tiempoRestante(e.fechaFin).toLowerCase() }} y se calcula con el XP que
                hayas sumado en esa ventana.
                @if (e.tipo === 'ESTANDAR') { Si no entrenas, tu rival gana y pierdes 15 puntos de temporada. }
                @else { Si no entrenas, la colocación termina con 0 puntos. }
              </p>
            }
            <p class="texto-tenue">Solo cuentan tus sesiones validadas con un enlace de evidencia no rechazado.</p>
          </section>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .versus { display: flex; align-items: center; justify-content: space-around; gap: 8px; margin: 20px 0; text-align: center; }
    .jugador { flex: 1; padding: 12px; border-radius: var(--kinet-radius-card); border: 1px solid var(--kinet-surface-high); display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .jugador--yo { border-color: var(--kinet-primary); }
    .jugador__nombre { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
    .jugador__puntaje { margin: 0; font-family: var(--kinet-font-display); font-weight: 700; font-size: 28px; }
    .jugador__puntaje small { font-size: 12px; color: var(--kinet-text-muted); }
    .aviso-info { margin: 12px 0; background: rgba(255, 176, 32, 0.14); color: #b87400; }
    .vs { font-family: var(--kinet-font-display); font-weight: 700; color: var(--kinet-text-muted); }
  `,
})
export class EnfrentamientoPage implements OnInit {
  private jugador = inject(JugadorService);
  private auth = inject(AuthService);

  id = input.required<string>();
  e = signal<Enfrentamiento | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  miId = computed(() => this.auth.usuario()?.id ?? -1);
  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaCorta = fechaCorta;
  tiempoRestante = tiempoRestante;

  ngOnInit(): void {
    this.jugador.enfrentamiento(Number(this.id())).subscribe({
        next: e => {
          this.e.set(e);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
        },
    });
  }
}
