import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import React, { useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { ScriptTurnBubble } from '@/components/ScriptTurnBubble';
import { parseScriptTurns } from '@/utils/scriptParser';

// ─── Legend ───────────────────────────────────────────────────────────────────

function ScriptLegend() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const successColor = (colors as { success?: string }).success ?? '#22c55e';

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginBottom: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: isDark ? colors.backgroundSecondary : colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.tint,
          }}
        />
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Tuteur</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: successColor,
          }}
        />
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Élève</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScriptScreen() {
  const { id, reportId } = useLocalSearchParams<{ id: string; reportId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { aiResult, aiResultSessionId } = useSessionRecording();

  const aiProcessingQuery = reportId ? `?reportId=${reportId}` : '';
  const backToAiProcessing = `/(tabs)/sessions/${id}/ai-processing${aiProcessingQuery}` as const;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(backToAiProcessing as never);
            }
          }}
          style={({ pressed }) => ({
            marginRight: 12,
            padding: 10,
            margin: -10,
            opacity: pressed ? 0.7 : 1,
            minWidth: 44,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
          })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Retour aux résultats de l'analyse"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [id, reportId, navigation, router, colors.text, backToAiProcessing]);

  const isThisSession = id != null && aiResultSessionId === id;
  const script = isThisSession && aiResult?.generatedScript ? aiResult.generatedScript.trim() : '';

  const turns = useMemo(() => (script ? parseScriptTurns(script) : []), [script]);
  const hasStructuredTurns =
    turns.length >= 2 && turns.some((t) => t.speaker === 'tuteur') && turns.some((t) => t.speaker === 'eleve');

  /* ── Derived render flags ── */
  const renderEmpty = !script;
  const renderConversation = script && hasStructuredTurns;
  const successColorGlobal = (colors as { success?: string }).success ?? '#22c55e';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.pageBackground }}
      contentContainerStyle={{
        paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: scrollBottom,
      }}
    >
      {/* ── Empty state ── */}
      {renderEmpty && (
        <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.textSecondary + '18',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <MaterialCommunityIcons name="script-text-outline" size={32} color={colors.textSecondary} />
          </View>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
              marginBottom: spacing.xs,
            }}
          >
            Script non disponible
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: spacing.xl,
            }}
          >
            Le script de cette séance n'a pas encore été généré.
          </Text>
          <AppButton
            title="Retour aux résultats"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(backToAiProcessing as never);
              }
            }}
            variant="secondary"
            accessibilityLabel="Retour aux résultats de l'analyse"
          />
        </View>
      )}

      {/* ── Conversation view ── */}
      {renderConversation && (
        <>
          {/* Stats bar */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.tint + '14',
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.tint + '30',
                paddingVertical: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tint }}>
                {turns.filter((t) => t.speaker === 'tuteur').length}
              </Text>
              <Text style={{ fontSize: 11, color: colors.tint, opacity: 0.8, fontWeight: '500' }}>
                répliques tuteur
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: successColorGlobal + '14',
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: successColorGlobal + '30',
                paddingVertical: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: successColorGlobal }}>
                {turns.filter((t) => t.speaker === 'eleve').length}
              </Text>
              <Text style={{ fontSize: 11, color: successColorGlobal, opacity: 0.8, fontWeight: '500' }}>
                répliques élève
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.backgroundSecondary,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{turns.length}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>échanges</Text>
            </View>
          </View>

          <ScriptLegend />

          {turns.map((turn, i) => (
            <ScriptTurnBubble key={`${turn.speaker}-${i}`} turn={turn} index={i} />
          ))}
        </>
      )}

      {/* ── Raw text fallback (script present but no structured turns detected) ── */}
      {Boolean(script) && !hasStructuredTurns && (
        <View
          style={{
            borderRadius: borderRadius.lg,
            backgroundColor: colors.backgroundSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            ...getCardShadowPlatform(isDark),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.tint + '10',
            }}
          >
            <MaterialCommunityIcons name="script-text-outline" size={18} color={colors.tint} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Script de la séance</Text>
          </View>
          <View style={{ padding: spacing.lg }}>
            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} selectable>
              {script}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
