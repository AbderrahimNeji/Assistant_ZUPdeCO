import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Snackbar } from 'react-native-paper';

import { ActivityFeedRow } from '@/components/ActivityFeedRow';
import { AppButton } from '@/components/AppButton';
import { SessionAttendanceEditable } from '@/components/SessionAttendanceEditable';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { isWeb, sessionVoiceCrRecordingEnabled } from '@/constants/Platform';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { triggerMedium } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCompteRenduDetail } from '@/hooks/useCompteRenduDetail';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfile } from '@/hooks/useProfile';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import { useSessions } from '@/hooks/useSessions';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useSubmitCompteRendu } from '@/hooks/useSubmitCompteRendu';
import { useUpdateCompteRenduOffline } from '@/hooks/useUpdateCompteRenduOffline';
import { useSubjectsCatalog } from '@/hooks/useSubjectsCatalog';
import { useSessionRecording } from '@/providers/SessionRecordingProvider';
import { fetchSessionById } from '@/services/sessions';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { isNetworkError } from '@/utils/networkError';
import { validateSessionAttendanceForViewer, validateParticipantAbsence } from '@/utils/attendanceValidation';
import { buildSessionReportParticipantsPayload } from '@/utils/sessionReportParticipants';
import type { SessionParticipant } from '@/types/session';
import {
  buildTutorReportSections,
  feedbackToFormValue,
  formValueToAuthorFeedback,
  getAuthorFeedbackForViewer,
  isMultiAuthorReport,
  normalizeAuthorFeedbacks,
  resolveActorFormValue,
  type TutorFeedbackFormValue,
} from '@/utils/report-author-feedback';
import type { CompteRenduAuthorFeedback, CompteRenduFeeling } from '@/types/compteRendu';
import type { CrSubmittedPayload, SessionCompletedPayload } from '@/types/activityFeed';
import { isValidated } from '@/types/compteRendu';
import { parseNoteToRating } from '@/services/comptesRendus';

