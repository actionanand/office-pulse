import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.actionanand.officepulse.app',
  appName: 'Office Pulse',
  webDir: 'dist/office-pulse/browser',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#f7f8fb',
  },
};

export default config;
