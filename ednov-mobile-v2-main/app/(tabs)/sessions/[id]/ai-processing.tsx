import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, View } from 'react-native';

import { isAndroid } from '@/constants/Platform';

import { AppButton } from '@/components/AppButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';
import { getSessionReport } from '@/services/comptesRendus';
import type { PedagogicalResource } from '@/services/aiSession';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { ScriptTurnBubble } from '@/components/ScriptTurnBubble';
import { parseScriptTurns } from '@/utils/scriptParser';

const SCRIPT_PREVIEW_TURNS = 4;

function isStructuredResource(r: PedagogicalResource | string): r is PedagogicalResource {
  return typeof r === 'object' && r !== null && 'title' in r;
}

const AI_STEPS = [
  { label: 'Transcription de l\'audio', icon: 'microphone' as const },
  { label: 'Script tuteur / élève', icon: 'script-text' as const },
  { label: 'Rédaction du CR', icon: 'file-document-edit-outline' as const },
  { label: 'Ressources pédagogiques', icon: 'book-open-variant' as const },
];

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

export default function AiProcessingScreen() {
  const { id, reportId } = useLocalSearchParams<{ id: string; reportId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';

  const isFocused = useIsFocused();

  const {
    recordingSessionId,
    isUploading,
    aiError,
    aiResult,
    aiResultSessionId,
    clearError,
    clearResult,
    loadSavedResult,
  } = useSessionRecording();

  const isProcessingThisSession = id != null && recordingSessionId === id && isUploading;
  const hasResultThisSession = id != null && aiResultSessionId === id && aiResult != null;
  const hasErrorThisSession = id != null && (recordingSessionId === id || aiResultSessionId === id) && aiError != null;

  const shouldFetchSavedReport =
    id != null &&
    reportId != null &&
    !hasResultThisSession &&
    !isProcessingThisSession &&
    !hasErrorThisSession;

  const {
    data: savedReport,
    isLoading: isLoadingSavedReport,
  } = useQuery({
    queryKey: ['session-report', id, reportId],
    queryFn: () => getSessionReport(id!, reportId!),
    enabled: shouldFetchSavedReport,
  });

  useEffect(() => {
    // Guard: only load when this screen is actually in focus.
    // Without this, a background ai-processing instance (still in the nav stack) would
    // call loadSavedResult() after the user presses "Ignorer" on the modal, instantly
    // restoring aiResult and causing the modal to reappear.
    if (!isFocused) return;
    if (
      id == null ||
      reportId == null ||
      !savedReport ||
      hasResultThisSession
    ) return;
    const hasContent =
      (savedReport.script != null && savedReport.script.trim() !== '') ||
      (savedReport.generatedResources != null && savedReport.generatedResources.length > 0) ||
      (savedReport.commentaire != null && savedReport.commentaire.trim() !== '');
    if (hasContent) {
      loadSavedResult(id, {
        reportId: savedReport.id,
        generatedScript: savedReport.script ?? undefined,
        generatedComment: savedReport.commentaire ?? undefined,
        generatedResources: savedReport.generatedResources ?? [],
      });
    }
  }, [isFocused, id, reportId, savedReport, hasResultThisSession, loadSavedResult]);

  const showLoading =
    isProcessingThisSession ||
    (id != null && recordingSessionId === id && !hasResultThisSession && !hasErrorThisSession) ||
    (shouldFetchSavedReport && isLoadingSavedReport);
  const showResults = hasResultThisSession && aiResult;
  const showError = hasErrorThisSession && aiError;
  const showSavedReportEmpty =
    reportId != null &&
    savedReport != null &&
    !hasResultThisSession &&
    !(savedReport.script?.trim()) &&
    !(savedReport.generatedResources?.length) &&
    !(savedReport.commentaire?.trim());

  const handleBack = useCallback(() => {
    clearError();
    clearResult();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(id ? `/(tabs)/sessions/${id}` as never : ('/(tabs)/sessions' as never));
    }
  }, [id, router, clearError, clearResult]);

  useEffect(() => {
    if (!isAndroid) return;
    const handler = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [handleBack]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: 'Analyse IA',
        headerIcon: 'robot-outline',
        headerLeft: () => (
          <Pressable
            onPress={handleBack}
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
            accessibilityLabel="Retour au détail de la séance"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        ),
      });
    }, [navigation, colors.text, handleBack])
  );

  const scriptReportQuery = aiResult?.reportId ? `?reportId=${aiResult.reportId}` : '';
  const scriptPath = `/(tabs)/sessions/${id}/script${scriptReportQuery}`;
  const resourceReportQuery = aiResult?.reportId ? `&reportId=${aiResult.reportId}` : '';

  const contentContainerStyle = {
    flexGrow: 1,
    backgroundColor: colors.pageBackground,
    paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET,
    paddingHorizontal: spacing.lg,
    paddingBottom: scrollBottom,
  };

  /** Results ScrollView must not use flex:1 on content so content can scroll. */
  const resultsContentStyle = {
    paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET,
    paddingHorizontal: spacing.lg,
    paddingBottom: scrollBottom,
  };

  if (showLoading) {
    const isLoadingHistory = shouldFetchSavedReport && isLoadingSavedReport;
    return (
      <View style={[contentContainerStyle, { justifyContent: 'center', paddingBottom: spacing.xxl }]}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <ActivityIndicator size="large" color={colors.tint} style={{ marginBottom: spacing.lg }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.sm }}>
            {isLoadingHistory ? 'Chargement des résultats enregistrés' : "L'IA analyse votre séance"}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
            {isLoadingHistory
              ? 'Récupération du script, du CR et des ressources pédagogiques.'
              : 'Transcription, script, compte rendu et ressources pédagogiques sont en cours de génération.'}
          </Text>
        </View>
        <View style={{ gap: spacing.md }}>
          {AI_STEPS.map((step, index) => (
            <View
              key={step.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.md,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <ActivityIndicator size="small" color={colors.tint} />
              <MaterialCommunityIcons name={step.icon} size={22} color={colors.tint} />
              <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 }}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (showError) {
    return (
      <View style={[contentContainerStyle, { justifyContent: 'center' }]}>
        <View style={cardStyle(colors, isDark)}>
          <View style={{ padding: spacing.lg }}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={(colors as { danger?: string }).danger ?? colors.tint}
              style={{ alignSelf: 'center', marginBottom: spacing.md }}
            />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' }}>
              Erreur lors de l&apos;analyse
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
              {aiError ?? 'Une erreur est survenue.'}
            </Text>
            <AppButton
              title="Retour à la séance"
              onPress={handleBack}
              variant="primary"
              accessibilityLabel="Retour à la séance"
            />
          </View>
        </View>
      </View>
    );
  }

  if (showResults && aiResult) {
    const scriptLines = aiResult.generatedScript?.trim() ?? '';
    const turns = parseScriptTurns(scriptLines);
    const hasStructuredTurns =
      turns.length >= 2 &&
      turns.some((t) => t.speaker === 'tuteur') &&
      turns.some((t) => t.speaker === 'eleve');
    const previewTurns = hasStructuredTurns
      ? turns.slice(0, SCRIPT_PREVIEW_TURNS)
      : [];
    // Always allow opening full script when there is script content (preview may show only first N turns).
    const canOpenFullScript = scriptLines.length > 0;
    const crPreview = aiResult.generatedComment?.trim().split('\n').slice(0, 3).join('\n') ?? '';
    const resources = aiResult.generatedResources ?? [];

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.pageBackground }}
        contentContainerStyle={resultsContentStyle}
        showsVerticalScrollIndicator={true}
      >
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs }}>
            Résultats de l&apos;analyse
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            Votre séance a été analysée. Consultez le script, le CR et les ressources ci-dessous.
          </Text>
        </View>

        {scriptLines ? (
          <View style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <MaterialCommunityIcons name="script-text" size={22} color={colors.tint} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Script de la séance
              </Text>
            </View>
            <View style={cardStyle(colors, isDark)}>
              <View style={{ padding: spacing.lg }}>
                {previewTurns.length > 0 ? (
                  <>
                    {previewTurns.map((turn, i) => (
                      <ScriptTurnBubble key={`preview-${turn.speaker}-${i}`} turn={turn} index={i} compact />
                    ))}
                    {canOpenFullScript ? (
                      <Pressable
                        onPress={() => router.push(scriptPath as never)}
                        style={({ pressed }) => ({
                          marginTop: spacing.sm,
                          paddingVertical: spacing.sm,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: spacing.xs,
                          opacity: pressed ? 0.85 : 1,
                        })}
                        accessibilityLabel="Voir le script complet"
                        accessibilityRole="button"
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Voir le script complet</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.tint} style={{ alignSelf: 'center' }} />
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }} selectable numberOfLines={4}>
                      {scriptLines.slice(0, 280)}{scriptLines.length > 280 ? '…' : ''}
                    </Text>
                    <Pressable
                      onPress={() => router.push(scriptPath as never)}
                      style={({ pressed }) => ({
                        marginTop: spacing.md,
                        paddingVertical: spacing.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.xs,
                        opacity: pressed ? 0.85 : 1,
                      })}
                      accessibilityLabel="Voir le script complet"
                      accessibilityRole="button"
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Voir le script complet</Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.tint} style={{ alignSelf: 'center' }} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={22} color={colors.tint} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              Compte rendu
            </Text>
          </View>
          <View style={cardStyle(colors, isDark)}>
            <View style={{ padding: spacing.lg }}>
              {crPreview ? (
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md }} numberOfLines={4}>
                  {crPreview}
                </Text>
              ) : null}
              <Pressable
                onPress={() => router.push(`/(tabs)/comptes-rendus/${aiResult.reportId}?sessionId=${id}&fromSessionId=${id}&returnTo=ai-processing` as never)}
                style={({ pressed }) => ({
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.tint,
                  opacity: pressed ? 0.85 : 1,
                })}
                accessibilityLabel="Voir ou modifier le CR brouillon"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.text : colors.background }}>
                  Voir / modifier le CR brouillon
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {resources.length > 0 ? (
          <View style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.tint} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Ressources pédagogiques
              </Text>
            </View>
            <View style={{ gap: spacing.md }}>
              {resources.map((r, idx) => {
                const structured = isStructuredResource(r);
                const legacyText = typeof r === 'string' ? r : '';
                const displayTitle = structured ? r.title : legacyText.slice(0, 60);
                const problemOrSolution = structured ? (r.problem || r.solution || '').trim().split('\n')[0] ?? '' : legacyText;
                const displayPreview = problemOrSolution.slice(0, 60) + (problemOrSolution.length > 60 ? '…' : '');
                const resourceKey = structured ? `res-${r.title}-${idx}` : `res-legacy-${idx}`;
                return (
                  <Pressable
                    key={resourceKey}
                    onPress={() => router.push(`/(tabs)/sessions/${id}/resource-detail?index=${idx}${resourceReportQuery}` as never)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    accessibilityLabel={structured ? `Ressource : ${r.title}` : `Ressource ${idx + 1}`}
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        cardStyle(colors, isDark),
                        {
                          padding: spacing.lg,
                          minHeight: 44,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
                          {displayTitle || `Ressource ${idx + 1}`}
                        </Text>
                        {displayPreview ? (
                          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }} numberOfLines={1}>
                            {displayPreview}
                          </Text>
                        ) : null}
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <AppButton
          title="Retour à la séance"
          onPress={handleBack}
          variant="secondary"
          accessibilityLabel="Retour à la séance"
          style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}
        />
      </ScrollView>
    );
  }

  if (showSavedReportEmpty) {
    return (
      <View style={[contentContainerStyle, { justifyContent: 'center' }]}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
          Aucun résultat d&apos;analyse enregistré pour cette séance.
        </Text>
        <AppButton
          title="Retour à la séance"
          onPress={handleBack}
          variant="primary"
          accessibilityLabel="Retour à la séance"
        />
      </View>
    );
  }

  return (
    <View style={[contentContainerStyle, { justifyContent: 'center' }]}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
        Aucun résultat pour cette séance.
      </Text>
      <AppButton
        title="Retour à la séance"
        onPress={handleBack}
        variant="primary"
        accessibilityLabel="Retour à la séance"
      />
    </View>
  );
}
