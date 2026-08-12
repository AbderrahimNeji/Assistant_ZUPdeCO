import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { borderRadius, CARD_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useUpdateAttendance } from '@/hooks/useUpdateAttendance';
import type { ColorPalette } from '@/providers/BrandingProvider';
import type { AttendanceStatus, SessionParticipant } from '@/types/session';
import {
  filterParticipantsForViewerAssiduity,
  getSessionParticipantDisplayLabel,
} from '@/types/session';
import {
  AUTRE_MOTIF,
  draftFromParticipant,
  getAbsenceMotifOptionsForRole,
  isSameAbsenceDraft,
  resolveDraftForParticipant,
  resolveStoredMotifSelection,
  validateAbsenceDraft,
} from '@/utils/absenceDraft';
import { mergeParticipantsWithAbsenceDrafts } from '@/utils/sessionReportParticipants';
import { validateParticipantAbsence } from '@/utils/attendanceValidation';

const COMMIT_DEBOUNCE_MS = 700;

function getAttendanceStatusColor(status: AttendanceStatus, colors: ColorPalette): string {
  switch (status) {
    case 'present':
      return colors.success;
    case 'absent':
      return colors.danger;
    case 'excused':
      return colors.warning;
    case 'pending':
    default:
      return colors.info;
  }
}

function getCrAttendanceLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'Présent';
    case 'absent':
    case 'excused':
      return 'Absent';
    case 'pending':
    default:
      return 'En attente';
  }
}

function preventInputBlurOnWeb(event: { preventDefault?: () => void }) {
  if (Platform.OS === 'web') event.preventDefault?.();
}

export interface SessionAttendanceEditableProps {
  participants: SessionParticipant[];
  viewerUserId?: string | null;
  sessionId: string;
  canEdit: boolean;
  loading: boolean;
  colors: ColorPalette;
  isDark: boolean;
  fieldErrors?: Record<string, string>;
  /** Enregistre une fonction pour lire les participants fusionnés avec les brouillons locaux (soumission CR). */
  onRegisterParticipantsResolver?: (resolver: () => SessionParticipant[]) => void;
}

