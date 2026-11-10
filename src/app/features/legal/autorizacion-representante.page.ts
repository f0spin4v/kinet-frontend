import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { triangle } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { SolicitudAutorizacion } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth';
import { fechaLarga } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';
import { PoliticaTextoComponent } from './politica-texto';

const PARENTESCO: Record<string, string> = { MADRE: 'madre', PADRE: 'padre', TUTOR_LEGAL: 'representante legal' };

/**
 * RN-33: el representante legal de un titular de 14 a 17 años abre el enlace del correo
 * (/autorizacion-representante?token=...) y autoriza o no el tratamiento de sus datos. No necesita cuenta.
 */
@Component({
  selector: 'app-autorizacion-representante',
  styleUrls: ['../auth/login/login.page.scss'],
  imports: [IonContent, IonIcon, IonSpinner, FormsModule, RouterLink, PoliticaTextoComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth">
        <header class="auth__brand">
          <ion-icon name="triangle" class="auth__logo" aria-hidden="true"></ion-icon>
          <span class="auth__wordmark">KINET</span>
        </header>

        <div class="auth__intro">
          <p class="auth__eyebrow"><span class="auth__dot"></span>Autorización del representante legal</p>
          <h1>Autorizar una cuenta de menor de edad</h1>
        </div>

        @if (respuesta()) {
          <p class="aviso-ok" role="status">{{ respuesta() }}</p>
        } @else if (cargando()) {
          <ion-spinner name="crescent" aria-label="Cargando"></ion-spinner>
        } @else if (error() && !solicitud()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        } @else if (solicitud(); as s) {
          <div class="auth__form">
            <p class="auth__lead">
              Hola, {{ s.nombreRepresentante }}. <strong>{{ s.nombreMenor }}</strong>
              @if (s.gamertag) { (&#64;{{ s.gamertag }}) }, de {{ s.edad }} años, se registró en Kinet y te indicó como su
              {{ parentesco(s.parentesco) }}.
            </p>
            <p>Kinet es una app que convierte la actividad física en un juego: registra entrenamientos, da puntos de experiencia y permite competir en temporadas. Como es menor de 18 años, la ley colombiana (Ley 1581 de 2012 y Decreto 1377 de 2013, artículo 12) exige tu autorización para tratar sus datos. Su cuenta no se puede usar hasta que respondas.</p>
            <p>Puedes responder hasta el {{ fechaLarga(s.fechaExpiracion) }}. Antes, lee la política de tratamiento de datos:</p>

            <details class="politica">
              <summary>Leer la política de tratamiento de datos</summary>
              <app-politica-texto />
            </details>

            <label class="check">
              <input type="checkbox" [(ngModel)]="confirma" name="confirma" />
              <span>Soy {{ parentesco(s.parentesco) }} de {{ s.nombreMenor }}, tengo su representación legal, leí la política y escuché su opinión.</span>
            </label>

            @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }

            <button type="button" class="btn-primary" [disabled]="!confirma || enviando()" (click)="responder(true)">
              @if (enviando()) { <ion-spinner name="crescent" aria-label="Cargando"></ion-spinner> } @else { Autorizo su cuenta }
            </button>
            <button type="button" class="btn-secundario" [disabled]="enviando()" (click)="responder(false)">No autorizo</button>
          </div>
        }

        <p class="auth__switch"><a routerLink="/politica-datos">Política de tratamiento de datos</a></p>
      </div>
    </ion-content>
  `,
  styles: `
    .auth__form { display: flex; flex-direction: column; gap: 14px; }
    .auth__form p { margin: 0; line-height: 1.5; }
    .politica summary { cursor: pointer; font-weight: 600; }
    .politica { border: 1px solid rgba(127, 127, 127, 0.3); border-radius: 12px; padding: 10px 14px; max-height: 50vh; overflow: auto; }
  `,
})
export class AutorizacionRepresentantePage implements OnInit {
  private auth = inject(AuthService);

  /** ?token=... del enlace del correo. */
  token = input<string>('');

  solicitud = signal<SolicitudAutorizacion | null>(null);
  respuesta = signal<string | null>(null);
  error = signal<string | null>(null);
  cargando = signal(true);
  enviando = signal(false);
  confirma = false;
  fechaLarga = fechaLarga;

  constructor() {
    addIcons({ triangle });
  }

  ngOnInit(): void {
    if (!this.token()) {
      this.cargando.set(false);
      this.error.set('El enlace no es válido. Revisa que lo hayas copiado completo.');
      return;
    }
    this.auth.consultarAutorizacion(this.token())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: s => this.solicitud.set(s),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }

  parentesco(valor: string): string {
    return PARENTESCO[valor] ?? 'representante legal';
  }

  responder(autoriza: boolean): void {
    this.enviando.set(true);
    this.error.set(null);
    this.auth.responderAutorizacion(this.token(), autoriza)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: m => this.respuesta.set(m.mensaje),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }
}
