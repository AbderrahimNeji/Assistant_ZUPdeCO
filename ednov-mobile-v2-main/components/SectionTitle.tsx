import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { getTypographyStyles } from '@/constants/DesignTokens';

type SectionTitleProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

export function SectionTitle({ children, style }: SectionTitleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const typographyStyles = getTypographyStyles({ text: colors.text, textSecondary: colors.textSecondary });

  return (
    <Text
      style={[
        typographyStyles.caption,
        {
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        style,
      ]}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}
