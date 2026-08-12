import { BottomTabBar } from '@react-navigation/bottom-tabs';
import React, { Suspense, lazy } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Platform, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiProcessingModal } from '@/components/AiProcessingModal';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RecordingFloatingBar } from '@/components/RecordingFloatingBar';
import { SyncMessageBanner } from '@/components/SyncMessageBanner';
import { WebDesktopAppFrame } from '@/components/WebDesktopAppFrame';
import { WebDesktopSideNav } from '@/components/WebDesktopSideNav';
import { useColorScheme } from '@/components/useColorScheme';
import { useIsWebDesktop } from '@/hooks/useWebDesktop';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { SessionRecordingProvider } from '@/providers/SessionRecordingProvider';
import { sessionVoiceCrRecordingEnabled } from '@/constants/Platform';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';

/** Lazy-loaded so expo-notifications is not loaded on Android in Expo Go (SDK 53+ push removed). */
const ReminderHooksRunner = lazy(() =>
  import('@/components/ReminderHooksRunner').then((m) => ({ default: m.ReminderHooksRunner }))
);

const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.appOwnership === 'expo';

/** Local notification scheduling is not supported on web (expo-notifications). */
const shouldRunReminderHooks = !isExpoGoAndroid && Platform.OS !== 'web';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type TabBarIconProps = Readonly<{
  nameOutline: IconName;
  nameFilled: IconName;
  color: string;
  focused: boolean;
  tintColor: string;
}>;

function TabBarIcon({ nameOutline, nameFilled, color, focused, tintColor }: TabBarIconProps) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? tintColor + '18' : 'transparent',
      }}
    >
      <MaterialCommunityIcons
        name={focused ? nameFilled : nameOutline}
        size={24}
        color={color}
        style={{ marginBottom: 0 }}
      />
    </View>
  );
}

/** Returns a tab bar icon component for the given icon names. Used to avoid defining components inside TabLayout. */
function createTabBarIcon(nameOutline: IconName, nameFilled: IconName) {
  return function TabBarIconForRoute(props: Readonly<{ color: string; focused: boolean }>) {
    const colors = useDynamicColors();
    return (
      <TabBarIcon
        nameOutline={nameOutline}
        nameFilled={nameFilled}
        color={props.color}
        focused={props.focused}
        tintColor={colors.tint}
      />
    );
  };
}

const TabIconDashboard = createTabBarIcon('view-dashboard', 'view-dashboard');
const TabIconSessions = createTabBarIcon('calendar-clock', 'calendar-clock');
const TabIconComptesRendus = createTabBarIcon('file-document-outline', 'file-document');
const TabIconStudents = createTabBarIcon('account-group-outline', 'account-group');
const TabIconProfile = createTabBarIcon('account-outline', 'account');

export default function TabLayout() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { syncMessage, clearSyncMessage } = useOfflineSync();
  const isWebDesktop = useIsWebDesktop();

  const tabBarPaddingBottom = Platform.OS === 'ios' ? 24 + insets.bottom : 8 + insets.bottom;
  const tabBarHeight =
    Platform.OS === 'ios'
      ? 88 + insets.bottom
      : Platform.OS === 'web'
        ? 64 + insets.bottom
        : 64 + insets.bottom;

  return (
    <SessionRecordingProvider>
      <WebDesktopAppFrame>
      <View style={{ flex: 1, flexDirection: isWebDesktop ? 'row' : 'column' }}>
        {isWebDesktop ? <WebDesktopSideNav /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
        {shouldRunReminderHooks && (
          <Suspense fallback={null}>
            <ReminderHooksRunner />
          </Suspense>
        )}
        {isOffline && <OfflineBanner />}
        {syncMessage && (
          <SyncMessageBanner message={syncMessage} onDismiss={clearSyncMessage} />
        )}
        <Tabs
      tabBar={isWebDesktop ? () => null : (props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 4,
        },
        tabBarStyle: isWebDesktop
          ? { display: 'none' as const, height: 0 }
          : {
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              height: tabBarHeight,
              paddingTop: 8,
              paddingBottom: tabBarPaddingBottom,
              elevation: 8,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.4 : 0.1,
              shadowRadius: 4,
            },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarAccessibilityLabel: 'Tableau de bord',
          tabBarIcon: TabIconDashboard,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Séances',
          tabBarAccessibilityLabel: 'Séances',
          tabBarIcon: TabIconSessions,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate('/(tabs)/sessions');
          },
        }}
      />
      <Tabs.Screen
        name="comptes-rendus"
        options={{
          title: 'Comptes rendus',
          tabBarAccessibilityLabel: 'Comptes rendus',
          tabBarIcon: TabIconComptesRendus,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate('/(tabs)/comptes-rendus');
          },
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Participants',
          tabBarAccessibilityLabel: 'Participants',
          tabBarIcon: TabIconStudents,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profil',
          tabBarIcon: TabIconProfile,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
    </Tabs>
        {sessionVoiceCrRecordingEnabled ? (
          <>
            {/* Floating recording toolbar — visible above tab bar while recording is active (web) */}
            <RecordingFloatingBar />
            {/* AI processing modal — after recording validated (web) */}
            <AiProcessingModal />
          </>
        ) : null}
        </View>
      </View>
      </WebDesktopAppFrame>
    </SessionRecordingProvider>
  );
}
