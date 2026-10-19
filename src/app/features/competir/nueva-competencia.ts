import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { finalize, forkJoin } from 'rxjs';
import { Actividad, ClanDetalle, TipoCompetencia } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { aFechaBackend, aInputFecha, etiqueta } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';

interface Candidato {
  id: number;
  gamertag: string;
  detalle: string;
}

const REGLAS: Record<TipoCompetencia, { min: number; max: number; ayuda: string }> = {
  DUELO: { min: 1, max: 1, ayuda: 'Uno contra uno. Empieza cuando el rival acepta.' },
  GRUPAL: { min: 2, max: 9, ayuda: 'Una ronda en la que gana quien más XP sume.' },
  TORNEO: { min: 3, max: 15, ayuda: 'Rondas eliminatorias: en cada ronda pasa la mitad con más XP.' },
};

/** Crear un duelo, una competencia grupal o un torneo. Los invitados se eligen del ranking y de tu clan. */
@Component({
  selector: 'app-nueva-competencia',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonIcon, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/competir" text=""></ion-back-button></ion-buttons>
        <ion-title>Nueva competencia</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form [formGroup]="form" (ngSubmit)="crear()" novalidate class="pagina pagina--estrecha formulario">
        <div class="field">
          <label class="field__label">Tipo</label>
          <div class="pestanas" role="radiogroup" aria-label="Tipo de competencia">
            @for (t of tipos; track t) {
              <button type="button" role="radio" class="pestana" [class.pestana--activa]="tipo() === t"
                      [attr.aria-checked]="tipo() === t" (click)="elegirTipo(t)">{{ etiqueta(t) }}</button>
            }
          </div>
          <span class="field__hint">{{ reglas().ayuda }}</span>
        </div>

        <div class="field">
          <label class="field__label" for="nombre">Nombre</label>
          <div class="field__box" [class.field__box--error]="form.controls.nombre.touched && form.controls.nombre.invalid">
            <input id="nombre" type="text" formControlName="nombre" maxlength="80" placeholder="Ej. Reto de la semana" />
          </div>
          @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
            <span class="field__error">Ponle un nombre a la competencia.</span>
          }
        </div>

        <div class="campos campos--2">
          <div class="field">
            <label class="field__label" for="actividad">Actividad</label>
            <div class="field__box">
              <select id="actividad" formControlName="idTipoActividad">
                <option [ngValue]="null">Cualquiera</option>
                @for (a of actividades(); track a.id) { <option [ngValue]="a.id">{{ etiqueta(a.nombre) }}</option> }
              </select>
            </div>
          </div>
          <div class="field">
            <label class="field__label" for="horas">Horas por ronda</label>
            <div class="field__box"><input id="horas" type="number" min="1" max="168" formControlName="duracionRondaHoras" /></div>
          </div>
        </div>

        @if (tipo() !== 'DUELO') {
          <div class="field">
            <label class="field__label" for="inicio">Empieza el</label>
            <div class="field__box"><input id="inicio" type="datetime-local" formControlName="fechaInicio" [min]="minInicio" [max]="maxInicio" /></div>
            <span class="field__hint">Dentro de los próximos 7 días.</span>
          </div>
        }

        <div class="field">
          <label class="field__label">Invitados ({{ seleccion().length }} de {{ reglas().min }}@if (reglas().max !== reglas().min) { a {{ reglas().max }} })</label>
          @if (cargando()) {
            <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
          } @else if (candidatos().length === 0) {
            <p class="texto-suave">No hay otros jugadores para invitar todavía.</p>
          } @else {
            <ul class="lista tarjeta">
              @for (c of candidatos(); track c.id) {
                <li>
                  <button type="button" class="item item--enlace candidato" [attr.aria-pressed]="estaElegido(c.id)" (click)="alternar(c.id)">
                    <div class="item__texto">
                      <p class="item__titulo">{{ c.gamertag }}</p>
                      <p class="item__detalle">{{ c.detalle }}</p>
                    </div>
                    <ion-icon [name]="estaElegido(c.id) ? 'checkmark-circle' : 'ellipse-outline'" aria-hidden="true"
                              [class.marcado]="estaElegido(c.id)"></ion-icon>
                  </button>
                </li>
              }
            </ul>
          }
        </div>

        @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn-primary" [disabled]="enviando()">
          @if (enviando()) { <ion-spinner name="crescent"></ion-spinner> } @else { Enviar invitaciones }
        </button>
      </form>
    </ion-content>
  `,
  styles: `
    .formulario { display: flex; flex-direction: column; gap: 20px; }
    .candidato { width: 100%; background: none; border: 0; border-bottom: 1px solid var(--kinet-surface-high); font: inherit; color: inherit; text-align: left; }
    .candidato ion-icon { font-size: 24px; color: var(--kinet-text-muted); }
    .candidato ion-icon.marcado { color: var(--kinet-accent); }
    .pestanas { margin-bottom: 4px; }
  `,
})
export class NuevaCompetenciaPage {
  private fb = inject(FormBuilder);
  private jugador = inject(JugadorService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly tipos: TipoCompetencia[] = ['DUELO', 'GRUPAL', 'TORNEO'];
  readonly minInicio = aInputFecha(new Date(Date.now() + 5 * 60_000));
  readonly maxInicio = aInputFecha(new Date(Date.now() + 7 * 24 * 3_600_000 - 60_000));

  tipo = signal<TipoCompetencia>('DUELO');
  reglas = computed(() => REGLAS[this.tipo()]);
  actividades = signal<Actividad[]>([]);
  candidatos = signal<Candidato[]>([]);
  seleccion = signal<number[]>([]);
  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);
  etiqueta = etiqueta;

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    idTipoActividad: this.fb.control<number | null>(null),
    duracionRondaHoras: [24, [Validators.required, Validators.min(1), Validators.max(168)]],
    fechaInicio: [aInputFecha(new Date(Date.now() + 3_600_000))],
  });

  constructor() {
    addIcons({ checkmarkCircle, ellipseOutline });
    forkJoin({ actividades: this.jugador.actividades(), ranking: this.jugador.ranking(100), clan: this.jugador.miClan() })
      .subscribe({
        next: r => {
          this.actividades.set(r.actividades.filter(a => a.estado === 'ACTIVA'));
          this.candidatos.set(this.armarCandidatos(r.ranking, r.clan));
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(mensajeDeError(e));
          this.cargando.set(false);
        },
      });
  }

  elegirTipo(t: TipoCompetencia): void {
    this.tipo.set(t);
    this.seleccion.update(s => s.slice(0, REGLAS[t].max));
  }

  estaElegido(id: number): boolean {
    return this.seleccion().includes(id);
  }

  alternar(id: number): void {
    const max = this.reglas().max;
    this.seleccion.update(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      return max === 1 ? [id] : s.length < max ? [...s, id] : s;
    });
  }

  crear(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { min, max } = this.reglas();
    const n = this.seleccion().length;
    if (n < min || n > max) {
      this.error.set(min === max ? `Elige ${min} jugador.` : `Elige de ${min} a ${max} jugadores.`);
      return;
    }

    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.jugador.crearCompetencia({
      tipo: this.tipo(),
      nombre: v.nombre.trim(),
      idsInvitados: this.seleccion(),
      idTipoActividad: v.idTipoActividad,
      duracionRondaHoras: v.duracionRondaHoras,
      fechaInicio: this.tipo() === 'DUELO' ? null : aFechaBackend(v.fechaInicio),
    }).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: c => this.router.navigate(['/tabs/competir/competencias', c.id], { replaceUrl: true }),
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  private armarCandidatos(ranking: { idUsuario: number; gamertag: string; rango: string; puntos: number }[], clan: ClanDetalle | null): Candidato[] {
    const yo = this.auth.usuario()?.id;
    const mapa = new Map<number, Candidato>();
    for (const m of clan?.miembros ?? []) {
      mapa.set(m.idUsuario, { id: m.idUsuario, gamertag: m.gamertag, detalle: `Tu clan · ${clan?.clan.nombre}` });
    }
    for (const r of ranking) {
      if (!mapa.has(r.idUsuario)) mapa.set(r.idUsuario, { id: r.idUsuario, gamertag: r.gamertag, detalle: `${r.rango} · ${r.puntos} pts` });
    }
    mapa.delete(yo ?? -1);
    return [...mapa.values()];
  }
}
