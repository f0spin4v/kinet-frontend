import { Component, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosedOutline, triangle } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Se abre desde el enlace del correo: /restablecer-contrasena?token=... */
@Component({
  selector: 'app-restablecer',
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
          <p class="auth__eyebrow"><span class="auth__dot"></span>Nueva contraseña</p>
          <h1>Restablece tu contraseña</h1>
          <p class="auth__lead">Elige una contraseña nueva. El enlace sirve una sola vez.</p>
        </div>

        @if (listo()) {
          <p class="aviso-ok" role="status">Tu contraseña quedó actualizada. Ya puedes iniciar sesión.</p>
        } @else if (!token()) {
          <p class="alert-error" role="alert">El enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?".</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="enviar()" novalidate class="auth__form">
            <div class="field">
              <label class="field__label" for="nueva">Nueva contraseña</label>
              <div class="field__box" [class.field__box--error]="form.controls.nueva.invalid && form.controls.nueva.touched">
                <ion-icon name="lock-closed-outline" aria-hidden="true"></ion-icon>
                <input id="nueva" type="password" formControlName="nueva" autocomplete="new-password" placeholder="••••••••" />
              </div>
              @if (form.controls.nueva.invalid && form.controls.nueva.touched) {
                <span class="field__error">Mínimo 8 caracteres, con al menos una letra y un número.</span>
              } @else {
                <span class="field__hint">Mínimo 8 caracteres, con al menos una letra y un número.</span>
              }
            </div>

            @if (error()) {
              <p class="alert-error" role="alert">{{ error() }}</p>
            }

            <button type="submit" class="btn-primary" [disabled]="cargando()">
              @if (cargando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Guardar contraseña }
            </button>
          </form>
        }

        <p class="auth__switch"><a routerLink="/login">Ir a iniciar sesión</a></p>
      </div>
    </ion-content>
  `,
})
export class RestablecerPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  /** Llega de la dirección (?token=...) gracias a withComponentInputBinding. */
  token = input<string>();

  form = this.fb.nonNullable.group({
    nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
  });
  cargando = signal(false);
  error = signal<string | null>(null);
  listo = signal(false);

  constructor() {
    addIcons({ lockClosedOutline, triangle });
  }

  enviar(): void {
    const token = this.token();
    if (this.form.invalid || !token) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.restablecerContrasena(token, this.form.getRawValue().nueva)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => this.listo.set(true),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }
}
