import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useDynamicColors } from '@/providers/BrandingProvider';

type Props = Readonly<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}>;

/** Full-bleed shell for tabs and auth (no max-width column). */
export function WebDesktopAppFrame({ children, style }: Props) {
  const colors = useDynamicColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
});
