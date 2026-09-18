import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.meetdating.app',
  appName: 'love that',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' }
};
export default config;
