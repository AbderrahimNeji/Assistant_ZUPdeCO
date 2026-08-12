import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { ErrorMessage } from '@/components/ErrorMessage';
import { HelpHint } from '@/components/HelpHint';
import { isValidRouteId, routes } from '@/utils/routes';
import { InfoRow } from '@/components/InfoRow';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { CARD_PADDING_HORIZONTAL, borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useStudents } from '@/hooks/useStudents';
import type { Student } from '@/types/student';
import {
  GENERIC_STUDENT_ROW_TOOLTIP,
  getStudentAvatarSeed,
  getStudentDisplayName,
  getStudentInitials,
  isGenericStudentDisplayName,
  STUDENT_DISPLAY_PRIVACY_TOOLTIP,
} from '@/utils/studentDisplay';

function getAvatarColor(name: string, colors: ColorPalette): string {
  const palette = [colors.tint, colors.info, colors.success, colors.warning];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
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

export default function StudentDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';

  useEffect(() => {
    if (!isValidRouteId(id)) {
      router.replace(routes.studentsList() as never);
    }
  }, [id, router]);
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const { data: studentsData, isLoading, error, refetch } = useStudents();
  const students = studentsData?.students;

  const student = students?.find((s) => s.id === id);
  const showFullScreenLoading = isLoading && students === undefined;
  const notFound = !isLoading && students != null && !student;

  useEffect(() => {
    if (student) {
      navigation.setOptions({
        title: getStudentDisplayName(student),
      });
    }
  }, [navigation, student]);

  if (showFullScreenLoading) {
    return <LoadingScreen message="Chargement du profil…" />;
  }

  if (notFound || (error && !student)) {
    return (
      <ErrorMessage
        title="Élève introuvable"
        message="Cet élève n'existe pas ou a été retiré de la liste."
        onRetry={() => refetch()}
      />
    );
  }

  if (!student) {
    return null;
  }

  const displayName = getStudentDisplayName(student);
  const genericName = isGenericStudentDisplayName(displayName);
  const initials = getStudentInitials(student);
  const avatarColor = getAvatarColor(getStudentAvatarSeed(student), colors);
  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: CARD_PADDING_HORIZONTAL,
            paddingTop: spacing.md,
            paddingBottom: scrollBottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Carte profil */}
          <View style={[cardStyle(colors, isDark), { padding: CARD_PADDING_HORIZONTAL, marginBottom: spacing.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 6 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: avatarColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(Platform.OS === 'android' ? { elevation: 3 } : { shadowColor: avatarColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }),
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.background }}>{initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                    {displayName}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.success, marginTop: 2, fontWeight: '600' }}>Actif</Text>
                </View>
                {genericName ? (
                  <HelpHint message={GENERIC_STUDENT_ROW_TOOLTIP} accessibilityLabel="Pourquoi « Élève » ?" />
                ) : (
                  <HelpHint message={STUDENT_DISPLAY_PRIVACY_TOOLTIP} accessibilityLabel="Confidentialité du nom affiché" />
                )}
              </View>
            </View>
          </View>

          {/* Infos personnelles */}
          <View style={cardStyle(colors, isDark)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.sm + 6,
                paddingBottom: spacing.sm,
              }}
            >
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textSecondary }}>
                Infos personnelles
              </Text>
              <HelpHint
                message="Coordonnées et niveau : champs à compléter côté établissement ou synchronisation. Le nom affiché en tête reste un identifiant public."
                accessibilityLabel="À propos de ces informations"
              />
            </View>
            <InfoRow icon="email-outline" iconColor={colors.tint} label="Email" value="—" colors={colors} />
            <InfoRow icon="phone-outline" iconColor={colors.info} label="Téléphone" value="—" colors={colors} />
            <InfoRow icon="school-outline" iconColor={colors.warning} label="Niveau" value="—" colors={colors} />
            <InfoRow icon="book-open-variant" iconColor={colors.success} label="Programme" value={student.program ?? '—'} colors={colors} last />
          </View>

          {/* Établissement */}
          <View style={cardStyle(colors, isDark)}>
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm + 6, paddingBottom: spacing.sm }}>
              <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textSecondary }}>
                Établissement
              </Text>
            </View>
            <InfoRow icon="domain" iconColor={colors.info} label="Établissement" value="—" colors={colors} last />
          </View>

          {/* Résumé des séances */}
          <View style={cardStyle(colors, isDark)}>
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm + 6, paddingBottom: spacing.sm }}>
              <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textSecondary }}>
                Résumé des séances
              </Text>
            </View>
            <InfoRow icon="calendar-check" iconColor={colors.success} label="Séances réalisées" value="—" colors={colors} />
            <InfoRow icon="chart-line" iconColor={colors.tint} label="Progression" value="—" colors={colors} last />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
