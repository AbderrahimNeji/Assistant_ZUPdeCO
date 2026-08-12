import { useWindowDimensions } from 'react-native';

import { WEB_DESKTOP_MIN_WIDTH } from '@/constants/breakpoints';
import { isWeb } from '@/constants/Platform';

/** True on web when the window is wide enough to use desktop-oriented layouts. */
export function useIsWebDesktop(): boolean {
  const { width } = useWindowDimensions();
  return isWeb && width >= WEB_DESKTOP_MIN_WIDTH;
}
