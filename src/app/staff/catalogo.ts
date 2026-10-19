import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { Observable, finalize, forkJoin } from 'rxjs';
import { Actividad, Intensidad, NivelProgresion } from '../core/models/api.models';
import { JugadorService } from '../core/services/jugador';
import { StaffService } from '../core/services/staff';
import { claseEstado, etiqueta, fechaLarga, numero } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';
import { RefrescarComponent } from '../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../shared/components/encabezado/encabezado';
import { LogrosAdminComponent } from './logros-admin';
import { PreguntasAdminComponent } from './preguntas-admin';

type Pestana = 'actividades' | 'niveles' | 'logros' | 'cuestionario';

/** Catálogos (administrador): actividades y reglas de XP, niveles de progresión, logros y cuestionario de nivel. */
@Component({
  selector: 'app-catalogo',
  imports: [
    IonContent, IonHeader, IonToolbar, IonIcon, IonSpinner, FormsModule, ReactiveFormsModule, EncabezadoComponent, RefrescarComponent,
    LogrosAdminComponent, PreguntasAdminComponent,
  ],
  templateUrl: './catalogo.html',
  styles: `
    .nueva { width: auto; padding: 0 18px; }
    .formulario { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .inline { display: flex; gap: 8px; align-items: end; flex-wrap: wrap; }
    .inline .field { flex: 1 1 180px; }
    .xp-input { max-width: 140px; }
    .regla-fila { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; padding: 4px 0; }
  `,
})
export class CatalogoPage implements ViewWillEnter {
  private staff = inject(StaffService);
  private jugador = inject(JugadorService);
  private alertas = inject(AlertController);
  private fb = inject(FormBuilder);

  pestana = signal<Pestana>('actividades');
  actividades = signal<Actividad[]>([]);
  niveles = signal<NivelProgresion[]>([]);
  cargando = signal(true);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  reglaPara = signal<Actividad | null>(null);
  xpEditado: Record<number, number> = {};

  readonly intensidades: Intensidad[] = ['BAJA', 'MEDIA', 'ALTA'];
  nuevaActividad = this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(40), Validators.pattern(/^[A-Za-z_ÁÉÍÓÚÑáéíóúñ ]+$/)]);
  regla = this.fb.nonNullable.group({
    intensidad: ['MEDIA' as Intensidad, Validators.required],
    xpPorMinuto: [3, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    duracionMinimaMin: [10, [Validators.required, Validators.min(1), Validators.max(240)]],
    vigenteDesde: [new Date().toLocaleDateString('en-CA'), Validators.required],
  });

  maxXp = computed(() => Math.max(1, ...this.niveles().map(n => n.xpRequerido)));
  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;
  numero = numero;

  constructor() {
    addIcons({ addOutline });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cambiar(p: Pestana): void {
    this.pestana.set(p);
    this.ok.set(null);
    this.error.set(null);
  }

  cargar(): void {
    forkJoin({ actividades: this.staff.actividades(), niveles: this.jugador.nivelesProgresion() }).subscribe({
      next: r => {
        this.actividades.set(r.actividades);
        this.niveles.set(r.niveles);
        this.xpEditado = Object.fromEntries(r.niveles.map(n => [n.numeroNivel, n.xpRequerido]));
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  // ---------- actividades ----------
  crearActividad(): void {
    if (this.nuevaActividad.invalid) {
      this.error.set('El nombre solo puede tener letras, espacios y guion bajo (máximo 40).');
      return;
    }
    this.ejecutar(this.staff.crearActividad(this.nuevaActividad.value.trim()), 'Actividad creada.', () => this.nuevaActividad.reset(''));
  }

  async renombrar(a: Actividad): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Renombrar actividad',
      inputs: [{ name: 'nombre', type: 'text', value: a.nombre, attributes: { maxlength: 40 } }],
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Guardar', role: 'confirm', handler: (d: { nombre: string }) => !!d.nombre?.trim() }],
    });
    await alerta.present();
    const { role, data } = await alerta.onDidDismiss();
    if (role === 'confirm') {
      this.ejecutar(this.staff.editarActividad(a.id, (data.values.nombre as string).trim()), 'Actividad renombrada.');
    }
  }

  alternarActividad(a: Actividad): void {
    const estado = a.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    this.ejecutar(this.staff.estadoActividad(a.id, estado), `${etiqueta(a.nombre)}: ${etiqueta(estado)}.`);
  }

  abrirRegla(a: Actividad): void {
    this.reglaPara.set(this.reglaPara()?.id === a.id ? null : a);
  }

  guardarRegla(): void {
    const a = this.reglaPara();
    if (!a || this.regla.invalid) {
      this.regla.markAllAsTouched();
      this.error.set('Revisa la regla: XP por minuto entre 0.01 y 100, y duración mínima entre 1 y 240.');
      return;
    }
    this.ejecutar(this.staff.crearRegla({ idTipoActividad: a.id, ...this.regla.getRawValue() }),
      'Regla creada; la anterior se cerró el día previo.', () => this.reglaPara.set(null));
  }

  // ---------- niveles ----------
  guardarNivel(n: NivelProgresion): void {
    this.ejecutar(this.staff.editarNivelProgresion(n.numeroNivel, Number(this.xpEditado[n.numeroNivel])),
      `Nivel ${n.numeroNivel} actualizado.`);
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
