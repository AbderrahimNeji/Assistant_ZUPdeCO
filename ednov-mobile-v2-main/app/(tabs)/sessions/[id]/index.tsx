import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { Snackbar } from 'react-native-paper';

import { AppButton } from '@/components/AppButton';
import { AddStudentToSessionModal } from '@/components/AddStudentToSessionModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ErrorMessage } from '@/components/ErrorMessage';
import { InfoRow } from '@/components/InfoRow';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';
import { borderRadius, CARD_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssignmentCandidates } from '@/hooks/useAssignmentCandidates';
import { useProfile } from '@/hooks/useProfile';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import type { SessionFormat, SessionStatus } from '@/types/session';
import { displayNameMasked, getSessionParticipantDisplayLabel } from '@/types/session';
import { sessionVoiceCrRecordingEnabled } from '@/constants/Platform';
import { env } from '@/config/env';
import { isValidRouteId, routes } from '@/utils/routes';
import { slotFromSession } from '@/utils/sessionStudentAvailability';
import { fetchSubjectsCatalog } from '@/services/subjects';
import { setSessionAssignments } from '@/services/sessions';
import {
  derivePairsFromParticipants,
  removeStudentFromPairs,
  toAssignmentParticipants,
} from '@/utils/sessionStudentPairs';
import { triggerMedium } from '@/utils/haptics';