export default function NewCompteRenduScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; reportId?: string; fromSessionId?: string; offlineQueueId?: string }>();
  const sessionIdParam =
    typeof params.sessionId === 'string'
      ? params.sessionId
      : Array.isArray(params.sessionId)
        ? params.sessionId[0]
        : undefined;
  const reportIdParam =
    typeof params.reportId === 'string'
      ? params.reportId
      : Array.isArray(params.reportId)
        ? params.reportId[0]
        : undefined;
  const fromSessionIdParam =
    typeof params.fromSessionId === 'string'
      ? params.fromSessionId
      : Array.isArray(params.fromSessionId)
        ? params.fromSessionId[0]
        : undefined;
  const offlineQueueIdParam =
    typeof params.offlineQueueId === 'string'
      ? params.offlineQueueId
      : Array.isArray(params.offlineQueueId)
        ? params.offlineQueueId[0]
        : undefined;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { data: sessions } = useSessions();
  const { mutate, isPending, error } = useSubmitCompteRendu();
  const { mutate: updateMutate, isPending: isUpdatePending, error: updateError } = useUpdateCompteRenduOffline();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const removeFromQueue = useOfflineQueueStore((s) => s.remove);
  const offlineQueueItems = useOfflineQueueStore((s) => s.queue);
  // Pre-existing offline draft (tapped from the CR list)
  const offlineDraft = offlineQueueIdParam
    ? offlineQueueItems.find((it) => it.id === offlineQueueIdParam) ?? null
    : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const {
    data: activityFeedData,
    isLoading: activityFeedLoading,
    error: activityFeedError,
    refetch: refetchActivityFeed,
  } = useActivityFeed(50);
  const { isOffline } = useNetworkStatus();
  const { aiResult, aiResultSessionId } = useSessionRecording();
  const isEdit = Boolean(reportIdParam && sessionIdParam);
  const { cr: existingCr } = useCompteRenduDetail(
    isEdit ? reportIdParam ?? undefined : undefined,
    isEdit ? sessionIdParam ?? undefined : undefined
  );

  const [sessionId, setSessionId] = useState(sessionIdParam ?? '');
  const { data: sessionParticipants = [], isLoading: sessionParticipantsLoading } = useSessionParticipants(
    sessionId || undefined,
  );
  const [note, setNote] = useState('');
  const [matiereIds, setMatiereIds] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [feeling, setFeeling] = useState<CompteRenduFeeling | null>(null);
  const [feedbackByAuthor, setFeedbackByAuthor] = useState<Map<string, TutorFeedbackFormValue>>(
    () => new Map(),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [attendanceFieldErrors, setAttendanceFieldErrors] = useState<Record<string, string>>({});
  const [noteFocused, setNoteFocused] = useState(false);
  const [commentaireFocused, setCommentaireFocused] = useState(false);
  const subjectIdsTouchedRef = useRef(false);
  const [prefillDone, setPrefillDone] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSubmitRef = useRef<() => void>(() => {});
  const resolveParticipantsForSubmitRef = useRef<(() => SessionParticipant[]) | null>(null);
  const registerParticipantsResolver = useCallback((resolver: () => SessionParticipant[]) => {
    resolveParticipantsForSubmitRef.current = resolver;
  }, []);

  useEffect(() => {
    if (sessionIdParam) setSessionId(sessionIdParam);
  }, [sessionIdParam]);

  // Resynchro des présences chaque fois que l'écran reprend le focus
  // (changement de tab, retour de navigation) → garde l'UI alignée avec le web.
  useFocusEffect(
    useCallback(() => {
      if (!sessionId) return;
      queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
    }, [sessionId, queryClient]),
  );

  useEffect(() => {
    if (!isWeb) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'textarea') return;
      if (tagName !== 'input') return;
      e.preventDefault();
      handleSubmitRef.current();
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [isWeb]);

  useEffect(() => {
    if (isEdit && existingCr) {
      if (isValidated(existingCr)) {
        router.replace(`/(tabs)/comptes-rendus/${existingCr.id}?sessionId=${existingCr.sessionId}` as never);
        return;
      }
      if (!prefillDone) {
        setMatiereIds(existingCr.matiereIds?.length ? [...existingCr.matiereIds] : []);
        const feedbacks = normalizeAuthorFeedbacks(existingCr);
        const map = new Map<string, TutorFeedbackFormValue>();
        for (const f of feedbacks) {
          map.set(f.idAuteur, feedbackToFormValue(f));
        }
        setFeedbackByAuthor(map);
        const actorFb = getAuthorFeedbackForViewer(existingCr, profile?.id ?? undefined);
        setNote(actorFb?.rating != null ? String(actorFb.rating) : '');
        setCommentaire(actorFb?.comment ?? '');
        setFeeling(actorFb?.feeling ?? null);
        setPrefillDone(true);
      }
    }
  }, [isEdit, existingCr, prefillDone, router]);

  // Pre-fill from an offline-pending queue item (opened from the CR list)
  useEffect(() => {
    if (!offlineDraft || prefillDone) return;
    const p = offlineDraft.payload as unknown as Record<string, unknown>;
    if (typeof p.note === 'string') setNote(p.note);
    if (Array.isArray(p.matiereIds)) setMatiereIds(p.matiereIds as string[]);
    if (typeof p.commentaire === 'string') setCommentaire(p.commentaire);
    if (p.feeling !== undefined) setFeeling((p.feeling as CompteRenduFeeling) ?? null);
    if (Array.isArray(p.authorFeedbacks)) {
      const map = new Map<string, TutorFeedbackFormValue>();
      for (const f of p.authorFeedbacks as CompteRenduAuthorFeedback[]) {
        map.set(f.idAuteur, feedbackToFormValue(f));
      }
      setFeedbackByAuthor(map);
    }
    setPrefillDone(true);
  }, [offlineDraft, prefillDone]);

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    subjectIdsTouchedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    setAttendanceFieldErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next: Record<string, string> = {};
      for (const [id, message] of Object.entries(prev)) {
        const participant = sessionParticipants.find((p) => p.id === id);
        if (participant && validateParticipantAbsence(participant)) {
          next[id] = message;
        }
      }
      return next;
    });
    if (sessionParticipants.length > 0 && validateSessionAttendanceForViewer(sessionParticipants, profile?.id).size === 0) {
      setValidationError((prev) =>
        prev === "Veuillez compléter les présences (motifs d'absence requis)" ? null : prev,
      );
    }
  }, [sessionParticipants]);

  const sessionOptions = sessions ?? [];
  const { data: sessionDetail, isLoading: sessionDetailLoading } = useQuery({
    queryKey: ['session', sessionId, 'detail-cr'],
    queryFn: () => fetchSessionById(sessionId),
    enabled: Boolean(sessionId),
  });
  /** Détail séance (subject_ids) prioritaire ; sinon entrée liste souvent sans subjectIds. */
  const selectedSession = sessionDetail ?? sessionOptions.find((s) => s.id === sessionId);
  const sessionForReport = React.useMemo(
    () => ({
      type: selectedSession?.type ?? existingCr?.sessionType ?? null,
      participants: sessionParticipants,
    }),
    [selectedSession?.type, existingCr?.sessionType, sessionParticipants],
  );
  const reportLike = React.useMemo(
    () =>
      existingCr ?? {
        authorId: profile?.id ?? null,
        authorFeedbacks: [] as CompteRenduAuthorFeedback[],
        note: null,
        commentaire: null,
        feeling: null,
      },
    [existingCr, profile?.id],
  );
  const multiAuthor = isMultiAuthorReport(sessionForReport, reportLike);

  React.useEffect(() => {
    if (!sessionId || prefillDone) return;
    const secs = buildTutorReportSections(sessionForReport, reportLike);
    if (!secs.length) return;
    const viewerId = profile?.id;
    setFeedbackByAuthor((prev) => {
      const next = new Map(prev);
      for (const s of secs) {
        if (viewerId && s.authorUserId !== viewerId) continue;
        if (!next.has(s.authorUserId)) {
          next.set(s.authorUserId, feedbackToFormValue(s.feedback));
        }
      }
      return next;
    });
  }, [sessionId, sessionForReport, reportLike, prefillDone, profile?.id]);

  const { data: allSubjects = [], isLoading: subjectsLoading } = useSubjectsCatalog();

  /**
   * Comme le web : si la séance a des subjectIds, on restreint au référentiel ;
   * sinon on propose tout le catalogue (liste GET /sessions souvent sans subject_ids).
   */
  const subjectOptions = useMemo(() => {
    if (!allSubjects.length) return [];
    const ids = selectedSession?.subjectIds ?? [];
    if (ids.length > 0) {
      return allSubjects.filter((s) => ids.includes(s.id));
    }
    return allSubjects;
  }, [selectedSession?.subjectIds, allSubjects]);

  const matieresLoading = Boolean(sessionId) && (subjectsLoading || sessionDetailLoading);

  useEffect(() => {
    if (subjectIdsTouchedRef.current) return;
    if (!selectedSession?.subjectIds?.length) return;
    if (isEdit && existingCr?.matiereIds?.length) return;
    setMatiereIds((prev) => (prev.length > 0 ? prev : [...selectedSession.subjectIds!]));
  }, [selectedSession, isEdit, existingCr]);

  const toggleMatiereId = (id: string) => {
    subjectIdsTouchedRef.current = true;
    setMatiereIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const sessionLabel = selectedSession
    ? `${new Date(selectedSession.date).toLocaleDateString('fr-FR')} · ${selectedSession.establishment ?? '—'}`
    : 'Choisir une séance';

  const navigateAfterSubmit = () => {
    if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    navigateTimeoutRef.current = setTimeout(() => {
      navigateTimeoutRef.current = null;
      if (fromSessionIdParam) {
        router.replace(`/(tabs)/sessions/${fromSessionIdParam}` as never);
      } else {
        router.replace('/(tabs)/comptes-rendus' as never);
      }
    }, 900);
  };

  const localActorForm = (): TutorFeedbackFormValue => ({
    note,
    commentaire,
    feeling,
  });

  const buildAuthorFeedbacksForSubmit = (): CompteRenduAuthorFeedback[] => {
    const authorId = profile?.id ?? '';
    const actorValue = resolveActorFormValue(
      multiAuthor,
      authorId,
      feedbackByAuthor,
      localActorForm(),
    );
    return [formValueToAuthorFeedback(authorId, actorValue, parseNoteToRating)];
  };

  const handleSubmit = () => {
    setValidationError(null);
    setAttendanceFieldErrors({});
    if (!sessionId) {
      setValidationError('Veuillez sélectionner une séance.');
      return;
    }

    // Le résolveur fait un flush des commits en attente (refs locales) puis renvoie
    // les participants fusionnés avec les brouillons locaux. Ainsi, même si une mise
    // à jour live est encore en vol ou que le commentaire vient d'être modifié, le
    // PATCH CR contient les valeurs les plus récentes côté UI (aligné sur le web).
    const latestParticipants =
      resolveParticipantsForSubmitRef.current?.()
      ?? queryClient.getQueryData<SessionParticipant[]>(['session', sessionId, 'participants'])
      ?? sessionParticipants;

    const participantPayload =
      latestParticipants.length > 0
        ? buildSessionReportParticipantsPayload(latestParticipants)
        : undefined;

    if (latestParticipants.length > 0) {
      const attendanceErrors = validateSessionAttendanceForViewer(
        latestParticipants,
        profile?.id,
      );
      if (attendanceErrors.size > 0) {
        setAttendanceFieldErrors(Object.fromEntries(attendanceErrors));
        setValidationError("Veuillez compléter les présences (motifs d'absence requis)");
        return;
      }
    }

    const actorId = profile?.id ?? '';
    const actorValue = resolveActorFormValue(
      multiAuthor,
      actorId,
      feedbackByAuthor,
      localActorForm(),
    );
    const trimmedNote = actorValue.note.trim();
    if (!trimmedNote) {
      setValidationError('Veuillez saisir la note de la séance (0 à 5).');
      return;
    }
    const noteNum = Number.parseFloat(trimmedNote.replace(',', '.'));
    if (Number.isNaN(noteNum) || noteNum < 0 || noteNum > 5) {
      setValidationError('La note doit être entre 0 et 5.');
      return;
    }

    if (!isOffline) {
      if (!subjectsLoading && subjectOptions.length === 0) {
        setValidationError('Aucune matière disponible dans le référentiel.');
        return;
      }
      if (matiereIds.length === 0) {
        setValidationError('Veuillez sélectionner au moins une matière.');
        return;
      }
    }

    const authorFeedbacks = buildAuthorFeedbacksForSubmit();
    const submitPayload = {
      sessionId,
      matiereIds,
      authorFeedbacks,
      authorId: profile?.id ?? undefined,
      reportId: isEdit && reportIdParam ? reportIdParam : null,
      note,
      commentaire: commentaire.trim(),
      feeling: feeling ?? null,
      ...(participantPayload?.length ? { participants: participantPayload } : {}),
    };

    if (isOffline) {
      if (isSubmitting) return;
      setIsSubmitting(true);
      if (offlineQueueIdParam) removeFromQueue(offlineQueueIdParam);
      if (isEdit && reportIdParam) {
        enqueue({
          type: 'cr_update',
          payload: {
            reportId: reportIdParam,
            sessionId,
            matiereIds,
            authorFeedbacks,
            ...(participantPayload?.length ? { participants: participantPayload } : {}),
          },
        });
      } else {
        enqueue({
          type: 'cr_submit',
          payload: submitPayload,
        });
      }
      triggerMedium();
      setOfflineQueued(true);
      setSuccessVisible(true);
      navigateAfterSubmit();
      return;
    }

    const onNetworkFallback = (err: unknown) => {
      if (isNetworkError(err)) {
        setOfflineQueued(true);
        triggerMedium();
        setSuccessVisible(true);
        navigateAfterSubmit();
      }
    };

    if (isEdit && reportIdParam) {
      updateMutate(
        {
          sessionId,
          reportId: reportIdParam,
          matiereIds,
          authorFeedbacks,
          ...(participantPayload?.length ? { participants: participantPayload } : {}),
        },
        {
          onSuccess: () => {
            triggerMedium();
            setSuccessVisible(true);
            navigateAfterSubmit();
          },
          onError: onNetworkFallback,
        },
      );
    } else {
      mutate(submitPayload, {
        onSuccess: () => {
          triggerMedium();
          setSuccessVisible(true);
          navigateAfterSubmit();
        },
        onError: onNetworkFallback,
      });
    }
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  const isAnyPending = isPending || isUpdatePending || isSubmitting;
  const apiError = error ?? updateError;
  const displayError = validationError ?? (apiError && !isNetworkError(apiError) ? (apiError.message ?? null) : null);
  const hasError = Boolean(displayError);

  // AI-generated CR suggestion — visible when the AI analysed this same session
  const aiCommentText = aiResult?.generatedComment?.trim() ?? '';
  const hasAiSuggestion =
    sessionVoiceCrRecordingEnabled &&
    !aiSuggestionDismissed &&
    Boolean(aiCommentText) &&
    aiResultSessionId === sessionId;

  const applyAiSuggestion = () => {
    setCommentaire(aiCommentText);
    setAiSuggestionDismissed(true);
  };

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
  };

  const activityFeedItems = (activityFeedData ?? []).slice(0, 8);
  const activityFeedCardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };
  const hasMoreActivityThanPreview = (activityFeedData ?? []).length > 8;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top + SCREEN_HEADER_CONTENT_OFFSET}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: scrollBottom,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Page title */}
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20, letterSpacing: -0.3 }}>
              Saisir un CR
            </Text>

            {/* Session selector */}
            <View
              style={{
                borderRadius: 16,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 14,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.info + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="calendar" size={16} color={colors.info} />
                </View>
                <SectionTitle>Séance</SectionTitle>
              </View>

              {!params.sessionId && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {sessionOptions.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Aucune séance disponible.</Text>
                  ) : (
                    sessionOptions.map((s) => {
                      const label = `${new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${s.establishment ?? '—'}`;
                      const isSelected = sessionId === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setSessionId(s.id)}
                          style={{
                            borderRadius: 20,
                            borderWidth: 1,
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderColor: isSelected ? colors.tint : colors.border,
                            backgroundColor: isSelected ? colors.tint + '18' : colors.background,
                            shadowColor: isSelected ? colors.tint : 'transparent',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isSelected ? 0.2 : 0,
                            shadowRadius: 4,
                            elevation: isSelected ? 2 : 0,
                          }}
                          accessibilityLabel={`Séance : ${label}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '500',
                              color: isSelected ? colors.tint : colors.text,
                            }}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}
              {sessionId ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                  <Text style={{ fontSize: 12, color: colors.success }}>{sessionLabel}</Text>
                </View>
              ) : null}
            </View>

            {sessionId ? (
              <View style={{ marginBottom: 14 }}>
                <SessionAttendanceEditable
                  participants={sessionParticipants}
                  viewerUserId={profile?.id}
                  sessionId={sessionId}
                  canEdit={true}
                  loading={sessionParticipantsLoading}
                  colors={colors}
                  isDark={isDark}
                  fieldErrors={attendanceFieldErrors}
                  onRegisterParticipantsResolver={registerParticipantsResolver}
                />
              </View>
            ) : null}

            {/* Historique des activités — contexte pour la saisie du CR */}
            <View
              style={{
                borderRadius: 16,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 14,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.tint + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="history" size={16} color={colors.tint} />
                </View>
                <SectionTitle>Historique des activités</SectionTitle>
              </View>
              {activityFeedLoading ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : activityFeedError ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    Impossible de charger l&apos;historique.
                  </Text>
                  <Pressable
                    onPress={() => refetchActivityFeed()}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, alignSelf: 'flex-start' })}
                    accessibilityLabel="Réessayer le chargement de l'historique"
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Réessayer</Text>
                  </Pressable>
                </View>
              ) : activityFeedItems.length === 0 ? (
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucune activité pour le moment.</Text>
              ) : (
                <View>
                  {activityFeedItems.map((item) => {
                    let onPress: (() => void) | undefined;
                    if (item.type === 'session_completed') {
                      onPress = () =>
                        router.push(`/(tabs)/sessions/${(item.payload as SessionCompletedPayload).sessionId}` as never);
                    } else if (item.type === 'cr_submitted') {
                      onPress = () => router.push('/(tabs)/comptes-rendus' as never);
                    }
                    return (
                      <ActivityFeedRow
                        key={item.id}
                        item={item}
                        colors={colors}
                        cardStyle={activityFeedCardStyle}
                        onPress={onPress}
                      />
                    );
                  })}
                  {hasMoreActivityThanPreview ? (
                    <Pressable
                      onPress={() => router.push('/(tabs)/profile/historique' as never)}
                      style={({ pressed }) => ({
                        marginTop: spacing.sm,
                        paddingVertical: 8,
                        opacity: pressed ? 0.75 : 1,
                      })}
                      accessibilityLabel="Voir tout l'historique des activités"
                      accessibilityRole="button"
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Voir tout l&apos;historique</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            <>
            {/* Note globale 0-5 */}
            <View
              style={{
                borderRadius: 16,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 14,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.warning + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="star-outline" size={16} color={colors.warning} />
                </View>
                <SectionTitle>Note globale (0 à 5)</SectionTitle>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map((n) => {
                  const isSelected = note.trim() === String(n) || (note.trim() !== '' && Number.parseFloat(note) === n);
                  return (
                    <Pressable
                      key={n}
                      testID={`cr-note-${n}`}
                      onPress={() => setNote(String(n))}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.tint : colors.border,
                        backgroundColor: isSelected ? colors.tint + '18' : colors.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      accessibilityLabel={`Note ${n}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '600', color: isSelected ? colors.tint : colors.text }}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Matière field */}
            <View
              style={{
                borderRadius: 16,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 14,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.success + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="book-open-outline" size={16} color={colors.success} />
                </View>
                <SectionTitle>Matières</SectionTitle>
              </View>
              {sessionId && matieresLoading ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : subjectOptions.length === 0 ? (
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  Aucune matière disponible dans le référentiel.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {subjectOptions.map((opt) => {
                    const selected = matiereIds.includes(opt.id);
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => toggleMatiereId(opt.id)}
                        disabled={isAnyPending}
                        style={{
                          borderRadius: 20,
                          borderWidth: 1,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderColor: selected ? colors.tint : colors.border,
                          backgroundColor: selected ? colors.tint + '18' : colors.background,
                        }}
                        accessibilityLabel={`Matière ${opt.label}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: selected ? colors.tint : colors.text,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Commentaire field */}
            <View
              style={{
                borderRadius: 16,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 14,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.info + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="comment-text-outline" size={16} color={colors.info} />
                </View>
                <SectionTitle>Résumé de la séance</SectionTitle>
              </View>

              {/* AI suggestion banner */}
              {hasAiSuggestion && (
                <Pressable
                  onPress={applyAiSuggestion}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    marginBottom: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.tint + '50',
                    backgroundColor: colors.tint + '10',
                    overflow: 'hidden',
                  })}
                  accessibilityLabel="Utiliser le brouillon de commentaire généré par l'IA"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.tint + '25',
                      backgroundColor: colors.tint + '18',
                    }}
                  >
                    <MaterialCommunityIcons name="robot-outline" size={16} color={colors.tint} />
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.tint }}>
                      Brouillon généré par l'IA
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: colors.tint,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <MaterialCommunityIcons name="content-copy" size={11} color={isDark ? colors.text : '#fff'} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? colors.text : '#fff' }}>
                        Utiliser
                      </Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text
                      numberOfLines={3}
                      style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}
                    >
                      {aiCommentText}
                    </Text>
                  </View>
                </Pressable>
              )}

              <TextInput
                testID="cr-commentaire"
                value={commentaire}
                onChangeText={setCommentaire}
                onFocus={() => setCommentaireFocused(true)}
                onBlur={() => setCommentaireFocused(false)}
                placeholder="Résumé libre de la séance"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                editable={!isPending}
                accessibilityLabel="Résumé de la séance"
                style={{
                  ...inputStyle,
                  borderColor: commentaireFocused ? colors.tint : colors.border,
                  minHeight: 100,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Comment vous êtes-vous senti ? */}
            <View
              style={{
                borderRadius: 16,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 14,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.tint + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="emoticon-outline" size={16} color={colors.tint} />
                </View>
                <SectionTitle style={{ flex: 1, flexShrink: 1 }}>Comment vous êtes-vous senti pendant cette séance ?</SectionTitle>
              </View>
              <View style={{ gap: 8 }}>
                {(
                  [
                    { value: 'very_at_ease' as const, label: "Très à l'aise" },
                    { value: 'rather_at_ease' as const, label: "Plutôt à l'aise" },
                    { value: 'neutral' as const, label: 'Neutre' },
                    { value: 'somewhat_difficult' as const, label: 'Un peu en difficulté' },
                    { value: 'difficult' as const, label: 'En difficulté' },
                  ] as const
                ).map(({ value, label }) => {
                  const isSelected = feeling === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setFeeling(isSelected ? null : value)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.tint : colors.border,
                        backgroundColor: isSelected ? colors.tint + '18' : colors.background,
                      }}
                      accessibilityLabel={label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={{ fontSize: 15, color: isSelected ? colors.tint : colors.text, fontWeight: isSelected ? '600' : '400' }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            </>

            {/* Offline info banner */}
            {isOffline ? (
              <View
                style={{
                  marginBottom: 12,
                  borderRadius: 12,
                  backgroundColor: (colors.warning ?? colors.tint) + '18',
                  borderWidth: 1,
                  borderColor: (colors.warning ?? colors.tint) + '50',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
                accessibilityRole="text"
              >
                <MaterialCommunityIcons name="cloud-off-outline" size={16} color={colors.warning ?? colors.tint} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.warning ?? colors.tint }}>
                  Hors ligne — les données seront synchronisées dès le retour de la connexion.
                </Text>
              </View>
            ) : null}

            {/* Error banner */}
            {hasError ? (
              <View
                style={{
                  marginBottom: 16,
                  borderRadius: 12,
                  backgroundColor: colors.danger + '18',
                  borderWidth: 1,
                  borderColor: colors.danger + '40',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.danger }}>{displayError}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <AppButton
              testID="cr-submit-button"
              title={isOffline ? 'Enregistrer (hors ligne)' : 'Enregistrer le CR'}
              onPress={handleSubmit}
              variant="primary"
              icon={isOffline ? 'cloud-upload-outline' : 'check-circle-outline'}
              loading={isAnyPending}
              disabled={isAnyPending}
              accessibilityLabel="Enregistrer le compte rendu"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={offlineQueued ? 3000 : 800}
        style={{ backgroundColor: offlineQueued ? (colors.warning ?? colors.tint) : colors.success }}
      >
        {offlineQueued
          ? 'Sauvegardé localement — synchronisation à venir'
          : 'CR enregistré avec succès'}
      </Snackbar>
    </View>
  );
}
