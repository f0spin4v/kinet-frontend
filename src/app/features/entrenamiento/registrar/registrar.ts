import { Component, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add, alertCircleOutline, barbellOutline, bodyOutline, checkmark, checkmarkCircleOutline,
  flame, remove, repeatOutline, trophy, walkOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import {
  Intensidad, RegistroEntrenamientoResponse, TipoActividad,
} from '../../../core/models/entrenamiento.models';
import { EntrenamientoService } from '../../../core/services/entrenamiento';
import { ACTIVIDADES, INTENSIDADES, etiquetaActividad, usaRepeticiones } from '../../../core/utils/actividad';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraProgresoComponent } from '../../../shared/components/barra-progreso/barra-progreso';
import { ActivatedRoute } from '@angular/router';

type Estado = 'formulario' | 'resultado';
type Campo = 'tipo' | 'repeticiones' | 'nota';

const MENSAJES: Record<Campo, Record<string, string>> = {
  tipo: { required: 'Elige el tipo de actividad.' },
  repeticiones: {
    min: 'Las repeticiones deben estar entre 1 y 2000.',
    max: 'Las repeticiones deben estar entre 1 y 2000.',
  },
  nota: { maxlength: 'La nota no puede tener más de 300 caracteres.' },
};

@Component({
  selector: 'app-registrar',
  templateUrl: './registrar.html',
  styleUrls: ['./registrar.scss'],
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonContent, IonIcon, IonSpinner, BarraProgresoComponent,
  ],
})
export class RegistrarPage {
  private fb = inject(FormBuilder);
  private entrenamientos = inject(EntrenamientoService);
  private nav = inject(NavController);
  private contenido = viewChild(IonContent);
  private ruta = inject(ActivatedRoute);

  readonly actividades = ACTIVIDADES;
  readonly intensidades = INTENSIDADES;
  readonly atajos = [30, 45, 60, 90];
  readonly MIN = 5;
  readonly MAX = 300;
  readonly PASO = 5;
  readonly usaRepeticiones = usaRepeticiones;
  readonly etiqueta = etiquetaActividad;

  form = this.fb.group({
    tipo: this.fb.control<TipoActividad | null>(null, Validators.required),
    duracionMinutos: this.fb.nonNullable.control(45),
    intensidad: this.fb.nonNullable.control<Intensidad>('MEDIA'),
    repeticiones: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(2000)]),
    nota: this.fb.nonNullable.control('', Validators.maxLength(300)),
  });

  estado = signal<Estado>('formulario');
  enviando = signal(false);
  error = signal<string | null>(null);
  resultado = signal<RegistroEntrenamientoResponse | null>(null);

  private formato = new Intl.NumberFormat('es-CO');

  constructor() {
    addIcons({
      barbellOutline, bodyOutline, walkOutline, remove, add, repeatOutline,
      checkmarkCircleOutline, checkmark, flame, trophy, alertCircleOutline,
    });
    const tipo = this.ruta.snapshot.queryParamMap.get('tipo');
    const valida = ACTIVIDADES.find(a => a.valor === tipo);
    if (valida) this.elegirTipo(valida.valor);
  }


  // ----- Interacción del formulario -----
  elegirTipo(tipo: TipoActividad): void {
    const c = this.form.controls;
    c.tipo.setValue(tipo);
    if (!usaRepeticiones(tipo)) c.repeticiones.reset(null);
  }

  cambiarDuracion(delta: number): void {
    const c = this.form.controls.duracionMinutos;
    c.setValue(Math.min(this.MAX, Math.max(this.MIN, c.value + delta)));
  }

  elegirDuracion(minutos: number): void {
    this.form.controls.duracionMinutos.setValue(minutos);
  }

  elegirIntensidad(intensidad: Intensidad): void {
    this.form.controls.intensidad.setValue(intensidad);
  }

  descripcionIntensidad(): string {
    return INTENSIDADES.find(i => i.valor === this.form.controls.intensidad.value)?.descripcion ?? '';
  }

  mensaje(campo: Campo): string | null {
    const control = this.form.controls[campo];
    if (!control.invalid || !control.touched || !control.errors) return null;
    return MENSAJES[campo][Object.keys(control.errors)[0]] ?? null;
  }

  // ----- Envío -----
  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);

    this.entrenamientos.registrar({
      tipo: v.tipo!,
      duracionMinutos: v.duracionMinutos,
      intensidad: v.intensidad,
      repeticiones: usaRepeticiones(v.tipo) ? v.repeticiones : null,
      nota: v.nota.trim() || null,
    })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: r => {
          this.resultado.set(r);
          this.mostrar('resultado');
        },
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }

  // ----- Acciones del resultado -----
  corregir(): void {
    this.mostrar('formulario');
  }

  registrarOtra(): void {
    this.form.reset({ tipo: null, duracionMinutos: 45, intensidad: 'MEDIA', repeticiones: null, nota: '' });
    this.resultado.set(null);
    this.mostrar('formulario');
  }

  volverAlInicio(): void {
    this.nav.navigateBack('/tabs/inicio');
  }

  numero(valor: number): string {
    return this.formato.format(valor);
  }

  private mostrar(estado: Estado): void {
    this.estado.set(estado);
    this.contenido()?.scrollToTop(300);
  }
}
