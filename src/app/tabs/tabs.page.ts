import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { gridOutline, medalOutline, personOutline, playCircleOutline, trophyOutline, triangle } from 'ionicons/icons';

/** Navegación del jugador: barra inferior en el móvil y menú lateral en la web (estilos en theme/componentes.scss). */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {
    addIcons({ gridOutline, playCircleOutline, medalOutline, trophyOutline, personOutline, triangle });
  }
}
