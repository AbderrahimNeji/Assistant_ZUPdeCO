import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { Text } from '@/components/Themed';
import { isAndroid, isWeb } from '@/constants/Platform';
import { borderRadius, spacing } from '@/constants/DesignTokens';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { fetchStudentsByEstablishment } from '@/services/students';
import { setSessionAssignments } from '@/services/sessions';
import type { SessionParticipant, SessionStudentTutorPair, SessionType } from '@/types/session';
import type { Student } from '@/types/student';
import { getStudentDisplayName } from '@/utils/studentDisplay';
import {
  buildPairsForAddedStudents,
  derivePairsFromParticipants,
  mergeSessionPairs,
  toAssignmentParticipants,
} from '@/utils/sessionStudentPairs';
import {
  buildStudentSubmitBlockedMessage,
  checkOneStudentSlotAvailability,
  isSessionSlotComplete,
  type SessionSlot,
  type StudentAvailabilityById,
} from '@/utils/sessionStudentAvailability';
import { triggerMedium } from '@/utils/haptics';

export interface AddStudentToSessionModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onCreateNew: () => void;
  readonly sessionId: string;
  readonly sessionType: SessionType | null | undefined;
  readonly establishmentId: string;
  readonly establishmentName?: string | null;
  readonly currentTutorId: string;
  readonly participants: SessionParticipant[];
  readonly existingPairs?: SessionStudentTutorPair[];
  /** Créneau de la séance — permet la vérification de disponibilité des élèves. */
  readonly slot?: SessionSlot | null;
}

function studentPickerLabel(student: Student): string {
  const display = getStudentDisplayName(student);
  if (display !== 'Élève') return display;
  const first = (student.firstName ?? '').trim();
  const last = (student.lastName ?? '').trim();
  const legal = `${first} ${last}`.trim();
  return legal || display;
}

