import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light impact for expand/collapse and card taps. No-op on web. */
export function triggerLight(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium impact for filter apply and refresh. No-op on web. */
export function triggerMedium(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
