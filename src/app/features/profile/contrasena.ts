import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar,
  NavController, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosedOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { mensajeDeError } from '../../core/utils/http-error';

/** Cambiar la contraseña (PUT /usuarios/me/contrasena). Sirve para jugadores y para el equipo. */
@Component({
  selector: 'app-contrasena',
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonIcon, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="rutaVolver" text=""></ion-back-button></ion-buttons>
        <ion-title>Cambiar contraseña</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="pagina pagina--estrecha formulario">
        <div class="field">
          <label class="field__label" for="actual">Contraseña actual</label>
          <div class="field__box">
            <ion-icon name="lock-closed-outline" aria-hidden="true"></ion-icon>
            <input id="actual" type="password" formControlName="contrasenaActual" autocomplete="current-password" />
          </div>
          @if (form.controls.contrasenaActual.touched && form.controls.contrasenaActual.invalid) {
            <span class="field__error">Escribe tu contraseña actual.</span>
          }
        </div>

        <div class="field">
          <label class="field__label" for="nueva">Nueva contraseña</label>
          <div class="field__box" [class.field__box--error]="nuevaInvalida()">
            <ion-icon name="lock-closed-outline" aria-hidden="true"></ion-icon>
            <input id="nueva" type="password" formControlName="nuevaContrasena" autocomplete="new-password" />
          </div>
          @if (nuevaInvalida()) {
            <span class="field__error">Debe tener entre 8 y 72 caracteres, con al menos una letra y un número.</span>
          } @else {
            <span class="field__hint">Mínimo 8 caracteres, con al menos una letra y un número.</span>
          }
        </div>

        @if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }

        <button type="submit" class="btn-primary" [disabled]="guardando()">
          @if (guardando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Guardar contraseña }
        </button>
      </form>
    </ion-content>
  `,
  styles: `.formulario { display: flex; flex-direction: column; gap: 20px; }`,
})
export class ContrasenaPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private jugador = inject(JugadorService);
  private nav = inject(NavController);
  private toast = inject(ToastController);

  readonly rutaVolver = this.auth.esJugador() ? '/tabs/perfil' : '/staff/perfil';

  form = this.fb.nonNullable.group({
    contrasenaActual: ['', Validators.required],
    nuevaContrasena: ['', [
      Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
    ]],
  });

  guardando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    addIcons({ lockClosedOutline });
  }

  nuevaInvalida(): boolean {
    const c = this.form.controls.nuevaContrasena;
    return c.touched && c.invalid;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    const { contrasenaActual, nuevaContrasena } = this.form.getRawValue();

    this.jugador.cambiarContrasena(contrasenaActual, nuevaContrasena)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: async r => {
          const aviso = await this.toast.create({ message: r.mensaje, duration: 2500, position: 'top' });
          await aviso.present();
          this.nav.back();
        },
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }
}
