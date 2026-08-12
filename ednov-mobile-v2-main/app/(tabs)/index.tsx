import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarWidget } from '@/components/CalendarWidget';
import { Card } from '@/components/Card';
import { HelpHint } from '@/components/HelpHint';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NotificationsBell } from '@/components/NotificationsBell';
import { SectionTitle } from '@/components/SectionTitle';
import { StatisticsCard, type StatisticsCardColor } from '@/components/StatisticsCard';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useDashboardKpis } from '@/hooks/useDashboardKpis';
import { useGamification } from '@/hooks/useGamification';
import { useProfile } from '@/hooks/useProfile';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useSessions } from '@/hooks/useSessions';
import { useCrFilterStore } from '@/store/crFilterStore';
import { useDashboardPeriodStore } from '@/store/dashboardPeriodStore';
import type { DashboardPeriod } from '@/types/dashboard';
import type { Session } from '@/types/session';
import { sessionsToCalendarEvents } from '@/types/calendar';
import { getSessionsInPeriod } from '@/utils/dashboardPeriod';
import {
  getNextSession,
  getSessionStatusColor,
  getSessionStatusResolvedColor,
  getSessionStatusLabel,
} from '@/utils/sessionDates';
import { LevelBadgeImage } from '@/components/LevelBadgeImage';
import { displayLabelForNumero, isRemoteIconUrl, tierFromNumero } from '@/utils/levelBadge';

const DASHBOARD_PERIOD_SECTION_TOOLTIP =
  'Toutes les cartes et totaux ci-dessous utilisent cette plage de dates (séances, comptes rendus, heures).';

const PERIODS: { value: DashboardPeriod; label: string; hint: string }[] = [
  { value: 'week', label: 'Semaine', hint: 'Semaine civile en cours (lundi → dimanche).' },
  { value: 'month', label: 'Mois', hint: 'Mois calendaire en cours (1er au dernier jour).' },
  { value: 'quarter', label: 'Trimestre', hint: 'Trimestre scolaire approximatif sur 3 mois glissants.' },
  { value: 'semester', label: 'Semestre', hint: 'Semestre sur environ six mois glissants.' },
  { value: 'school-year', label: 'Année scolaire', hint: 'Depuis la rentrée jusqu’à aujourd’hui (selon calendrier chargé).' },
];

type StatCardItem = {
  key: string;
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: StatisticsCardColor;
  accessibilityLabel: string;
  tooltip: string;
};

