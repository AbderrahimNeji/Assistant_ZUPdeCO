import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { CONTENT_PADDING_HORIZONTAL, borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useUserPreferences, useUpdateNotificationPreferences } from '@/hooks/useUserPreferences';
import { requestSessionReminderPermission, requestCrReminderPermission } from '@/services/notificationPermissions';
import { useColorScheme } from '@/components/useColorScheme';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { NotificationPreferences } from '@/types/userPreferences';

const RAPPEL_SEANCE_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
] as const;

const RAPPEL_CR_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 120, label: '2 h' },
  { value: 1440, label: '24 h' },
] as const;

export default function NotificationSettingsScreen() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const { data: prefs, isLoading } = useUserPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const notifications = prefs?.interfaceConfigs?.notifications ?? {};
  const rappelCR = notifications.rappelCR !== false;
  const rappelSeance = notifications.rappelSeance !== false;
  const rappelSeanceMinutesBefore = notifications.rappelSeanceMinutesBefore ?? 15;
  const rappelCRDelayMinutes = notifications.rappelCRDelayMinutes ?? 60;

  const getChipTextColor = useCallback(
    (isActive: boolean) => {
      if (!isActive) return colors.textSecondary;
      return isDark ? colors.text : colors.background;
    },
    [colors.textSecondary, colors.text, colors.background, isDark]
  );

  const update = useCallback(
    (next: NotificationPreferences) => {
      if (!prefs) return;
      updateMutation.mutate({ current: prefs, notifications: next });
    },
    [prefs, updateMutation]
  );

  const setRappelCR = useCallback(
    async (value: boolean) => {
      if (value) {
        const granted = await requestCrReminderPermission();
        if (!granted) {
          Alert.alert(
            'Notifications désactivées',
            'Activez les notifications dans les paramètres pour recevoir les rappels de CR.'
          );
        }
      }
      update({ ...notifications, rappelCR: value });
    },
    [notifications, update]
  );

  const setRappelSeanceMinutesBefore = useCallback(
    (value: number) => {
      update({ ...notifications, rappelSeanceMinutesBefore: value });
    },
    [notifications, update]
  );

  const setRappelCRDelayMinutes = useCallback(
    (value: number) => {
      update({ ...notifications, rappelCRDelayMinutes: value });
    },
    [notifications, update]
  );

  const setRappelSeance = useCallback(
    async (value: boolean) => {
      if (value) {
        const granted = await requestSessionReminderPermission();
        if (!granted) {
          Alert.alert(
            'Notifications désactivées',
            'Activez les notifications dans les paramètres pour recevoir les rappels de séances.'
          );
        }
      }
      update({ ...notifications, rappelSeance: value });
    },
    [notifications, update]
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
        <LoadingScreen message="Chargement…" backgroundColor={colors.pageBackground} />
      </View>
    );
  }

  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
    marginBottom: spacing.lg,
    ...getCardShadowPlatform(isDark),
  };

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
          paddingTop: spacing.lg,
          paddingBottom: scrollBottom,
        }}
      >
      <View style={cardStyle}>
        <View style={[rowStyle, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.tint} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Rappel CR</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Recevoir une notification après la séance si le CR n'est pas saisi
              </Text>
            </View>
          </View>
          <Switch
            value={rappelCR}
            onValueChange={setRappelCR}
            trackColor={{ false: colors.border, true: colors.tint + '80' }}
            thumbColor={rappelCR ? colors.tint : colors.textSecondary}
            disabled={updateMutation.isPending}
          />
        </View>
        {rappelCR && (
          <View style={[rowStyle, { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm }]}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, paddingHorizontal: spacing.lg }}>
              Délai après la fin de séance
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              {RAPPEL_CR_OPTIONS.map((opt) => {
                const isActive = rappelCRDelayMinutes === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRappelCRDelayMinutes(opt.value)}
                    style={{
                      borderRadius: borderRadius.lg,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 8,
                      backgroundColor: isActive ? colors.tint : colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: isActive ? colors.tint : colors.border,
                    }}
                    accessibilityLabel={`Rappel CR : ${opt.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: getChipTextColor(isActive) }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <View style={rowStyle}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.tint} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Rappel séance</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Recevoir des rappels pour les séances à venir
              </Text>
            </View>
          </View>
          <Switch
            value={rappelSeance}
            onValueChange={setRappelSeance}
            trackColor={{ false: colors.border, true: colors.tint + '80' }}
            thumbColor={rappelSeance ? colors.tint : colors.textSecondary}
            disabled={updateMutation.isPending}
          />
        </View>
        {rappelSeance && (
          <View style={[rowStyle, { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm }]}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, paddingHorizontal: spacing.lg }}>
              Rappel envoyé avant le début
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              {RAPPEL_SEANCE_OPTIONS.map((opt) => {
                const isActive = rappelSeanceMinutesBefore === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRappelSeanceMinutesBefore(opt.value)}
                    style={{
                      borderRadius: borderRadius.lg,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 8,
                      backgroundColor: isActive ? colors.tint : colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: isActive ? colors.tint : colors.border,
                    }}
                    accessibilityLabel={`Rappel séance : ${opt.label} avant`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: getChipTextColor(isActive) }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
