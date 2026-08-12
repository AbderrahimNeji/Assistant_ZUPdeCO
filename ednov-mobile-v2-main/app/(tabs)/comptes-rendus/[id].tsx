import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from 'react-native';

import { ErrorMessage } from '@/components/ErrorMessage';
import { AppButton } from '@/components/AppButton';
import { InfoRow } from '@/components/InfoRow';
import { ReportValidateWaitModal } from '@/components/report/ReportValidateWaitModal';
import { SessionAttendanceEditable } from '@/components/SessionAttendanceEditable';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCompteRenduDetail } from '@/hooks/useCompteRenduDetail';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useProfile } from '@/hooks/useProfile';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import { useSubmitCrAsSubmitted } from '@/hooks/useSubmitCrAsSubmitted';
import { useValidateCr } from '@/hooks/useValidateCr';
import { useSessions } from '@/hooks/useSessions';
import { useSubjectsCatalog } from '@/hooks/useSubjectsCatalog';
import { joinMatiereLabels } from '@/utils/reportSubject';
import { fetchSessionById } from '@/services/sessions';
import {
  getAuthorFeedbackForViewer,
  getVscWaitForAllTutorsModalDescription,
  getVscWaitForAllTutorsBannerText,
  shouldShowValidateWaitHint,
  shouldVscConfirmBeforeValidate,
} from '@/utils/report-author-feedback';
import { useCompanyStore } from '@/store/companyStore';
import { isSubmitted, isValidated, type CompteRenduFeeling } from '@/types/compteRendu';
import type { Session } from '@/types/session';
import { formatSessionStudentsTitle } from '@/types/session';
import { isValidRouteId, routes } from '@/utils/routes';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getCrStatusLabel(submitted: boolean, validated: boolean): string {
  if (validated) return 'Validé';
  return submitted ? 'Saisi' : 'À saisir';
}

function getCrStatusColor(submitted: boolean, validated: boolean, colors: ColorPalette): string {
  if (validated) return colors.success;
  return submitted ? colors.success : colors.warning;
}

const FEELING_LABELS: Record<CompteRenduFeeling, string> = {
  very_at_ease: "Très à l'aise",
  rather_at_ease: "Plutôt à l'aise",
  neutral: 'Neutre',
  somewhat_difficult: 'Un peu en difficulté',
  difficult: 'En difficulté',
};

