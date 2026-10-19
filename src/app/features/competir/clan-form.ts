import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { finalize } from 'rxjs';
import { JugadorService } from '../../core/services/jugador';
import { mensajeDeError } from '../../core/utils/http-error';

/** Crear un clan (ruta /clan/nuevo) o editar el propio (ruta /clan/:id/editar). El que crea queda como líder. */
@Component({
  selector: 'app-clan-form',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/competir" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ id() ? 'Editar clan' : 'Crear un clan' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="pagina pagina--estrecha formulario">
        <div class="field">
          <label class="field__label" for="nombre">Nombre</label>
          <div class="field__box" [class.field__box--error]="invalido('nombre')">
            <input id="nombre" type="text" formControlName="nombre" maxlength="60" />
          </div>
          @if (invalido('nombre')) { <span class="field__error">El nombre debe tener entre 3 y 60 caracteres.</span> }
        </div>

        <div class="field">
          <label class="field__label" for="descripcion">Descripción (opcional)</label>
          <div class="field__box field__box--area"><textarea id="descripcion" formControlName="descripcion" maxlength="300" rows="3"></textarea></div>
        </div>

        <div class="field">
          <label class="field__label" for="capacidad">Capacidad máxima</label>
          <div class="field__box" [class.field__box--error]="invalido('capacidadMax')">
            <input id="capacidad" type="number" min="2" max="200" formControlName="capacidadMax" />
          </div>
          @if (invalido('capacidadMax')) { <span class="field__error">La capacidad debe estar entre 2 y 200 miembros.</span> }
        </div>

        @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn-primary" [disabled]="guardando()">
          @if (guardando()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ id() ? 'Guardar cambios' : 'Crear clan' }} }
        </button>
      </form>
    </ion-content>
  `,
  styles: `.formulario { display: flex; flex-direction: column; gap: 20px; }`,
})
export class ClanFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private jugador = inject(JugadorService);
  private router = inject(Router);

  /** Solo viene al editar. */
  id = input<string>();

  guardando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
    descripcion: ['', Validators.maxLength(300)],
    capacidadMax: [20, [Validators.required, Validators.min(2), Validators.max(200)]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.jugador.clan(Number(id)).subscribe({
      next: d => this.form.setValue({
        nombre: d.clan.nombre, descripcion: d.clan.descripcion ?? '', capacidadMax: d.clan.capacidadMax,
      }),
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  invalido(campo: 'nombre' | 'capacidadMax'): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null, capacidadMax: v.capacidadMax };
    const id = this.id();

    this.guardando.set(true);
    this.error.set(null);
    (id ? this.jugador.editarClan(Number(id), datos) : this.jugador.crearClan(datos))
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: d => this.router.navigate(['/tabs/competir/clan', d.clan.id], { replaceUrl: true }),
        error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
      });
  }
}
