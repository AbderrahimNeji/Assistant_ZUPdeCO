import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { CONTENT_PADDING_HORIZONTAL, borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResource } from '@/hooks/useResources';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useColorScheme } from '@/components/useColorScheme';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function RessourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const navigation = useNavigation();
  const { data: resource, isLoading, error, refetch } = useResource(id ?? null);

  useEffect(() => {
    if (!resource) return;
    navigation.setOptions({
      title: resource.title,
      headerIcon: 'file-document-outline',
    });
  }, [navigation, resource]);

  const headerOffsetStyle = { flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET };

  if (isLoading) {
    return (
      <View style={headerOffsetStyle}>
        <LoadingScreen message="Chargement…" backgroundColor={colors.pageBackground} />
      </View>
    );
  }

  if (error || !resource) {
    return (
      <View style={headerOffsetStyle}>
        <ErrorMessage
        title="Ressource introuvable"
        message="Cette ressource n’existe pas ou n’est plus disponible."
        onRetry={() => { void refetch(); }}
        />
      </View>
    );
  }

  const openUrl = () => {
    if (resource.url) {
      void Linking.openURL(resource.url);
    }
  };

  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
      <View style={cardStyle}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{resource.title}</Text>
        {resource.description ? (
          <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 22 }}>
            {resource.description}
          </Text>
        ) : null}
      </View>

      {resource.content ? (
        <View style={cardStyle}>
          <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{resource.content}</Text>
        </View>
      ) : null}

      {resource.url ? (
        <Pressable
          onPress={openUrl}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: borderRadius.md,
            backgroundColor: colors.tint + '18',
            opacity: pressed ? 0.8 : 1,
          })}
          accessibilityLabel="Ouvrir le lien"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="open-in-new" size={20} color={colors.tint} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.tint }}>Ouvrir le lien</Text>
        </Pressable>
      ) : null}
      </ScrollView>
    </View>
  );
}
