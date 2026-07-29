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
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#f7f8fb',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