function formatSessionShort(session: Session): string {
  try {
    const d = new Date(session.date);
    const dateStr = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const place = session.establishment ?? session.room ?? '';
    return place ? `${dateStr} · ${timeStr} — ${place}` : `${dateStr} · ${timeStr}`;
  } catch {
    return session.date;
  }
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { data: kpis, isLoading, isRefetching, error, refetch } = useDashboardKpis();
  const {
    data: gamification,
    refetch: refetchGamification,
    isRefetching: isRefetchingGamification,
  } = useGamification();
  const { data: profile, refetch: refetchProfile, isRefetching: isRefetchingProfile } = useProfile();

  useFocusEffect(
    useCallback(() => {
      void refetchProfile();
    }, [refetchProfile]),
  );
  const { data: userPrefs } = useUserPreferences();
  const { data: sessions = [] } = useSessions();
  const { dashboardPeriod, setDashboardPeriod } = useDashboardPeriodStore();
  const showRappelCR = userPrefs?.interfaceConfigs?.notifications?.rappelCR !== false;
  const setCrReportStatus = useCrFilterStore((s) => s.setReportStatus);
  const scrollBottom = useScrollContentBottomPadding();

  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);
  const calendarEvents = useMemo(
    () => sessionsToCalendarEvents(sessions),
    [sessions]
  );
  const sessionsThisWeek = useMemo(
    () => getSessionsInPeriod(sessions, 'week').length,
    [sessions]
  );

  const statCardItems = useMemo(
    (): StatCardItem[] =>
      kpis
        ? [
            {
              key: 'sessions',
              label: 'Séances',
              value: kpis.sessionsCount,
              icon: 'calendar' as const,
              color: 'blue' as const,
              accessibilityLabel: `Séances : ${kpis.sessionsCount} dans la période sélectionnée`,
              tooltip: 'Nombre de séances comptées sur la période choisie (prévues ou réalisées selon les données).',
            },
            {
              key: 'students',
              label: 'Élèves suivis',
              value: kpis.studentsCount,
              icon: 'account-group' as const,
              color: 'emerald' as const,
              accessibilityLabel: `Élèves suivis : ${kpis.studentsCount}`,
              tooltip: 'Nombre d’élèves distincts associés à votre activité sur cette période.',
            },
            {
              key: 'cr-completed',
              label: 'CR complétés',
              value: kpis.crCompleted,
              icon: 'file-document-check' as const,
              color: 'emerald' as const,
              accessibilityLabel: `Comptes rendus complétés : ${kpis.crCompleted}`,
              tooltip: 'Comptes rendus de séance déjà saisis et validés pour la période.',
            },
            {
              key: 'cr-to-submit',
              label: 'CR à saisir',
              value: kpis.crToSubmit,
              icon: 'file-document-alert-outline' as const,
              color: 'orange' as const,
              accessibilityLabel: `Comptes rendus à saisir : ${kpis.crToSubmit}`,
              tooltip:
                'Nombre de comptes rendus encore à compléter (manquant ou en retard selon les données).',
            },
            {
              key: 'hours',
              label: 'Heures validées',
              value: kpis.hoursValidated,
              icon: 'clock-check-outline' as const,
              color: 'blue' as const,
              accessibilityLabel: `Heures validées : ${kpis.hoursValidated}`,
              tooltip: 'Volume d’heures d’accompagnement comptabilisées et validées sur la période.',
            },
          ]
        : [],
    [kpis]
  );

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  /** Labels on filled `colors.tint` (period chips, CTA) — must stay light for contrast. */
  const buttonTextOnTint = '#FFFFFF';

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBackground }} edges={['top', 'left', 'right']}>
        <View style={[contentSheetStyle, { flex: 1 }]}>
          <LoadingScreen message="Chargement du tableau de bord…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBackground }} edges={['top', 'left', 'right']}>
        <View style={[contentSheetStyle, { flex: 1 }]}>
          <ErrorMessage
            title="Impossible de charger le tableau de bord"
            message={error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez plus tard.'}
            onRetry={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const headerCardStyle = {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    ...getCardShadowPlatform(isDark),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBackground }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        {/* Header card (sessions-style, no back button) */}
        <View style={headerCardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.tint + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="view-dashboard" size={22} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.3 }}
                numberOfLines={1}
                accessibilityRole="header"
              >
                Tableau de bord
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                Suivez votre activité en temps réel
              </Text>
            </View>
            <NotificationsBell size={40} />
          </View>
        </View>
        <View style={[contentSheetStyle, { flex: 1 }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: scrollBottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isRefetchingGamification || isRefetchingProfile}
              onRefresh={() => {
                void Promise.all([refetch(), refetchGamification(), refetchProfile()]);
              }}
              tintColor={colors.tint}
            />
          }
        >

          {profile?.firstName ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginBottom: spacing.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                borderLeftWidth: 4,
                borderLeftColor: colors.tint,
                ...getCardShadowPlatform(isDark),
              }}
              accessibilityRole="text"
              accessibilityLabel={`Bonjour, ${profile.firstName} ${profile.lastName} — bienvenue sur votre espace tuteur.`}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.tint + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="hand-wave-outline" size={24} color={colors.tint} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.tint,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Bienvenue
                </Text>
                <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: '400', color: colors.textSecondary }}>
                  Bonjour,{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {profile.firstName} {profile.lastName}
                  </Text>
                  {' '}
                  — bienvenue sur votre espace tuteur.
                </Text>
              </View>
            </View>
          ) : null}

          {gamification ? (
            <Card style={{ borderRadius: borderRadius.lg, marginBottom: spacing.lg, padding: 0, overflow: 'hidden' }}>
              <Pressable
                onPress={() => router.push('/(tabs)/profile' as never)}
                style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                accessibilityLabel="Progression et gamification, ouvrir le profil"
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
                  {gamification.currentNiveau &&
                  (gamification.levelBadge ||
                    tierFromNumero(gamification.currentNiveau.numero) ||
                    isRemoteIconUrl(gamification.currentNiveau.icone)) ? (
                    <LevelBadgeImage
                      size={56}
                      levelBadge={gamification.levelBadge}
                      niveauNumero={gamification.currentNiveau.numero}
                      niveauIcone={gamification.currentNiveau.icone}
                    />
                  ) : (
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: colors.tint + '22',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name="trophy-outline" size={28} color={colors.tint} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Votre progression</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 }} numberOfLines={1}>
                      {gamification.currentNiveau
                        ? (gamification.levelBadge?.displayLabel ??
                            displayLabelForNumero(gamification.currentNiveau.numero) ??
                            gamification.currentNiveau.nom)
                        : 'En route vers le niveau 1'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.tint, fontWeight: '600', marginTop: 4 }}>
                      {gamification.totalXp} XP
                      {gamification.nextNiveau != null && gamification.xpToNextLevel != null
                        ? ` · ${gamification.xpToNextLevel} XP avant ${gamification.nextNiveau.nom}`
                        : ''}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
                </View>
              </Pressable>
            </Card>
          ) : null}

          {/* Period selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Période d’analyse</Text>
            <HelpHint message={DASHBOARD_PERIOD_SECTION_TOOLTIP} accessibilityLabel="Période du tableau de bord" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.sm }}
            style={{ marginBottom: spacing.lg }}
          >
            {PERIODS.map((p) => {
              const isActive = dashboardPeriod === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setDashboardPeriod(p.value)}
                  style={{
                    borderRadius: borderRadius.lg,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 10,
                    backgroundColor: isActive ? colors.tint : colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: isActive ? colors.tint : colors.border,
                    shadowColor: isActive ? colors.tint : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isActive ? 0.25 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 3 : 0,
                  }}
                  accessibilityLabel={`Période : ${p.label}`}
                  accessibilityHint={p.hint}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  {...(Platform.OS === 'web' ? { title: `${p.label} — ${p.hint}` } : {})}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: isActive ? buttonTextOnTint : colors.textSecondary,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* N1 Rappel CR: reminder when CR not submitted (respects P5 notification prefs) */}
          {kpis && kpis.crToSubmit >= 1 && showRappelCR && (
            <Pressable
              onPress={() => {
                setCrReportStatus('a-saisir');
                router.push('/(tabs)/comptes-rendus' as never);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.lg,
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor: (colors.warning ?? colors.tint) + '18',
                borderWidth: 1,
                borderColor: (colors.warning ?? colors.tint) + '40',
                opacity: pressed ? 0.9 : 1,
              })}
              accessibilityLabel="Des comptes rendus sont en attente. Voir les CR"
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: (colors.warning ?? colors.tint) + '30',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name="file-document-alert-outline"
                    size={22}
                    color={colors.warning ?? colors.tint}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                    Des comptes rendus sont en attente
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                    Saisissez vos comptes rendus pour les séances passées
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
            </Pressable>
          )}

          {/* Stat cards grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {statCardItems.map((item) => (
              <StatisticsCard
                key={item.key}
                title={item.label}
                value={item.value}
                icon={item.icon}
                color={item.color}
                accessibilityLabel={item.accessibilityLabel}
                hint={item.tooltip}
              />
            ))}
          </View>

          {/* Next session */}
          <SectionTitle style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Prochaine séance</SectionTitle>
          <Card primaryGlow style={{ borderRadius: borderRadius.lg }}>
            {nextSession ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.tint + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.tint} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Prochaine séance</Text>
                </View>
                <Text style={{ fontSize: 14, color: colors.text }}>
                  {formatSessionShort(nextSession)}
                </Text>
                {(() => {
                  const statusColor = getSessionStatusResolvedColor(
                    getSessionStatusColor(nextSession.status),
                    colors,
                  );
                  return (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: statusColor + '18',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>
                        {getSessionStatusLabel(nextSession.status)}
                      </Text>
                    </View>
                  );
                })()}
                <Pressable
                  onPress={() => router.push(`/(tabs)/sessions/${nextSession.id}` as never)}
                  style={({ pressed }) => ({
                    marginTop: 4,
                    alignSelf: 'flex-start',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: colors.tint,
                    opacity: pressed ? 0.8 : 1,
                    shadowColor: colors.tint,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  })}
                  accessibilityLabel={`Rejoindre la séance : ${formatSessionShort(nextSession)}`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: buttonTextOnTint }}>Rejoindre la séance</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 }}>
                  Il n'y a aucune séance prochaine
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Vos prochaines séances apparaîtront ici une fois qu'elles seront planifiées.
                </Text>
              </View>
            )}
          </Card>

          {/* Calendar */}
          <SectionTitle style={{ marginTop: 24, marginBottom: 10 }}>Calendrier</SectionTitle>
          <CalendarWidget
            events={calendarEvents}
            onDatePress={(date) =>
              router.push({
                pathname: '/(tabs)/calendar',
                params: { initialDate: date.toISOString(), viewMode: 'day' },
              } as never)
            }
            onEventPress={(event) => router.push(`/(tabs)/sessions/${event.id}` as never)}
            onOpenFullScreen={() =>
              router.push({ pathname: '/(tabs)/calendar', params: { viewMode: 'month' } } as never)
            }
          />

          {/* Élèves actifs */}
          <SectionTitle style={{ marginTop: 24, marginBottom: 10 }}>Élèves</SectionTitle>
          <Card style={{ borderRadius: 16 }}>
            <Pressable
              onPress={() => router.push('/(tabs)/students' as never)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                opacity: pressed ? 0.8 : 1,
              })}
              accessibilityLabel="Voir les élèves"
              accessibilityRole="button"
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.success + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="account-group" size={22} color={colors.success} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Élèves suivis</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                    {kpis?.studentsCount ?? 0} élève{(kpis?.studentsCount ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
            </Pressable>
          </Card>

          {/* Footer */}
          <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.info + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="calendar-week" size={14} color={colors.info} />
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {sessionsThisWeek} séance{sessionsThisWeek === 1 ? '' : 's'} cette semaine
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/sessions' as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityLabel="Voir les séances"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.tint }}>
                Voir les séances →
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
