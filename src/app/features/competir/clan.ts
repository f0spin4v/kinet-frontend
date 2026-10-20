import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { Observable, finalize } from 'rxjs';
import { ClanDetalle, Miembro } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { claseEstado, etiqueta, fechaLarga } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';

/** Un clan: miembros y, según seas líder, miembro o visitante, las acciones disponibles. */
@Component({
  selector: 'app-clan',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSpinner, RouterLink],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/competir" text=""></ion-back-button></ion-buttons>
        <ion-title>Clan</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        @if (cargando()) {
          <div class="cargando-centro"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (d(); as d) {
          <section class="tarjeta tarjeta--resalte">
            <div class="tarjeta__cabecera">
              <h1 class="titulo-tarjeta">{{ d.clan.nombre }}</h1>
              <span class="chip" [class]="claseEstado(d.clan.estado)">{{ etiqueta(d.clan.estado) }}</span>
            </div>
            <p class="texto-suave">{{ d.clan.descripcion || 'Sin descripción.' }}</p>
            <dl class="kv-lista">
              <div class="kv"><dt>Miembros</dt><dd>{{ d.clan.miembros }} / {{ d.clan.capacidadMax }}</dd></div>
              <div class="kv"><dt>Líder</dt><dd>{{ d.clan.lider }}</dd></div>
              <div class="kv"><dt>Creado</dt><dd>{{ fechaLarga(d.clan.fechaCreacion) }}</dd></div>
            </dl>
          </section>

          @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }
          @if (ok()) { <p class="aviso-ok">{{ ok() }}</p> }

          <div class="acciones acc">
            @if (esMiembro()) {
              @if (soyLider()) {
                <a [routerLink]="['/tabs/competir/clan', d.clan.id, 'editar']" class="btn-secundario">Editar clan</a>
                <button type="button" class="btn-peligro" [disabled]="trabajando()" (click)="confirmar('Cerrar el clan', 'Se cerrará para todos los miembros.', cerrar)">Cerrar clan</button>
              }
              <button type="button" class="btn-secundario" [disabled]="trabajando()" (click)="confirmar('Salir del clan', 'Dejarás de aportar a los retos de clan.', salir)">Salir del clan</button>
            } @else if (d.clan.estado === 'ACTIVO' && d.clan.miembros < d.clan.capacidadMax) {
              <button type="button" class="btn-primary" [disabled]="trabajando()" (click)="unirse(d)">Unirme al clan</button>
            }
          </div>

          <h2 class="titulo-seccion">Miembros</h2>
          <div class="tarjeta">
            <ul class="lista">
              @for (m of d.miembros; track m.idUsuario) {
                <li class="item">
                  <div class="item__texto">
                    <p class="item__titulo">{{ m.gamertag }} @if (m.idUsuario === miId()) { <span class="chip chip--info">Tú</span> }</p>
                    <p class="item__detalle">{{ m.rolClan === 'LIDER' ? 'Líder' : 'Miembro' }} · desde {{ fechaLarga(m.fechaIngreso) }}</p>
                  </div>
                  @if (soyLider() && m.idUsuario !== miId()) {
                    <div class="item__lado">
                      <button type="button" class="btn-chico" [disabled]="trabajando()"
                              (click)="confirmar('Dar el liderazgo', 'Pasarás a ser un miembro más.', transferir(m))">Hacer líder</button>
                      <button type="button" class="btn-chico btn-peligro" [disabled]="trabajando()"
                              (click)="confirmar('Expulsar a ' + m.gamertag, 'Saldrá del clan.', expulsar(m))">Expulsar</button>
                    </div>
                  }
                </li>
              }
            </ul>
          </div>
        } @else if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }
      </div>
    </ion-content>
  `,
  styles: `.acc { margin: 16px 0 24px; } .item__lado { flex-direction: row; flex-wrap: wrap; justify-content: flex-end; }`,
})
export class ClanPage implements OnInit {
  private jugador = inject(JugadorService);
  private auth = inject(AuthService);
  private alertas = inject(AlertController);
  private router = inject(Router);

  id = input.required<string>();
  d = signal<ClanDetalle | null>(null);
  cargando = signal(true);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  miId = computed(() => this.auth.usuario()?.id ?? -1);
  esMiembro = computed(() => !!this.d()?.miembros.some(m => m.idUsuario === this.miId()));
  soyLider = computed(() => !!this.d()?.miembros.some(m => m.idUsuario === this.miId() && m.rolClan === 'LIDER'));

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.jugador.clan(Number(this.id())).subscribe({
      next: d => {
        this.d.set(d);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  unirse(d: ClanDetalle): void {
    this.accion(this.jugador.unirseAClan(d.clan.id), 'Te uniste al clan.');
  }

  readonly salir = () => this.accion(this.jugador.salirDelClan(), 'Saliste del clan.', true);
  readonly cerrar = () => this.accion(this.jugador.cerrarClan(Number(this.id())), 'El clan se cerró.', true);
  readonly transferir = (m: Miembro) => () =>
    this.accion(this.jugador.transferirLiderazgo(Number(this.id()), m.idUsuario), `${m.gamertag} es el nuevo líder.`);
  readonly expulsar = (m: Miembro) => () =>
    this.accion(this.jugador.expulsar(Number(this.id()), m.idUsuario), `${m.gamertag} salió del clan.`);

  async confirmar(titulo: string, mensaje: string, hacer: () => void): Promise<void> {
    const alerta = await this.alertas.create({
      header: titulo,
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', role: 'destructive', cssClass: 'alerta-boton-peligro', handler: () => { hacer(); } },
      ],
    });
    await alerta.present();
  }

  private accion(peticion: Observable<unknown>,
                 mensaje: string, volver = false): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.ok.set(null);
    peticion.pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: () => {
        if (volver) {
          this.router.navigateByUrl('/tabs/competir', { replaceUrl: true });
        } else {
          this.ok.set(mensaje);
          this.cargar();
        }
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }
}
