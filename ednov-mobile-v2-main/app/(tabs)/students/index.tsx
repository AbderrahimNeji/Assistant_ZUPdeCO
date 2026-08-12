import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { HelpHint } from '@/components/HelpHint';
import { ListSkeleton } from '@/components/ListSkeleton';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, CARD_PADDING_HORIZONTAL, CONTENT_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useStudents } from '@/hooks/useStudents';
import { ALL_PROGRAMS_VALUE, useStudentSearchStore } from '@/store/studentSearchStore';
import type { Student } from '@/types/student';
import {
  GENERIC_STUDENT_ROW_TOOLTIP,
  getStudentAvatarSeed,
  getStudentDisplayName,
  getStudentInitials,
  isGenericStudentDisplayName,
  STUDENT_DISPLAY_PRIVACY_TOOLTIP,
} from '@/utils/studentDisplay';
import { filterStudentsBySearch } from '@/utils/studentSearch';

const STUDENT_ROW_HEIGHT = 96;
const STUDENT_ITEM_TOTAL_HEIGHT = STUDENT_ROW_HEIGHT + spacing.md;

function listFilterTag(s: Student): string {
  const level = s.levelLabel?.trim();
  if (level) return level;
  return (s.program ?? '').trim();
}

function getAvatarColor(name: string, colors: ColorPalette): string {
  const palette = [colors.tint, colors.info, colors.success, colors.warning];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

const studentCardStyle = (colors: ColorPalette, isDark: boolean) => ({
  borderRadius: borderRadius.lg,
  backgroundColor: colors.backgroundSecondary,
  borderWidth: 1,
  borderColor: colors.border,
  borderLeftWidth: 4,
  borderLeftColor: colors.tint,
  overflow: 'hidden' as const,
  ...getCardShadowPlatform(isDark),
});

function StudentRow({
  item,
  colors,
  isDark,
}: Readonly<{
  item: Student;
  colors: ColorPalette;
  isDark: boolean;
}>) {
  const displayName = getStudentDisplayName(item);
  const initials = getStudentInitials(item);
  const avatarColor = getAvatarColor(getStudentAvatarSeed(item), colors);
  const avatarTextColor = colors.background;
  const genericName = isGenericStudentDisplayName(displayName);
  const level = item.levelLabel?.trim();
  const a11yLevel = level ? `Niveau ${level}` : 'Niveau non renseigné';

  return (
    <View
      style={studentCardStyle(colors, isDark)}
      accessible
      accessibilityRole="text"
      accessibilityLabel={genericName ? `${displayName}. ${GENERIC_STUDENT_ROW_TOOLTIP} ${a11yLevel}` : `${displayName}. ${a11yLevel}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          flexWrap: 'nowrap',
          paddingVertical: spacing.lg,
          paddingHorizontal: CARD_PADDING_HORIZONTAL,
        }}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: avatarColor,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            ...(Platform.OS === 'android'
              ? { elevation: 3 }
              : { shadowColor: avatarColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }),
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: avatarTextColor }}>{initials}</Text>
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: spacing.lg,
            justifyContent: 'center',
            paddingRight: spacing.sm,
          }}
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>
            {displayName}
          </Text>
          {level ? (
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: spacing.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: 3,
                borderRadius: borderRadius.md,
                backgroundColor: colors.tint + '18',
                maxWidth: '100%',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.tint }} numberOfLines={1}>
                {level}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: spacing.sm,
                fontStyle: 'italic',
              }}
              numberOfLines={1}
            >
              Non renseigné
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function StudentListSeparator() {
  return <View style={{ height: spacing.md }} />;
}

export default function StudentsListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const { data: studentsData, isLoading, isRefetching, error, refetch } = useStudents();
  const students = studentsData?.students;
  const { searchQuery, setSearchQuery, programFilter, setProgramFilter } = useStudentSearchStore();
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const levelFilterOptions = useMemo(() => {
    const list = students ?? [];
    const set = new Set<string>();
    list.forEach((s) => {
      const tag = listFilterTag(s);
      if (tag !== '') set.add(tag);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const bySearch = filterStudentsBySearch(students ?? [], debouncedSearchQuery);
    if (programFilter === ALL_PROGRAMS_VALUE) return bySearch;
    return bySearch.filter((s) => listFilterTag(s) === programFilter);
  }, [students, debouncedSearchQuery, programFilter]);

  const renderStudent = useCallback(
    ({ item }: { item: Student }) => <StudentRow item={item} colors={colors} isDark={isDark} />,
    [colors, isDark]
  );

  const showFullScreenLoading = isLoading && students === undefined;

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  if (showFullScreenLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
        <View style={contentSheetStyle}>
          <ListSkeleton count={6} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
        <View style={contentSheetStyle}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
            <Text style={{ textAlign: 'center', color: colors.text, fontSize: 15 }}>
              Impossible de charger cette liste. Réessayez plus tard.
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => ({
                marginTop: spacing.md,
                borderRadius: borderRadius.md,
                paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
                paddingVertical: spacing.sm,
                backgroundColor: colors.tint,
                opacity: pressed ? 0.8 : 1,
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              })}
              accessibilityLabel="Réessayer"
              accessibilityRole="button"
            >
              <Text style={{ fontWeight: '600', color: isDark ? colors.text : colors.background }}>Réessayer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        {/* Header + Search */}
        <View
          style={{
            paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm + 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ position: 'relative' }}>
            <View
              style={{
                position: 'absolute',
                left: spacing.sm,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={searchFocused ? colors.tint : colors.textSecondary}
              />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Rechercher par nom affiché…"
              placeholderTextColor={colors.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: searchFocused ? colors.tint : colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.sm,
                paddingRight: spacing.sm + 6,
                paddingLeft: 40,
                fontSize: 14,
                color: colors.text,
                backgroundColor: colors.backgroundSecondary,
              }}
              accessibilityLabel="Rechercher par nom affiché"
              accessibilityRole="search"
            />
          </View>
          {/* Niveau / programme filter chips (tag = levelLabel or program) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.sm, paddingBottom: spacing.xs }}
          >
            {(() => {
              const allSelected = programFilter === ALL_PROGRAMS_VALUE;
              let tousColor = colors.text;
              if (allSelected) tousColor = isDark ? colors.text : colors.background;
              return (
                <Pressable
                  onPress={() => setProgramFilter(ALL_PROGRAMS_VALUE)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm + 6,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.xl,
                    backgroundColor: allSelected ? colors.tint : colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: allSelected ? colors.tint : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                  accessibilityLabel="Tous les niveaux"
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tousColor }}>Tous</Text>
                </Pressable>
              );
            })()}
            {levelFilterOptions.map((tag) => {
              const selected = programFilter === tag;
              let chipTextColor = colors.text;
              if (selected) chipTextColor = isDark ? colors.text : colors.background;
              return (
                <Pressable
                  key={tag}
                  onPress={() => setProgramFilter(tag)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm + 6,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.xl,
                    backgroundColor: selected ? colors.tint : colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: selected ? colors.tint : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                  accessibilityLabel={`Filtrer par ${tag}`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: chipTextColor }}>{tag}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              marginTop: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
              Noms affichés : pseudonymes / identifiants publics (confidentialité).
            </Text>
            <HelpHint message={STUDENT_DISPLAY_PRIVACY_TOOLTIP} accessibilityLabel="Confidentialité des noms" />
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            paddingTop: spacing.md,
            paddingBottom: scrollBottom,
          }}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          getItemLayout={(_data, index) => ({
            length: STUDENT_ITEM_TOTAL_HEIGHT,
            offset: index * STUDENT_ITEM_TOTAL_HEIGHT,
            index,
          })}
          ItemSeparatorComponent={StudentListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.tint}
            />
          }
          renderItem={renderStudent}
          ListEmptyComponent={
            <EmptyState
              icon="account-group-outline"
              title={
                searchQuery.trim() || programFilter !== ALL_PROGRAMS_VALUE ? 'Aucun résultat' : 'Liste vide'
              }
              message={
                searchQuery.trim() || programFilter !== ALL_PROGRAMS_VALUE
                  ? 'Aucune entrée ne correspond à votre recherche ou au filtre.'
                  : 'Rien à afficher pour le moment.'
              }
              actionLabel={
                searchQuery.trim() || programFilter !== ALL_PROGRAMS_VALUE ? 'Réinitialiser les filtres' : undefined
              }
              onAction={
                searchQuery.trim() || programFilter !== ALL_PROGRAMS_VALUE
                  ? () => {
                      setSearchQuery('');
                      setProgramFilter(ALL_PROGRAMS_VALUE);
                    }
                  : undefined
              }
            />
          }
        />
      </View>
    </View>
  );
}