function formatDate(iso: string): string {
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

function isJoinable(status: SessionStatus | null | undefined): boolean {
  return status === 'planned' || status === 'in_progress';
}

/** Add/remove students: planned, in progress, and completed (not closed/cancelled). */
function canManageSessionStudents(status: SessionStatus | null | undefined): boolean {
  return status === 'planned' || status === 'in_progress' || status === 'completed';
}

function getSessionFormatLabel(format: SessionFormat | null | undefined, joinLink: string | null | undefined): string {
  if (format === 'visio') return 'Visio';
  if (format === 'presentiel') return 'Présentiel';
  if (format === 'hybrid') return 'Hybride';
  return joinLink?.trim() ? 'Visio' : 'Présentiel';
}

const ctaIconColor = (c: ColorPalette, dark: boolean) =>
  dark ? c.text : c.background;

function cardStyle(colors: ColorPalette, isDark: boolean) {
  return {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.tint,
    overflow: 'hidden' as const,
    marginBottom: spacing.md,
    ...getCardShadowPlatform(isDark),
  };
}

export default function SessionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const { data: session, isLoading, error, refetch } = useSessionDetail(id);

  useEffect(() => {
    if (!isValidRouteId(id)) {
      router.replace(routes.sessionsList() as never);
    }
  }, [id, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(routes.sessionsList() as never);
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
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, router, colors.text]);
  const { data: participants = [], isLoading: participantsLoading } = useSessionParticipants(id);
  const assignmentCandidates = useAssignmentCandidates(id);
  const { data: profile } = useProfile();
  const [tutorsExpanded, setTutorsExpanded] = useState(true);
  const [studentsExpanded, setStudentsExpanded] = useState(true);
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{ userId: string; name: string } | null>(
    null,
  );
  const [removeFeedback, setRemoveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const removeStudentMutation = useMutation({
    mutationFn: async (studentUserId: string) => {
      if (!id || !session) throw new Error('Séance introuvable');
      const currentPairs =
        session.studentTutorPairs && session.studentTutorPairs.length > 0
          ? session.studentTutorPairs
          : derivePairsFromParticipants(participants, profile?.id, session.type);
      const nextPairs = removeStudentFromPairs(currentPairs, studentUserId);
      const nextParticipants = toAssignmentParticipants(
        participants.filter((p) => !(p.role === 'student' && p.userId === studentUserId)),
      );
      return setSessionAssignments(id, nextPairs, nextParticipants);
    },
    onMutate: () => {
      setRemoveFeedback(null);
    },
    onSuccess: async () => {
      triggerMedium();
      setStudentToRemove(null);
      if (id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['session', id] }),
          queryClient.invalidateQueries({ queryKey: ['session', id, 'participants'] }),
        ]);
      }
      setRemoveFeedback({ type: 'success', message: 'Élève retiré de la séance' });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Impossible de retirer l’élève';
      setRemoveFeedback({ type: 'error', message: msg || 'Impossible de retirer l’élève' });
    },
  });

  const closeRemoveModal = useCallback(() => {
    if (removeStudentMutation.isPending) return;
    setStudentToRemove(null);
    if (removeFeedback?.type === 'error') setRemoveFeedback(null);
  }, [removeStudentMutation.isPending, removeFeedback?.type]);

  const {
    recordingSessionId,
    isRecording,
    isUploading,
    aiError,
    aiResultSessionId,
    startRecording: startRecordingContext,
  } = useSessionRecording();

  const startRecording = useCallback(() => {
    if (id) startRecordingContext(id);
  }, [id, startRecordingContext]);

  // isRecordingThisSession checks isRecording so that going back from the recording
  // screen (while recordingSessionId is still set) does NOT trigger a redirect loop.
  const isRecordingThisSession = id != null && recordingSessionId === id && isRecording;
  const isUploadingThisSession = id != null && recordingSessionId === id && isUploading;
  const showAiErrorThisSession = id != null && (recordingSessionId === id || aiResultSessionId === id) && aiError != null;

  // Navigation to ai-processing is handled by AiProcessingModal (global, in tabs layout).
  // Navigation to recording screen is handled by RecordingFloatingBar (global, floating above tab bar).
  // No useEffect redirects needed here.

  const sessionStatusStr = typeof session?.status === 'string' ? session.status : String(session?.status ?? '');
  const isSessionInProgress = sessionStatusStr.toLowerCase() === 'in_progress';

  const showFullScreenLoading = isLoading && session === undefined;
  const sessionMismatch = session != null && id != null && session.id !== id;

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

  if (showFullScreenLoading || sessionMismatch) {
    return wrapContent(<LoadingScreen message="Chargement…" />);
  }

  if (error || !session) {
    return wrapContent(
      <ErrorMessage
        title="Séance introuvable"
        message="Impossible de charger cette séance. Vérifiez votre connexion ou réessayez."
        onRetry={() => refetch()}
      />
    );
  }

  const hasJoinLink = !!(session.joinLink?.trim());
  const hasReportId = !!(session.reportId?.trim());
  const showRejoindre = hasJoinLink && isJoinable(session.status);
  // CR accessible dès le début de la séance (pas de condition sur session.status)
  const showVoirCR = hasReportId;
  const tutorParticipants = participants.filter((p) => p.role === 'tutor' || p.role === 'volunteer');
  const studentParticipants = participants.filter((p) => p.role === 'student');
  const canAddStudents =
    !!env.apiUrl &&
    !env.useStaticData &&
    session.format === 'presentiel' &&
    !!session.establishmentId &&
    !!profile?.id &&
    canManageSessionStudents(session.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: scrollBottom }}
        >
          {/* En-tête */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3, flex: 1 }}>
              Détails de la séance
            </Text>
            <StatusBadge status={session.status ?? 'planned'} variant="session" />
          </View>

          {/* Carte Date et heure */}
          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="calendar-clock"
              iconColor={colors.info}
              label="Date et heure"
              value={formatDate(session.date)}
              colors={colors}
              last
            />
          </View>

          {/* Carte Lieu / établissement */}
          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="map-marker-outline"
              iconColor={colors.tint}
              label="Lieu / établissement"
              value={[session.room, session.establishment].filter(Boolean).join(' · ') || '—'}
              colors={colors}
              last
            />
          </View>

          {/* Carte Format de la séance */}
          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="video-wireless-outline"
              iconColor={colors.textSecondary}
              label="Format de la séance"
              value={getSessionFormatLabel(session.format, session.joinLink)}
              colors={colors}
              last
            />
          </View>

          {/* Carte Lien de réunion */}
          <View style={cardStyle(colors, isDark)}>
            <InfoRow
              icon="video-outline"
              iconColor={colors.success}
              label="Lien de réunion"
              value={session.joinLink?.trim() ? 'Disponible' : 'Non disponible'}
              colors={colors}
              last
            />
          </View>

          {/* Section Candidats à l'assignation (only when feature enabled) */}
          {assignmentCandidates.isEnabled && (
            <>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
                Candidats à l&apos;assignation
              </Text>
              <View style={cardStyle(colors, isDark)}>
                {assignmentCandidates.isLoading && (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>Chargement…</Text>
                  </View>
                )}
                {!assignmentCandidates.isLoading && assignmentCandidates.error && (
                  <View style={{ padding: spacing.lg }}>
                    <Text style={{ fontSize: 14, color: colors.danger ?? colors.textSecondary, marginBottom: spacing.sm }}>
                      Impossible de charger les candidats.
                    </Text>
                    <Pressable
                      onPress={() => assignmentCandidates.refetch()}
                      style={({ pressed }) => ({
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        alignSelf: 'flex-start',
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Réessayer</Text>
                    </Pressable>
                  </View>
                )}
                {!assignmentCandidates.isLoading && !assignmentCandidates.error && (
                  <>
                    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs }}>
                        Élèves éligibles ({assignmentCandidates.students.length})
                      </Text>
                      {assignmentCandidates.students.length === 0 ? (
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucun élève éligible</Text>
                      ) : (
                        assignmentCandidates.students.map((s) => {
                          const name = displayNameMasked(s.firstName, s.lastName, 'Élève');
                          return (
                            <Text key={s.id} style={{ fontSize: 14, color: colors.text, marginBottom: 2 }} numberOfLines={1}>
                              {name}
                            </Text>
                          );
                        })
                      )}
                    </View>
                    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs }}>
                        Tuteurs éligibles ({assignmentCandidates.tutors.length})
                      </Text>
                      {assignmentCandidates.tutors.length === 0 ? (
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucun tuteur éligible</Text>
                      ) : (
                        assignmentCandidates.tutors.map((t) => {
                          const name = displayNameMasked(t.firstName, t.lastName, 'Tuteur');
                          return (
                            <Text key={t.id} style={{ fontSize: 14, color: colors.text, marginBottom: 2 }} numberOfLines={1}>
                              {name}
                            </Text>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </View>
            </>
          )}

          {/* Section Tuteurs assignés */}
          <>
            <Pressable
              onPress={() => setTutorsExpanded((v) => !v)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: spacing.sm })}
              accessibilityLabel="Afficher les tuteurs et bénévoles assignés"
              accessibilityRole="button"
              accessibilityState={{ expanded: tutorsExpanded }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Tuteurs et bénévoles assignés
                </Text>
                <MaterialCommunityIcons
                  name={tutorsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>
            {tutorsExpanded ? (
              <View style={cardStyle(colors, isDark)}>
                {participantsLoading && (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>Chargement…</Text>
                  </View>
                )}
                {!participantsLoading && tutorParticipants.length === 0 && (
                  <View style={{ padding: spacing.lg }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucun tuteur assigné</Text>
                  </View>
                )}
                {!participantsLoading && tutorParticipants.length > 0 &&
                  tutorParticipants.map((p, index) => {
                    const name = getSessionParticipantDisplayLabel(p, 'Tuteur');
                    const roleLabel = p.role === 'volunteer' ? 'Bénévole' : 'Tuteur';
                    const isLast = index === tutorParticipants.length - 1;
                    return (
                      <View key={p.id}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: spacing.md,
                            paddingHorizontal: CARD_PADDING_HORIZONTAL,
                            borderBottomWidth: isLast ? 0 : 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500', flex: 1, minWidth: 0 }} numberOfLines={1}>
                            {name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <View style={{ backgroundColor: colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{roleLabel}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : null}
          </>

          {/* Section Élèves assignés */}
          <>
            <Pressable
              onPress={() => setStudentsExpanded((v) => !v)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: spacing.sm, marginTop: spacing.sm })}
              accessibilityLabel="Afficher les élèves assignés"
              accessibilityRole="button"
              accessibilityState={{ expanded: studentsExpanded }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Élèves assignés
                </Text>
                <MaterialCommunityIcons
                  name={studentsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>
            {studentsExpanded ? (
              <View style={cardStyle(colors, isDark)}>
                {participantsLoading && (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>Chargement…</Text>
                  </View>
                )}
                {!participantsLoading && studentParticipants.length === 0 && (
                  <View style={{ padding: spacing.lg }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucun élève assigné</Text>
                  </View>
                )}
                {!participantsLoading &&
                  studentParticipants.length > 0 &&
                  studentParticipants.map((p, index) => {
                    const name = getSessionParticipantDisplayLabel(p, 'Élève');
                    const isLast = index === studentParticipants.length - 1;
                    const isRemoving =
                      removeStudentMutation.isPending && studentToRemove?.userId === p.userId;
                    return (
                      <View key={p.id}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: spacing.md,
                            paddingHorizontal: CARD_PADDING_HORIZONTAL,
                            borderBottomWidth: isLast && !canAddStudents ? 0 : 1,
                            borderBottomColor: colors.border,
                            gap: spacing.sm,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              color: colors.text,
                              fontWeight: '500',
                              flex: 1,
                              minWidth: 0,
                            }}
                            numberOfLines={1}
                          >
                            {name}
                          </Text>
                          {canAddStudents ? (
                            <Pressable
                              onPress={() => {
                                setRemoveFeedback(null);
                                setStudentToRemove({ userId: p.userId, name });
                              }}
                              disabled={removeStudentMutation.isPending}
                              hitSlop={8}
                              style={({ pressed }) => ({
                                opacity: pressed || isRemoving ? 0.55 : 1,
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: colors.danger + '14',
                              })}
                              accessibilityLabel={`Retirer ${name} de la séance`}
                              accessibilityRole="button"
                            >
                              {isRemoving ? (
                                <ActivityIndicator size="small" color={colors.danger} />
                              ) : (
                                <MaterialCommunityIcons name="close" size={18} color={colors.danger} />
                              )}
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                {canAddStudents ? (
                  <Pressable
                    onPress={() => setAddStudentModalVisible(true)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.75 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.md,
                      paddingHorizontal: CARD_PADDING_HORIZONTAL,
                      minHeight: 56,
                    })}
                    accessibilityLabel="Ajouter un élève"
                    accessibilityRole="button"
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.tint + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <MaterialCommunityIcons name="account-plus" size={20} color={colors.tint} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.tint, flex: 1 }}>
                      Ajouter un élève
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.tint} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>

          {/* Boutons d'action */}
          {showRejoindre && (
            <AppButton
              title="Rejoindre la séance"
              onPress={() => {
                const url = session.joinLink?.trim();
                if (url) Linking.openURL(url);
              }}
              variant="primary"
              icon="video"
              accessibilityLabel="Rejoindre la séance"
              style={{ marginBottom: spacing.sm }}
            />
          )}

          {/* Assistant IA — carte d’action */}
          {isJoinable(session.status) && env.apiUrl?.trim() && !env.useStaticData && (
            <View style={cardStyle(colors, isDark)}>
              <Pressable
                onPress={() => id && router.push(`/(tabs)/sessions/${id}/chat` as never)}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                accessibilityLabel="Ouvrir l'assistant IA"
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingVertical: spacing.lg, paddingHorizontal: CARD_PADDING_HORIZONTAL, minHeight: 72 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint + '18', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg, flexShrink: 0 }}>
                    <MaterialCommunityIcons name="robot-outline" size={24} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      Assistant IA
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }} numberOfLines={1}>
                      Poser des questions sur la séance
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ alignSelf: 'center', flexShrink: 0 }} />
                </View>
              </Pressable>
            </View>
          )}

          {/* Enregistrement IA — carte d'action (séance en cours uniquement, web uniquement) */}
          {isSessionInProgress && sessionVoiceCrRecordingEnabled && (
            <>
              {/* AI error banner */}
              {showAiErrorThisSession ? (
                <View style={{ marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: ((colors as { danger?: string }).danger ?? colors.tint) + '15', borderWidth: 1, borderColor: ((colors as { danger?: string }).danger ?? colors.tint) + '40' }}>
                  <Text style={{ fontSize: 14, color: (colors as { danger?: string }).danger ?? colors.text }}>{aiError}</Text>
                </View>
              ) : null}

              {/* Uploading state */}
              {isUploadingThisSession ? (
                <View style={[cardStyle(colors, isDark), { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: CARD_PADDING_HORIZONTAL }]}>
                  <ActivityIndicator size="small" color={colors.tint} />
                  <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1 }}>Génération du CR en cours…</Text>
                </View>

              ) : isRecordingThisSession ? (
                /* Recording in progress — managed by the floating toolbar (RecordingFloatingBar) */
                <View
                  style={[cardStyle(colors, isDark), { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingVertical: spacing.lg, paddingHorizontal: CARD_PADDING_HORIZONTAL, minHeight: 72 }]}
                  accessibilityLabel="Enregistrement en cours"
                  accessibilityRole="text"
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint + '18', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg, flexShrink: 0 }}>
                    <MaterialCommunityIcons name="microphone" size={24} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      Enregistrement en cours
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }} numberOfLines={1}>
                      Utilisez la barre en bas pour gérer l&apos;enregistrement
                    </Text>
                  </View>
                </View>

              ) : isRecording ? (
                /* Another session is being recorded */
                <View style={[cardStyle(colors, isDark), { paddingVertical: spacing.md, paddingHorizontal: CARD_PADDING_HORIZONTAL }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <MaterialCommunityIcons name="microphone-off" size={20} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                      Un enregistrement est déjà en cours pour une autre séance.
                    </Text>
                  </View>
                </View>

              ) : env.apiUrl?.trim() ? (
                /* Ready to record */
                <View style={cardStyle(colors, isDark)}>
                  <Pressable
                    onPress={startRecording}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    accessibilityLabel="Démarrer l'enregistrement pour générer le CR"
                    accessibilityRole="button"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingVertical: spacing.lg, paddingHorizontal: CARD_PADDING_HORIZONTAL, minHeight: 72 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint + '18', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg, flexShrink: 0 }}>
                        <MaterialCommunityIcons name="microphone-outline" size={24} color={colors.tint} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                          Démarrer l&apos;enregistrement
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }} numberOfLines={1}>
                          Génère script, CR et ressources pédagogiques
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ alignSelf: 'center', flexShrink: 0 }} />
                    </View>
                  </Pressable>
                </View>

              ) : (
                /* API not configured */
                <View style={[cardStyle(colors, isDark), { paddingVertical: spacing.md, paddingHorizontal: CARD_PADDING_HORIZONTAL }]}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs }}>
                    Générer un CR avec l&apos;IA
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    Configurez EXPO_PUBLIC_API_URL pour activer l&apos;enregistrement IA.
                  </Text>
                </View>
              )}
            </>
          )}

          {showVoirCR && (
            <>
              {/* Voir les résultats de l’analyse — carte d’action */}
              <View style={cardStyle(colors, isDark)}>
                <Pressable
                  onPress={() => router.push(`/(tabs)/sessions/${session.id}/ai-processing?reportId=${session.reportId}` as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  accessibilityLabel="Voir les résultats de l'analyse"
                  accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingVertical: spacing.lg, paddingHorizontal: CARD_PADDING_HORIZONTAL, minHeight: 72 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint + '18', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg, flexShrink: 0 }}>
                      <MaterialCommunityIcons name="chart-box-outline" size={24} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        Résultats de l&apos;analyse
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }} numberOfLines={1}>
                        Script, CR brouillon et ressources
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ alignSelf: 'center', flexShrink: 0 }} />
                  </View>
                </Pressable>
              </View>
              {/* Voir le CR — carte d’action */}
              <View style={cardStyle(colors, isDark)}>
                <Pressable
                  onPress={() => router.push(`/(tabs)/comptes-rendus/${session.reportId}?sessionId=${session.id}&fromSessionId=${session.id}` as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  accessibilityLabel="Voir le compte rendu"
                  accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingVertical: spacing.lg, paddingHorizontal: CARD_PADDING_HORIZONTAL, minHeight: 72 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint + '18', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg, flexShrink: 0 }}>
                      <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        Voir le CR
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }} numberOfLines={1}>
                        Consulter ou modifier le compte rendu
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ alignSelf: 'center', flexShrink: 0 }} />
                  </View>
                </Pressable>
              </View>
            </>
          )}

          <AppButton
            title="Rédiger un CR"
            onPress={() => {
              const params = new URLSearchParams({
                sessionId: session.id,
                fromSessionId: session.id,
              });
              if (session.reportId?.trim()) params.set('reportId', session.reportId.trim());
              // Warm-up the subjects catalog so it's available when the form opens offline.
              // Participants are already in cache because useSessionParticipants runs on this screen.
              queryClient.prefetchQuery({
                queryKey: ['subjects', 'catalog'],
                queryFn: fetchSubjectsCatalog,
              });
              router.push(`/(tabs)/comptes-rendus/new?${params.toString()}` as never);
            }}
            variant="primary"
            icon="file-document-edit-outline"
            accessibilityLabel="Rédiger un compte rendu pour cette séance"
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </View>

      {canAddStudents && session.establishmentId && profile?.id ? (
        <AddStudentToSessionModal
          visible={addStudentModalVisible}
          onClose={() => setAddStudentModalVisible(false)}
          onCreateNew={() => {
            setAddStudentModalVisible(false);
            if (id) router.push(routes.sessionCreateStudent(id) as never);
          }}
          sessionId={session.id}
          sessionType={session.type}
          establishmentId={session.establishmentId}
          establishmentName={session.establishment}
          currentTutorId={profile.id}
          participants={participants}
          existingPairs={session.studentTutorPairs}
          slot={slotFromSession(session)}
        />
      ) : null}

      <ConfirmModal
        visible={!!studentToRemove}
        title="Retirer l’élève"
        message={
          studentToRemove
            ? `Retirer ${studentToRemove.name} de cette séance ?`
            : 'Retirer cet élève de cette séance ?'
        }
        confirmLabel="Retirer"
        icon="account-remove-outline"
        onClose={closeRemoveModal}
        onConfirm={() => {
          if (studentToRemove) removeStudentMutation.mutate(studentToRemove.userId);
        }}
        loading={removeStudentMutation.isPending}
        error={removeFeedback?.type === 'error' ? removeFeedback.message : null}
        confirmAccessibilityLabel="Confirmer le retrait de l’élève"
        cancelAccessibilityLabel="Annuler le retrait de l’élève"
      />

      <Snackbar
        visible={removeFeedback?.type === 'success'}
        onDismiss={() => setRemoveFeedback(null)}
        duration={2500}
      >
        {removeFeedback?.message ?? ''}
      </Snackbar>
    </View>
  );
}
