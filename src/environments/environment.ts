import { Capacitor } from '@capacitor/core';

// En el navegador la API se busca en el mismo equipo (puerto 8080); en el emulador de Android, en 10.0.2.2.
const host = Capacitor.getPlatform() === 'android' ? '10.0.2.2' : window.location.hostname;

export const environment = {
  production: false,
  apiUrl: `http://${host}:8080/api`,
};
