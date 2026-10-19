import { Component, inject } from '@angular/core';
import {AlertController, IonContent, IonIcon,LoadingController, NavController,ToastController, } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, moonOutline, phonePortraitOutline, sunnyOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth';
import { Tema, TemaService } from '../../core/services/tema';
import {RouterLink} from "@angular/router";
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioService } from '../../core/services/usuario';
import { mensajeDeError } from '../../core/utils/http-error';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonContent, IonIcon, RouterLink],
})
export class ProfilePage {
  private auth = inject(AuthService);
  private nav = inject(NavController);
  protected tema = inject(TemaService);
  private usuarios = inject(UsuarioService);
  private alertas = inject(AlertController);
  private cargando = inject(LoadingController);
  private toast = inject(ToastController);

  usuario = this.auth.usuario;

  opcionesTema: { valor: Tema; etiqueta: string; icono: string }[] = [
    { valor: 'sistema', etiqueta: 'Sistema', icono: 'phone-portrait-outline' },
    { valor: 'claro', etiqueta: 'Claro', icono: 'sunny-outline' },
    { valor: 'oscuro', etiqueta: 'Oscuro', icono: 'moon-outline' },
  ];

  constructor() {
    addIcons({ logOutOutline, phonePortraitOutline, sunnyOutline, moonOutline });
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
    this.nav.navigateRoot('/login');
  }
  async confirmarEliminacion(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Eliminar cuenta',
      message: 'Esta acción es permanente. Se borrarán tu perfil, tu evaluación y todo tu progreso. Escribe tu contraseña para confirmar.',
      inputs: [
        {
          name: 'contrasena',
          type: 'password',
          placeholder: 'Contraseña',
          attributes: { autocomplete: 'current-password' },
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alerta-boton-peligro',
          handler: (datos: { contrasena: string }) => {
            if (!datos.contrasena) return false; // sin contraseña, el diálogo no se cierra
            this.eliminar(datos.contrasena);
            return true;
          },
        },
      ],
    });
    await alerta.present();
  }

  private async eliminar(contrasena: string): Promise<void> {
    const indicador = await this.cargando.create({ message: 'Eliminando cuenta…' });
    await indicador.present();

    this.usuarios.eliminarCuenta(contrasena).subscribe({
      next: async () => {
        await indicador.dismiss();
        await this.auth.cerrarSesion();
        this.nav.navigateRoot('/login');
        const aviso = await this.toast.create({
          message: 'Tu cuenta fue eliminada',
          duration: 3000,
          position: 'top',
        });
        await aviso.present();
      },
      error: async (e: HttpErrorResponse) => {
        await indicador.dismiss();
        const aviso = await this.toast.create({
          message: mensajeDeError(e),
          duration: 3000,
          position: 'top',
          color: 'danger',
        });
        await aviso.present();
      },
    });
  }
}
