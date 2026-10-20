import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AlertController, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, peopleOutline, searchOutline } from 'ionicons/icons';
import { finalize, forkJoin } from 'rxjs';
import {
  ClanDetalle, Clan, Competencia, Enfrentamiento, HistorialRango, ParticipacionTemporada, PosicionRanking, Solicitud, Temporada,
} from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { claseEstado, etiqueta, fechaCorta, fechaLarga, numero } from '../../core/utils/formato';
import { mensajeDeError } from '../../core/utils/http-error';
import { ListaPaginada } from '../../core/utils/lista-paginada';
import { RefrescarComponent } from '../../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../../shared/components/pie-lista/pie-lista';

type Pestana = 'temporada' | 'competencias' | 'clan';

/** Competir: temporada y enfrentamientos por ranking, competencias por invitación y clanes. */
@Component({
  selector: 'app-competir',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, IonSpinner, RouterLink, EncabezadoComponent, RefrescarComponent, PieListaComponent],
  templateUrl: './competir.html',
  styleUrl: './competir.scss',
})
export class CompetirPage implements ViewWillEnter {
  private jugador = inject(JugadorService);
  private auth = inject(AuthService);
  private alertas = inject(AlertController);

  /** ?pestana=clan|competencias|temporada (por ejemplo, desde una notificación). */
  pestanaInicial = input<string | undefined>(undefined, { alias: 'pestana' });
  pestana = signal<Pestana>('temporada');
  cargando = signal(true);
  trabajando = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // temporada
  temporada = signal<Temporada | null>(null);
  participacion = signal<ParticipacionTemporada | null>(null);
  ranking = signal<PosicionRanking[]>([]);
  busqueda = signal<Solicitud | null>(null);
  enfrentamientos = new ListaPaginada<Enfrentamiento>((p, t) => this.jugador.enfrentamientos(p, t), 5);
  historial = new ListaPaginada<HistorialRango>((p, t) => this.jugador.historialRango(p, t), 5);

  // competencias
  invitaciones = new ListaPaginada<Competencia>((p, t) => this.jugador.invitaciones(p, t), 10);
  competencias = new ListaPaginada<Competencia>((p, t) => this.jugador.competencias(p, t), 10);

  // clanes
  miClan = signal<ClanDetalle | null>(null);
  clanes = new ListaPaginada<Clan>((p, t) => this.jugador.clanes(p, t), 10);

  miId = computed(() => this.auth.usuario()?.id ?? -1);
  etiqueta = etiqueta;
  numero = numero;
  claseEstado = claseEstado;
  fechaCorta = fechaCorta;
  fechaLarga = fechaLarga;

  constructor() {
    addIcons({ addOutline, peopleOutline, searchOutline });
  }

  ionViewWillEnter(): void {
    const p = this.pestanaInicial();
    if (p === 'temporada' || p === 'competencias' || p === 'clan') this.pestana.set(p);
    this.cargar();
  }

  cambiar(p: Pestana): void {
    this.pestana.set(p);
  }

  cargar(): void {
    this.error.set(null);
    forkJoin({
      temporada: this.jugador.temporadaActiva(),
      participacion: this.jugador.miParticipacion(),
      ranking: this.jugador.ranking(20),
      clan: this.jugador.miClan(),
    }).subscribe({
      next: r => {
        this.temporada.set(r.temporada);
        this.participacion.set(r.participacion);
        this.ranking.set(r.ranking);
        this.miClan.set(r.clan);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
    this.enfrentamientos.recargar();
    this.historial.recargar();
    this.invitaciones.recargar();
    this.competencias.recargar();
    this.clanes.recargar();
  }

  esMio(p: { idUsuario: number }): boolean {
    return p.idUsuario === this.miId();
  }

  // ---------- enfrentamientos ----------
  buscar(): void {
    this.ejecutar(this.jugador.buscarEnfrentamiento(), s => {
      this.busqueda.set(s.enfrentamiento ? null : s);
      this.aviso.set(s.mensaje);
    });
  }

  cancelarBusqueda(): void {
    this.ejecutar(this.jugador.cancelarBusqueda(), r => {
      this.busqueda.set(null);
      this.aviso.set(r.mensaje);
    });
  }

  async confirmarAbandono(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Abandonar la temporada',
      message: 'Dejarás de participar en el ranking de esta temporada.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Abandonar', role: 'destructive', cssClass: 'alerta-boton-peligro',
          handler: () => { this.ejecutar(this.jugador.abandonarTemporada(), () => this.cargar()); } },
      ],
    });
    await alerta.present();
  }

  // ---------- competencias ----------
  aceptar(c: Competencia): void {
    this.ejecutar(this.jugador.aceptarCompetencia(c.id), () => this.cargar());
  }

  rechazar(c: Competencia): void {
    this.ejecutar(this.jugador.rechazarCompetencia(c.id), () => this.cargar());
  }

  // ---------- clanes ----------
  unirse(c: Clan): void {
    this.ejecutar(this.jugador.unirseAClan(c.id), () => this.cargar());
  }

  private ejecutar<T>(peticion: import('rxjs').Observable<T>, ok: (r: T) => void): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    peticion.pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: ok,
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }
}
