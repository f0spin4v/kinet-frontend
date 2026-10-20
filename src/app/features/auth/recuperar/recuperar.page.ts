import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, triangle } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Pide el enlace de recuperación. El backend responde igual exista o no la cuenta. */
@Component({
  selector: 'app-recuperar',
  styleUrls: ['../login/login.page.scss'],
  imports: [IonContent, IonIcon, IonSpinner, ReactiveFormsModule, RouterLink],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth">
        <header class="auth__brand">
          <ion-icon name="triangle" class="auth__logo" aria-hidden="true"></ion-icon>
          <span class="auth__wordmark">KINET</span>
        </header>

        <div class="auth__intro">
          <p class="auth__eyebrow"><span class="auth__dot"></span>Recuperar acceso</p>
          <h1>¿Olvidaste tu contraseña?</h1>
          <p class="auth__lead">Escribe tu correo y te enviamos un enlace para crear una nueva.</p>
        </div>

        @if (mensaje()) {
          <p class="aviso-ok" role="status">{{ mensaje() }}</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="enviar()" novalidate class="auth__form">
            <div class="field">
              <label class="field__label" for="correo">Correo</label>
              <div class="field__box" [class.field__box--error]="form.controls.correo.invalid && form.controls.correo.touched">
                <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
                <input id="correo" type="email" formControlName="correo" autocomplete="email"
                       inputmode="email" placeholder="tu@correo.com" />
              </div>
              @if (form.controls.correo.invalid && form.controls.correo.touched) {
                <span class="field__error">Escribe un correo válido.</span>
              }
            </div>

            @if (error()) {
              <p class="alert-error" role="alert">{{ error() }}</p>
            }

            <button type="submit" class="btn-primary" [disabled]="cargando()">
              @if (cargando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Enviar enlace }
            </button>
          </form>
        }

        <p class="auth__switch"><a routerLink="/login">Volver a iniciar sesión</a></p>
      </div>
    </ion-content>
  `,
})
export class RecuperarPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.nonNullable.group({ correo: ['', [Validators.required, Validators.email]] });
  cargando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  constructor() {
    addIcons({ mailOutline, triangle });
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.recuperarContrasena(this.form.getRawValue().correo)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: r => this.mensaje.set(r.mensaje),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }
}
