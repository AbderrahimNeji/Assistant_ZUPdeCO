import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Switch } from 'react-native-paper';

import { Text } from '@/components/Themed';
import { useThemeContext } from '@/providers/ThemeContext';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { spacing } from '@/constants/DesignTokens';

export function ThemeToggle() {
  const theme = useThemeContext();
  const colorScheme = useColorScheme();
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';

  if (!theme) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
      }}
    >
      <Pressable
        onPress={theme.toggleTheme}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityLabel="Mode sombre"
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.tint + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name={isDark ? 'weather-night' : 'weather-sunny'}
            size={20}
            color={colors.tint}
          />
        </View>
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Mode sombre</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {isDark ? 'Activé' : 'Désactivé'}
          </Text>
        </View>
      </Pressable>
      <Switch
        value={isDark}
        onValueChange={theme.toggleTheme}
        color={colors.tint}
      />
    </View>
  );
}
