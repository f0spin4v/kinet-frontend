import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { triangle } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { iniciales } from '../../../core/utils/texto';

@Component({
  selector: 'app-encabezado',
  templateUrl: './encabezado.html',
  styleUrls: ['./encabezado.scss'],
  imports: [IonIcon, RouterLink],
})
export class EncabezadoComponent {
  private usuario = inject(AuthService).usuario;

  iniciales = computed(() => iniciales(this.usuario()?.nombre));

  constructor() {
    addIcons({ triangle });
  }
}
