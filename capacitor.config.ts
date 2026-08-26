import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recurwords.app',
  appName: 'RecurWords',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      signingType: 'apk',
    },
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#7c3aed',
    },
  },
};

export default config;
