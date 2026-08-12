/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 *
 * On Android/iOS we do not apply default theme color/backgroundColor so that
 * explicit styles from BrandingProvider (useDynamicColors) are never overridden.
 * On web, theme defaults are still applied.
 */

import { Platform, Text as DefaultText, View as DefaultView } from 'react-native';

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

/** Max font scale multiplier (e.g. 1.3 = 130%). Helps prevent layout overflow when user increases system font size. */
const MAX_FONT_SIZE_MULTIPLIER = 1.3;

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <DefaultText
      style={isNative ? style : [{ color }, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={isNative ? style : [{ backgroundColor }, style]} {...otherProps} />;
}
