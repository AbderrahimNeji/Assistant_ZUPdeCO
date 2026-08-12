import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import {
  AvailabilityGrid,
  type AvailabilityValue,
} from '@/components/AvailabilityGrid';
import { Text } from '@/components/Themed';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfile } from '@/hooks/useProfile';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import {
  fetchLevels,
  fetchRoles,
  fetchSchoolClasses,
  fetchSpecialties,
} from '@/services/academic';
import { fetchSubjectsCatalog } from '@/services/subjects';
import { createStudent, fetchStudentsByEstablishment } from '@/services/students';
import { setSessionAssignments } from '@/services/sessions';
import { isValidRouteId, routes } from '@/utils/routes';
import {
  buildPairsForAddedStudents,
  derivePairsFromParticipants,
  mergeSessionPairs,
  toAssignmentParticipants,
} from '@/utils/sessionStudentPairs';

/** Aligné web CreateStudentView genderOptions. */
const GENDER_OPTIONS: { value: 'M' | 'F'; label: string }[] = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
];

/** Aligné web SPECIAL_NEEDS_TYPE_OPTIONS. */
const SPECIAL_NEEDS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ulis', label: 'ULIS' },
  { value: 'upe2a', label: 'UPE2A' },
  { value: 'segpa', label: 'SEGPA' },
  { value: 'allophones', label: 'Allophones' },
  { value: 'erea', label: 'EREA' },
  { value: 'autre', label: 'Autre' },
];

/** Aligné web DISABILITY_TYPE_OPTIONS. */
const DISABILITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'moteur', label: 'Handicap moteur' },
  { value: 'visuel', label: 'Handicap visuel' },
  { value: 'auditif', label: 'Handicap auditif' },
  { value: 'intellectuel', label: 'Handicap intellectuel' },
  { value: 'psychique', label: 'Handicap psychique' },
  { value: 'cognitif', label: 'Handicap cognitif' },
  { value: 'tsa', label: "Troubles du spectre de l'autisme (TSA)" },
  { value: 'tnd', label: 'Troubles du neuro développement (TND)' },
  { value: 'dys', label: 'Troubles du langage et des apprentissages (dys)' },
  { value: 'maladies', label: 'Maladies invalidantes ou chroniques' },
  { value: 'polyhandicap', label: 'Polyhandicap' },
  { value: 'plurihandicap', label: 'Pluri handicap' },
  { value: 'autre', label: 'Autre' },
];

