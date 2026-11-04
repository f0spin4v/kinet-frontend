import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { mensajeDeError } from '../../core/utils/http-error';
import { PoliticaTextoComponent } from './politica-texto';

/**
 * Primer ingreso de una cuenta creada por el administrador: el titular lee y acepta la política él mismo.
 * Sin aceptarla no puede usar la app (Ley 1581 de 2012, autorización previa del titular).
 */
@Component({
  selector: 'app-aceptar-politica',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonSpinner, PoliticaTextoComponent],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Antes de empezar</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        <h1 class="titulo-pagina">Hola, {{ auth.usuario()?.nombres }}</h1>
        <p class="texto-suave">
          El administrador creó tu cuenta. Para usar Kinet necesitamos que leas y aceptes la política de
          tratamiento de tus datos personales.
        </p>
        <section class="tarjeta"><app-politica-texto /></section>

        @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }

        <div class="acciones">
          <button type="button" class="btn-primary" [disabled]="enviando()" (click)="aceptar()">
            @if (enviando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Acepto la política }
          </button>
          <button type="button" class="btn-secundario" [disabled]="enviando()" (click)="salir()">No acepto, salir</button>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .titulo-pagina { font-size: 22px; margin: 0 0 8px; }
    .tarjeta { margin: 16px 0; }
    .acciones { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
  `,
})
export class AceptarPoliticaPage {
  auth = inject(AuthService);
  private router = inject(Router);

  enviando = signal(false);
  error = signal<string | null>(null);

  aceptar(): void {
    this.enviando.set(true);
    this.error.set(null);
    this.auth.aceptarPolitica()
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.auth.rutaInicial(), { replaceUrl: true }),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