export function SessionAttendanceEditable({
  participants,
  viewerUserId,
  sessionId,
  canEdit,
  loading,
  colors,
  isDark,
  fieldErrors = {},
  onRegisterParticipantsResolver,
}: SessionAttendanceEditableProps) {
  const visibleParticipants = useMemo(
    () => filterParticipantsForViewerAssiduity(participants, viewerUserId ?? undefined),
    [participants, viewerUserId],
  );

  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const [selectedMotif, setSelectedMotif] = useState<Record<string, string>>({});
  const [commentaire, setCommentaire] = useState<Record<string, string>>({});
  const [motifError, setMotifError] = useState<Record<string, string>>({});
  const [expandedAbsenceParticipantIds, setExpandedAbsenceParticipantIds] = useState<Set<string>>(
    () => new Set(),
  );

  const initializedSessionRef = useRef<string | null>(null);
  const selectedMotifRef = useRef(selectedMotif);
  const commentaireRef = useRef(commentaire);
  const commitTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  selectedMotifRef.current = selectedMotif;
  commentaireRef.current = commentaire;

  const hydrateDraftsFromParticipants = useCallback((list: SessionParticipant[]) => {
    const motifs: Record<string, string> = {};
    const comments: Record<string, string> = {};
    for (const p of list) {
      const draft = draftFromParticipant(p);
      if (draft.motif) motifs[p.id] = draft.motif;
      if (draft.comment) comments[p.id] = draft.comment;
    }
    selectedMotifRef.current = motifs;
    commentaireRef.current = comments;
    setSelectedMotif(motifs);
    setCommentaire(comments);
  }, []);

  const syncDraftFromSaved = useCallback(
    (participantId: string, payload: { absenceJustification: string; absenceComment: string }) => {
      const motif = resolveStoredMotifSelection(payload.absenceJustification.trim());
      const comment = payload.absenceComment.trim();
      selectedMotifRef.current = { ...selectedMotifRef.current, [participantId]: motif };
      commentaireRef.current = { ...commentaireRef.current, [participantId]: comment };
      setSelectedMotif((prev) => ({ ...prev, [participantId]: motif }));
      setCommentaire((prev) => ({ ...prev, [participantId]: comment }));
    },
    [],
  );

  const tryCommitAbsenceRef = useRef<
    (participantId: string, options?: { showValidationErrors?: boolean }) => boolean
  >(() => false);

  const updateAttendance = useUpdateAttendance(sessionId, {
    onSaved: syncDraftFromSaved,
    onSettled: (participantId) => {
      tryCommitAbsenceRef.current(participantId);
    },
  });
  const pendingParticipantId = updateAttendance.isPending
    ? updateAttendance.variables?.participantId
    : null;

  useEffect(() => {
    initializedSessionRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!canEdit || loading || visibleParticipants.length === 0) return;
    if (initializedSessionRef.current === sessionId) return;
    initializedSessionRef.current = sessionId;

    setExpandedAbsenceParticipantIds(
      new Set(visibleParticipants.filter((p) => p.attendanceStatus !== 'present').map((p) => p.id)),
    );
    hydrateDraftsFromParticipants(visibleParticipants);
  }, [canEdit, loading, visibleParticipants, sessionId, hydrateDraftsFromParticipants]);

  useEffect(() => {
    const errorIds = Object.keys(fieldErrors);
    if (errorIds.length === 0) return;
    setExpandedAbsenceParticipantIds((prev) => {
      const next = new Set(prev);
      for (const id of errorIds) next.add(id);
      return next;
    });
  }, [fieldErrors]);

  useEffect(
    () => () => {
      for (const timer of Object.values(commitTimersRef.current)) clearTimeout(timer);
    },
    [],
  );

  const clearCommitTimer = (participantId: string) => {
    const timer = commitTimersRef.current[participantId];
    if (timer) {
      clearTimeout(timer);
      delete commitTimersRef.current[participantId];
    }
  };

  const tryCommitAbsence = useCallback(
    (participantId: string, options?: { showValidationErrors?: boolean }) => {
      const p = participantsRef.current.find((item) => item.id === participantId);
      if (!p || !canEdit) return false;

      const draft = resolveDraftForParticipant(
        p,
        selectedMotifRef.current,
        commentaireRef.current,
      );
      const validationError = validateAbsenceDraft(draft);
      if (validationError) {
        if (options?.showValidationErrors) {
          setMotifError((prev) => ({ ...prev, [participantId]: validationError }));
        }
        return false;
      }
      if (isSameAbsenceDraft(p, draft)) {
        setMotifError((prev) => {
          const next = { ...prev };
          delete next[participantId];
          return next;
        });
        return true;
      }

      setMotifError((prev) => {
        const next = { ...prev };
        delete next[participantId];
        return next;
      });
      updateAttendance.mutate({
        participantId,
        attendanceStatus: 'absent',
        absenceJustification: draft.motif,
        absenceComment: draft.comment.trim() || null,
      });
      return true;
    },
    [canEdit, updateAttendance],
  );

  tryCommitAbsenceRef.current = tryCommitAbsence;

  const flushPendingCommits = useCallback(() => {
    for (const p of visibleParticipants) {
      clearCommitTimer(p.id);
      tryCommitAbsenceRef.current(p.id);
    }
  }, [visibleParticipants]);

  useEffect(() => {
    if (!onRegisterParticipantsResolver) return;
    onRegisterParticipantsResolver(() => {
      flushPendingCommits();
      return mergeParticipantsWithAbsenceDrafts(
        participantsRef.current,
        selectedMotifRef.current,
        commentaireRef.current,
      );
    });
  }, [onRegisterParticipantsResolver, flushPendingCommits]);

  const scheduleCommitAbsence = useCallback(
    (participantId: string) => {
      clearCommitTimer(participantId);
      commitTimersRef.current[participantId] = setTimeout(() => {
        delete commitTimersRef.current[participantId];
        tryCommitAbsence(participantId);
      }, COMMIT_DEBOUNCE_MS);
    },
    [tryCommitAbsence],
  );

  const commitAbsenceNow = useCallback(
    (participantId: string) => {
      clearCommitTimer(participantId);
      return tryCommitAbsence(participantId, { showValidationErrors: true });
    },
    [tryCommitAbsence],
  );

  // Silent: tente de sauvegarder, mais n'affiche pas l'erreur (utilisé par blur).
  const commitAbsenceSilently = useCallback(
    (participantId: string) => {
      clearCommitTimer(participantId);
      return tryCommitAbsence(participantId);
    },
    [tryCommitAbsence],
  );

  const setPresent = (p: SessionParticipant) => {
    clearCommitTimer(p.id);
    updateAttendance.mutate({
      participantId: p.id,
      attendanceStatus: 'present',
      absenceJustification: null,
      absenceComment: null,
    });
    setExpandedAbsenceParticipantIds((prev) => {
      if (!prev.has(p.id)) return prev;
      const next = new Set(prev);
      next.delete(p.id);
      return next;
    });
    const nextMotifs = { ...selectedMotifRef.current };
    delete nextMotifs[p.id];
    selectedMotifRef.current = nextMotifs;
    const nextComments = { ...commentaireRef.current };
    delete nextComments[p.id];
    commentaireRef.current = nextComments;
    setSelectedMotif(nextMotifs);
    setCommentaire(nextComments);
    setMotifError((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
  };

  const openAbsencePanel = (p: SessionParticipant) => {
    setExpandedAbsenceParticipantIds((prev) => new Set(prev).add(p.id));
    setMotifError((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    const draft = draftFromParticipant(p);
    const nextMotif = selectedMotifRef.current[p.id] ?? draft.motif;
    const nextComment = commentaireRef.current[p.id] ?? draft.comment;
    selectedMotifRef.current = {
      ...selectedMotifRef.current,
      [p.id]: nextMotif,
    };
    commentaireRef.current = {
      ...commentaireRef.current,
      [p.id]: nextComment,
    };
    setSelectedMotif((prev) => ({ ...prev, [p.id]: nextMotif }));
    setCommentaire((prev) => ({ ...prev, [p.id]: nextComment }));
  };

  const selectMotif = (p: SessionParticipant, motif: string) => {
    selectedMotifRef.current = { ...selectedMotifRef.current, [p.id]: motif };
    commentaireRef.current = { ...commentaireRef.current };
    setSelectedMotif((prev) => ({ ...prev, [p.id]: motif }));
    setMotifError((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    if (motif !== AUTRE_MOTIF) {
      commitAbsenceNow(p.id);
    }
  };

  const updateComment = (p: SessionParticipant, text: string) => {
    commentaireRef.current = { ...commentaireRef.current, [p.id]: text };
    setCommentaire((prev) => ({ ...prev, [p.id]: text }));
    setMotifError((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    scheduleCommitAbsence(p.id);
  };

  const tutorParticipants = useMemo(
    () => visibleParticipants.filter((p) => p.role === 'tutor' || p.role === 'volunteer'),
    [visibleParticipants],
  );
  const studentParticipants = useMemo(
    () => visibleParticipants.filter((p) => p.role === 'student'),
    [visibleParticipants],
  );
  const tutorSectionTitle =
    tutorParticipants.length === 1 ? 'Ma présence' : 'Tuteurs et bénévoles';

  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
    marginBottom: spacing.md,
    ...getCardShadowPlatform(isDark),
  };

  const chipBaseStyle = {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const renderRow = (p: SessionParticipant, nameFallback: string, showBorderBottom: boolean) => {
    const name = getSessionParticipantDisplayLabel(p, nameFallback);
    const roleLabel = p.role === 'volunteer' ? 'Bénévole' : p.role === 'tutor' ? 'Tuteur' : 'Élève';
    const statusColor = getAttendanceStatusColor(p.attendanceStatus, colors);
    const isPending = pendingParticipantId === p.id;
    const isExpanded = expandedAbsenceParticipantIds.has(p.id);
    const isAbsent = p.attendanceStatus === 'absent';
    const canInteract = canEdit && !isPending;
    const draft = resolveDraftForParticipant(p, selectedMotif, commentaire);
    const showAbsenceDetails = isAbsent || isExpanded;
    const submitError =
      !isExpanded && fieldErrors[p.id] && validateParticipantAbsence(p)
        ? fieldErrors[p.id]
        : undefined;

    return (
      <View
        key={p.id}
        style={{
          paddingVertical: spacing.md,
          paddingHorizontal: CARD_PADDING_HORIZONTAL,
          borderBottomWidth: showBorderBottom ? 1 : 0,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={2}>
              {name}
            </Text>
            {showAbsenceDetails ? (
              <>
                <Text
                  style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 }}
                >
                  Motif : {draft.motif !== '' ? draft.motif : '—'}
                </Text>
                {draft.comment !== '' ? (
                  <Text
                    style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}
                  >
                    Commentaire : {draft.comment}
                  </Text>
                ) : null}
                {submitError ? (
                  <Text style={{ fontSize: 12, color: colors.danger, marginTop: 4, lineHeight: 16 }}>
                    {submitError}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: colors.background,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{roleLabel}</Text>
            </View>

            <View
              style={{
                backgroundColor: statusColor + '18',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: borderRadius.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isPending ? <ActivityIndicator size="small" color={statusColor} /> : null}
              <Text style={{ fontSize: 13, fontWeight: '600', color: statusColor }}>
                {getCrAttendanceLabel(p.attendanceStatus)}
              </Text>
            </View>
          </View>
        </View>

        {canEdit ? (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable
                onPress={() => setPresent(p)}
                disabled={!canInteract}
                style={({ pressed }) => ({
                  ...chipBaseStyle,
                  opacity: !canInteract ? 0.6 : pressed ? 0.8 : 1,
                  borderColor: p.attendanceStatus === 'present' ? colors.success : colors.border,
                  backgroundColor:
                    p.attendanceStatus === 'present' ? colors.success + '18' : colors.background,
                })}
                accessibilityRole="button"
                accessibilityLabel={`Marquer ${name} présent`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Présent</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => openAbsencePanel(p)}
                disabled={!canInteract}
                style={({ pressed }) => ({
                  ...chipBaseStyle,
                  opacity: !canInteract ? 0.6 : pressed ? 0.8 : 1,
                  borderColor: isAbsent || isExpanded ? colors.danger : colors.border,
                  backgroundColor:
                    isAbsent || isExpanded ? colors.danger + '18' : colors.background,
                })}
                accessibilityRole="button"
                accessibilityLabel={`Marquer ${name} absent`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="close" size={16} color={colors.danger} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Absent</Text>
                </View>
              </Pressable>
            </View>

            {isExpanded ? (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  padding: 12,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  Motif d&apos;absence
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {getAbsenceMotifOptionsForRole(p.role).map((motif) => {
                    const selected = draft.motif === motif;
                    return (
                      <Pressable
                        key={motif}
                        onPressIn={preventInputBlurOnWeb}
                        onPress={() => selectMotif(p, motif)}
                        disabled={!canInteract}
                        style={({ pressed }) => ({
                          ...chipBaseStyle,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          opacity: !canInteract ? 0.6 : pressed ? 0.8 : 1,
                          borderColor: selected ? colors.tint : colors.border,
                          backgroundColor: selected ? colors.tint + '18' : colors.background,
                        })}
                        accessibilityRole="button"
                        accessibilityLabel={`Motif: ${motif}`}
                      >
                        <Text style={{ fontSize: 13, color: selected ? colors.tint : colors.text }}>
                          {motif}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {motifError[p.id] ? (
                  <Text style={{ fontSize: 12, color: colors.danger }}>{motifError[p.id]}</Text>
                ) : null}

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                    Commentaire{' '}
                    <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                      (optionnel)
                    </Text>
                  </Text>
                  <TextInput
                    value={p.id in commentaire ? commentaire[p.id] : draft.comment}
                    onChangeText={(text) => updateComment(p, text)}
                    placeholder={
                      draft.motif === AUTRE_MOTIF ? 'Précisez le motif…' : 'Saisissez un commentaire…'
                    }
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => commitAbsenceNow(p.id)}
                    onBlur={() => commitAbsenceSilently(p.id)}
                    onKeyPress={(event) => {
                      if (event.nativeEvent.key === 'Enter') commitAbsenceNow(p.id);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: draft.motif ? colors.tint : colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                      minHeight: 40,
                    }}
                    accessibilityLabel="Commentaire d'absence"
                  />
                </View>

                {draft.motif === AUTRE_MOTIF ? (
                  <Pressable
                    onPressIn={preventInputBlurOnWeb}
                    onPress={() => commitAbsenceNow(p.id)}
                    disabled={!canInteract}
                    style={({ pressed }) => ({
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      alignItems: 'center' as const,
                      justifyContent: 'center' as const,
                      opacity: !canInteract ? 0.6 : pressed ? 0.8 : 1,
                      backgroundColor: colors.tint,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel="Valider le motif d'absence"
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Valider</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
        <MaterialCommunityIcons name="account-check-outline" size={20} color={colors.tint} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Assiduité</Text>
      </View>

      <View style={cardStyle}>
        {loading ? (
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Chargement de la présence…
            </Text>
          </View>
        ) : visibleParticipants.length === 0 ? (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Aucun participant sur cette séance.
            </Text>
          </View>
        ) : (
          <>
            {tutorParticipants.length > 0 ? (
              <>
                <View
                  style={{
                    paddingHorizontal: CARD_PADDING_HORIZONTAL,
                    paddingTop: spacing.md,
                    paddingBottom: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: colors.textSecondary,
                    }}
                  >
                    {tutorSectionTitle}
                  </Text>
                </View>
                {tutorParticipants.map((p, i) =>
                  renderRow(p, 'Tuteur', i < tutorParticipants.length - 1),
                )}
              </>
            ) : null}

            {studentParticipants.length > 0 ? (
              <>
                {tutorParticipants.length > 0 ? (
                  <View
                    style={{
                      marginHorizontal: CARD_PADDING_HORIZONTAL,
                      marginTop: spacing.sm,
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: colors.textSecondary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Élèves
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      paddingHorizontal: CARD_PADDING_HORIZONTAL,
                      paddingTop: spacing.md,
                      paddingBottom: spacing.xs,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: colors.textSecondary,
                      }}
                    >
                      Élèves
                    </Text>
                  </View>
                )}

                {studentParticipants.map((p, i) =>
                  renderRow(p, 'Élève', i < studentParticipants.length - 1),
                )}
              </>
            ) : null}

            {updateAttendance.isError ? (
              <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 13, color: colors.danger ?? colors.textSecondary }}>
                  Impossible de mettre à jour la présence. Réessayez.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {!canEdit ? (
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            La présence est verrouillée car le compte rendu est validé.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
