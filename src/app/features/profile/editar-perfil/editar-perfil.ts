import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner,
  IonTitle, IonToolbar, NavController, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { atOutline, calendarOutline, footballOutline, locationOutline, personOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { UsuarioService } from '../../../core/services/usuario';
import { mensajeDeError } from '../../../core/utils/http-error';

type Campo = 'nombre' | 'nickname' | 'fechaNacimiento' | 'ciudad' | 'deporteFavorito';

/** Fecha de hoy en formato AAAA-MM-DD, en la zona horaria del usuario. */
function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Igual que @Past en el backend: la fecha debe ser anterior a hoy. */
function anteriorAHoy(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return control.value >= hoy() ? { noPasada: true } : null;
}

const LONGITUD_NICKNAME = 'El nickname debe tener entre 3 y 30 caracteres.';

const MENSAJES: Record<Campo, Record<string, string>> = {
  nombre: {
    required: 'Escribe tu nombre.',
    maxlength: 'El nombre no puede tener más de 100 caracteres.',
  },
  nickname: {
    required: 'Elige un nickname.',
    minlength: LONGITUD_NICKNAME,
    maxlength: LONGITUD_NICKNAME,
    pattern: 'El nickname solo puede tener letras, números y guion bajo.',
  },
  fechaNacimiento: {
    noPasada: 'La fecha de nacimiento debe ser anterior a hoy.',
  },
  ciudad: {
    maxlength: 'La ciudad no puede tener más de 80 caracteres.',
  },
  deporteFavorito: {
    maxlength: 'El deporte no puede tener más de 50 caracteres.',
  },
};

@Component({
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.html',
  styleUrls: ['./editar-perfil.scss'],
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonTitle, IonContent, IonIcon, IonSpinner,
  ],
})
export class EditarPerfilPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private usuarios = inject(UsuarioService);
  private nav = inject(NavController);
  private toast = inject(ToastController);

  readonly maxFecha = hoy();

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    nickname: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
      Validators.pattern(/^[A-Za-z0-9_]+$/),
    ]],
    fechaNacimiento: ['', anteriorAHoy],
    ciudad: ['', Validators.maxLength(80)],
    deporteFavorito: ['', Validators.maxLength(50)],
  });

  guardando = signal(false);
  errorServidor = signal<string | null>(null);

  constructor() {
    addIcons({ personOutline, atOutline, calendarOutline, locationOutline, footballOutline });

    const u = this.auth.usuario();
    if (u) {
      this.form.setValue({
        nombre: u.nombre,
        nickname: u.nickname ?? '',
        fechaNacimiento: u.fechaNacimiento ?? '',
        ciudad: u.ciudad ?? '',
        deporteFavorito: u.deporteFavorito ?? '',
      });
    }
  }

  mensaje(campo: Campo): string | null {
    const control = this.form.controls[campo];
    if (!control.invalid || !control.touched || !control.errors) return null;
    const primerError = Object.keys(control.errors)[0];
    return MENSAJES[campo][primerError] ?? null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.errorServidor.set(null);

    this.usuarios.actualizarPerfil({
      nombre: v.nombre.trim(),
      nickname: v.nickname.trim(),
      fechaNacimiento: v.fechaNacimiento || null,
      ciudad: v.ciudad.trim() || null,
      deporteFavorito: v.deporteFavorito.trim() || null,
    })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: async () => {
          const aviso = await this.toast.create({
            message: 'Perfil actualizado',
            duration: 2000,
            position: 'top',
          });
          await aviso.present();
          this.nav.back();
        },
        error: (e: HttpErrorResponse) => this.errorServidor.set(mensajeDeError(e)),
      });
  }
}
