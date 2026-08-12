import { Stack } from 'expo-router';

import { WebDesktopAppFrame } from '@/components/WebDesktopAppFrame';

export default function AuthLayout() {
  return (
    <WebDesktopAppFrame>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="phone-otp" />
      <Stack.Screen name="reset-password-otp" />
      <Stack.Screen name="set-new-password" />
    </Stack>
    </WebDesktopAppFrame>
  );
}
