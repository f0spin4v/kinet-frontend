import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner,
  IonTitle, IonToolbar, NavController, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { atOutline, calendarOutline, imageOutline, personOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { JugadorService } from '../../../core/services/jugador';
import { mensajeDeError } from '../../../core/utils/http-error';

type Campo = 'nombres' | 'apellidos' | 'gamertag' | 'avatarUrl' | 'fechaNacimiento';

/** Fecha de hoy en formato AAAA-MM-DD, en la zona horaria del usuario. */
function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Igual que @Past en el backend: la fecha debe ser anterior a hoy. */
function anteriorAHoy(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return control.value >= hoy() ? { noPasada: true } : null;
}

const LONGITUD_GAMERTAG = 'El gamertag debe tener entre 3 y 30 caracteres.';

/** Mismos textos que EditarPerfilDTO en el backend. */
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
  avatarUrl: {
    pattern: 'La imagen debe ser una dirección que empiece por http o https.',
    maxlength: 'La dirección de la imagen es demasiado larga.',
  },
  fechaNacimiento: {
    noPasada: 'La fecha de nacimiento debe ser anterior a hoy.',
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
  private jugador = inject(JugadorService);
  private nav = inject(NavController);
  private toast = inject(ToastController);

  readonly maxFecha = hoy();
  readonly rutaVolver = this.auth.esJugador() ? '/tabs/perfil' : '/staff/perfil';

  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(80)]],
    gamertag: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
      Validators.pattern(/^[A-Za-z0-9_]+$/),
    ]],
    avatarUrl: ['', [Validators.maxLength(300), Validators.pattern(/^(https?:\/\/.+)?$/)]],
    fechaNacimiento: ['', anteriorAHoy],
  });

  guardando = signal(false);
  errorServidor = signal<string | null>(null);

  constructor() {
    addIcons({ personOutline, atOutline, calendarOutline, imageOutline });

    const u = this.auth.usuario();
    if (u) {
      this.form.setValue({
        nombres: u.nombres,
        apellidos: u.apellidos,
        gamertag: u.gamertag ?? '',
        avatarUrl: u.avatarUrl ?? '',
        fechaNacimiento: u.fechaNacimiento ?? '',
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

    this.jugador.editarPerfil({
      nombres: v.nombres.trim(),
      apellidos: v.apellidos.trim(),
      gamertag: v.gamertag.trim(),
      avatarUrl: v.avatarUrl.trim() || null,
      fechaNacimiento: v.fechaNacimiento || null,
    })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: async () => {
          const aviso = await this.toast.create({ message: 'Perfil actualizado', duration: 2000, position: 'top' });
          await aviso.present();
          this.nav.back();
        },
        error: (e: HttpErrorResponse) => this.errorServidor.set(mensajeDeError(e)),
      });
  }
}
