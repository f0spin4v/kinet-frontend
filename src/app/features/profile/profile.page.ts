import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AlertController, IonContent, IonHeader, IonIcon, IonToolbar, LoadingController, NavController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, moonOutline, phonePortraitOutline, sunnyOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth';
import { JugadorService } from '../../core/services/jugador';
import { Tema, TemaService } from '../../core/services/tema';
import { ResultadoEvaluacion } from '../../core/models/api.models';
import { mensajeDeError } from '../../core/utils/http-error';
import { etiqueta, fechaLarga } from '../../core/utils/formato';
import { iniciales } from '../../core/utils/texto';
import { EncabezadoComponent } from '../../shared/components/encabezado/encabezado';

/** Perfil de cualquier cuenta. En el equipo (entrenador, administrador) se omite la evaluación y el borrado. */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, RouterLink, EncabezadoComponent],
})
export class ProfilePage {
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private jugador = inject(JugadorService);
  protected tema = inject(TemaService);
  private alertas = inject(AlertController);
  private cargando = inject(LoadingController);
  private toast = inject(ToastController);

  usuario = this.auth.usuario;
  esJugador = this.auth.esJugador;
  evaluacion = signal<ResultadoEvaluacion | null>(null);
  etiqueta = etiqueta;
  fechaLarga = fechaLarga;

  rutaEditar = computed(() => (this.esJugador() ? '/tabs/perfil/editar' : '/staff/perfil/editar'));
  rutaContrasena = computed(() => (this.esJugador() ? '/tabs/perfil/contrasena' : '/staff/perfil/contrasena'));
  iniciales = computed(() => iniciales(this.auth.nombreCompleto()));
  puedeRepetir = computed(() => {
    const e = this.evaluacion();
    return !!e && (!e.puedeRepetirDesde || new Date(e.puedeRepetirDesde) <= new Date());
  });

  opcionesTema: { valor: Tema; etiqueta: string; icono: string }[] = [
    { valor: 'sistema', etiqueta: 'Sistema', icono: 'phone-portrait-outline' },
    { valor: 'claro', etiqueta: 'Claro', icono: 'sunny-outline' },
    { valor: 'oscuro', etiqueta: 'Oscuro', icono: 'moon-outline' },
  ];

  constructor() {
    addIcons({ logOutOutline, phonePortraitOutline, sunnyOutline, moonOutline });
    if (this.esJugador()) this.jugador.evaluacionVigente().subscribe(e => this.evaluacion.set(e));
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
    this.nav.navigateRoot('/login');
  }

  async confirmarDesactivacion(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Desactivar cuenta',
      message: 'Tu cuenta quedará inactiva y se cerrará tu sesión. Soporte puede reactivarla más adelante.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Desactivar', role: 'destructive', cssClass: 'alerta-boton-peligro', handler: () => { this.desactivar(); } },
      ],
    });
    await alerta.present();
  }

  private async desactivar(): Promise<void> {
    const indicador = await this.cargando.create({ message: 'Desactivando cuenta…' });
    await indicador.present();

    this.jugador.desactivarCuenta().subscribe({
      next: async () => {
        await indicador.dismiss();
        await this.auth.cerrarSesion();
        this.nav.navigateRoot('/login');
        await this.aviso('Tu cuenta quedó inactiva');
      },
      error: async (e: HttpErrorResponse) => {
        await indicador.dismiss();
        await this.aviso(mensajeDeError(e), true);
      },
    });
  }

  private async aviso(message: string, error = false): Promise<void> {
    const t = await this.toast.create({ message, duration: 3000, position: 'top', color: error ? 'danger' : undefined });
    await t.present();
  }
}
