import { MaterialCommunityIcons } from '@expo/vector-icons';
import { updatePassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Snackbar, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { AuthPaperCard } from '@/components/AuthPaperCard';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';

const SPACING = 16;
const MIN_PASSWORD_LENGTH = 6;

function getUpdatePasswordErrorMessage(code: string): string {
  switch (code) {
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/requires-recent-login':
      return 'Veuillez vous reconnecter puis réessayer.';
    default:
      return 'Impossible de mettre à jour le mot de passe. Réessayez.';
  }
}

export default function SetNewPasswordScreen() {
  const theme = useTheme();
  const colors = useDynamicColors();
  const router = useRouter();
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = (): boolean => {
    setPasswordError('');
    setConfirmError('');
    let valid = true;
    if (!password.trim()) {
      setPasswordError('Mot de passe requis');
      valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
      valid = false;
    }
    if (password !== confirmPassword) {
      setConfirmError('Les deux mots de passe ne correspondent pas');
      valid = false;
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const user = auth.currentUser;
    if (!user) {
      setToastMessage('Session expirée. Veuillez recommencer la réinitialisation.');
      setToastVisible(true);
      router.replace('/(auth)/forgot-password' as never);
      return;
    }
    setLoading(true);
    try {
      await updatePassword(user, password);
      setSuccess(true);
      setToastMessage('Mot de passe mis à jour. Connectez-vous avec votre e-mail et le nouveau mot de passe.');
      setToastVisible(true);
      await signOut();
      router.replace('/(auth)/login' as never);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      const message =
        typeof code === 'string' ? getUpdatePasswordErrorMessage(code) : 'Impossible de mettre à jour le mot de passe. Réessayez.';
      setToastMessage(message);
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    router.replace('/(auth)/login' as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.pageBackground }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthPaperCard backgroundColor={colors.background}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="lock-reset" size={32} color={colors.tint} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Nouveau mot de passe</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Choisissez un mot de passe d’au moins 6 caractères.
              </Text>
              <TextInput
                label="Nouveau mot de passe"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                error={!!passwordError}
                placeholder="••••••••"
                outlineColor={colors.border}
                activeOutlineColor={colors.tint}
                style={styles.input}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <MaterialCommunityIcons name="lock-outline" size={20} color={colors.tint} />
                    )}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={() => (
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    )}
                    onPress={() => setShowPassword((p) => !p)}
                  />
                }
              />
              {passwordError ? (
                <Text style={[styles.inlineError, { color: theme.colors.error }]}>{passwordError}</Text>
              ) : null}
              <TextInput
                label="Confirmer le mot de passe"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmError) setConfirmError('');
                }}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                error={!!confirmError}
                placeholder="••••••••"
                outlineColor={colors.border}
                activeOutlineColor={colors.tint}
                style={styles.input}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.tint} />
                    )}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={() => (
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    )}
                    onPress={() => setShowConfirmPassword((p) => !p)}
                  />
                }
              />
              {confirmError ? (
                <Text style={[styles.inlineError, { color: theme.colors.error }]}>{confirmError}</Text>
              ) : null}
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                icon="check-circle"
                style={styles.submitButton}
                buttonColor={colors.tint}
                textColor={colors.background}
              >
                Définir le mot de passe
              </Button>
              <Button
                mode="text"
                onPress={handleCancel}
                disabled={loading}
                style={styles.cancelButton}
                textColor={colors.textSecondary}
              >
                Annuler
              </Button>
            </Card.Content>
          </AuthPaperCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={success ? 4000 : 5000}
        style={{ backgroundColor: success ? undefined : colors.danger }}
        action={{
          label: 'OK',
          onPress: () => setToastVisible(false),
        }}
      >
        {toastMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  cardContent: { padding: SPACING },
  iconWrap: { alignItems: 'center', marginBottom: SPACING },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING,
  },
  input: { backgroundColor: 'transparent', marginBottom: 4 },
  inlineError: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },
  submitButton: { marginTop: SPACING },
  cancelButton: { marginTop: 8, alignSelf: 'center' },
});
