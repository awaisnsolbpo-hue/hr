import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nsolbpo.aihiring',
  appName: 'AI Hiring',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    // Uncomment below if you need to test with local dev server
    // url: 'http://192.168.1.X:5173',
    // cleartext: true
  },

  android: {
    allowMixedContent: true,
    // Enable hardware acceleration
    webContentsDebuggingEnabled: false,
    // Improve performance
    loggingBehavior: 'none'
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#000000"
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true
    }
  }
};

export default config;