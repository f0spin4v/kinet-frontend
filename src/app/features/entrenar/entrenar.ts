import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AlertController, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, ToastController, ViewWillEnter, ViewWillLeave,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barbellOutline, bicycleOutline, bodyOutline, flashOutline, playOutline, stopOutline, walkOutline, waterOutline,
} from 'ionicons/icons';
import { finalize, forkJoin } from 'rxjs';
import { Actividad, Entrenamiento, Intensidad, ResultadoEntrenamiento } from '../../core/models/api.models';
import { CronometroService } from '../../core/services/cronometro';
import { JugadorService } from '../../core/services/jugador';
import { fechaCorta, claseEstado, duracion, etiqueta, iconoActividad } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';
import { ListaPaginada } from '../../core/utils/lista-paginada';
import { BarraProgresoComponent } from '../../shared/components/barra-progreso/barra-progreso';
import { RefrescarComponent } from '../../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../../shared/components/pie-lista/pie-lista';

/** Qué datos opcionales tiene sentido pedir según la actividad. La distancia se envía siempre en km. */
interface CamposActividad {
  distancia: { unidad: 'km' | 'm'; etiqueta: string } | null;
  calorias: boolean;
  /** Series, repeticiones por serie y peso (fuerza y calistenia). */
  series: boolean;
  pesoCorporal: boolean;
  notas: string;
}

const CAMPOS_POR_DEFECTO: CamposActividad = { distancia: null, calorias: true, series: false, pesoCorporal: false, notas: 'Cómo te sentiste, qué hiciste…' };

const CAMPOS_ACTIVIDAD: Record<string, CamposActividad> = {
  RUNNING: { distancia: { unidad: 'km', etiqueta: 'Distancia recorrida (km)' }, calorias: true, series: false, pesoCorporal: false, notas: 'Ruta, ritmo, clima…' },
  CICLISMO: { distancia: { unidad: 'km', etiqueta: 'Distancia recorrida (km)' }, calorias: true, series: false, pesoCorporal: false, notas: 'Ruta, desnivel, bicicleta…' },
  NATACION: { distancia: { unidad: 'm', etiqueta: 'Distancia nadada (metros)' }, calorias: true, series: false, pesoCorporal: false, notas: 'Estilo, series, piscina o aguas abiertas…' },
  FUERZA: { distancia: null, calorias: true, series: true, pesoCorporal: false, notas: 'Ejercicios y observaciones…' },
  CALISTENIA: { distancia: null, calorias: true, series: true, pesoCorporal: true, notas: 'Ejercicios y observaciones…' },
  OTRO: { distancia: null, calorias: true, series: false, pesoCorporal: false, notas: 'Describe la actividad…' },
};

const DURACION_MAXIMA_MIN = 240;
const LIMITE_SIN_ENLACE_MIN = 180;

/**
 * Entrenar con cronómetro en el servidor: elegir actividad → entrenar → finalizar (intensidad y datos opcionales).
 * El XP lo calcula el backend con las reglas vigentes; aquí solo se muestra el resultado.
 */
