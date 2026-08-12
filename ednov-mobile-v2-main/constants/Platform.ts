import { Platform } from 'react-native';

/** True when running in a browser (react-native-web). */
export const isWeb = Platform.OS === 'web';

/** True when running on a native platform (iOS or Android). */
export const isNative = !isWeb;

/** True when running on iOS. */
export const isIOS = Platform.OS === 'ios';

/** True when running on Android. */
export const isAndroid = Platform.OS === 'android';

/**
 * Enregistrement vocal → génération CR (STT + brouillon) : proposé sur web uniquement,
 * masqué sur les apps natives (iOS / Android) et sur la version web (en mode mobile).
 */
export const sessionVoiceCrRecordingEnabled = false;
