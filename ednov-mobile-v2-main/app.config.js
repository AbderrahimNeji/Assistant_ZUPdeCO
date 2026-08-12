const path = require('path');
/** Web deploy: `EXPO_ENV_OVERLAY=.env.web.dev`, `.env.web.testing` ou `.env.web.prod` (voir package.json).
 * L'overlay est chargé EN PREMIER (process.env vide) puis .env en fallback sans override,
 * garantissant que les valeurs de l'overlay ne sont jamais écrasées par .env. */
if (process.env.EXPO_ENV_OVERLAY) {
  require('dotenv').config({
    path: path.resolve(__dirname, process.env.EXPO_ENV_OVERLAY),
  });
}
require('dotenv').config();

module.exports = () => ({
  expo: {
    name: 'ednov-mobile-v2',
    slug: 'ednov-mobile-v2',
    owner: 'ednov-organization',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'ednovmobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ['audio'],
      },
    },
    android: {
      package: 'com.zupdeco.ednov',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: '1061c1ab-16ce-4b8d-a3f1-950672c912e1',
      },
      EXPO_PUBLIC_USE_STATIC_DATA: process.env.EXPO_PUBLIC_USE_STATIC_DATA,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      /** Web only: when EXPO_PUBLIC_API_URL is relative (/api/v1), prepend this origin (e.g. https://api.example.com). In __DEV__, defaults to http://localhost:3000 if unset. */
      EXPO_PUBLIC_WEB_API_ORIGIN: process.env.EXPO_PUBLIC_WEB_API_ORIGIN,
      /** On Android, used to replace localhost in API_URL so the device can reach your dev machine (e.g. 192.168.1.10 or 10.0.2.2 for emulator). */
      EXPO_PUBLIC_DEV_HOST: process.env.EXPO_PUBLIC_DEV_HOST,
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
  },
});
