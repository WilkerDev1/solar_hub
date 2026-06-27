import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solarhub.app',
  appName: 'Solar Hub',
  webDir: 'out',
  server: {
    androidScheme: 'http'
  }
};

export default config;
