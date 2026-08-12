import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Themed';
import { useDynamicColors } from '@/providers/BrandingProvider';

interface PendingSyncBadgeProps {
  /** Override label. Defaults to "En attente de sync". */
  label?: string;
}

/** Small badge indicating a CR is saved locally and waiting for synchronisation. */
export function PendingSyncBadge({ label = 'En attente de sync' }: PendingSyncBadgeProps) {
  const colors = useDynamicColors();
  const color = colors.warning ?? colors.tint;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: color + '18',
        borderWidth: 1,
        borderColor: color + '60',
        marginTop: 6,
      }}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <MaterialCommunityIcons name="cloud-sync-outline" size={12} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}
