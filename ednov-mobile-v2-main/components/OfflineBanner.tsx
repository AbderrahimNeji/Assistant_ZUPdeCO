import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Themed';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { spacing } from '@/constants/DesignTokens';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

export function OfflineBanner() {
  const colors = useDynamicColors();
  const pendingCount = useOfflineQueueStore((s) => s.queue.length);

  const label =
    pendingCount > 0
      ? `Hors ligne — ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`
      : 'Hors ligne — Données en cache';

  return (
    <View
      testID="offline-banner"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.warning ?? colors.tint,
        opacity: 0.95,
      }}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <MaterialCommunityIcons name="wifi-off" size={18} color="#fff" />
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{label}</Text>
      {pendingCount > 0 ? (
        <View
          style={{
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 5,
            backgroundColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{pendingCount}</Text>
        </View>
      ) : null}
    </View>
  );
}
