import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  atOutline, calendarOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, personOutline, triangle,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { mensajeDeError } from '../../../core/utils/http-error';

type Campo = 'nombres' | 'apellidos' | 'gamertag' | 'correo' | 'contrasena' | 'fechaNacimiento' | 'aceptaPolitica';

const LONGITUD_CONTRASENA = 'La contraseña debe tener entre 8 y 72 caracteres.';
const LONGITUD_GAMERTAG = 'El gamertag debe tener entre 3 y 30 caracteres.';

/** Mismos textos que las validaciones de RegistroDTO en el backend. */
const MENSAJES: Record<Campo, Record<string, string>> = {
  nombres: {
    required: 'Escribe tus nombres.',
    maxlength: 'Los nombres no pueden tener más de 80 caracteres.',
  },
  apellidos: {
    required: 'Escribe tus apellidos.',
    maxlength: 'Los apellidos no pueden tener más de 80 caracteres.',
  },
  gamertag: {
    required: 'Elige un gamertag.',
    minlength: LONGITUD_GAMERTAG,
    maxlength: LONGITUD_GAMERTAG,
    pattern: 'El gamertag solo puede tener letras, números y guion bajo.',
  },
  correo: {
    required: 'Escribe tu correo.',
    email: 'El correo no tiene un formato válido.',
    maxlength: 'El correo no puede tener más de 120 caracteres.',
  },
  contrasena: {
    required: 'Escribe una contraseña.',
    minlength: LONGITUD_CONTRASENA,
    maxlength: LONGITUD_CONTRASENA,
    pattern: 'La contraseña debe incluir al menos una letra y un número.',
  },
  fechaNacimiento: {
    futura: 'La fecha de nacimiento debe estar en el pasado.',
  },
  aceptaPolitica: {
    required: 'Debes aceptar la política de tratamiento de datos.',
  },
};

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [IonContent, IonIcon, IonSpinner, ReactiveFormsModule, RouterLink],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  hoy = new Date().toLocaleDateString('en-CA');

  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(80)]],
    gamertag: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
      Validators.pattern(/^[A-Za-z0-9_]+$/),
    ]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    contrasena: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(72),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
    ]],
    fechaNacimiento: ['', [(c: { value: string }) => (c.value && c.value >= this.hoy ? { futura: true } : null)]],
    aceptaPolitica: [false, Validators.requiredTrue],
  });

  cargando = signal(false);
  errorServidor = signal<string | null>(null);
  verContrasena = signal(false);

  constructor() {
    addIcons({
      personOutline, atOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, calendarOutline, triangle,
    });
  }

  /** Devuelve el mensaje del primer error del campo, o null si no hay que mostrar nada. */
  mensaje(campo: Campo): string | null {
    const control = this.form.controls[campo];
    if (!control.invalid || !control.touched || !control.errors) return null;
    const primerError = Object.keys(control.errors)[0];
    return MENSAJES[campo][primerError] ?? null;
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorServidor.set(null);

    const { fechaNacimiento, ...resto } = this.form.getRawValue();
    this.auth.registrar({ ...resto, fechaNacimiento: fechaNacimiento || null })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.auth.rutaInicial(), { replaceUrl: true }),
        error: (e: HttpErrorResponse) => this.errorServidor.set(mensajeDeError(e)),
      });
  }
}
