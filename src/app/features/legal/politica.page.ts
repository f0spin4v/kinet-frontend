import { Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { PoliticaTextoComponent } from './politica-texto';

/** Página pública con la Política de Tratamiento de Datos Personales (Ley 1581 de 2012). */
@Component({
  selector: 'app-politica',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, PoliticaTextoComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/registro" text=""></ion-back-button></ion-buttons>
        <ion-title>Política de datos</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina pagina--estrecha">
        <h1 class="titulo-pagina">Política de tratamiento de datos personales</h1>
        <section class="tarjeta"><app-politica-texto /></section>
      </div>
    </ion-content>
  `,
  styles: `.titulo-pagina { font-size: 22px; margin: 0 0 16px; }`,
})
export class PoliticaPage {}
