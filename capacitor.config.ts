import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.uq.kinet',
  appName: 'KINET',
  webDir: 'www',
  android: {
    allowMixedContent: true, // solo para desarrollo con backend http
  },
};

export default config;
