import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationsBell } from '@/components/NotificationsBell';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getTypographyStyles, spacing } from '@/constants/DesignTokens';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type ScreenHeaderProps = {
  navigation: { canGoBack: () => boolean; goBack: () => void };
  route?: { name?: string };
  options: {
    title?: string;
    headerIcon?: string;
    headerLeft?: () => React.ReactNode;
    headerRight?: () => React.ReactNode;
    /** Force hide the notifications bell (defaults to visible on root tab screens). */
    hideNotificationsBell?: boolean;
    /** Force show the notifications bell, regardless of navigation state. */
    showNotificationsBell?: boolean;
  };
};

/** Height of the header card below the safe area (marginTop + card height + marginBottom). Use with useSafeAreaInsets().top for content paddingTop. */
export const SCREEN_HEADER_CONTENT_OFFSET = 8 + 12 * 2 + 40 + 16; // 88

/**
 * Enhanced top banner inspired by ednov-mobile GlobalNavbar.
 * Floating card with icon container, optional back button, and title.
 */
export function ScreenHeader({ navigation, options, route }: ScreenHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const typographyStyles = getTypographyStyles({ text: colors.text, textSecondary: colors.textSecondary });
  const customBack = options.headerLeft?.();
  /** Root of each tab stack — reliable across nested tab navigators (canGoBack may be true due to tab history). */
  const isRootTabScreen = route?.name === 'index';
  const canGoBack = !isRootTabScreen && (customBack != null || navigation.canGoBack());
  const customRight = options.headerRight?.();
  const title = (options.title as string) ?? '';
  const iconName = (options.headerIcon ?? 'file-document-outline') as IconName;
  const showBell =
    customRight == null &&
    options.hideNotificationsBell !== true &&
    (options.showNotificationsBell === true || isRootTabScreen || !canGoBack);

  const cardStyle = {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    ...(Platform.OS === 'android'
      ? { elevation: 3 }
      : {
          shadowColor: colorScheme === 'dark' ? colors.background : colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.08,
          shadowRadius: 8,
        }),
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}>
          {canGoBack ? (
            customBack ?? (
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => ({
                marginRight: 12,
                padding: 10,
                margin: -10,
                opacity: pressed ? 0.7 : 1,
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
              })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Retour"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </Pressable>
            )
          ) : (
            <View style={{ width: 36, marginRight: 12 }} />
          )}
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
            <MaterialCommunityIcons name={iconName} size={22} color={colors.tint} />
          </View>
          <Text
            style={[typographyStyles.titleMedium, { flex: 1, letterSpacing: -0.3 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {customRight ?? (showBell ? <NotificationsBell size={40} /> : !canGoBack ? <View style={{ width: 36 }} /> : null)}
        </View>
      </View>
    </SafeAreaView>
  );
}
