import { Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-test',
  templateUrl: './test.html',
  styleUrls: ['./test.scss'],
  imports: [IonContent],
})
export class TestPage {
  usuario = inject(AuthService).usuario;
}
