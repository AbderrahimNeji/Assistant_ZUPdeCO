import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';
import type { PedagogicalResource } from '@/services/aiSession';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';

function cardStyle(colors: ColorPalette, isDark: boolean) {
  return {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
    marginBottom: spacing.md,
    ...getCardShadowPlatform(isDark),
  };
}

function isStructuredResource(r: PedagogicalResource | string): r is PedagogicalResource {
  return typeof r === 'object' && r !== null && 'title' in r;
}

export default function ResourceDetailScreen() {
  const { id, index, reportId } = useLocalSearchParams<{ id: string; index: string; reportId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
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
  const resources = isThisSession && aiResult?.generatedResources ? aiResult.generatedResources : [];
  const idx = index != null ? Number(index) : 0;
  const resource =
    Number.isInteger(idx) && idx >= 0 && idx < resources.length ? resources[idx] : null;

  const contentContainerStyle = {
    flex: 1,
    backgroundColor: colors.pageBackground,
    paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET,
    paddingHorizontal: spacing.lg,
    paddingBottom: scrollBottom,
  };

  const hasResource = resource != null;
  if (hasResource) {
    const structured = isStructuredResource(resource);
    return (
      <ScrollView
      style={{ flex: 1, backgroundColor: colors.pageBackground }}
      contentContainerStyle={contentContainerStyle}
    >
      {structured ? (
        <>
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs }}>
              {resource.title || 'Ressource pédagogique'}
            </Text>
          </View>

          {resource.problem ? (
            <View style={{ marginBottom: spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <MaterialCommunityIcons name="help-circle-outline" size={22} color={colors.tint} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Énoncé</Text>
              </View>
              <View style={cardStyle(colors, isDark)}>
                <View style={{ padding: spacing.lg }}>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} selectable>
                    {resource.problem}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {resource.solution ? (
            <View style={{ marginBottom: spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.tint} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Solution / Corrigé</Text>
              </View>
              <View style={cardStyle(colors, isDark)}>
                <View style={{ padding: spacing.lg }}>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} selectable>
                    {resource.solution}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {resource.problem || resource.solution ? null : (
            <View style={cardStyle(colors, isDark)}>
              <View style={{ padding: spacing.lg }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucun contenu détaillé.</Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <MaterialCommunityIcons name="text-box-outline" size={22} color={colors.tint} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Description</Text>
          </View>
          <View style={cardStyle(colors, isDark)}>
            <View style={{ padding: spacing.lg }}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} selectable>
                {typeof resource === 'string' ? resource : ''}
              </Text>
            </View>
          </View>
        </View>
      )}
      </ScrollView>
    );
  }

  return (
    <View style={[contentContainerStyle, { justifyContent: 'center', paddingVertical: spacing.xxl }]}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
        Ressource non disponible.
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
        icon="arrow-left"
      />
    </View>
  );
}
