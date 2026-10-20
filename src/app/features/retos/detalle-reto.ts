import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { Participacion, Reto } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { tiempoRestante } from '../../core/utils/fechas';
import { ETIQUETA_METRICA, claseEstado, etiqueta, fechaLarga } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';
import { BarraProgresoComponent } from '../../shared/components/barra-progreso/barra-progreso';

/** Un reto: sus reglas, mi progreso, aportes manuales (retos de repeticiones) y abandono. */
@Component({
  selector: 'app-detalle-reto',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSpinner, FormsModule, BarraProgresoComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/retos" text=""></ion-back-button></ion-buttons>
        <ion-title>Reto</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (reto(); as r) {
          <section class="tarjeta">
            <div class="tarjeta__cabecera">
              <h1 class="titulo-tarjeta">{{ r.nombre }}</h1>
              <span class="chip chip--info">+{{ r.xpRecompensa }} XP</span>
            </div>
            <p class="texto-suave">{{ r.descripcion }}</p>
            @if (r.condiciones) { <p class="texto-tenue">{{ r.condiciones }}</p> }
            <dl class="kv-lista">
              <div class="kv"><dt>Meta</dt><dd>{{ r.valorMeta }} {{ metrica[r.metrica] }}</dd></div>
              <div class="kv"><dt>Periodicidad</dt><dd>{{ etiqueta(r.periodicidad) }}</dd></div>
              <div class="kv"><dt>Ámbito</dt><dd>{{ r.ambito === 'CLAN' ? 'Clan (suma todo el equipo)' : 'Individual' }}</dd></div>
              @if (r.actividad) { <div class="kv"><dt>Actividad</dt><dd>{{ etiqueta(r.actividad) }}</dd></div> }
              @if (r.nivelHabilidad) { <div class="kv"><dt>Nivel</dt><dd>{{ etiqueta(r.nivelHabilidad) }}</dd></div> }
              <div class="kv"><dt>Desde</dt><dd>{{ fechaLarga(r.fechaInicio) }}</dd></div>
              @if (r.fechaFin) { <div class="kv"><dt>Hasta</dt><dd>{{ fechaLarga(r.fechaFin) }}</dd></div> }
            </dl>
          </section>

          @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }
          @if (ok()) { <p class="aviso-ok">{{ ok() }}</p> }

          @if (r.participacion; as p) {
            <h2 class="titulo-seccion">Mi progreso</h2>
            <section class="tarjeta bloque">
              <div class="tarjeta__cabecera">
                <p class="titulo-tarjeta">{{ p.progreso }} / {{ p.meta }} {{ metrica[p.metrica] }}</p>
                <span class="chip" [class]="claseEstado(p.estado)">{{ etiqueta(p.estado) }}</span>
              </div>
              <app-barra-progreso [valor]="p.progreso" [meta]="p.meta" [completado]="p.estado === 'COMPLETADO'" />
              @if (p.progresoClan !== null) {
                <p class="texto-suave">Progreso de todo el clan: {{ p.progresoClan }} {{ metrica[p.metrica] }}</p>
              }
              <p class="texto-tenue">
                Periodo {{ p.periodo }}
                @if (p.estado === 'EN_CURSO') { · {{ tiempoRestante(p.fechaLimite) }} }
              </p>

              @if (p.estado === 'VENCIDO') {
                <p class="alert-error">Se acabó el tiempo sin completar la meta: perdiste la oportunidad de este periodo.
                  {{ r.periodicidad === 'DIARIA' ? 'Podrás volver a unirte mañana.' : r.periodicidad === 'SEMANAL' ? 'Podrás volver a unirte la próxima semana.' : 'Este reto no se repite.' }}</p>
              }
              @if (p.estado === 'ABANDONADO') {
                <p class="alert-error">Abandonaste este reto y no puedes retomarlo en este periodo.
                  {{ r.periodicidad === 'DIARIA' ? 'Podrás volver a unirte mañana.' : r.periodicidad === 'SEMANAL' ? 'Podrás volver a unirte la próxima semana.' : 'Este reto no se repite.' }}</p>
              }
              @if (p.estado === 'EN_CURSO') {
                <p class="texto-tenue">Debes completar la meta antes del límite; si no, el reto vence solo y pierdes el periodo.</p>
                @if (r.metrica === 'REPETICIONES') {
                  <div class="campos campos--2">
                    <div class="field">
                      <label class="field__label" for="cant">Repeticiones a sumar</label>
                      <div class="field__box"><input id="cant" type="number" min="1" inputmode="numeric" [(ngModel)]="cantidad" /></div>
                    </div>
                    <div class="field">
                      <label class="field__label" for="nota">Nota (opcional)</label>
                      <div class="field__box"><input id="nota" type="text" maxlength="120" [(ngModel)]="nota" /></div>
                    </div>
                  </div>
                  <button type="button" class="btn-primary" [disabled]="trabajando() || !cantidad || cantidad < 1" (click)="aportar(p)">Registrar aporte</button>
                } @else {
                  <p class="texto-suave">Este reto suma solo con tus entrenamientos validados.</p>
                }
                <button type="button" class="btn-peligro" [disabled]="trabajando()" (click)="confirmarAbandono(p)">Abandonar reto</button>
              }
            </section>
          } @else if (r.estado === 'ACTIVO') {
            <button type="button" class="btn-primary" [disabled]="trabajando()" (click)="unirse(r)">
              @if (trabajando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Unirme al reto }
            </button>
          }
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .bloque { display: flex; flex-direction: column; gap: 14px; margin-top: 4px; }
    section.tarjeta { margin-bottom: 16px; }
  `,
})
export class DetalleRetoPage implements OnInit {
  private jugador = inject(JugadorService);
  private alertas = inject(AlertController);

  id = input.required<string>();

  reto = signal<Reto | null>(null);
  cargando = signal(true);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  cantidad: number | null = null;
  nota = '';

  metrica = ETIQUETA_METRICA;
  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;
  tiempoRestante = tiempoRestante;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.jugador.reto(Number(this.id())).subscribe({
      next: r => {
        this.reto.set(r);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  unirse(r: Reto): void {
    this.ejecutar(this.jugador.unirseAReto(r.id), 'Te uniste al reto.');
  }

  aportar(p: Participacion): void {
    this.ejecutar(this.jugador.aportar(p.id, this.cantidad ?? 0, this.nota.trim() || null), 'Aporte registrado.', () => {
      this.cantidad = null;
      this.nota = '';
    });
  }

  async confirmarAbandono(p: Participacion): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Abandonar reto',
      message: 'Perderás el progreso de este periodo.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Abandonar', role: 'destructive', cssClass: 'alerta-boton-peligro',
          handler: () => { this.ejecutar(this.jugador.abandonarReto(p.id), 'Abandonaste el reto.'); } },
      ],
    });
    await alerta.present();
  }

  private ejecutar(peticion: ReturnType<JugadorService['unirseAReto']>, mensaje: string, despues?: () => void): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.ok.set(null);
    peticion.pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: () => {
        this.ok.set(mensaje);
        despues?.();
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }
}
