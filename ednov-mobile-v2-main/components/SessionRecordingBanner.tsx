import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';
import { spacing } from '@/constants/DesignTokens';

const MIN_VALID_SECONDS = 30;

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionRecordingBanner() {
  const colors = useDynamicColors();
  const router = useRouter();
  const {
    recordingSessionId,
    isRecording,
    isUploading,
    recordingStartedAt,
  } = useSessionRecording();

  const [now, setNow] = useState(Date.now());
  const elapsedSeconds = recordingStartedAt
    ? Math.floor((now - recordingStartedAt) / 1000)
    : 0;
  const bannerIsGreen = isRecording && elapsedSeconds >= MIN_VALID_SECONDS;

  useEffect(() => {
    if (!isRecording && !isUploading) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRecording, isUploading]);

  if (!isRecording && !isUploading) return null;

  const dangerColor = (colors as { danger?: string }).danger ?? colors.tint;
  const successColor = (colors as { success?: string }).success ?? '#22c55e';
  const bannerColor = isRecording
    ? (bannerIsGreen ? successColor : dangerColor)
    : colors.backgroundSecondary;
  const isRecordingPhase = isRecording;
  const textColor = isRecordingPhase ? '#fff' : colors.text;

  const goToTarget = () => {
    if (recordingSessionId) {
      if (isRecording) {
        router.push(`/(tabs)/sessions/${recordingSessionId}/recording` as never);
      } else {
        router.push(`/(tabs)/sessions/${recordingSessionId}` as never);
      }
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: bannerColor,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
      accessibilityLabel={isRecordingPhase ? 'Enregistrement en cours' : 'Génération du CR en cours'}
      accessibilityRole="text"
    >
      <Pressable
        onPress={recordingSessionId ? goToTarget : undefined}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flex: 1,
          opacity: recordingSessionId && pressed ? 0.85 : 1,
        })}
        accessibilityLabel={isRecording ? "Ouvrir l'écran d'enregistrement" : 'Voir la séance'}
        accessibilityRole={recordingSessionId ? 'button' : 'text'}
      >
        {isRecordingPhase && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#fff',
              opacity: 0.95,
            }}
          />
        )}
        {isUploading && (
          <ActivityIndicator size="small" color={colors.tint} />
        )}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: textColor,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {isRecordingPhase
            ? `Enregistrement en cours · ${formatElapsed(elapsedSeconds)}`
            : 'Génération du CR en cours…'}
        </Text>
        {recordingSessionId && (
          <MaterialCommunityIcons
            name="open-in-new"
            size={18}
            color={textColor}
          />
        )}
      </Pressable>
    </View>
  );
}
