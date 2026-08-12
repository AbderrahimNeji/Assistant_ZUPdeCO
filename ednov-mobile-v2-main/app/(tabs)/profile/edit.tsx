import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Snackbar } from 'react-native-paper';

import { Text } from '@/components/Themed';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useColorScheme } from '@/components/useColorScheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { validateFrenchPhone } from '@/utils/validation';

export default function ProfileEditScreen() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [successVisible, setSuccessVisible] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [blockingError, setBlockingError] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const validate = (): boolean => {
    setFirstNameError('');
    setLastNameError('');
    setPhoneError('');
    setBlockingError('');
    let valid = true;
    if (!firstName.trim()) {
      setFirstNameError('Le prénom est requis');
      valid = false;
    }
    if (!lastName.trim()) {
      setLastNameError('Le nom est requis');
      valid = false;
    }
    if (phone.trim() && !validateFrenchPhone(phone)) {
      setPhoneError('Numéro de téléphone invalide');
      valid = false;
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isOffline) {
      setBlockingError('Pas de connexion internet. Réessayez plus tard.');
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      setSuccessVisible(true);
      setTimeout(() => router.back(), 600);
    } catch {
      // Error shown via mutation.error / errorMsg
    }
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  };

  if (profileLoading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
        <LoadingScreen message="Chargement du profil…" backgroundColor={colors.background} />
      </View>
    );
  }

  const errorMsg =
    updateProfileMutation.isError && updateProfileMutation.error instanceof Error
      ? updateProfileMutation.error.message
      : updateProfileMutation.error && typeof updateProfileMutation.error === 'object' && 'message' in updateProfileMutation.error
        ? String((updateProfileMutation.error as { message: string }).message)
        : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: scrollBottom,
        }}
        keyboardShouldPersistTaps="handled"
        >
          <View
          style={{
            borderRadius: borderRadius.lg,
            backgroundColor: colors.backgroundSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            ...getCardShadowPlatform(isDark),
          }}
        >
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
              Prénom
            </Text>
            <TextInput
              value={firstName}
              onChangeText={(t) => { setFirstName(t); setFirstNameError(''); }}
              placeholder="Prénom"
              placeholderTextColor={colors.textSecondary}
              style={[inputStyle, firstNameError ? { borderColor: colors.danger } : undefined]}
              accessibilityLabel="Prénom"
            />
            {firstNameError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={{ fontSize: 12, color: colors.danger }}>{firstNameError}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
              Nom
            </Text>
            <TextInput
              value={lastName}
              onChangeText={(t) => { setLastName(t); setLastNameError(''); }}
              placeholder="Nom"
              placeholderTextColor={colors.textSecondary}
              style={[inputStyle, lastNameError ? { borderColor: colors.danger } : undefined]}
              accessibilityLabel="Nom"
            />
            {lastNameError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={{ fontSize: 12, color: colors.danger }}>{lastNameError}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
              Téléphone (optionnel)
            </Text>
            <TextInput
              value={phone}
              onChangeText={(t) => { setPhone(t); setPhoneError(''); }}
              placeholder="+33 6 12 34 56 78"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              style={[inputStyle, phoneError ? { borderColor: colors.danger } : undefined]}
              accessibilityLabel="Téléphone"
            />
            {phoneError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={{ fontSize: 12, color: colors.danger }}>{phoneError}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {(errorMsg || blockingError) ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.danger + '14',
              borderRadius: borderRadius.md,
              padding: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.danger }}>{errorMsg || blockingError}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => { void handleSubmit(); }}
          disabled={updateProfileMutation.isPending}
          style={({ pressed }) => ({
            paddingVertical: 14,
            borderRadius: borderRadius.md,
            backgroundColor: colors.tint,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || updateProfileMutation.isPending ? 0.7 : 1,
            flexDirection: 'row',
            gap: 8,
          })}
          accessibilityLabel="Enregistrer les modifications"
          accessibilityRole="button"
        >
          {updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.background }}>Enregistrer</Text>
          )}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={600}
        style={{ backgroundColor: colors.success }}
      >
        Profil mis à jour
      </Snackbar>
    </View>
  );
}
