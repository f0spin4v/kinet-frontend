import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonContent, IonHeader, IonIcon, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { Observable, finalize } from 'rxjs';
import { Temporada } from '../core/models/api.models';
import { StaffService } from '../core/services/staff';
import { claseEstado, etiqueta, fechaLarga } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';
import { ListaPaginada } from '../core/utils/lista-paginada';
import { RefrescarComponent } from '../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../shared/components/pie-lista/pie-lista';

/** Temporadas (administrador): crear, editar mientras están programadas, activar y cerrar. */
@Component({
  selector: 'app-temporadas',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, ReactiveFormsModule, EncabezadoComponent, RefrescarComponent, PieListaComponent],
  template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar class="toolbar-kinet"><app-encabezado></app-encabezado></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="pagina">
        <div class="titulo-pagina">
          <app-refrescar [cargando]="lista.cargando()" (refrescar)="lista.recargar()" />
          <div>
            <p class="eyebrow"><span class="punto"></span>Administración</p>
            <h1>Temporadas</h1>
            <p class="titulo-pagina__lead">Solo una puede estar activa. Al cerrarla se reparten ascensos y descensos.</p>
          </div>
          <button type="button" class="btn-primary nueva" (click)="abrirNueva()"><ion-icon name="add-outline"></ion-icon>&nbsp;Nueva</button>
        </div>

        @if (formAbierto()) {
          <form class="tarjeta formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
            <p class="titulo-seccion">{{ editando() ? 'Editar temporada' : 'Nueva temporada' }}</p>
            <div class="campos campos--2">
              <div class="field"><label class="field__label" for="t1">Nombre</label>
                <div class="field__box"><input id="t1" formControlName="nombre" maxlength="60" /></div></div>
              <div class="field"><label class="field__label" for="t4">% de puntos que se conserva</label>
                <div class="field__box"><input id="t4" type="number" min="0" max="100" formControlName="porcentajeConservado" /></div></div>
              <div class="field"><label class="field__label" for="t2">Inicio</label>
                <div class="field__box"><input id="t2" type="date" formControlName="fechaInicio" /></div></div>
              <div class="field"><label class="field__label" for="t3">Fin</label>
                <div class="field__box"><input id="t3" type="date" formControlName="fechaFin" /></div></div>
            </div>
            <div class="acciones">
              <button type="submit" class="btn-primary" [disabled]="trabajando()">Guardar</button>
              <button type="button" class="btn-secundario" (click)="formAbierto.set(false)">Cancelar</button>
            </div>
          </form>
        }

        @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }
        @if (ok()) { <p class="aviso-ok" role="status">{{ ok() }}</p> }

        <div class="rejilla rejilla--3">
          @for (t of lista.items(); track t.id) {
            <article class="tarjeta">
              <div class="tarjeta__cabecera">
                <h2 class="titulo-tarjeta">{{ t.nombre }}</h2>
                <span class="chip" [class]="claseEstado(t.estado)">{{ etiqueta(t.estado) }}</span>
              </div>
              <p class="texto-suave">{{ fechaLarga(t.fechaInicio) }} – {{ fechaLarga(t.fechaFin) }}</p>
              <p class="texto-tenue">Conserva el {{ t.porcentajeConservado }}% de los puntos al reiniciar.</p>
              <div class="acciones">
                @if (t.estado === 'PROGRAMADA') {
                  <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="editar(t)">Editar</button>
                  <button type="button" class="btn-primary btn-chico" [disabled]="trabajando()" (click)="activar(t)">Activar</button>
                }
                @if (t.estado === 'ACTIVA') {
                  <button type="button" class="btn-peligro btn-chico" [disabled]="trabajando()" (click)="cerrar(t)">Cerrar temporada</button>
                }
              </div>
            </article>
          }
        </div>
        <app-pie-lista [lista]="lista" vacio="No hay temporadas creadas." />
      </div>
    </ion-content>
  `,
  styles: `
    .nueva { width: auto; padding: 0 18px; }
    .formulario { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    article .acciones { margin-top: 12px; }
  `,
})
export class TemporadasPage implements ViewWillEnter {
  private staff = inject(StaffService);
  private alertas = inject(AlertController);
  private fb = inject(FormBuilder);

  lista = new ListaPaginada<Temporada>((p, t) => this.staff.temporadas(p, t), 12);
  formAbierto = signal(false);
  editando = signal<Temporada | null>(null);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    porcentajeConservado: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;

  constructor() {
    addIcons({ addOutline });
  }

  ionViewWillEnter(): void {
    this.lista.recargar();
  }

  abrirNueva(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', fechaInicio: '', fechaFin: '', porcentajeConservado: 50 });
    this.formAbierto.set(true);
  }

  editar(t: Temporada): void {
    this.editando.set(t);
    this.form.setValue({
      nombre: t.nombre, fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, porcentajeConservado: t.porcentajeConservado,
    });
    this.formAbierto.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa nombre, fechas y un porcentaje entre 0 y 100.');
      return;
    }
    const datos = this.form.getRawValue();
    const e = this.editando();
    this.ejecutar(e ? this.staff.editarTemporada(e.id, datos) : this.staff.crearTemporada(datos),
      e ? 'Temporada actualizada.' : 'Temporada creada.', () => this.formAbierto.set(false));
  }

  activar(t: Temporada): void {
    this.ejecutar(this.staff.activarTemporada(t.id), `${t.nombre} está activa.`);
  }

  async cerrar(t: Temporada): Promise<void> {
    const alerta = await this.alertas.create({
      header: `Cerrar ${t.nombre}`,
      message: 'Se calculan las posiciones finales, los ascensos y descensos, y se reinician los puntos. No se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar temporada', role: 'destructive', cssClass: 'alerta-boton-peligro',
          handler: () => { this.ejecutar(this.staff.cerrarTemporada(t.id), `${t.nombre} se cerró.`); } },
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
        this.lista.recargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }
}
