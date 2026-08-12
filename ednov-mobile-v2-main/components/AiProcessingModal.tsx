import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';

const AI_STEPS = [
  { label: "Transcription de l'audio", icon: 'microphone' as const },
  { label: 'Script tuteur / élève', icon: 'script-text' as const },
  { label: 'Rédaction du CR', icon: 'file-document-edit-outline' as const },
  { label: 'Ressources pédagogiques', icon: 'book-open-variant' as const },
];

export function AiProcessingModal() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const {
    isUploading,
    aiResult,
    aiResultSessionId,
    hasFreshAnalysis,
    aiError,
    clearError,
    clearResult,
    dismissResult,
  } = useSessionRecording();

  // The modal is visible ONLY when hasFreshAnalysis is true — meaning a recording was
  // just validated. loadSavedResult (DB reads) never sets hasFreshAnalysis, so simply
  // navigating to a session's analysis screen will never trigger this modal.
  const visible = hasFreshAnalysis;

  const handleViewResults = useCallback(() => {
    // Always close the modal first (regardless of whether we can navigate).
    dismissResult();
    if (aiResultSessionId) {
      // aiResult stays in context so the ai-processing screen can read it immediately.
      router.push(`/(tabs)/sessions/${aiResultSessionId}/ai-processing` as never);
    }
  }, [aiResultSessionId, dismissResult, router]);

  const handleIgnore = useCallback(() => {
    // Wipe everything — user is not interested in the result.
    clearResult();
  }, [clearResult]);

  const handleCloseError = useCallback(() => {
    clearError();
  }, [clearError]);

  if (!visible) return null;

  const dangerColor = (colors as { danger?: string }).danger ?? '#ef4444';
  const successColor = (colors as { success?: string }).success ?? '#22c55e';
  const shadow = getCardShadowPlatform(isDark);

  const isSuccess = !isUploading && aiResult != null;
  const isError = !isUploading && aiError != null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (isError) handleCloseError();
        else if (isSuccess) handleIgnore();
      }}
    >
      {/* Backdrop — tap to dismiss success/error (not loading) */}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
        onPress={() => {
          if (isError) handleCloseError();
          else if (isSuccess) handleIgnore();
        }}
        accessibilityLabel="Fermer"
      >
        {/* Card — stop propagation so tapping inside doesn't close */}
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            width: '100%',
            maxWidth: 360,
          }}
        >
          <View
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow,
            }}
          >
            {/* ── LOADING ── */}
            {isUploading && (
              <>
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: colors.tint + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing.md,
                    }}
                  >
                    <ActivityIndicator size="large" color={colors.tint} />
                  </View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: colors.text,
                      textAlign: 'center',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Analyse en cours
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    Transcription, script, CR et ressources en cours de génération.
                  </Text>
                </View>

                <View style={{ gap: spacing.sm }}>
                  {AI_STEPS.map((step) => (
                    <View
                      key={step.label}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingVertical: spacing.xs + 2,
                        paddingHorizontal: spacing.sm + 4,
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <ActivityIndicator size="small" color={colors.tint} />
                      <MaterialCommunityIcons
                        name={step.icon}
                        size={18}
                        color={colors.tint}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.text,
                          fontWeight: '500',
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── SUCCESS ── */}
            {isSuccess && (
              <>
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: successColor + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing.md,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="check-circle-outline"
                      size={36}
                      color={successColor}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: colors.text,
                      textAlign: 'center',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Analyse terminée
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    Script, CR brouillon et ressources pédagogiques sont prêts.
                  </Text>
                </View>

                <View style={{ gap: spacing.sm }}>
                  <AppButton
                    title="Voir les résultats"
                    onPress={handleViewResults}
                    variant="primary"
                    icon="robot-outline"
                    accessibilityLabel="Voir les résultats de l'analyse IA"
                  />
                  <AppButton
                    title="Ignorer"
                    onPress={handleIgnore}
                    variant="secondary"
                    accessibilityLabel="Ignorer et fermer cette notification"
                  />
                </View>
              </>
            )}

            {/* ── ERROR ── */}
            {isError && (
              <>
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: dangerColor + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing.md,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={36}
                      color={dangerColor}
                    />
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
                    Erreur lors de l&apos;analyse
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      textAlign: 'center',
                      lineHeight: 20,
                    }}
                  >
                    {aiError}
                  </Text>
                </View>

                <AppButton
                  title="Fermer"
                  onPress={handleCloseError}
                  variant="secondary"
                  accessibilityLabel="Fermer le message d'erreur"
                />
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
