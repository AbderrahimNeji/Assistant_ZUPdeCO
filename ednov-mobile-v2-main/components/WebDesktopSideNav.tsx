import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useAuth } from '@/providers/AuthProvider';

const SIDEBAR_WIDTH = 252;

type NavKey = 'index' | 'sessions' | 'comptes-rendus' | 'students' | 'profile';

type NavItem = Readonly<{
  key: NavKey;
  label: string;
  href: string;
  iconOutline: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconFilled: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** Longer description for tooltips and screen reader hints on web. */
  tooltip: string;
}>;

const NAV_ITEMS: NavItem[] = [
  {
    key: 'index',
    label: 'Tableau de bord',
    href: '/(tabs)',
    iconOutline: 'view-dashboard',
    iconFilled: 'view-dashboard',
    tooltip: 'Vue d’ensemble : indicateurs, prochaine séance et rappels.',
  },
  {
    key: 'sessions',
    label: 'Séances',
    href: '/(tabs)/sessions',
    iconOutline: 'calendar-clock',
    iconFilled: 'calendar-clock',
    tooltip: 'Calendrier et détail des séances prévues ou passées.',
  },
  {
    key: 'comptes-rendus',
    label: 'Comptes rendus',
    href: '/(tabs)/comptes-rendus',
    iconOutline: 'file-document-outline',
    iconFilled: 'file-document',
    tooltip: 'Saisir et suivre les comptes rendus liés aux séances.',
  },
  {
    key: 'students',
    label: 'Élèves',
    href: '/(tabs)/students',
    iconOutline: 'account-group-outline',
    iconFilled: 'account-group',
    tooltip: 'Liste des élèves suivis ; noms affichés en identifiants publics.',
  },
  {
    key: 'profile',
    label: 'Profil',
    href: '/(tabs)/profile',
    iconOutline: 'account-outline',
    iconFilled: 'account',
    tooltip: 'Votre compte, préférences et informations personnelles.',
  },
];

/** Derive which primary tab is active from the current URL (supports nested routes e.g. /sessions/[id]). */
export function getWebDesktopActiveTab(pathname: string): NavKey {
  const p = pathname || '';
  if (p.includes('/profile')) return 'profile';
  if (p.includes('/students')) return 'students';
  if (p.includes('/comptes-rendus')) return 'comptes-rendus';
  if (p.includes('/sessions')) return 'sessions';
  return 'index';
}

export function WebDesktopSideNav() {
  const colors = useDynamicColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const active = useMemo(() => getWebDesktopActiveTab(pathname), [pathname]);
  const { signOut } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const dangerColor = colors.danger ?? '#e53935';

  const go = useCallback(
    (item: NavItem) => {
      router.navigate(item.href as never);
    },
    [router],
  );

  const closeLogoutModal = useCallback(() => {
    setLogoutModalVisible(false);
    setLogoutError(null);
  }, []);

  const handleOpenLogout = useCallback(() => {
    setLogoutError(null);
    setLogoutModalVisible(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    setLogoutError(null);
    setLogoutLoading(true);
    try {
      await signOut();
      setLogoutModalVisible(false);
      router.replace('/(auth)/login' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'La déconnexion a échoué.';
      setLogoutError(message);
    } finally {
      setLogoutLoading(false);
    }
  }, [router, signOut]);

  return (
    <View
      style={[
        styles.sidebar,
        {
          width: SIDEBAR_WIDTH,
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: colors.background,
          borderRightColor: colors.border,
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.06)',
              } as object)
            : {}),
        },
      ]}
      accessibilityRole="menu"
    >
      <View style={styles.logoBlock}>
        <AppLogo size="small" />
      </View>

      <View style={styles.navMain}>
        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => go(item)}
                accessibilityRole="link"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={item.label}
                accessibilityHint={item.tooltip}
                {...(Platform.OS === 'web' ? { title: `${item.label} — ${item.tooltip}` } : {})}
                style={({ pressed, hovered }) => [
                  styles.row,
                  {
                    backgroundColor: isActive ? colors.tint + '14' : pressed ? colors.textSecondary + '12' : 'transparent',
                    borderLeftColor: isActive ? colors.tint : 'transparent',
                  },
                  Platform.OS === 'web' && hovered && !isActive ? { backgroundColor: colors.textSecondary + '0f' } : null,
                ]}
              >
                <View style={styles.rowInner}>
                  <MaterialCommunityIcons
                    name={isActive ? item.iconFilled : item.iconOutline}
                    size={22}
                    color={isActive ? colors.tint : colors.tabIconDefault}
                  />
                  <Text
                    style={[styles.label, { color: isActive ? colors.text : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.logoutBlock, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleOpenLogout}
            accessibilityRole="button"
            accessibilityLabel="Déconnexion"
            accessibilityHint="Se déconnecter du compte tuteur"
            {...(Platform.OS === 'web' ? { title: 'Déconnexion — se déconnecter du compte' } : {})}
            style={({ pressed, hovered }) => [
              styles.row,
              styles.logoutRow,
              {
                borderLeftColor: 'transparent',
                backgroundColor: pressed ? colors.textSecondary + '12' : 'transparent',
              },
              Platform.OS === 'web' && hovered ? { backgroundColor: colors.textSecondary + '0f' } : null,
            ]}
          >
            <View style={styles.rowInner}>
              <MaterialCommunityIcons name="logout" size={22} color={dangerColor} />
              <Text style={[styles.label, styles.logoutLabel, { color: dangerColor }]} numberOfLines={1}>
                Déconnexion
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <LogoutConfirmModal
        visible={logoutModalVisible}
        onClose={closeLogoutModal}
        onConfirm={handleConfirmLogout}
        loading={logoutLoading}
        error={logoutError}
      />
    </View>
  );
}

export const WEB_DESKTOP_SIDE_NAV_WIDTH = SIDEBAR_WIDTH;

const styles = StyleSheet.create({
  sidebar: {
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
  },
  logoBlock: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  navMain: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
  },
  navList: {
    gap: 4,
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  logoutBlock: {
    paddingHorizontal: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    flexShrink: 0,
  },
  logoutRow: {
    marginBottom: 4,
  },
  logoutLabel: {
    fontWeight: '600',
  },
  row: {
    borderRadius: 12,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