export function AddStudentToSessionModal({
  visible,
  onClose,
  onCreateNew,
  sessionId,
  sessionType,
  establishmentId,
  establishmentName,
  currentTutorId,
  participants,
  existingPairs,
  slot,
}: AddStudentToSessionModalProps) {
  const colors = useDynamicColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [availabilityById, setAvailabilityById] = useState<StudentAvailabilityById>({});
  const canCheckAvailability = isSessionSlotComplete(slot);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setDebouncedSearch('');
    setSelectedIds(new Set());
    setErrorMessage('');
    setAvailabilityById({});
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!visible || isWeb) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const alreadyOnSession = useMemo(
    () =>
      new Set(
        participants.filter((p) => p.role === 'student').map((p) => p.userId),
      ),
    [participants],
  );

  const facilitatorIds = useMemo(
    () =>
      participants
        .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
        .map((p) => p.userId),
    [participants],
  );

  const studentsQuery = useQuery({
    queryKey: [
      'session-add-students',
      establishmentId,
      debouncedSearch,
      [...alreadyOnSession].sort().join(','),
    ],
    queryFn: () =>
      fetchStudentsByEstablishment({
        establishmentId,
        search: debouncedSearch || undefined,
        page: 1,
        pageSize: 50,
        excludeIds: [...alreadyOnSession],
      }),
    enabled: visible && !!establishmentId,
  });

  const addMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      const currentPairs =
        existingPairs && existingPairs.length > 0
          ? existingPairs
          : derivePairsFromParticipants(participants, currentTutorId, sessionType);

      const newPairs = buildPairsForAddedStudents({
        sessionType,
        newStudentIds: studentIds,
        currentTutorId,
        facilitatorIds,
      });

      const merged = mergeSessionPairs(currentPairs, newPairs);
      const nextParticipants = toAssignmentParticipants([
        ...participants,
        ...studentIds.map((userId) => ({ userId, role: 'student' as const })),
      ]);
      return setSessionAssignments(sessionId, merged, nextParticipants);
    },
    onSuccess: async () => {
      triggerMedium();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'participants'] }),
      ]);
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Impossible d’ajouter les élèves';
      setErrorMessage(msg || 'Impossible d’ajouter les élèves');
    },
  });

  /**
   * Sélection avec vérification de disponibilité (aligné web ensureStudentAvailableForAdd) :
   * l'élève en conflit reste visible mais non sélectionnable, avec le motif affiché.
   */
  const toggleStudent = useCallback(
    (id: string) => {
      setErrorMessage('');
      const isSelected = selectedIds.has(id);
      if (isSelected) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      const entry = availabilityById[id];
      if (entry?.status === 'conflict') return;

      setSelectedIds((prev) => new Set(prev).add(id));

      if (!canCheckAvailability || !slot || entry?.status === 'available') return;

      setAvailabilityById((prev) => ({ ...prev, [id]: { status: 'checking' } }));
      void checkOneStudentSlotAvailability(id, slot, sessionId).then((result) => {
        setAvailabilityById((prev) => ({ ...prev, [id]: result }));
        if (result.status === 'conflict') {
          // Désélectionne automatiquement l'élève occupé (comportement web : ajout refusé).
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      });
    },
    [selectedIds, availabilityById, canCheckAvailability, slot, sessionId],
  );

  const students = studentsQuery.data?.students ?? [];

  const handleConfirm = async () => {
    setErrorMessage('');
    if (selectedIds.size === 0) {
      setErrorMessage('Sélectionnez au moins un élève');
      return;
    }

    // Garde finale avant enregistrement (aligné web validateForSubmit) : re-vérifie tous les élèves.
    if (canCheckAvailability && slot) {
      const ids = [...selectedIds];
      const results = await Promise.all(
        ids.map(async (id) => [id, await checkOneStudentSlotAvailability(id, slot, sessionId)] as const),
      );
      setAvailabilityById((prev) => ({ ...prev, ...Object.fromEntries(results) }));
      const conflictIds = results.filter(([, r]) => r.status === 'conflict').map(([id]) => id);
      if (conflictIds.length > 0) {
        const names = conflictIds.map((id) => {
          const student = students.find((s) => s.id === id);
          return student ? studentPickerLabel(student) : 'Élève';
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          conflictIds.forEach((id) => next.delete(id));
          return next;
        });
        setErrorMessage(buildStudentSubmitBlockedMessage(names));
        return;
      }
    }

    addMutation.mutate([...selectedIds]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      {...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {})}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              maxHeight: '88%',
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Ajouter un élève</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Fermer"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {establishmentName ? (
            <Text
              style={{
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.sm,
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              Établissement : {establishmentName}
            </Text>
          ) : null}

          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                backgroundColor: colors.backgroundSecondary,
                paddingHorizontal: spacing.md,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher par nom ou prénom…"
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: spacing.sm,
                  fontSize: 16,
                  color: colors.text,
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Pressable
            onPress={onCreateNew}
            style={({ pressed }) => ({
              marginHorizontal: spacing.lg,
              marginTop: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.tint,
              backgroundColor: colors.tint + '12',
              opacity: pressed ? 0.8 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            })}
            accessibilityRole="button"
            accessibilityLabel="Créer un nouvel élève"
          >
            <MaterialCommunityIcons name="account-plus" size={22} color={colors.tint} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.tint, flex: 1 }}>
              Créer un nouvel élève
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.tint} />
          </Pressable>

          {studentsQuery.isLoading ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
              ListEmptyComponent={
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                  Aucun élève trouvé dans cet établissement
                </Text>
              }
              renderItem={({ item }) => {
                const selected = selectedIds.has(item.id);
                const availability = availabilityById[item.id];
                const isConflict = availability?.status === 'conflict';
                const isChecking = availability?.status === 'checking';
                return (
                  <Pressable
                    onPress={() => toggleStudent(item.id)}
                    disabled={isConflict}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.md,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      opacity: isConflict ? 0.55 : pressed ? 0.75 : 1,
                      backgroundColor: selected ? colors.tint + '10' : 'transparent',
                    })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: isConflict }}
                  >
                    <MaterialCommunityIcons
                      name={
                        isConflict
                          ? 'account-cancel-outline'
                          : selected
                            ? 'checkbox-marked'
                            : 'checkbox-blank-outline'
                      }
                      size={24}
                      color={isConflict ? colors.danger : selected ? colors.tint : colors.textSecondary}
                      style={{ marginRight: spacing.md }}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: '500', color: colors.text }}
                        numberOfLines={1}
                      >
                        {studentPickerLabel(item)}
                      </Text>
                      {isConflict ? (
                        <Text style={{ fontSize: 12, color: colors.danger, marginTop: 2 }}>
                          {availability?.hint ?? 'Déjà en séance sur ce créneau horaire.'}
                        </Text>
                      ) : item.levelLabel ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          {item.levelLabel}
                        </Text>
                      ) : null}
                    </View>
                    {isChecking ? (
                      <ActivityIndicator size="small" color={colors.tint} style={{ marginLeft: spacing.sm }} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}

          {errorMessage ? (
            <Text
              style={{
                color: colors.danger,
                paddingHorizontal: spacing.lg,
                marginBottom: spacing.sm,
                fontSize: 13,
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <AppButton
              title={
                selectedIds.size > 0
                  ? `Ajouter (${selectedIds.size})`
                  : 'Ajouter à la séance'
              }
              onPress={handleConfirm}
              variant="primary"
              disabled={addMutation.isPending || selectedIds.size === 0}
              loading={addMutation.isPending}
              accessibilityLabel="Ajouter les élèves sélectionnés"
            />
            {isAndroid ? (
              <AppButton title="Annuler" onPress={onClose} variant="secondary" />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
