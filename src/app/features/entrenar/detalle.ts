import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, linkOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { Entrenamiento, Evidencia } from '../../core/models/api.models';
import { JugadorService } from '../../core/services/jugador';
import { claseEstado, duracion, etiqueta, fechaCorta } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';

/** Detalle de una sesión y su evidencia (imagen o enlace a una app deportiva). */
@Component({
  selector: 'app-detalle-entrenamiento',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonIcon, IonSpinner, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/entrenar" text=""></ion-back-button></ion-buttons>
        <ion-title>Entrenamiento</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (entrenamiento(); as e) {
          <section class="tarjeta">
            <div class="tarjeta__cabecera">
              <h1 class="titulo-tarjeta">{{ etiqueta(e.actividad) }}</h1>
              <span class="chip" [class]="claseEstado(e.estado)">{{ etiqueta(e.estado) }}</span>
            </div>
            <dl class="kv-lista">
              <div class="kv"><dt>Inicio</dt><dd>{{ fechaCorta(e.fechaHoraInicio) }}</dd></div>
              <div class="kv"><dt>Duración</dt><dd>{{ duracion(e.duracionMin) }}</dd></div>
              <div class="kv"><dt>Intensidad</dt><dd>{{ etiqueta(e.intensidad) }}</dd></div>
              @if (e.distanciaKm !== null) { <div class="kv"><dt>Distancia</dt><dd>{{ e.distanciaKm }} km</dd></div> }
              @if (e.caloriasKcal !== null) { <div class="kv"><dt>Calorías</dt><dd>{{ e.caloriasKcal }} kcal</dd></div> }
              @if (e.series !== null) { <div class="kv"><dt>Series</dt><dd>{{ e.series }}</dd></div> }
              @if (e.repeticiones !== null) { <div class="kv"><dt>Repeticiones por serie</dt><dd>{{ e.repeticiones }}</dd></div> }
              @if (e.pesoKg !== null) { <div class="kv"><dt>Peso</dt><dd>{{ e.pesoKg }} kg</dd></div> }
              <div class="kv"><dt>XP otorgado</dt><dd>{{ e.xpOtorgado }}</dd></div>
              @if (e.notas) { <div class="kv"><dt>Notas</dt><dd>{{ e.notas }}</dd></div> }
            </dl>
            @if (e.motivoRechazo) {
              <p class="alert-error">Motivo del rechazo: {{ e.motivoRechazo }}</p>
            }
          </section>

          <h2 class="titulo-seccion">Evidencia</h2>
          <section class="tarjeta">
            @if (evidencia(); as ev) {
              <dl class="kv-lista">
                <div class="kv"><dt>Tipo</dt><dd>{{ ev.tipo === 'ENLACE' ? 'Enlace' + (ev.plataforma ? ' · ' + etiqueta(ev.plataforma) : '') : 'Imagen' }}</dd></div>
                @if (ev.url) { <div class="kv"><dt>Enlace</dt><dd><a [href]="ev.url" target="_blank" rel="noopener noreferrer">{{ ev.url }}</a></dd></div> }
                @if (ev.nombreArchivo) { <div class="kv"><dt>Archivo</dt><dd>{{ ev.nombreArchivo }}</dd></div> }
                <div class="kv"><dt>Revisión</dt><dd><span class="chip" [class]="claseEstado(ev.estadoRevision)">{{ etiqueta(ev.estadoRevision) }}</span></dd></div>
                @if (ev.notaRevision) { <div class="kv"><dt>Nota</dt><dd>{{ ev.notaRevision }}</dd></div> }
                <div class="kv"><dt>Subida</dt><dd>{{ fechaCorta(ev.fechaSubida) }}</dd></div>
              </dl>
            } @else if (puedeSubir(e)) {
              <p class="texto-suave">
                Una evidencia suma +10 XP. Sube una imagen (JPEG, PNG o WEBP, hasta 5 MB) o el enlace de tu actividad en Strava, Garmin Connect, Polar Flow o Komoot.
                @if ((e.duracionMin ?? 0) > 180) { <strong>En sesiones de más de 180 min el enlace es obligatorio.</strong> }
              </p>

              @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }
              @if (ok()) { <p class="aviso-ok">{{ ok() }}</p> }

              <div class="field">
                <label class="field__label" for="url">Enlace de la actividad</label>
                <div class="field__box">
                  <ion-icon name="link-outline" aria-hidden="true"></ion-icon>
                  <input id="url" type="url" [(ngModel)]="enlace" placeholder="https://www.strava.com/activities/…" />
                </div>
              </div>
              <button type="button" class="btn-primary" [disabled]="subiendo() || !enlace.trim()" (click)="subirEnlace(e)">
                @if (subiendo()) { <ion-spinner name="crescent"></ion-spinner> } @else { Enviar enlace }
              </button>

              <div class="field imagen">
                <label class="field__label" for="archivo">…o una imagen</label>
                <label class="btn-secundario subir" for="archivo">
                  <ion-icon name="cloud-upload-outline"></ion-icon> Elegir imagen
                </label>
                <input id="archivo" type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="subirImagen(e, $event)" />
              </div>
            } @else {
              <p class="texto-suave">Esta sesión ya no admite evidencia.</p>
            }
          </section>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    section.tarjeta { margin-bottom: 20px; display: flex; flex-direction: column; gap: 14px; }
    .subir { cursor: pointer; width: 100%; }
    .imagen { margin-top: 4px; }
  `,
})
export class DetalleEntrenamientoPage implements OnInit {
  private jugador = inject(JugadorService);

  /** Viene de la ruta (:id) gracias a withComponentInputBinding. */
  id = input.required<string>();

  entrenamiento = signal<Entrenamiento | null>(null);
  evidencia = signal<Evidencia | null>(null);
  cargando = signal(true);
  subiendo = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  enlace = '';

  etiqueta = etiqueta;
  duracion = duracion;
  fechaCorta = fechaCorta;
  claseEstado = claseEstado;

  constructor() {
    addIcons({ cloudUploadOutline, linkOutline });
  }

  ngOnInit(): void {
    this.cargar();
  }

  puedeSubir(e: Entrenamiento): boolean {
    return e.estado !== 'EN_CURSO';
  }

  private cargar(): void {
    const id = Number(this.id());
    this.jugador.entrenamiento(id).subscribe({
      next: e => {
        this.entrenamiento.set(e);
        this.jugador.evidencia(id).subscribe(ev => {
          this.evidencia.set(ev);
          this.cargando.set(false);
        });
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  subirEnlace(e: Entrenamiento): void {
    this.enviar(this.jugador.subirEnlace(e.id, this.enlace.trim()), e);
  }

  subirImagen(e: Entrenamiento, evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    if (!archivo) return;
    this.enviar(this.jugador.subirImagen(e.id, archivo), e);
    campo.value = '';
  }

  private enviar(peticion: ReturnType<JugadorService['subirEnlace']>, e: Entrenamiento): void {
    this.subiendo.set(true);
    this.error.set(null);
    this.ok.set(null);
    peticion.pipe(finalize(() => this.subiendo.set(false))).subscribe({
      next: ev => {
        this.evidencia.set(ev);
        this.ok.set('Evidencia enviada. Un entrenador la revisará.');
        this.jugador.entrenamiento(e.id).subscribe(x => this.entrenamiento.set(x));
      },
      error: (err: HttpErrorResponse) => this.error.set(mensajeDeError(err)),
    });
  }
}
