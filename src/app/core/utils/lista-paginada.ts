import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagina } from '../models/api.models';
import { mensajeDeError } from './http-error';

/** Lista que se llena página a página (botón "Ver más") a partir de un endpoint paginado del backend. */
export class ListaPaginada<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly cargada = signal(false);
  readonly hayMas = computed(() => this.items().length < this.total());

  private pagina = 0;

  constructor(
    private fuente: (pagina: number, tamanio: number) => Observable<Pagina<T>>,
    private tamanio = 20,
  ) {}

  /** Vuelve a la primera página. */
  recargar(): void {
    this.pagina = 0;
    this.pedir(true);
  }

  masResultados(): void {
    if (this.cargando() || !this.hayMas()) return;
    this.pagina++;
    this.pedir(false);
  }

  /** Cambia un elemento sin volver a pedir la lista (por ejemplo, tras marcar una notificación como leída). */
  reemplazar(donde: (item: T) => boolean, nuevo: T): void {
    this.items.update(lista => lista.map(i => (donde(i) ? nuevo : i)));
  }

  private pedir(reiniciar: boolean): void {
    this.cargando.set(true);
    this.error.set(null);
    this.fuente(this.pagina, this.tamanio).subscribe({
      next: p => {
        this.items.update(lista => (reiniciar ? p.contenido : [...lista, ...p.contenido]));
        this.total.set(p.totalElementos);
        this.cargando.set(false);
        this.cargada.set(true);
      },
      error: (e: HttpErrorResponse) => {
        if (!reiniciar) this.pagina--;
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
        this.cargada.set(true);
      },
    });
  }
}
