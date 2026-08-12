import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { BackHandler, Modal, Platform, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { isAndroid, isWeb } from '@/constants/Platform';

export type ReportValidateWaitModalProps = Readonly<{
  visible: boolean;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}>;

/** Avertit le VSC lorsque tous les tuteurs n’ont pas renseigné le CR (classe entière). */
export function ReportValidateWaitModal({
  visible,
  description,
  onClose,
  onConfirm,
  loading = false,
}: ReportValidateWaitModalProps) {
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
            maxWidth: 400,
            backgroundColor: colors.background,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            ...getCardShadowPlatform(isDark),
            borderWidth: 1,
            borderColor: colors.warning + '50',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.warning + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.warning} />
            </View>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
              marginBottom: spacing.md,
            }}
          >
            Compte rendu incomplet
          </Text>
          <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
            {description
              .split('\n\n')
              .filter((p) => p.trim().length > 0)
              .map((paragraph, index) => (
                <Text
                  key={index}
                  style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22, textAlign: 'center' }}
                >
                  {paragraph}
                </Text>
              ))}
          </View>
          <View style={{ gap: spacing.sm }}>
            <AppButton
              title="Valider quand même"
              variant="primary"
              icon="check-decagram"
              onPress={onConfirm}
              loading={loading}
              disabled={loading}
              accessibilityLabel="Valider le compte rendu malgré les tuteurs en attente"
            />
            <AppButton
              title="Annuler"
              variant="secondary"
              onPress={onClose}
              disabled={loading}
              accessibilityLabel="Annuler la validation"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