@Component({
  selector: 'app-entrenar',
  imports: [
    IonContent, IonHeader, IonToolbar, IonIcon, IonSpinner, ReactiveFormsModule, RouterLink,
    EncabezadoComponent, RefrescarComponent, BarraProgresoComponent, PieListaComponent,
  ],
  templateUrl: './entrenar.html',
  styleUrl: './entrenar.scss',
})
export class EntrenarPage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private fb = inject(FormBuilder);
  private jugador = inject(JugadorService);
  private almacen = inject(CronometroService);
  private alertas = inject(AlertController);
  private toast = inject(ToastController);

  actividades = signal<Actividad[]>([]);
  enCurso = signal<Entrenamiento | null>(null);
  resultado = signal<ResultadoEntrenamiento | null>(null);
  cargando = signal(true);
  trabajando = signal(false);
  error = signal<string | null>(null);

  historial = new ListaPaginada<Entrenamiento>((p, t) => this.jugador.entrenamientos(p, t), 10);

  /** Segundos transcurridos = ahora - inicio. El inicio se guarda en el dispositivo, así que no se reinicia al cambiar de pestaña. */
  segundos = signal(0);
  private inicioMs = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;
  private guardado: ReturnType<typeof setInterval> | null = null;
  private readonly alOcultar = () => { if (document.visibilityState === 'hidden') this.guardarAhora(); };

  readonly intensidades: { valor: Intensidad; etiqueta: string }[] = [
    { valor: 'BAJA', etiqueta: 'Baja' }, { valor: 'MEDIA', etiqueta: 'Media' }, { valor: 'ALTA', etiqueta: 'Alta' },
  ];
  readonly maximo = DURACION_MAXIMA_MIN;
  readonly limiteSinEnlace = LIMITE_SIN_ENLACE_MIN;

  form = this.fb.group({
    intensidad: this.fb.nonNullable.control<Intensidad>('MEDIA', Validators.required),
    distanciaKm: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(1000)]),
    caloriasKcal: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(20000)]),
    series: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(100)]),
    repeticiones: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(1000)]),
    pesoKg: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(1000)]),
    notas: this.fb.nonNullable.control('', Validators.maxLength(300)),
  });

  /** Campos que se muestran según la actividad en curso. */
  campos = computed<CamposActividad>(() => CAMPOS_ACTIVIDAD[(this.enCurso()?.actividad ?? '').toUpperCase()] ?? CAMPOS_POR_DEFECTO);
  minutos = computed(() => Math.floor(this.segundos() / 60));
  reloj$ = computed(() => {
    const s = this.segundos();
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
  });
  requiereEnlace = computed(() => this.minutos() > LIMITE_SIN_ENLACE_MIN);
  activas = computed(() => this.actividades().filter(a => a.estado === 'ACTIVA'));

  duracion = duracion;
  etiqueta = etiqueta;
  fechaCorta = fechaCorta;
  claseEstado = claseEstado;
  icono = iconoActividad;

  constructor() {
    addIcons({ barbellOutline, bicycleOutline, bodyOutline, flashOutline, playOutline, stopOutline, walkOutline, waterOutline });
  }

  ionViewWillEnter(): void {
    document.addEventListener('visibilitychange', this.alOcultar);
    this.cargar();
  }

  /** Al cambiar de pestaña se guarda lo último y se detienen los relojes; al volver se recalcula desde el inicio guardado. */
  ionViewWillLeave(): void {
    this.guardarAhora();
    this.detenerReloj();
    document.removeEventListener('visibilitychange', this.alOcultar);
  }

  ngOnDestroy(): void {
    this.guardarAhora();
    this.detenerReloj();
    document.removeEventListener('visibilitychange', this.alOcultar);
  }

  cargar(): void {
    this.error.set(null);
    forkJoin({ actividades: this.jugador.actividades(), enCurso: this.jugador.enCurso() }).subscribe({
      next: async r => {
        this.actividades.set(r.actividades);
        await this.fijarEnCurso(r.enCurso);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
    this.historial.recargar();
  }

  /** Minutos mínimos para que cuente, según la regla vigente de la actividad (la menor entre sus intensidades). */
  minimoDe(a: Actividad): number | null {
    const mins = a.reglasVigentes.map(r => r.duracionMinimaMin);
    return mins.length ? Math.min(...mins) : null;
  }

  iniciar(a: Actividad): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.resultado.set(null);
    this.jugador.iniciar(a.id).pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: e => this.fijarEnCurso(e, true),
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  finalizar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const c = this.campos();
    // lo que no aplica a la actividad no se envía, aunque haya quedado en el borrador
    const distanciaKm = c.distancia && v.distanciaKm != null
      ? (c.distancia.unidad === 'm' ? Math.round(v.distanciaKm) / 1000 : v.distanciaKm)
      : null;
    this.trabajando.set(true);
    this.error.set(null);
    this.jugador.finalizar({
      intensidad: v.intensidad,
      distanciaKm,
      caloriasKcal: c.calorias ? v.caloriasKcal : null,
      series: c.series ? v.series : null,
      repeticiones: c.series ? v.repeticiones : null,
      pesoKg: c.pesoCorporal ? v.pesoKg : null,
      notas: v.notas.trim() || null,
    }).pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: r => {
        this.fijarEnCurso(null);
        this.resultado.set(r);
        this.form.reset({ intensidad: 'MEDIA', distanciaKm: null, caloriasKcal: null, series: null, repeticiones: null, pesoKg: null, notas: '' });
        this.historial.recargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  async confirmarCancelar(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Cancelar entrenamiento',
      message: 'Se descarta el cronómetro y no se registra nada.',
      buttons: [
        { text: 'Seguir entrenando', role: 'cancel' },
        { text: 'Cancelar', role: 'destructive', cssClass: 'alerta-boton-peligro', handler: () => { this.cancelar(); } },
      ],
    });
    await alerta.present();
  }

  private cancelar(): void {
    this.jugador.cancelarEntrenamiento().subscribe({
      next: async r => {
        this.fijarEnCurso(null);
        const t = await this.toast.create({ message: r.mensaje, duration: 2000, position: 'top' });
        await t.present();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  cerrarResultado(): void {
    this.resultado.set(null);
  }

  /**
   * Deja el cronómetro en el estado correcto. El servidor manda sobre si hay un entrenamiento y cuál es; lo guardado
   * en el dispositivo solo aporta los segundos exactos y el borrador, y solo se usa si es del mismo entrenamiento.
   */
  private async fijarEnCurso(e: Entrenamiento | null, nuevo = false): Promise<void> {
    this.detenerReloj();
    this.enCurso.set(e);
    if (!e) {
      this.segundos.set(0);
      await this.almacen.borrar();
      return;
    }

    const ahora = Date.now();
    // el servidor solo da minutos completos: es una cota inferior del tiempo real
    const inicioServidor = ahora - (e.minutosTranscurridos ?? 0) * 60_000;
    const previo = nuevo ? null : await this.almacen.leer();

    if (previo && previo.idEntrenamiento === e.id) {
      // el inicio guardado es más exacto; si el servidor dice que ya pasó más tiempo, gana el servidor
      this.inicioMs = Math.min(previo.inicioMs, inicioServidor);
      this.form.patchValue({
        intensidad: (previo.borrador.intensidad as Intensidad) ?? 'MEDIA',
        distanciaKm: previo.borrador.distanciaKm,
        caloriasKcal: previo.borrador.caloriasKcal,
        series: previo.borrador.series ?? null,
        repeticiones: previo.borrador.repeticiones ?? null,
        pesoKg: previo.borrador.pesoKg ?? null,
        notas: previo.borrador.notas ?? '',
      });
    } else {
      this.inicioMs = nuevo ? ahora : inicioServidor;
    }

    this.actualizarSegundos();
    this.guardarAhora();
    this.reloj = setInterval(() => this.actualizarSegundos(), 1000);
    this.guardado = setInterval(() => this.guardarAhora(), 10_000);
  }

  private actualizarSegundos(): void {
    this.segundos.set(Math.max(0, Math.floor((Date.now() - this.inicioMs) / 1000)));
  }

  /** Guarda sin esperar: no frena la pantalla ni propaga errores. */
  private guardarAhora(): void {
    const e = this.enCurso();
    if (!e) return;
    const v = this.form.getRawValue();
    void this.almacen.guardar({
      idEntrenamiento: e.id,
      inicioMs: this.inicioMs,
      borrador: {
        intensidad: v.intensidad, distanciaKm: v.distanciaKm, caloriasKcal: v.caloriasKcal,
        series: v.series, repeticiones: v.repeticiones, pesoKg: v.pesoKg, notas: v.notas,
      },
    });
  }

  private detenerReloj(): void {
    if (this.reloj) clearInterval(this.reloj);
    if (this.guardado) clearInterval(this.guardado);
    this.reloj = null;
    this.guardado = null;
  }
}
