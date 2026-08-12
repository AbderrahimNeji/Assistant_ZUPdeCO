import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Themed';

/** Minimal color set used by InfoRow (accepts Colors or ColorPalette). */
export type InfoRowColors = { border: string; text: string; textSecondary: string };

export type InfoRowProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  label: string;
  value: string;
  colors: InfoRowColors;
  last?: boolean;
};

export function InfoRow({ icon, iconColor, label, value, colors, last = false }: Readonly<InfoRowProps>) {
  return (
    <View
      style={{
        padding: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: iconColor + '18',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            color: colors.textSecondary,
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}
