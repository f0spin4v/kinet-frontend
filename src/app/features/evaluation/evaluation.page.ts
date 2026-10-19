import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward, optionsOutline, pulseOutline, triangle } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { PreguntaEvaluacion, ResultadoEvaluacion } from '../../core/models/api.models';
import { etiqueta } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';

type Estado = 'cargando' | 'respondiendo' | 'enviando' | 'resultado' | 'error';

@Component({
  selector: 'app-evaluation',
  templateUrl: './evaluation.page.html',
  styleUrls: ['./evaluation.page.scss'],
  imports: [IonContent, IonIcon, IonSpinner],
})
export class EvaluationPage {
  private jugador = inject(JugadorService);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** true cuando un jugador ya evaluado repite el cuestionario (/evaluacion/repetir). */
  repitiendo = this.router.url.includes('/evaluacion/repetir');
  estado = signal<Estado>('cargando');
  preguntas = signal<PreguntaEvaluacion[]>([]);
  indice = signal(0);
  respuestas = signal<number[]>([]);
  seleccion = signal<number | null>(null);
  resultado = signal<ResultadoEvaluacion | null>(null);
  error = signal<string | null>(null);

  total = computed(() => this.preguntas().length);
  preguntaActual = computed(() => this.preguntas()[this.indice()]);
  progreso = computed(() => (this.total() ? ((this.indice() + 1) / this.total()) * 100 : 0));

  /** La opción resaltada: la que se acaba de tocar, o la ya respondida si el usuario volvió atrás. */
  marcada = computed(() => this.seleccion() ?? this.respuestas()[this.indice()] ?? null);

  constructor() {
    addIcons({ triangle, optionsOutline, arrowForward, arrowBack, pulseOutline });
    this.cargar();
  }

  cargar(): void {
    this.estado.set('cargando');
    this.error.set(null);

    this.jugador.preguntas().subscribe({
      next: preguntas => {
        if (preguntas.length === 0) {
          this.error.set('No hay preguntas disponibles. Intenta más tarde.');
          this.estado.set('error');
          return;
        }
        this.preguntas.set(preguntas);
        this.indice.set(0);
        this.respuestas.set([]);
        this.estado.set('respondiendo');
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.estado.set('error');
      },
    });
  }

  responder(opcion: number): void {
    if (this.seleccion() || this.estado() !== 'respondiendo') return; // evita doble toque

    this.seleccion.set(opcion);

    setTimeout(() => {
      const respuestas = [...this.respuestas().slice(0, this.indice()), opcion];
      this.respuestas.set(respuestas);
      this.seleccion.set(null);

      if (this.indice() < this.total() - 1) {
        this.indice.update(i => i + 1);
      } else {
        this.enviar(respuestas);
      }
    }, 200);
  }

  anterior(): void {
    if (this.indice() > 0) this.indice.update(i => i - 1);
  }

  reintentar(): void {
    const completas = this.total() > 0 && this.respuestas().length === this.total();
    completas ? this.enviar(this.respuestas()) : this.cargar();
  }

  entrar(): void {
    this.router.navigateByUrl(this.repitiendo ? '/tabs/perfil' : '/tabs', { replaceUrl: true });
  }

  async salir(): Promise<void> {
    if (this.repitiendo) {
      this.router.navigateByUrl('/tabs/perfil', { replaceUrl: true });
      return;
    }
    await this.auth.cerrarSesion();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  formatearNivel(nivel: string): string {
    return etiqueta(nivel);
  }

  /** Votos por nivel, del más votado al menos votado. */
  votos(r: ResultadoEvaluacion): { nivel: string; peso: number }[] {
    return Object.entries(r.votos).map(([nivel, peso]) => ({ nivel, peso })).sort((a, b) => b.peso - a.peso);
  }

  private enviar(respuestas: number[]): void {
    this.estado.set('enviando');
    this.error.set(null);

    this.jugador.responderEvaluacion(respuestas).subscribe({
      next: r => {
        this.resultado.set(r);
        this.estado.set('resultado');
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.estado.set('error');
      },
    });
  }
}
