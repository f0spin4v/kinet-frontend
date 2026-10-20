import { Component, OnDestroy, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AlertController, IonContent, IonHeader, IonIcon, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline } from 'ionicons/icons';
import { Observable, finalize } from 'rxjs';
import {
  Clan, EntrenamientoPendiente, EstadoEvidencia, Evidencia, PosicionRanking,
} from '../core/models/api.models';
import { JugadorService } from '../core/services/jugador';
import { StaffService } from '../core/services/staff';
import { claseEstado, duracion, etiqueta, fechaCorta } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';
import { ListaPaginada } from '../core/utils/lista-paginada';
import { RefrescarComponent } from '../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../shared/components/pie-lista/pie-lista';

type Pestana = 'pendientes' | 'evidencias' | 'clanes' | 'jugadores';

/** Moderación (entrenador y administrador): sesiones pendientes, evidencias, cierre de clanes y descalificaciones. */
@Component({
  selector: 'app-moderacion',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, FormsModule, EncabezadoComponent, RefrescarComponent, PieListaComponent],
  templateUrl: './moderacion.html',
})
export class ModeracionPage implements ViewWillEnter, OnDestroy {
  private staff = inject(StaffService);
  private jugador = inject(JugadorService);
  private alertas = inject(AlertController);

  pestana = signal<Pestana>('pendientes');
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  trabajando = signal(false);

  pendientes = new ListaPaginada<EntrenamientoPendiente>((p, t) => this.staff.pendientes(p, t), 10);

  filtroEvidencia = signal<EstadoEvidencia>('SIN_REVISAR');
  evidencias = new ListaPaginada<Evidencia>((p, t) => this.staff.evidencias(this.filtroEvidencia(), p, t), 10);
  imagenes = signal<Record<number, string>>({});
  readonly filtros: { valor: EstadoEvidencia; etiqueta: string }[] = [
    { valor: 'SIN_REVISAR', etiqueta: 'Sin revisar' }, { valor: 'ACEPTADA', etiqueta: 'Aceptadas' }, { valor: 'RECHAZADA', etiqueta: 'Rechazadas' },
  ];

  clanes = new ListaPaginada<Clan>((p, t) => this.jugador.clanes(p, t), 10);
  ranking = signal<PosicionRanking[]>([]);

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  duracion = duracion;
  fechaCorta = fechaCorta;

  constructor() {
    addIcons({ checkmarkOutline, closeOutline });
  }

  ionViewWillEnter(): void {
    this.pendientes.recargar();
    this.evidencias.recargar();
    this.clanes.recargar();
    this.jugador.ranking(100).subscribe(r => this.ranking.set(r));
  }

  ngOnDestroy(): void {
    Object.values(this.imagenes()).forEach(url => URL.revokeObjectURL(url));
  }

  cambiar(p: Pestana): void {
    this.pestana.set(p);
  }

  filtrar(estado: EstadoEvidencia): void {
    this.filtroEvidencia.set(estado);
    this.evidencias.recargar();
  }

  // ---------- sesiones pendientes ----------
  aprobar(p: EntrenamientoPendiente): void {
    this.ejecutar(this.staff.revisarEntrenamiento(p.entrenamiento.id, true, null), `Sesión de ${p.gamertag} aprobada.`, () => this.pendientes.recargar());
  }

  async rechazar(p: EntrenamientoPendiente): Promise<void> {
    const motivo = await this.pedirTexto('Rechazar sesión', 'Motivo del rechazo', 'Rechazar');
    if (motivo) {
      this.ejecutar(this.staff.revisarEntrenamiento(p.entrenamiento.id, false, motivo), `Sesión de ${p.gamertag} rechazada.`, () => this.pendientes.recargar());
    }
  }

  // ---------- evidencias ----------
  verImagen(ev: Evidencia): void {
    this.staff.imagenDeEvidencia(ev.id).subscribe({
      next: blob => this.imagenes.update(m => ({ ...m, [ev.id]: URL.createObjectURL(blob) })),
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  aceptarEvidencia(ev: Evidencia): void {
    this.ejecutar(this.staff.revisarEvidencia(ev.id, true, null), 'Evidencia aceptada.', () => this.evidencias.recargar());
  }

  async rechazarEvidencia(ev: Evidencia): Promise<void> {
    const nota = await this.pedirTexto('Rechazar evidencia', 'Nota para el jugador', 'Rechazar');
    if (nota) {
      this.ejecutar(this.staff.revisarEvidencia(ev.id, false, nota), 'Evidencia rechazada.', () => this.evidencias.recargar());
    }
  }

  // ---------- clanes y jugadores ----------
  async cerrarClan(c: Clan): Promise<void> {
    if (await this.confirmar(`Cerrar el clan ${c.nombre}`, 'Los miembros quedarán sin clan.')) {
      this.ejecutar(this.staff.cerrarClan(c.id), `Clan ${c.nombre} cerrado.`, () => this.clanes.recargar());
    }
  }

  async descalificar(j: PosicionRanking): Promise<void> {
    const motivo = await this.pedirTexto(`Descalificar a ${j.gamertag}`, 'Motivo', 'Descalificar');
    if (motivo) {
      this.ejecutar(this.staff.descalificar(j.idUsuario, motivo), `${j.gamertag} fue descalificado de la temporada.`, () => this.jugador.ranking(100).subscribe(r => this.ranking.set(r)));
    }
  }

  // ---------- utilidades ----------
  private ejecutar<T>(peticion: Observable<T>, mensaje: string, despues: () => void): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.ok.set(null);
    peticion.pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: () => {
        this.ok.set(mensaje);
        despues();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  private async pedirTexto(header: string, placeholder: string, boton: string): Promise<string | null> {
    const alerta = await this.alertas.create({
      header,
      inputs: [{ name: 'texto', type: 'textarea', placeholder, attributes: { maxlength: 300 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: boton, role: 'confirm', cssClass: 'alerta-boton-peligro', handler: (d: { texto: string }) => !!d.texto?.trim() },
      ],
    });
    await alerta.present();
    const { role, data } = await alerta.onDidDismiss();
    return role === 'confirm' ? (data?.values?.texto ?? '').trim() || null : null;
  }

  private async confirmar(header: string, message: string): Promise<boolean> {
    const alerta = await this.alertas.create({
      header,
      message,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Confirmar', role: 'confirm', cssClass: 'alerta-boton-peligro' }],
    });
    await alerta.present();
    return (await alerta.onDidDismiss()).role === 'confirm';
  }
}
