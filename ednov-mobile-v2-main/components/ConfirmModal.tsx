import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { BackHandler, Modal, Platform, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { isAndroid, isWeb } from '@/constants/Platform';

export type ConfirmModalProps = Readonly<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  confirmAccessibilityLabel?: string;
  cancelAccessibilityLabel?: string;
}>;

/** Shared confirm dialog (same layout as logout confirm). */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  icon = 'help-circle-outline',
  onClose,
  onConfirm,
  loading = false,
  error = null,
  confirmAccessibilityLabel,
  cancelAccessibilityLabel,
}: ConfirmModalProps) {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!visible || !isAndroid) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible || !isWeb) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.background,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            ...getCardShadowPlatform(isDark),
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.tint + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name={icon} size={28} color={colors.tint} />
            </View>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: error ? spacing.sm : spacing.xl,
            }}
          >
            {message}
          </Text>
          {error ? (
            <View
              style={{
                backgroundColor: (colors.danger ?? '#e53935') + '14',
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                marginBottom: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={colors.danger ?? '#e53935'}
              />
              <Text style={{ flex: 1, fontSize: 13, color: colors.danger ?? '#e53935' }}>{error}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              title={cancelLabel}
              onPress={onClose}
              variant="secondary"
              disabled={loading}
              accessibilityLabel={cancelAccessibilityLabel ?? cancelLabel}
              style={{ flex: 1 }}
            />
            <AppButton
              title={confirmLabel}
              onPress={() => {
                void onConfirm();
              }}
              variant="primary"
              loading={loading}
              disabled={loading}
              accessibilityLabel={confirmAccessibilityLabel ?? confirmLabel}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
