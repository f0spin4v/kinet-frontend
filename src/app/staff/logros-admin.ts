import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { Observable, finalize } from 'rxjs';
import { Logro } from '../core/models/api.models';
import { StaffService } from '../core/services/staff';
import { mensajeDeError } from '../core/utils/http-error';

const METRICAS = ['ENTRENAMIENTOS', 'MINUTOS', 'RACHA', 'XP', 'NIVEL', 'RETOS', 'VICTORIAS', 'CLAN'];

/** Gestión de logros: el criterio tiene la forma METRICA>=VALOR (por ejemplo RACHA>=7). */
@Component({
  selector: 'app-logros-admin',
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  template: `
    <div class="acciones barra">
      <button type="button" class="btn-primary" (click)="abrirNuevo()"><ion-icon name="add-outline"></ion-icon>&nbsp;Nuevo logro</button>
    </div>

    @if (formAbierto()) {
      <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <p class="titulo-seccion">{{ editando() ? 'Editar logro' : 'Nuevo logro' }}</p>
        <div class="campos campos--2">
          <div class="field"><label class="field__label" for="l1">Nombre</label>
            <div class="field__box"><input id="l1" formControlName="nombre" maxlength="80" /></div></div>
          <div class="field"><label class="field__label" for="l2">XP de bonificación</label>
            <div class="field__box"><input id="l2" type="number" min="0" max="5000" formControlName="xpBonus" /></div></div>
          <div class="field"><label class="field__label" for="l3">Métrica</label>
            <div class="field__box"><select id="l3" formControlName="metrica">
              @for (m of metricas; track m) { <option [value]="m">{{ m }}</option> }
            </select></div></div>
          <div class="field"><label class="field__label" for="l4">Valor (≥)</label>
            <div class="field__box"><input id="l4" type="number" min="1" max="999999999" formControlName="valor" /></div></div>
        </div>
        <div class="field"><label class="field__label" for="l5">Descripción</label>
          <div class="field__box field__box--area"><textarea id="l5" rows="2" maxlength="300" formControlName="descripcion"></textarea></div></div>
        <div class="field"><label class="field__label" for="l6">Ícono (enlace, opcional)</label>
          <div class="field__box"><input id="l6" type="url" formControlName="iconoUrl" maxlength="300" /></div></div>
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
      <div class="rejilla rejilla--3">
        @for (l of logros(); track l.id) {
          <article class="tarjeta">
            <div class="tarjeta__cabecera">
              <h2 class="titulo-tarjeta">{{ l.nombre }}</h2>
              <span class="chip chip--info">+{{ l.xpBonus }} XP</span>
            </div>
            <p class="texto-suave">{{ l.descripcion }}</p>
            <p class="texto-tenue">Criterio: {{ l.criterio }}</p>
            <div class="acciones">
              <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="editar(l)">Editar</button>
              <button type="button" class="btn-chico btn-peligro" [disabled]="trabajando()" (click)="confirmarBorrar(l)">Borrar</button>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .barra { margin-bottom: 16px; }
    .formulario { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    article .acciones { margin-top: 12px; }
  `,
})
export class LogrosAdminComponent {
  private staff = inject(StaffService);
  private alertas = inject(AlertController);
  private fb = inject(FormBuilder);

  logros = signal<Logro[]>([]);
  cargando = signal(true);
  formAbierto = signal(false);
  editando = signal<Logro | null>(null);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  readonly metricas = METRICAS;

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
    metrica: ['ENTRENAMIENTOS'],
    valor: [1, [Validators.required, Validators.min(1), Validators.max(999999999)]],
    xpBonus: [50, [Validators.required, Validators.min(0), Validators.max(5000)]],
    iconoUrl: ['', Validators.maxLength(300)],
  });

  constructor() {
    addIcons({ addOutline });
    this.cargar();
  }

  private cargar(): void {
    this.staff.logros().subscribe({
      next: l => {
        this.logros.set(l);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', descripcion: '', metrica: 'ENTRENAMIENTOS', valor: 1, xpBonus: 50, iconoUrl: '' });
    this.formAbierto.set(true);
  }

  editar(l: Logro): void {
    const [metrica, valor] = l.criterio.split('>=');
    this.editando.set(l);
    this.form.setValue({
      nombre: l.nombre, descripcion: l.descripcion, metrica, valor: Number(valor), xpBonus: l.xpBonus, iconoUrl: l.iconoUrl ?? '',
    });
    this.formAbierto.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos del logro.');
      return;
    }
    const v = this.form.getRawValue();
    const datos = {
      nombre: v.nombre.trim(), descripcion: v.descripcion.trim(), criterio: `${v.metrica}>=${v.valor}`,
      xpBonus: v.xpBonus, iconoUrl: v.iconoUrl.trim() || null,
    };
    const e = this.editando();
    this.ejecutar(e ? this.staff.editarLogro(e.id, datos) : this.staff.crearLogro(datos),
      e ? 'Logro actualizado.' : 'Logro creado.', () => this.formAbierto.set(false));
  }

  async confirmarBorrar(l: Logro): Promise<void> {
    const alerta = await this.alertas.create({
      header: `Borrar "${l.nombre}"`,
      message: 'Solo se puede borrar un logro que nadie ha obtenido.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', role: 'destructive', cssClass: 'alerta-boton-peligro',
          handler: () => { this.ejecutar(this.staff.eliminarLogro(l.id), 'Logro borrado.'); } },
      ],
    });
    await alerta.present();
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
