import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { CONTENT_PADDING_HORIZONTAL, CARD_PADDING_HORIZONTAL, borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResources } from '@/hooks/useResources';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useColorScheme } from '@/components/useColorScheme';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorMessage } from '@/components/ErrorMessage';
import type { PedagogicalResource } from '@/types/resources';

export default function RessourcesListScreen() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const router = useRouter();
  const navigation = useNavigation();
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Ressources pédagogiques', headerIcon: 'book-open-variant' });
  }, [navigation]);

  const query = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      ...(subjectFilter && { subjectId: subjectFilter }),
      ...(levelFilter && { levelId: levelFilter }),
    }),
    [subjectFilter, levelFilter]
  );
  const { data, isLoading, error, refetch } = useResources(query);

  const resources = data?.data ?? [];
  const subjectOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of resources) {
      if (r.subjectId && (r.subject?.label ?? r.subjectId)) {
        byId.set(r.subjectId, r.subject?.label ?? r.subjectId);
      }
    }
    return Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ id, label }));
  }, [resources]);
  const levelOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of resources) {
      if (r.levelId && (r.level?.label ?? r.levelId)) {
        byId.set(r.levelId, r.level?.label ?? r.levelId);
      }
    }
    return Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ id, label }));
  }, [resources]);

  const hasActiveFilters = !!subjectFilter || !!levelFilter;
  const resetFilters = () => {
    setSubjectFilter(null);
    setLevelFilter(null);
  };

  const headerOffsetStyle = { flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET };

  if (isLoading) {
    return (
      <View style={headerOffsetStyle}>
        <LoadingScreen message="Chargement des ressources…" backgroundColor={colors.pageBackground} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={headerOffsetStyle}>
        <ErrorMessage
          title="Ressources indisponibles"
          message="Impossible de charger la liste. Réessayez."
          onRetry={() => { void refetch(); }}
        />
      </View>
    );
  }

  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  const renderChip = (label: string, selected: boolean, onPress: () => void) => {
    let chipTextColor = colors.text;
    if (selected) chipTextColor = isDark ? colors.text : colors.background;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          paddingHorizontal: spacing.sm + 6,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.xl,
          backgroundColor: selected ? colors.tint : colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: selected ? colors.tint : colors.border,
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityRole="button"
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: chipTextColor }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={headerOffsetStyle}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
          paddingTop: spacing.lg,
          paddingBottom: scrollBottom,
        }}
      >
      {/* Matière filter */}
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
          Matière
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xs }}
        >
          {renderChip('Toutes matières', !subjectFilter, () => setSubjectFilter(null))}
          {subjectOptions.map(({ id, label }) => (
            <View key={id}>{renderChip(label, subjectFilter === id, () => setSubjectFilter(id))}</View>
          ))}
        </ScrollView>
      </View>
      {/* Niveau filter */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
          Niveau
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xs }}
        >
          {renderChip('Tous les niveaux', !levelFilter, () => setLevelFilter(null))}
          {levelOptions.map(({ id, label }) => (
            <View key={id}>{renderChip(label, levelFilter === id, () => setLevelFilter(id))}</View>
          ))}
        </ScrollView>
      </View>

      {resources.length === 0 ? (
        <View
          style={{
            padding: spacing.xl,
            alignItems: 'center',
            backgroundColor: colors.backgroundSecondary,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MaterialCommunityIcons name="book-open-variant" size={48} color={colors.textSecondary} />
          <Text style={{ marginTop: spacing.md, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            {hasActiveFilters ? 'Aucune ressource trouvée' : 'Aucune ressource pour le moment'}
          </Text>
          {hasActiveFilters ? (
            <Pressable
              onPress={resetFilters}
              style={{ marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Réinitialiser les filtres</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        resources.map((resource: PedagogicalResource) => (
          <Pressable
            key={resource.id}
            onPress={() => router.push(`/(tabs)/profile/ressources/${resource.id}` as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            accessibilityLabel={resource.title}
            accessibilityRole="button"
          >
            <View
              style={[
                cardStyle,
                { borderLeftWidth: 4, borderLeftColor: colors.tint },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: CARD_PADDING_HORIZONTAL, flexWrap: 'nowrap' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.tint + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                    flexShrink: 0,
                  }}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.tint} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>{resource.title}</Text>
                  {resource.description ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>
                      {resource.description}
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
              </View>
            </View>
          </Pressable>
        ))
      )}
      </ScrollView>
    </View>
  );
}
