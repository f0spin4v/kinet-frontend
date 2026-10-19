import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { inject, provideAppInitializer } from '@angular/core';
import { TemaService } from './app/core/services/tema';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/core/interceptors/auth-interceptor';
import {EntrenamientoService} from './app/core/services/entrenamiento';
import {RetoService} from './app/core/services/retos';
import {EntrenamientoMockService} from './app/core/mocks/entrenamiento-mock';
import {RetoMockService} from './app/core/mocks/retos-mock';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(TemaService).iniciar()),
    { provide: EntrenamientoService, useClass: EntrenamientoMockService },
    { provide: RetoService, useClass: RetoMockService },
  ],
});
