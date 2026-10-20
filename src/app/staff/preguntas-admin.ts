import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import { Observable, finalize } from 'rxjs';
import { NivelHabilidad, PreguntaAdmin } from '../core/models/api.models';
import { JugadorService } from '../core/services/jugador';
import { StaffService } from '../core/services/staff';
import { claseEstado, etiqueta } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';

/** Preguntas de la evaluación de nivel: cada opción vota por un nivel de habilidad con un peso de 1 a 10. */
@Component({
  selector: 'app-preguntas-admin',
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  template: `
    <div class="acciones barra">
      <button type="button" class="btn-primary" (click)="abrirNueva()"><ion-icon name="add-outline"></ion-icon>&nbsp;Nueva pregunta</button>
    </div>

    @if (formAbierto()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <p class="titulo-seccion">{{ editando() ? 'Editar pregunta' : 'Nueva pregunta' }}</p>
        <div class="campos campos--2">
          <div class="field"><label class="field__label" for="p1">Enunciado</label>
            <div class="field__box"><input id="p1" formControlName="enunciado" maxlength="300" /></div></div>
          <div class="field"><label class="field__label" for="p2">Orden</label>
            <div class="field__box"><input id="p2" type="number" min="1" max="99" formControlName="orden" /></div></div>
        </div>

        @for (o of grupos(); track $index; let i = $index) {
          <fieldset class="opcion" [formGroup]="o">
            <legend class="etiqueta">Opción {{ i + 1 }}</legend>
            <div class="campos campos--2">
              <div class="field"><label class="field__label">Título</label>
                <div class="field__box"><input formControlName="titulo" maxlength="100" /></div></div>
              <div class="field"><label class="field__label">Descripción</label>
                <div class="field__box"><input formControlName="descripcion" maxlength="300" /></div></div>
              <div class="field"><label class="field__label">Vota por el nivel</label>
                <div class="field__box"><select formControlName="nivelHabilidad">
                  @for (n of niveles(); track n.id) { <option [value]="n.nombre">{{ etiqueta(n.nombre) }}</option> }
                </select></div></div>
              <div class="field"><label class="field__label">Peso (1 a 10)</label>
                <div class="field__box"><input type="number" min="1" max="10" formControlName="puntaje" /></div></div>
            </div>
            @if (opciones.length > 2) {
              <button type="button" class="btn-chico btn-peligro" (click)="quitarOpcion(i)"><ion-icon name="trash-outline"></ion-icon>&nbsp;Quitar</button>
            }
          </fieldset>
        }
        <button type="button" class="btn-secundario" (click)="agregarOpcion()"><ion-icon name="add-outline"></ion-icon>&nbsp;Agregar opción</button>
        @if (editando()) {
          <p class="texto-tenue">Las opciones solo se pueden cambiar si nadie ha respondido la pregunta.</p>
        }

        <div class="acciones">
          <button type="submit" class="btn-primary" [disabled]="trabajando()">Guardar</button>
          <button type="button" class="btn-secundario" (click)="formAbierto.set(false)">Cancelar</button>
        </div>
      </form>
    }

    @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }
    @if (ok()) { <p class="aviso-ok" role="status">{{ ok() }}</p> }

    @if (cargando()) {
      <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
    } @else {
      <div class="rejilla rejilla--2">
        @for (p of preguntas(); track p.id) {
          <article class="tarjeta">
            <div class="tarjeta__cabecera">
              <h2 class="titulo-tarjeta">{{ p.orden }}. {{ p.enunciado }}</h2>
              <span class="chip" [class]="claseEstado(p.activa ? 'ACTIVO' : 'INACTIVO')">{{ p.activa ? 'Activa' : 'Inactiva' }}</span>
            </div>
            <ul class="lista">
              @for (o of p.opciones; track o.id) {
                <li class="item">
                  <div class="item__texto">
                    <p class="item__titulo">{{ o.titulo }}</p>
                    @if (o.descripcion) { <p class="item__detalle">{{ o.descripcion }}</p> }
                  </div>
                  <span class="chip chip--info">{{ etiqueta(o.nivelHabilidad) }} · {{ o.puntaje }}</span>
                </li>
              }
            </ul>
            <div class="acciones">
              <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="editar(p)">Editar</button>
              <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="alternar(p)">{{ p.activa ? 'Desactivar' : 'Activar' }}</button>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .barra { margin-bottom: 16px; }
    .formulario { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .opcion { border: 1px solid var(--kinet-surface-high); border-radius: var(--kinet-radius-card); padding: 12px; display: flex; flex-direction: column; gap: 12px; margin: 0; }
    legend { padding: 0 6px; }
    article .acciones { margin-top: 12px; }
  `,
})
export class PreguntasAdminComponent {
  private staff = inject(StaffService);
  private jugador = inject(JugadorService);
  private fb = inject(FormBuilder);

