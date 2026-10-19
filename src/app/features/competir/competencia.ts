import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { finalize } from 'rxjs';
import { Competencia } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { claseEstado, etiqueta, fechaCorta } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';

/** Una competencia: participantes, posiciones y las acciones que tocan según el estado. */
@Component({
  selector: 'app-competencia',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/competir" text=""></ion-back-button></ion-buttons>
        <ion-title>Competencia</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (c(); as c) {
          <section class="tarjeta tarjeta--resalte">
            <div class="tarjeta__cabecera">
              <h1 class="titulo-tarjeta">{{ c.nombre }}</h1>
              <span class="chip" [class]="claseEstado(c.estado)">{{ etiqueta(c.estado) }}</span>
            </div>
            <dl class="kv-lista">
              <div class="kv"><dt>Tipo</dt><dd>{{ etiqueta(c.tipo) }}</dd></div>
              <div class="kv"><dt>Organiza</dt><dd>{{ c.creador }}</dd></div>
              <div class="kv"><dt>Actividad</dt><dd>{{ c.actividad ? etiqueta(c.actividad) : 'Cualquiera' }}</dd></div>
              <div class="kv"><dt>Ronda</dt><dd>{{ c.rondaActual }} · {{ c.duracionRondaHoras }} h por ronda</dd></div>
              <div class="kv"><dt>Premio</dt><dd>{{ c.premioXp }} XP</dd></div>
              <div class="kv"><dt>Inicio</dt><dd>{{ fechaCorta(c.fechaInicio) }}</dd></div>
              <div class="kv"><dt>Fin</dt><dd>{{ fechaCorta(c.fechaFin) }}</dd></div>
            </dl>
            <p class="texto-tenue">Solo suman las sesiones validadas que tengan un enlace de evidencia no rechazado.</p>
          </section>

          @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }

          <div class="acciones acc">
            @if (miInvitacionPendiente()) {
              <button type="button" class="btn-primary" [disabled]="trabajando()" (click)="ejecutar(aceptar)">Aceptar invitación</button>
              <button type="button" class="btn-secundario" [disabled]="trabajando()" (click)="ejecutar(rechazar)">Rechazar</button>
            }
            @if (puedeCancelar()) {
              <button type="button" class="btn-peligro" [disabled]="trabajando()" (click)="confirmarCancelar()">Cancelar competencia</button>
            }
          </div>

          <h2 class="titulo-seccion">Participantes</h2>
          <div class="tarjeta">
            <ul class="lista">
              @for (p of ordenados(); track p.idUsuario) {
                <li class="item">
                  <div class="item__texto">
                    <p class="item__titulo">
                      @if (p.posicion) { {{ p.posicion }}. }{{ p.gamertag }}
                      @if (p.idUsuario === miId()) { <span class="chip chip--info">Tú</span> }
                    </p>
                    <p class="item__detalle">
                      {{ etiqueta(p.estadoInvitacion) }}
                      @if (p.eliminadoEnRonda) { · Eliminado en la ronda {{ p.eliminadoEnRonda }} }
                    </p>
                  </div>
                  <div class="item__lado">
                    <span class="chip">{{ p.puntaje }} XP</span>
                    @if (p.resultado) { <span class="chip" [class]="claseEstado(p.resultado)">{{ etiqueta(p.resultado) }}</span> }
                  </div>
                </li>
              }
            </ul>
          </div>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .acc { margin: 16px 0 24px; }
    section.tarjeta { margin-bottom: 4px; }
  `,
})
export class CompetenciaPage implements OnInit {
  private jugador = inject(JugadorService);
  private auth = inject(AuthService);
  private alertas = inject(AlertController);

  id = input.required<string>();

  c = signal<Competencia | null>(null);
  cargando = signal(true);
  trabajando = signal(false);
  error = signal<string | null>(null);

  miId = computed(() => this.auth.usuario()?.id ?? -1);
  miInvitacionPendiente = computed(() =>
    this.c()?.estado === 'PENDIENTE'
    && this.c()!.participantes.some(p => p.idUsuario === this.miId() && p.estadoInvitacion === 'INVITADO'));
  puedeCancelar = computed(() => this.c()?.idCreador === this.miId() && ['PENDIENTE', 'EN_CURSO'].includes(this.c()?.estado ?? ''));
  ordenados = computed(() =>
    [...(this.c()?.participantes ?? [])].sort((a, b) => (a.posicion ?? 999) - (b.posicion ?? 999) || b.puntaje - a.puntaje));

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaCorta = fechaCorta;

  aceptar = (id: number) => this.jugador.aceptarCompetencia(id);
  rechazar = (id: number) => this.jugador.rechazarCompetencia(id);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.jugador.competencia(Number(this.id())).subscribe({
      next: c => {
        this.c.set(c);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  ejecutar(accion: (id: number) => ReturnType<JugadorService['competencia']>): void {
    this.trabajando.set(true);
    this.error.set(null);
    accion(Number(this.id())).pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: c => this.c.set(c),
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  async confirmarCancelar(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Cancelar competencia',
      message: 'Se avisará a los participantes.',
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Cancelar competencia', role: 'destructive', cssClass: 'alerta-boton-peligro',
          handler: () => { this.ejecutar(id => this.jugador.cancelarCompetencia(id)); } },
      ],
    });
    await alerta.present();
  }
}
