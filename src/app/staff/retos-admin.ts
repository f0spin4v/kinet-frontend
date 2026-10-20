import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { Observable, finalize, forkJoin } from 'rxjs';
import {
  Actividad, AmbitoReto, EstadoReto, MetricaReto, NivelHabilidad, Periodicidad, Reto, Temporada,
} from '../core/models/api.models';
import { JugadorService } from '../core/services/jugador';
import { StaffService } from '../core/services/staff';
import { ETIQUETA_METRICA, aFechaBackend, aInputFecha, claseEstado, etiqueta } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';
import { ListaPaginada } from '../core/utils/lista-paginada';
import { RefrescarComponent } from '../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../shared/components/pie-lista/pie-lista';

/** Retos (administrador): crear en borrador, editar, publicar (ACTIVO) y finalizar. */
@Component({
  selector: 'app-retos-admin',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, ReactiveFormsModule, EncabezadoComponent, RefrescarComponent, PieListaComponent],
  templateUrl: './retos-admin.html',
  styles: `
    .nueva { width: auto; padding: 0 18px; }
    .formulario { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    article .acciones { margin-top: 12px; }
  `,
})
export class RetosAdminPage implements ViewWillEnter {
  private staff = inject(StaffService);
  private jugador = inject(JugadorService);
  private fb = inject(FormBuilder);

  lista = new ListaPaginada<Reto>((p, t) => this.staff.retos(p, t), 12);
  actividades = signal<Actividad[]>([]);
  niveles = signal<NivelHabilidad[]>([]);
  temporadas = signal<Temporada[]>([]);

  formAbierto = signal(false);
  editando = signal<Reto | null>(null);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  readonly metricas: MetricaReto[] = ['MINUTOS', 'SESIONES', 'REPETICIONES'];
  readonly periodicidades: Periodicidad[] = ['UNICA', 'DIARIA', 'SEMANAL', 'TEMPORADA'];
  readonly ambitos: AmbitoReto[] = ['INDIVIDUAL', 'CLAN'];

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    condiciones: ['', Validators.maxLength(300)],
    imagenUrl: ['', Validators.maxLength(300)],
    metrica: ['MINUTOS' as MetricaReto, Validators.required],
    valorMeta: [30, [Validators.required, Validators.min(0.01), Validators.max(100000)]],
    xpRecompensa: [50, [Validators.required, Validators.min(1), Validators.max(5000)]],
    periodicidad: ['UNICA' as Periodicidad, Validators.required],
    ambito: ['INDIVIDUAL' as AmbitoReto, Validators.required],
    idTipoActividad: this.fb.control<number | null>(null),
    idNivelHabilidad: this.fb.control<number | null>(null),
    idTemporada: this.fb.control<number | null>(null),
    fechaInicio: [aInputFecha(new Date()), Validators.required],
    fechaFin: [''],
  });

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  unidad = ETIQUETA_METRICA;

  constructor() {
    addIcons({ addOutline });
  }

  ionViewWillEnter(): void {
    this.lista.recargar();
    forkJoin({
      actividades: this.staff.actividades(), niveles: this.jugador.nivelesHabilidad(), temporadas: this.staff.temporadas(0, 50),
    }).subscribe(r => {
      this.actividades.set(r.actividades.filter(a => a.estado === 'ACTIVA'));
      this.niveles.set(r.niveles);
      this.temporadas.set(r.temporadas.contenido.filter(t => t.estado !== 'CERRADA'));
    });
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.reset({
      nombre: '', descripcion: '', condiciones: '', imagenUrl: '', metrica: 'MINUTOS', valorMeta: 30, xpRecompensa: 50,
      periodicidad: 'UNICA', ambito: 'INDIVIDUAL', idTipoActividad: null, idNivelHabilidad: null, idTemporada: null,
      fechaInicio: aInputFecha(new Date()), fechaFin: '',
    });
    this.formAbierto.set(true);
  }

  editar(r: Reto): void {
    this.editando.set(r);
    this.form.setValue({
      nombre: r.nombre, descripcion: r.descripcion, condiciones: r.condiciones ?? '', imagenUrl: r.imagenUrl ?? '',
      metrica: r.metrica, valorMeta: r.valorMeta, xpRecompensa: r.xpRecompensa, periodicidad: r.periodicidad,
      ambito: r.ambito,
      idTipoActividad: this.actividades().find(a => a.nombre === r.actividad)?.id ?? null,
      idNivelHabilidad: this.niveles().find(n => n.nombre === r.nivelHabilidad)?.id ?? null,
      idTemporada: this.temporadas().find(t => t.nombre === r.temporada)?.id ?? null,
      fechaInicio: r.fechaInicio.slice(0, 16), fechaFin: r.fechaFin?.slice(0, 16) ?? '',
    });
    this.formAbierto.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos obligatorios del reto.');
      return;
    }
    const v = this.form.getRawValue();
    const datos = {
      ...v,
      condiciones: v.condiciones.trim() || null,
      imagenUrl: v.imagenUrl.trim() || null,
      fechaInicio: aFechaBackend(v.fechaInicio)!,
      fechaFin: aFechaBackend(v.fechaFin),
    };
    const e = this.editando();
    this.ejecutar(e ? this.staff.editarReto(e.id, datos) : this.staff.crearReto(datos),
      e ? 'Reto actualizado.' : 'Reto creado en borrador.', () => this.formAbierto.set(false));
  }

  cambiarEstado(r: Reto, estado: EstadoReto): void {
    this.ejecutar(this.staff.cambiarEstadoReto(r.id, estado), `${r.nombre}: ${etiqueta(estado)}.`);
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
