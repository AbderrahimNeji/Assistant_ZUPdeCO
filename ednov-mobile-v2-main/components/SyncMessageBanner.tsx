import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/Themed';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { spacing } from '@/constants/DesignTokens';
import type { SyncMessage } from '@/hooks/useOfflineSync';

type Props = Readonly<{
  message: SyncMessage;
  onDismiss: () => void;
  autoHideMs?: number;
}>;

export function SyncMessageBanner({ message, onDismiss, autoHideMs = 3000 }: Props) {
  const colors = useDynamicColors();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, autoHideMs]);

  if (!message) return null;

  const isSuccess = message.type === 'success';
  const bg = isSuccess ? (colors.success ?? colors.tint) : (colors.danger ?? colors.tint);

  return (
    <Pressable
      onPress={onDismiss}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: bg,
        opacity: 0.95,
      }}
      accessibilityLabel={message.text}
      accessibilityRole="button"
      accessibilityHint="Appuyer pour fermer"
    >
      <MaterialCommunityIcons
        name={isSuccess ? 'check-circle' : 'alert-circle'}
        size={18}
        color="#fff"
      />
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{message.text}</Text>
    </Pressable>
  );
}
