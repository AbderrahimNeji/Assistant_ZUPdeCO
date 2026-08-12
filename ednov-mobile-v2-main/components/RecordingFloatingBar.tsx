import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useIsWebDesktop } from '@/hooks/useWebDesktop';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';

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

export function RecordingFloatingBar() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const isWebDesktop = useIsWebDesktop();
  const router = useRouter();

  const {
    isRecording,
    recordingSessionId,
    recordingStartedAt,
    cancelRecording,
    stopRecordingAndGenerate,
  } = useSessionRecording();

  const [now, setNow] = useState(Date.now());
  const elapsedSeconds = recordingStartedAt
    ? Math.floor((now - recordingStartedAt) / 1000)
    : 0;
  const canValidate = elapsedSeconds >= MIN_VALID_SECONDS;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isRecording, pulseAnim]);

  const handleCancel = useCallback(async () => {
    await cancelRecording();
  }, [cancelRecording]);

  const handleValidate = useCallback(() => {
    stopRecordingAndGenerate();
  }, [stopRecordingAndGenerate]);

  const goToSession = useCallback(() => {
    if (recordingSessionId) {
      router.push(`/(tabs)/sessions/${recordingSessionId}` as never);
    }
  }, [recordingSessionId, router]);

  const goToChat = useCallback(() => {
    if (recordingSessionId) {
      router.push(`/(tabs)/sessions/${recordingSessionId}/chat` as never);
    }
  }, [recordingSessionId, router]);

  if (!isRecording) return null;

  const dangerColor = (colors as { danger?: string }).danger ?? '#ef4444';
  const successColor = (colors as { success?: string }).success ?? '#22c55e';
  const timerColor = canValidate ? successColor : dangerColor;

  const tabBarHeight =
    Platform.OS === 'web' && isWebDesktop
      ? 0
      : Platform.OS === 'ios'
        ? 88
        : Platform.OS === 'web'
          ? 64
          : 64;
  const bottom =
    Platform.OS === 'web' && isWebDesktop
      ? Math.max(insets.bottom, 12) + 16
      : tabBarHeight + insets.bottom + 10;

  const shadow = getCardShadowPlatform(isDark);
  const extraShadow = Platform.OS === 'android'
    ? { elevation: 10 }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.18,
        shadowRadius: 14,
      };

  return (
    <View
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom,
        ...(Platform.OS === 'web'
          ? { maxWidth: 480, alignSelf: 'center' as const, left: undefined, right: undefined, width: '90%' }
          : {}),
        borderRadius: borderRadius.full,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow,
        ...extraShadow,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingLeft: spacing.md,
        paddingRight: spacing.sm,
        gap: spacing.sm,
        zIndex: 999,
      }}
      accessibilityLabel="Barre d'enregistrement en cours"
      accessibilityRole="toolbar"
    >
      {/* Pulsing record dot */}
      <Animated.View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: timerColor,
          opacity: pulseAnim,
          flexShrink: 0,
        }}
      />

      {/* Mic icon */}
      <MaterialCommunityIcons
        name="microphone"
        size={20}
        color={timerColor}
        style={{ flexShrink: 0 }}
      />

      {/* Elapsed timer */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: timerColor,
          fontVariant: ['tabular-nums'],
          flex: 1,
          minWidth: 0,
        }}
        numberOfLines={1}
      >
        {formatElapsed(elapsedSeconds)}
      </Text>

      {/* Divider */}
      <View style={{ width: 1, height: 22, backgroundColor: colors.border, flexShrink: 0 }} />

      {/* Go to session details */}
      <Pressable
        onPress={goToSession}
        style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
        accessibilityLabel="Voir la séance en cours d'enregistrement"
        accessibilityRole="button"
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.text} />
        </View>
      </Pressable>

      {/* Go to AI chat for this session */}
      <Pressable
        onPress={goToChat}
        style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
        accessibilityLabel="Ouvrir l'assistant IA de la séance"
        accessibilityRole="button"
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="robot-outline" size={20} color={colors.tint} />
        </View>
      </Pressable>

      {/* Divider before main actions */}
      <View style={{ width: 1, height: 22, backgroundColor: colors.border, flexShrink: 0 }} />

      {/* Cancel */}
      <Pressable
        onPress={handleCancel}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        accessibilityLabel="Annuler l'enregistrement"
        accessibilityRole="button"
      >
        <View
          style={{
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.sm + 4,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            minHeight: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            Annuler
          </Text>
        </View>
      </Pressable>

      {/* Validate */}
      <Pressable
        onPress={canValidate ? handleValidate : undefined}
        disabled={!canValidate}
        style={({ pressed }) => {
          if (!canValidate) return { opacity: 0.38 };
          return { opacity: pressed ? 0.75 : 1 };
        }}
        accessibilityLabel={
          canValidate
            ? "Valider l'enregistrement et générer le CR"
            : "Enregistrez au moins 30 secondes pour valider"
        }
        accessibilityRole="button"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: successColor,
            borderRadius: borderRadius.full,
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.sm + 4,
            minHeight: 36,
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
            Valider
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
