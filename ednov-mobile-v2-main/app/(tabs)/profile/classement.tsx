import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SectionTitle } from '@/components/SectionTitle';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LevelBadgeImage } from '@/components/LevelBadgeImage';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { isRemoteIconUrl, tierFromNumero } from '@/utils/levelBadge';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { CONTENT_PADDING_HORIZONTAL, CARD_PADDING_HORIZONTAL, borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LeaderboardEntry } from '@/types/gamification';

const LEADERBOARD_LIMIT = 20;

function entryMatchesLeaderboardSearch(entry: LeaderboardEntry, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return entry.displayName.trim().toLowerCase().includes(q);
}

function EntryRow({
  entry,
  isCurrentUser,
  colors,
  isDark,
  cardStyle,
}: Readonly<{
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  colors: ReturnType<typeof useDynamicColors>;
  isDark: boolean;
  cardStyle: object;
}>) {
  return (
    <View
      style={[
        cardStyle,
        isCurrentUser && {
          borderColor: colors.tint,
          backgroundColor: colors.tint + '12',
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: CARD_PADDING_HORIZONTAL }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isCurrentUser ? colors.tint + '30' : colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: isCurrentUser ? colors.tint : colors.text }}>
            #{entry.rank}
          </Text>
        </View>
        {entry.currentNiveau &&
        (entry.levelBadge ||
          tierFromNumero(entry.currentNiveau.numero) ||
          isRemoteIconUrl(entry.currentNiveau.icone)) ? (
          <View style={{ marginRight: spacing.sm, justifyContent: 'center' }}>
            <LevelBadgeImage
              size={36}
              levelBadge={entry.levelBadge}
              niveauNumero={entry.currentNiveau.numero}
              niveauIcone={entry.currentNiveau.icone}
            />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: isCurrentUser ? '700' : '600',
              color: colors.text,
            }}
            numberOfLines={1}
          >
            {entry.displayName}
            {isCurrentUser ? ' (Vous)' : ''}
          </Text>
          {entry.currentNiveau ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {entry.currentNiveau.nom}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.tint }}>{entry.totalXp} XP</Text>
        </View>
      </View>
    </View>
  );
}

export default function ClassementScreen() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const { data, isLoading, error, refetch } = useLeaderboard(LEADERBOARD_LIMIT);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const entries = data?.entries ?? [];
  const myRank = data?.myRank ?? 0;
  const myEntry = data?.myEntry;
  const isSearchActive = searchQuery.trim().length > 0;
  const filteredEntries = useMemo(
    () => (isSearchActive ? entries.filter((e) => entryMatchesLeaderboardSearch(e, searchQuery)) : entries),
    [entries, isSearchActive, searchQuery],
  );
  const showMyCard =
    myEntry != null &&
    myRank > entries.length &&
    (!isSearchActive || entryMatchesLeaderboardSearch(myEntry, searchQuery));

  const headerOffsetStyle = { flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET };

  if (isLoading) {
    return (
      <View style={headerOffsetStyle}>
        <LoadingScreen message="Chargement du classement…" backgroundColor={colors.pageBackground} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={headerOffsetStyle}>
        <ErrorMessage
          title="Classement indisponible"
          message="Impossible de charger le classement. Réessayez."
          onRetry={() => { refetch(); }}
        />
      </View>
    );
  }

  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
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
        <View style={{ position: 'relative', marginBottom: spacing.md }}>
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
            placeholder="Rechercher un tuteur (nom ou prénom)…"
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
            accessibilityLabel="Rechercher un tuteur par nom ou prénom"
            accessibilityRole="search"
          />
        </View>
      <SectionTitle style={{ marginBottom: spacing.md }}>
        {isSearchActive ? `Résultats (${filteredEntries.length})` : `Top ${LEADERBOARD_LIMIT}`}
      </SectionTitle>
      {entries.length === 0 ? (
        <View
          style={[
            cardStyle,
            { padding: spacing.xl, alignItems: 'center' },
          ]}
        >
          <MaterialCommunityIcons name="podium" size={48} color={colors.textSecondary} />
          <Text style={{ marginTop: spacing.md, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            Aucun classement pour le moment
          </Text>
        </View>
      ) : filteredEntries.length === 0 && isSearchActive ? (
        <View
          style={[
            cardStyle,
            { padding: spacing.xl, alignItems: 'center' },
          ]}
        >
          <MaterialCommunityIcons name="account-search-outline" size={48} color={colors.textSecondary} />
          <Text style={{ marginTop: spacing.md, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            Aucun tuteur ne correspond à « {searchQuery.trim()} »
          </Text>
        </View>
      ) : (
        <>
          {filteredEntries.map((entry) => (
            <EntryRow
              key={`${entry.rank}-${entry.displayName}-${entry.totalXp}`}
              entry={entry}
              isCurrentUser={entry.rank === myRank}
              colors={colors}
              isDark={isDark}
              cardStyle={cardStyle}
            />
          ))}
          {showMyCard && myEntry ? (
            <>
              <SectionTitle style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                Votre position
              </SectionTitle>
              <EntryRow
                entry={myEntry}
                isCurrentUser
                colors={colors}
                isDark={isDark}
                cardStyle={cardStyle}
              />
            </>
          ) : null}
        </>
      )}
      </ScrollView>
    </View>
  );
}
