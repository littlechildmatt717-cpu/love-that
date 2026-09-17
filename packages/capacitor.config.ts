import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovethat.app',
  appName: 'love that',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    manifest: {
      '$': {
        'xmlns:android': 'http://schemas.android.com/apk/res/android'
      }
    }
  }
};

export default config;
