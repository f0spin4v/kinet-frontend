import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, triangle } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Cuentas de los datos de prueba (kinet_bd.sql). Solo se ofrecen fuera de producción. */
const CUENTAS_DE_PRUEBA = [
  { rol: 'Jugador', correo: 'laura@kinet.com', contrasena: 'Kinet2026' },
  { rol: 'Entrenador', correo: 'entrenador@kinet.com', contrasena: 'Kinet2026' },
  { rol: 'Administrador', correo: 'admin@kinet.com', contrasena: 'Admin2026' },
];

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonContent, IonIcon, IonSpinner, ReactiveFormsModule, RouterLink],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  cargando = signal(false);
  error = signal<string | null>(null);
  verContrasena = signal(false);
  cuentasDePrueba = environment.production ? [] : CUENTAS_DE_PRUEBA;

  constructor() {
    addIcons({ mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, triangle });
  }

  invalido(campo: 'correo' | 'contrasena'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  usarCuenta(cuenta: { correo: string; contrasena: string }): void {
    this.form.setValue({ correo: cuenta.correo, contrasena: cuenta.contrasena });
    this.error.set(null);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.auth.iniciarSesion(this.form.getRawValue())
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.auth.rutaInicial(), { replaceUrl: true }),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }
}