/** Parse note string to number (e.g. "14" -> 14). Returns null if not numeric. */
function parseNoteToNumber(note: string | null | undefined): number | null {
  if (note == null || note.trim() === '') return null;
  const n = Number.parseFloat(note.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Render 5 stars: filled up to rating (0–5). Scale from /20 to /5 if max is 20. */
function renderStars(rating: number, maxRating: number, colors: ColorPalette) {
  const normalized = maxRating === 20 ? (rating / 20) * 5 : rating;
  const value = Math.min(5, Math.max(0, normalized));
  return Array.from({ length: 5 }, (_, i) => (
    <MaterialCommunityIcons
      key={i}
      name={i < value ? 'star' : 'star-outline'}
      size={18}
      color={i < value ? colors.warning : colors.border}
    />
  ));
}

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

export default function CompteRenduDetailScreen() {
  const params = useLocalSearchParams<{ id: string; sessionId?: string; fromSessionId?: string; returnTo?: string }>();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : undefined;
  const fromSessionId = typeof params.fromSessionId === 'string' ? params.fromSessionId : undefined;
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isValidRouteId(id)) {
      router.replace(routes.comptesRendusList() as never);
    }
  }, [id, router]);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const queryClient = useQueryClient();
  const { cr, isLoading, error, refetch } = useCompteRenduDetail(id, sessionId ?? undefined);
  const { data: subjectsCatalog = [] } = useSubjectsCatalog();
  const { data: sessions } = useSessions();

  // Resynchro complète (CR + présences) chaque fois que l'écran reprend le focus
  // (changement de tab, retour depuis une autre page) pour éviter les écarts avec le web.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      refetch();
      const sid = sessionId ?? cr?.sessionId;
      if (sid) {
        queryClient.invalidateQueries({ queryKey: ['session', sid, 'participants'] });
        queryClient.invalidateQueries({ queryKey: ['session', sid] });
      }
    }, [id, sessionId, cr?.sessionId, queryClient, refetch]),
  );

  const matiereDisplay = useMemo(() => {
    if (!cr) return '—';
    const ids = cr.matiereIds ?? [];
    if (!ids.length) return '—';
    const labels = ids
      .map((mid) => subjectsCatalog.find((s) => s.id === mid)?.label)
      .filter((x): x is string => Boolean(x));
    return labels.length ? joinMatiereLabels(labels) : '—';
  }, [cr, subjectsCatalog]);
  const { data: profile } = useProfile();
  const roleCodes = useCompanyStore((s) => s.roleCodes);
  const { data: participants = [], isLoading: participantsLoading } = useSessionParticipants(cr?.sessionId);
  const submitAsSubmitted = useSubmitCrAsSubmitted();
  const validateCr = useValidateCr();
  const isVscRole = roleCodes.some((c) => ['vsc', 'volunteer'].includes((c ?? '').toLowerCase()));
  const isVscOnSession =
    isVscRole ||
    (Boolean(profile?.id) &&
      participants.some((p) => p.userId === profile?.id && p.role === 'volunteer'));

  const sessionList: Session[] = Array.isArray(sessions) ? sessions : [];
  const session = useMemo(
    () => sessionList.find((s) => s.id === (cr?.sessionId || sessionId)),
    [sessionList, cr?.sessionId, sessionId],
  );
  const { data: sessionDetail, isLoading: sessionDetailLoading } = useQuery({
    queryKey: ['session', cr?.sessionId],
    queryFn: () => fetchSessionById(cr!.sessionId),
    enabled: Boolean(cr?.sessionId),
  });

  const actorFeedback = cr ? getAuthorFeedbackForViewer(cr, profile?.id ?? undefined) : null;
  const validateWaitOptions = useMemo(() => {
    const type = (cr?.sessionType ?? sessionDetail?.type ?? session?.type ?? undefined) as
      | Session['type']
      | undefined;
    const mergedParticipants =
      sessionDetail?.participants?.length
        ? sessionDetail.participants
        : participants.length > 0
          ? participants
          : (session?.participants ?? []);
    return {
      session: { type, participants: mergedParticipants },
      viewerUserId: profile?.id ?? undefined,
    };
  }, [cr?.sessionType, sessionDetail, session, participants, profile?.id]);
  const [validateWaitVisible, setValidateWaitVisible] = useState(false);

  const sessionIdForBack = sessionId ?? fromSessionId;
  useLayoutEffect(() => {
    if (returnTo === 'ai-processing' && sessionIdForBack && id) {
      navigation.setOptions({
        headerLeft: () => (
          <Pressable
            onPress={() => router.replace(`/(tabs)/sessions/${sessionIdForBack}/ai-processing?reportId=${id}` as never)}
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
    } else if (fromSessionId) {
      navigation.setOptions({
        headerLeft: () => (
          <Pressable
            onPress={() => router.replace(`/(tabs)/sessions/${fromSessionId}` as never)}
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
            accessibilityLabel="Retour à la séance"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        ),
      });
    } else {
      navigation.setOptions({ headerLeft: undefined });
    }
  }, [fromSessionId, returnTo, sessionIdForBack, id, navigation, router, colors.text]);

  const sessionLabel = session
    ? `${formatShortDate(session.date)} · ${session.establishment ?? '—'}`
    : formatDate(cr?.sessionDate);

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  const wrapContent = (content: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>{content}</View>
    </View>
  );

  if (isLoading && !cr) {
    return wrapContent(<LoadingScreen message="Chargement…" />);
  }

  if (error || !cr) {
    return wrapContent(
      <ErrorMessage
        title="Compte rendu introuvable"
        message="Impossible de charger ce compte rendu. Vérifiez votre connexion ou réessayez."
        onRetry={() => refetch()}
      />
    );
  }

  const submitted = isSubmitted(cr);
  const validated = isValidated(cr);
  const canValidateAsVsc =
    isVscOnSession && submitted && !validated && Boolean(cr.sessionId) && Boolean(cr.id) && profile?.id;
  const needsValidateWaitModal = shouldVscConfirmBeforeValidate(cr, validateWaitOptions);
  const validateWaitDescription = getVscWaitForAllTutorsModalDescription(cr, validateWaitOptions);
  const vscWaitBanner =
    canValidateAsVsc && shouldShowValidateWaitHint(cr, validateWaitOptions)
      ? getVscWaitForAllTutorsBannerText(cr, validateWaitOptions)
      : null;
  const runValidateCr = () => {
    if (!profile?.id) return;
    validateCr.mutate({
      sessionId: cr.sessionId,
      reportId: cr.id,
      validatedById: profile.id,
    });
    setValidateWaitVisible(false);
  };

  const handleValidatePress = () => {
    if (shouldVscConfirmBeforeValidate(cr, validateWaitOptions)) {
      setValidateWaitVisible(true);
      return;
    }
    runValidateCr();
  };

  const statusColor = getCrStatusColor(submitted, validated, colors);
  const displayNoteStr =
    actorFeedback?.rating != null ? String(actorFeedback.rating) : (cr.note ?? '');
  const displayComment = actorFeedback?.comment ?? cr.commentaire ?? '—';
  const displayFeeling = actorFeedback?.feeling ?? cr.feeling ?? null;
  const noteNum = parseNoteToNumber(displayNoteStr);
  const noteMax = 5;

  return (
    <>
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: scrollBottom,
          }}
        >
          {/* En-tête — C5 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3, flex: 1 }}>
              Détails du compte rendu
            </Text>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.sm - 2,
                borderRadius: borderRadius.md,
                backgroundColor: statusColor + '18',
                borderWidth: 1,
                borderColor: statusColor,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: statusColor }}>{getCrStatusLabel(submitted, validated)}</Text>
            </View>
          </View>

          {/* Carte Session */}
          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="calendar"
              iconColor={colors.info}
              label="Date de la séance"
              value={session ? formatDate(session.date) : sessionLabel}
              colors={colors}
              last
            />
          </View>

          <SessionAttendanceEditable
            participants={participants}
            viewerUserId={profile?.id}
            sessionId={cr.sessionId}
            canEdit={!validated}
            loading={participantsLoading}
            colors={colors}
            isDark={isDark}
          />

          {/* Résumé élèves (même source que les séances) */}
          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="school-outline"
              iconColor={colors.tint}
              label="Élève(s)"
              value={
                participantsLoading ? 'Chargement…' : formatSessionStudentsTitle(participants)
              }
              colors={colors}
              last
            />
          </View>

          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="book-open-outline"
              iconColor={colors.success}
              label="Matières"
              value={matiereDisplay}
              colors={colors}
              last
            />
          </View>

          <View style={cardStyle(colors, isDark)}>
            <View style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textSecondary, marginBottom: spacing.sm - 2 }}>
                Note
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                  {displayNoteStr.trim() !== '' ? `${displayNoteStr}/5` : '—'}
                </Text>
                {noteNum != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    {renderStars(noteNum, noteMax, colors)}
                  </View>
                )}
              </View>
            </View>
          </View>

          {displayFeeling != null && (
            <View style={cardStyle(colors, isDark)}>
              <InfoRow
                icon="emoticon-outline"
                iconColor={colors.tint}
                label="Comment vous êtes-vous senti"
                value={FEELING_LABELS[displayFeeling]}
                colors={colors}
                last
              />
            </View>
          )}

          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="comment-text-outline"
              iconColor={colors.tint}
              label="Résumé de la séance"
              value={displayComment}
              colors={colors}
              last
            />
          </View>

          {/* Carte Script de la séance (si présent) */}
          {cr.script != null && cr.script.trim() !== '' && (
            <View style={cardStyle(colors, isDark)}>
              <View style={{ padding: spacing.md }}>
                <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textSecondary, marginBottom: spacing.sm - 2 }}>
                  Script de la séance
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>{cr.script.trim()}</Text>
              </View>
            </View>
          )}

          {/* Date de soumission (si soumis) */}
          {submitted && (
            <View style={cardStyle(colors, isDark)}>
              <InfoRow
                icon="calendar-check"
                iconColor={colors.success}
                label="Date de soumission"
                value={formatDate(cr.submittedAt)}
                colors={colors}
                last
              />
            </View>
          )}

          {vscWaitBanner ? (
            <View
              style={{
                marginBottom: spacing.md,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                backgroundColor: colors.warning + '18',
                borderWidth: 1,
                borderColor: colors.warning + '50',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <MaterialCommunityIcons name="information-outline" size={20} color={colors.warning} />
              <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 }}>
                <Text style={{ fontWeight: '700' }}>Validation : </Text>
                {vscWaitBanner}
              </Text>
            </View>
          ) : null}

          {/* Bouton Valider le CR (VSC uniquement, CR soumis et pas encore validé) */}
          {canValidateAsVsc && (
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
              <AppButton
                title={validateCr.isPending ? 'Validation…' : 'Valider le CR'}
                onPress={handleValidatePress}
                variant="success"
                icon="check-decagram"
                loading={validateCr.isPending || sessionDetailLoading || participantsLoading}
                disabled={validateCr.isPending || sessionDetailLoading || participantsLoading}
                accessibilityLabel="Valider le compte rendu"
              />
            </View>
          )}

          {/* Soumettre : uniquement en brouillon. Modifier : tant que le CR n'est pas validé (tuteur peut mettre à jour). */}
          {!submitted && !validated && (
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
              <AppButton
                title={submitAsSubmitted.isPending ? 'Envoi…' : 'Soumettre le CR'}
                onPress={() => submitAsSubmitted.mutate(cr)}
                variant="success"
                icon="send-check"
                loading={submitAsSubmitted.isPending}
                disabled={submitAsSubmitted.isPending}
                accessibilityLabel="Soumettre le compte rendu"
              />
            </View>
          )}
          {!validated && (
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
              <AppButton
                title="Modifier"
                icon="pencil-outline"
                variant="primary"
                onPress={() => router.push(`/(tabs)/comptes-rendus/new?sessionId=${cr.sessionId}&reportId=${cr.id}` as never)}
                accessibilityLabel="Modifier le compte rendu"
              />
            </View>
          )}
        </ScrollView>
      </View>
    </View>
    <ReportValidateWaitModal
      visible={validateWaitVisible}
      description={validateWaitDescription}
      onClose={() => setValidateWaitVisible(false)}
      onConfirm={runValidateCr}
      loading={validateCr.isPending}
    />
    </>
  );
}
