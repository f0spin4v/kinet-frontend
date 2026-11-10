import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  atOutline, calendarOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, peopleOutline, personOutline, triangle,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { mensajeDeError } from '../../../core/utils/http-error';
import { Parentesco, RegistroRequest } from '../../../core/models/api.models';

type Campo = 'nombres' | 'apellidos' | 'gamertag' | 'correo' | 'contrasena' | 'fechaNacimiento' | 'aceptaPolitica'
  | 'nombreRepresentante' | 'correoRepresentante' | 'parentesco';

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
    required: 'Escribe tu fecha de nacimiento.',
    futura: 'La fecha de nacimiento debe estar en el pasado.',
    menor: 'Kinet es para mayores de 14 años.',
  },
  aceptaPolitica: {
    required: 'Debes aceptar la política de tratamiento de datos.',
  },
  nombreRepresentante: {
    required: 'Escribe el nombre de tu representante legal.',
    maxlength: 'El nombre del representante no puede tener más de 160 caracteres.',
  },
  correoRepresentante: {
    required: 'Escribe el correo de tu representante legal.',
    email: 'El correo del representante no tiene un formato válido.',
    maxlength: 'El correo del representante no puede tener más de 120 caracteres.',
    mismo: 'El correo de tu representante legal debe ser distinto al tuyo.',
  },
  parentesco: {
    required: 'Elige el parentesco.',
  },
};

/** Fecha (AAAA-MM-DD) de hace n años. */
function haceAnios(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toLocaleDateString('en-CA');
}

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
  /** RN-33: desde 14 años; de 14 a 17 se necesita la autorización del representante legal (mismo límite que el backend). */
  hace14 = haceAnios(14);
  hace18 = haceAnios(18);

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
    fechaNacimiento: ['', [
      Validators.required,
      (c: { value: string }) => (c.value && c.value >= this.hoy ? { futura: true } : null),
      (c: { value: string }) => (c.value && c.value < this.hoy && c.value > this.hace14 ? { menor: true } : null),
    ]],
    aceptaPolitica: [false, Validators.requiredTrue],
    nombreRepresentante: ['', [Validators.maxLength(160)]],
    correoRepresentante: ['', [Validators.email, Validators.maxLength(120)]],
    parentesco: ['' as '' | Parentesco],
  });

  /** De 14 a 17 años: se piden los datos del representante legal. */
  esMenor = signal(false);
  /** Registro de un menor recibido: espera la autorización (no hay sesión). */
  pendiente = signal<{ correoRepresentante: string; correo: string } | null>(null);
  reenviado = signal<string | null>(null);
  readonly parentescos: { valor: Parentesco; texto: string }[] = [
    { valor: 'MADRE', texto: 'Madre' }, { valor: 'PADRE', texto: 'Padre' }, { valor: 'TUTOR_LEGAL', texto: 'Tutor o representante legal' },
  ];

  cargando = signal(false);
  errorServidor = signal<string | null>(null);
  verContrasena = signal(false);

  constructor() {
    addIcons({
      personOutline, atOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, calendarOutline, triangle,
      peopleOutline,
    });
    const c = this.form.controls;
    c.fechaNacimiento.valueChanges.pipe(takeUntilDestroyed()).subscribe(f => this.actualizarRepresentante(f));
    c.correo.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => c.correoRepresentante.updateValueAndValidity());
  }

  private actualizarRepresentante(fecha: string): void {
    const menor = !!fecha && fecha <= this.hace14 && fecha > this.hace18;
    this.esMenor.set(menor);
    const c = this.form.controls;
    const distinto = (x: { value: string }) =>
      x.value && x.value.trim().toLowerCase() === c.correo.value.trim().toLowerCase() ? { mismo: true } : null;
    c.nombreRepresentante.setValidators(menor ? [Validators.required, Validators.maxLength(160)] : [Validators.maxLength(160)]);
    c.correoRepresentante.setValidators(menor
      ? [Validators.required, Validators.email, Validators.maxLength(120), distinto]
      : [Validators.email, Validators.maxLength(120)]);
    c.parentesco.setValidators(menor ? [Validators.required] : []);
    for (const x of [c.nombreRepresentante, c.correoRepresentante, c.parentesco]) x.updateValueAndValidity({ emitEvent: false });
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

    const v = this.form.getRawValue();
    const datos: RegistroRequest = {
      nombres: v.nombres, apellidos: v.apellidos, gamertag: v.gamertag, correo: v.correo, contrasena: v.contrasena,
      fechaNacimiento: v.fechaNacimiento, aceptaPolitica: v.aceptaPolitica,
      ...(this.esMenor() ? {
        nombreRepresentante: v.nombreRepresentante.trim(),
        correoRepresentante: v.correoRepresentante.trim(),
        parentesco: v.parentesco as Parentesco,
      } : {}),
    };
    this.auth.registrar(datos)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: r => {
          if (!r.token) {
            this.pendiente.set({ correoRepresentante: datos.correoRepresentante ?? '', correo: datos.correo });
            return;
          }
          this.router.navigateByUrl(this.auth.rutaInicial(), { replaceUrl: true });
        },
        error: (e: HttpErrorResponse) => this.errorServidor.set(mensajeDeError(e)),
      });
  }

  reenviar(): void {
    const p = this.pendiente();
    if (!p) return;
    this.auth.reenviarAutorizacion(p.correo).subscribe({
      next: () => this.reenviado.set('Le enviamos de nuevo el correo a tu representante.'),
      error: (e: HttpErrorResponse) => this.errorServidor.set(mensajeDeError(e)),
    });
  }
}