  preguntas = signal<PreguntaAdmin[]>([]);
  niveles = signal<NivelHabilidad[]>([]);
  cargando = signal(true);
  formAbierto = signal(false);
  editando = signal<PreguntaAdmin | null>(null);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    enunciado: ['', [Validators.required, Validators.maxLength(300)]],
    orden: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    opciones: this.fb.array([this.nuevaOpcion(), this.nuevaOpcion()]),
  });

  etiqueta = etiqueta;
  claseEstado = claseEstado;

  constructor() {
    addIcons({ addOutline, trashOutline });
    this.jugador.nivelesHabilidad().subscribe(n => this.niveles.set(n));
    this.cargar();
  }

  get opciones(): FormArray {
    return this.form.controls.opciones;
  }

  grupos(): FormGroup[] {
    return this.opciones.controls as FormGroup[];
  }

  private nuevaOpcion(o?: { titulo: string; descripcion: string | null; nivelHabilidad: string; puntaje: number }) {
    return this.fb.nonNullable.group({
      titulo: [o?.titulo ?? '', [Validators.required, Validators.maxLength(100)]],
      descripcion: [o?.descripcion ?? '', Validators.maxLength(300)],
      nivelHabilidad: [o?.nivelHabilidad ?? '', Validators.required],
      puntaje: [o?.puntaje ?? 1, [Validators.required, Validators.min(1), Validators.max(10)]],
    });
  }

  private cargar(): void {
    this.staff.preguntas().subscribe({
      next: p => {
        this.preguntas.set(p);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  abrirNueva(): void {
    this.editando.set(null);
    this.armar(`${this.preguntas().length + 1}`, '', []);
    this.formAbierto.set(true);
  }

  editar(p: PreguntaAdmin): void {
    this.editando.set(p);
    this.armar(`${p.orden}`, p.enunciado, p.opciones);
    this.formAbierto.set(true);
  }

  private armar(orden: string, enunciado: string, ops: { titulo: string; descripcion: string | null; nivelHabilidad: string; puntaje: number }[]): void {
    this.form.controls.enunciado.setValue(enunciado);
    this.form.controls.orden.setValue(Number(orden));
    this.opciones.clear();
    const lista = ops.length ? ops : [undefined, undefined];
    lista.forEach(o => this.opciones.push(this.nuevaOpcion(o)));
  }

  agregarOpcion(): void {
    this.opciones.push(this.nuevaOpcion());
  }

  quitarOpcion(i: number): void {
    this.opciones.removeAt(i);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa el enunciado y, en cada opción, título, nivel y peso.');
      return;
    }
    const v = this.form.getRawValue() as {
      enunciado: string; orden: number;
      opciones: { titulo: string; descripcion: string; nivelHabilidad: string; puntaje: number }[];
    };
    const datos = {
      enunciado: v.enunciado.trim(),
      orden: v.orden,
      opciones: v.opciones.map(o => ({ ...o, titulo: o.titulo.trim(), descripcion: o.descripcion.trim() || null })),
    };
    const e = this.editando();
    this.ejecutar(e ? this.staff.editarPregunta(e.id, datos) : this.staff.crearPregunta(datos),
      e ? 'Pregunta actualizada.' : 'Pregunta creada.', () => this.formAbierto.set(false));
  }

  alternar(p: PreguntaAdmin): void {
    this.ejecutar(this.staff.estadoPregunta(p.id, !p.activa), p.activa ? 'Pregunta desactivada.' : 'Pregunta activada.');
  }

  private ejecutar<T>(peticion: Observable<T>, mensaje: string, despues?: () => void): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.ok.set(null);
    peticion.pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: () => {
        this.ok.set(mensaje);
        despues?.();
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }
}
