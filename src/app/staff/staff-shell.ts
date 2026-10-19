import { Component, EnvironmentInjector, computed, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  analyticsOutline, calendarOutline, flagOutline, libraryOutline, peopleOutline, personOutline, shieldCheckmarkOutline, triangle,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth';

/** Navegación del equipo. El entrenador solo modera; el administrador ve además cuentas, analítica, temporadas y retos. */
@Component({
  selector: 'app-staff-shell',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs class="shell">
      <ion-tab-bar slot="bottom">
        <div class="marca-lateral"><ion-icon name="triangle" aria-hidden="true"></ion-icon>KINET</div>
        <ion-tab-button tab="moderacion" href="/staff/moderacion">
          <ion-icon aria-hidden="true" name="shield-checkmark-outline"></ion-icon>
          <ion-label>Moderación</ion-label>
        </ion-tab-button>
        @if (esAdmin()) {
          <ion-tab-button tab="cuentas" href="/staff/cuentas">
            <ion-icon aria-hidden="true" name="people-outline"></ion-icon>
            <ion-label>Cuentas</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="analitica" href="/staff/analitica">
            <ion-icon aria-hidden="true" name="analytics-outline"></ion-icon>
            <ion-label>Analítica</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="temporadas" href="/staff/temporadas">
            <ion-icon aria-hidden="true" name="calendar-outline"></ion-icon>
            <ion-label>Temporadas</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="retos" href="/staff/retos">
            <ion-icon aria-hidden="true" name="flag-outline"></ion-icon>
            <ion-label>Retos</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="catalogo" href="/staff/catalogo">
            <ion-icon aria-hidden="true" name="library-outline"></ion-icon>
            <ion-label>Catálogo</ion-label>
          </ion-tab-button>
        }
        <ion-tab-button tab="perfil" href="/staff/perfil">
          <ion-icon aria-hidden="true" name="person-outline"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class StaffShellPage {
  public environmentInjector = inject(EnvironmentInjector);
  private auth = inject(AuthService);
  esAdmin = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  constructor() {
    addIcons({
      shieldCheckmarkOutline, peopleOutline, analyticsOutline, calendarOutline, flagOutline, libraryOutline, personOutline, triangle,
    });
  }
}