export default function CreateStudentForSessionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId =
    typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const { isOffline } = useNetworkStatus();
  const { data: profile } = useProfile();
  const { data: session, isLoading: sessionLoading } = useSessionDetail(sessionId);
  const { data: participants = [] } = useSessionParticipants(sessionId);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [maxNomLength, setMaxNomLength] = useState(2);
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [levelId, setLevelId] = useState('');
  const [schoolClassId, setSchoolClassId] = useState('');
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(false);
  const [specialNeedsType, setSpecialNeedsType] = useState('');
  const [specialNeedsNote, setSpecialNeedsNote] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [disabilityTypes, setDisabilityTypes] = useState<string[]>([]);
  const [disabilityOtherNote, setDisabilityOtherNote] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityValue>({ weekly: [] });
  const [medicalNotes, setMedicalNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [blockingError, setBlockingError] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [displayNameCheckQuery, setDisplayNameCheckQuery] = useState('');
  const lastNameRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const establishmentId = session?.establishmentId ?? '';
  const establishmentName = session?.establishment ?? '';

  useEffect(() => {
    if (!isValidRouteId(sessionId)) {
      router.replace(routes.sessionsList() as never);
    }
  }, [sessionId, router]);

  // Aligné web : displayName = Prénom + Nom (Nom déjà tronqué à 2+ lettres).
  useEffect(() => {
    const first = firstName.trim();
    const last = lastName.trim();
    const generated = first && last ? `${first} ${last}` : first || last;
    setDisplayName(generated);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (last.length >= 2 && establishmentId) {
      debounceRef.current = setTimeout(() => setDisplayNameCheckQuery(generated), 600);
    } else {
      setDisplayNameCheckQuery('');
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [firstName, lastName, establishmentId]);

  useEffect(() => {
    lastNameRef.current = lastName;
  }, [lastName]);

  const displayNameCheckQueryResult = useQuery({
    queryKey: ['students-displayname-check', establishmentId, displayNameCheckQuery],
    queryFn: () =>
      fetchStudentsByEstablishment({
        establishmentId,
        search: displayNameCheckQuery,
        page: 1,
        pageSize: 5,
      }),
    enabled: displayNameCheckQuery.length >= 2 && !!establishmentId,
    staleTime: 10_000,
  });

  const displayNameAlreadyExists = useMemo(() => {
    if (!displayNameCheckQuery || !displayNameCheckQueryResult.data?.students) return false;
    return displayNameCheckQueryResult.data.students.some(
      (s) => (s.displayName ?? '').toLowerCase() === displayNameCheckQuery.toLowerCase(),
    );
  }, [displayNameCheckQuery, displayNameCheckQueryResult.data]);

  useEffect(() => {
    if (displayNameAlreadyExists) {
      const len = lastNameRef.current.trim().length;
      setMaxNomLength((prev) => Math.max(prev, len + 1));
    }
  }, [displayNameAlreadyExists]);

  const levelsQuery = useQuery({
    queryKey: ['levels', 'all'],
    queryFn: fetchLevels,
    staleTime: 5 * 60_000,
  });

  const schoolClassesQuery = useQuery({
    queryKey: ['school-classes', establishmentId, levelId],
    queryFn: () =>
      fetchSchoolClasses({
        establishmentId: establishmentId || undefined,
        levelId,
      }),
    enabled: !!establishmentId && !!levelId,
    staleTime: 0,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['specialties', 'active'],
    queryFn: () => fetchSpecialties(true),
    staleTime: 10 * 60_000,
  });

  const specialtyOptions = useMemo(() => {
    if (!levelId) return [];
    return (specialtiesQuery.data ?? []).filter((s) => s.levelIds.includes(levelId));
  }, [levelId, specialtiesQuery.data]);

  const subjectsQuery = useQuery({ queryKey: ['subjects-catalog'], queryFn: fetchSubjectsCatalog });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });

  const studentRoleId = useMemo(() => {
    const roles = rolesQuery.data ?? [];
    return roles.find((r) => r.code === 'student')?.id ?? '';
  }, [rolesQuery.data]);

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 6,
  };

  const chipStyle = (selected: boolean) => ({
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: selected ? colors.tint : colors.border,
    backgroundColor: selected ? colors.tint + '18' : colors.backgroundSecondary,
  });

  const sectionTitle = (icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'], title: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm }}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.tint} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.tint, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {title}
      </Text>
    </View>
  );

  const selectLevel = (id: string) => {
    const next = levelId === id ? '' : id;
    setLevelId(next);
    setSchoolClassId('');
    setSpecialtyIds([]);
  };

  const toggleSpecialty = (id: string) => {
    setSpecialtyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDisabilityType = (value: string) => {
    setDisabilityTypes((prev) => {
      const next = prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value];
      if (!next.includes('autre')) setDisabilityOtherNote('');
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (firstName.trim().length < 2) errors.firstName = 'Le prénom est requis (min. 2 caractères)';
    if (lastName.trim().length < 2) errors.lastName = 'Le nom est requis (min. 2 caractères)';
    if (!gender) errors.gender = 'Le genre est requis';
    if (!establishmentId) errors.establishment = 'Établissement de la séance introuvable';
    if (!studentRoleId) errors.role = 'Rôle élève introuvable';
    if (displayNameAlreadyExists) {
      errors.lastName = 'Ce nom complet existe déjà, ajoutez un caractère supplémentaire';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId || !profile?.id) throw new Error('Session ou profil manquant');
      const created = await createStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        gender: gender || undefined,
        levelId: levelId || undefined,
        schoolClassId: schoolClassId || undefined,
        roleIds: [studentRoleId],
        establishmentIds: [establishmentId],
        subjects: subjectIds.length ? subjectIds : undefined,
        availability: availability.weekly.length > 0 ? availability : undefined,
        hasSpecialNeeds,
        specialNeedsType:
          hasSpecialNeeds && specialNeedsType ? specialNeedsType : undefined,
        specialNeedsNote:
          hasSpecialNeeds && specialNeedsType === 'autre' && specialNeedsNote.trim()
            ? specialNeedsNote.trim()
            : undefined,
        isDisabled,
        disabilityTypes:
          isDisabled && disabilityTypes.length > 0 ? disabilityTypes : undefined,
        disabilityOtherNote:
          isDisabled && disabilityTypes.includes('autre') && disabilityOtherNote.trim()
            ? disabilityOtherNote.trim()
            : undefined,
        specialtyIds: specialtyIds.length > 0 ? specialtyIds : undefined,
        medicalNotes: medicalNotes.trim() || undefined,
      });

      const facilitatorIds = participants
        .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
        .map((p) => p.userId);
      const currentPairs =
        session?.studentTutorPairs && session.studentTutorPairs.length > 0
          ? session.studentTutorPairs
          : derivePairsFromParticipants(participants, profile.id, session?.type);

      const newPairs = buildPairsForAddedStudents({
        sessionType: session?.type,
        newStudentIds: [created.id],
        currentTutorId: profile.id,
        facilitatorIds,
      });
      const mergedPairs = mergeSessionPairs(currentPairs, newPairs);
      const nextParticipants = toAssignmentParticipants([
        ...participants,
        { userId: created.id, role: 'student' },
      ]);
      await setSessionAssignments(sessionId, mergedPairs, nextParticipants);
      return created;
    },
    onSuccess: async () => {
      if (sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
          queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'participants'] }),
          queryClient.invalidateQueries({ queryKey: ['students'] }),
        ]);
      }
      setSuccessVisible(true);
      setTimeout(() => router.back(), 600);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Création impossible';
      setBlockingError(msg || 'Création impossible');
    },
  });

  const handleSubmit = () => {
    setBlockingError('');
    if (!validate()) return;
    if (isOffline) {
      setBlockingError('Pas de connexion internet. Réessayez plus tard.');
      return;
    }
    createMutation.mutate();
  };

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    gender !== '' &&
    !!establishmentId &&
    !displayNameAlreadyExists;

  if (sessionLoading && !session) {
    return <LoadingScreen />;
  }

  const levels = levelsQuery.data ?? [];
  const schoolClasses = schoolClassesQuery.data ?? [];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.pageBackground,
        paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: scrollBottom + spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              borderRadius: borderRadius.xl,
              backgroundColor: colors.background,
              padding: spacing.lg,
              ...getCardShadowPlatform(isDark),
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
              Créer un élève
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
              Renseignez les informations de l&apos;élève
            </Text>

            {/* ── Informations personnelles ── */}
            {sectionTitle('account', 'Informations personnelles')}
            <Text style={labelStyle}>Prénom *</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ex: Marie"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
              style={[inputStyle, { marginBottom: spacing.md }]}
            />
            {fieldErrors.firstName ? (
              <Text style={{ color: colors.danger, marginBottom: spacing.sm, fontSize: 13 }}>
                {fieldErrors.firstName}
              </Text>
            ) : null}

            <Text style={labelStyle}>Nom *</Text>
            <TextInput
              value={lastName}
              onChangeText={(v) => setLastName(v.slice(0, maxNomLength))}
              placeholder="Ex: MA"
              placeholderTextColor={colors.textSecondary}
              maxLength={maxNomLength}
              style={[
                inputStyle,
                {
                  marginBottom: spacing.xs,
                  borderColor: displayNameAlreadyExists ? colors.danger : colors.border,
                },
              ]}
            />
            {displayNameAlreadyExists || fieldErrors.lastName ? (
              <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>
                {fieldErrors.lastName ||
                  'Ce nom complet existe déjà, ajoutez un caractère supplémentaire'}
              </Text>
            ) : (
              <View style={{ marginBottom: spacing.md }} />
            )}

            <Text style={labelStyle}>Genre *</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              {GENDER_OPTIONS.map((opt) => {
                const selected = gender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setGender(opt.value)}
                    style={chipStyle(selected)}
                  >
                    <Text style={{ color: selected ? colors.tint : colors.text, fontWeight: '600' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {fieldErrors.gender ? (
              <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>
                {fieldErrors.gender}
              </Text>
            ) : null}

            {/* ── Établissement ── */}
            {sectionTitle('office-building', 'Établissement')}
            <Text style={labelStyle}>Établissement *</Text>
            <View style={[inputStyle, { opacity: 0.85, marginBottom: spacing.md }]}>
              <Text style={{ fontSize: 16, color: colors.text }}>
                {establishmentName || establishmentId || '—'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                Renseigné automatiquement (non modifiable)
              </Text>
            </View>
            {fieldErrors.establishment ? (
              <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>
                {fieldErrors.establishment}
              </Text>
            ) : null}

            {/* ── Scolarité (aligné web, visible dès qu’un établissement est connu) ── */}
            {!!establishmentId ? (
              <>
                {sectionTitle('school-outline', 'Scolarité')}
                <Text style={labelStyle}>Niveaux académiques</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                >
                  {levels.length === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Aucun niveau disponible
                    </Text>
                  ) : (
                    levels.map((lvl) => {
                      const selected = levelId === lvl.id;
                      return (
                        <Pressable
                          key={lvl.id}
                          onPress={() => selectLevel(lvl.id)}
                          style={chipStyle(selected)}
                        >
                          <Text
                            style={{
                              color: selected ? colors.tint : colors.text,
                              fontSize: 13,
                              fontWeight: selected ? '600' : '400',
                            }}
                          >
                            {lvl.label}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>

                {!!levelId ? (
                  <>
                    <Text style={labelStyle}>Classe</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {schoolClasses.length === 0 ? (
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          Aucune classe disponible pour ce niveau
                        </Text>
                      ) : (
                        schoolClasses.map((sc) => {
                          const selected = schoolClassId === sc.id;
                          return (
                            <Pressable
                              key={sc.id}
                              onPress={() => setSchoolClassId(selected ? '' : sc.id)}
                              style={chipStyle(selected)}
                            >
                              <Text
                                style={{
                                  color: selected ? colors.tint : colors.text,
                                  fontSize: 13,
                                  fontWeight: selected ? '600' : '400',
                                }}
                              >
                                {sc.label}
                              </Text>
                            </Pressable>
                          );
                        })
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
                      Optionnel
                    </Text>
                  </>
                ) : null}

                {specialtyOptions.length > 0 ? (
                  <>
                    <Text style={labelStyle}>Spécialités</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {specialtyOptions.map((sp) => {
                        const selected = specialtyIds.includes(sp.id);
                        return (
                          <Pressable
                            key={sp.id}
                            onPress={() => toggleSpecialty(sp.id)}
                            style={chipStyle(selected)}
                          >
                            <Text
                              style={{
                                color: selected ? colors.tint : colors.text,
                                fontSize: 13,
                                fontWeight: selected ? '600' : '400',
                              }}
                            >
                              {sp.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
                      Spécialités disponibles pour ce niveau
                    </Text>
                  </>
                ) : null}

                <Pressable
                  onPress={() => {
                    const next = !hasSpecialNeeds;
                    setHasSpecialNeeds(next);
                    if (!next) {
                      setSpecialNeedsType('');
                      setSpecialNeedsNote('');
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: hasSpecialNeeds ? spacing.sm : spacing.md,
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasSpecialNeeds }}
                >
                  <MaterialCommunityIcons
                    name={hasSpecialNeeds ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={hasSpecialNeeds ? colors.tint : colors.textSecondary}
                  />
                  <Text style={{ fontSize: 14, color: colors.text }}>A des besoins spécifiques</Text>
                </Pressable>

                {hasSpecialNeeds ? (
                  <View style={{ marginBottom: spacing.md, paddingLeft: spacing.xs }}>
                    <Text style={labelStyle}>Type de besoin spécifique</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                        marginBottom: spacing.sm,
                      }}
                    >
                      {SPECIAL_NEEDS_TYPE_OPTIONS.map((opt) => {
                        const selected = specialNeedsType === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => {
                              setSpecialNeedsType(opt.value);
                              if (opt.value !== 'autre') setSpecialNeedsNote('');
                            }}
                            style={chipStyle(selected)}
                          >
                            <Text
                              style={{
                                color: selected ? colors.tint : colors.text,
                                fontSize: 13,
                                fontWeight: selected ? '600' : '400',
                              }}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {specialNeedsType === 'autre' ? (
                      <>
                        <Text style={labelStyle}>Préciser le besoin</Text>
                        <TextInput
                          value={specialNeedsNote}
                          onChangeText={setSpecialNeedsNote}
                          placeholder="Décrivez le besoin spécifique"
                          placeholderTextColor={colors.textSecondary}
                          maxLength={200}
                          style={[inputStyle, { marginBottom: spacing.sm }]}
                        />
                      </>
                    ) : null}
                  </View>
                ) : null}

                <Text style={labelStyle}>Élève en situation de handicap ?</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                  {[
                    { value: true, label: 'Oui' },
                    { value: false, label: 'Non' },
                  ].map((opt) => {
                    const selected = isDisabled === opt.value;
                    return (
                      <Pressable
                        key={String(opt.value)}
                        onPress={() => {
                          setIsDisabled(opt.value);
                          if (!opt.value) {
                            setDisabilityTypes([]);
                            setDisabilityOtherNote('');
                          }
                        }}
                        style={chipStyle(selected)}
                      >
                        <Text
                          style={{
                            color: selected ? colors.tint : colors.text,
                            fontWeight: '600',
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {isDisabled ? (
                  <View style={{ marginBottom: spacing.md, paddingLeft: spacing.xs }}>
                    <Text style={labelStyle}>Types de handicap</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                        marginBottom: spacing.sm,
                      }}
                    >
                      {DISABILITY_TYPE_OPTIONS.map((opt) => {
                        const selected = disabilityTypes.includes(opt.value);
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => toggleDisabilityType(opt.value)}
                            style={chipStyle(selected)}
                          >
                            <Text
                              style={{
                                color: selected ? colors.tint : colors.text,
                                fontSize: 13,
                                fontWeight: selected ? '600' : '400',
                              }}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {disabilityTypes.includes('autre') ? (
                      <>
                        <Text style={labelStyle}>Préciser le type de handicap</Text>
                        <TextInput
                          value={disabilityOtherNote}
                          onChangeText={setDisabilityOtherNote}
                          placeholder="Décrivez le type de handicap"
                          placeholderTextColor={colors.textSecondary}
                          maxLength={200}
                          style={[inputStyle, { marginBottom: spacing.sm }]}
                        />
                      </>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ marginBottom: spacing.md }} />
                )}
              </>
            ) : null}

            {/* ── Matières suivies ── */}
            {sectionTitle('book-open-page-variant', 'Matières suivies')}
            <Text style={labelStyle}>Matières</Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
                marginBottom: spacing.xs,
              }}
            >
              {(subjectsQuery.data ?? []).map((sub) => {
                const selected = subjectIds.includes(sub.id);
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => toggleSubject(sub.id)}
                    style={chipStyle(selected)}
                  >
                    <Text style={{ color: selected ? colors.tint : colors.text, fontSize: 13 }}>
                      {sub.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
              Sélectionnez les matières que l&apos;élève suit
            </Text>

            {/* ── Disponibilités ── */}
            {sectionTitle('clock-outline', 'Disponibilités')}
            <View style={{ width: '100%', alignSelf: 'stretch' }}>
              <AvailabilityGrid value={availability} onChange={setAvailability} />
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md }}>
              Définissez les créneaux horaires hebdomadaires où l&apos;élève est disponible
            </Text>

            {/* ── Notes ── */}
            {sectionTitle('note-text-outline', 'Notes')}
            <Text style={labelStyle}>Notes</Text>
            <TextInput
              value={medicalNotes}
              onChangeText={setMedicalNotes}
              multiline
              maxLength={500}
              placeholder="Informations ou commentaires sur l'élève"
              placeholderTextColor={colors.textSecondary}
              style={[
                inputStyle,
                { minHeight: 90, textAlignVertical: 'top', marginBottom: spacing.xs },
              ]}
            />
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.lg }}>
              Informations ou commentaires sur l&apos;élève
            </Text>

            {blockingError || fieldErrors.role ? (
              <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>
                {blockingError || fieldErrors.role}
              </Text>
            ) : null}

            <AppButton
              title="Créer et ajouter à la séance"
              onPress={handleSubmit}
              variant="primary"
              disabled={createMutation.isPending || !canSubmit}
              loading={createMutation.isPending}
              accessibilityLabel="Créer l’élève et l’ajouter à la séance"
            />
            {createMutation.isPending ? (
              <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.tint} />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={successVisible} onDismiss={() => setSuccessVisible(false)} duration={1500}>
        Élève créé et ajouté à la séance
      </Snackbar>
    </View>
  );
}
