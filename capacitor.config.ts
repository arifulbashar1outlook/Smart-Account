import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartspend.tracker',
  appName: 'SmartSpend Tracker',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']
    }
  }
};

export default config;