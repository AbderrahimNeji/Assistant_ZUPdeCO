import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Snackbar, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { AuthPaperCard } from '@/components/AuthPaperCard';
import { isAndroid } from '@/constants/Platform';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { auth } from '@/lib/firebase';
import { sendPhoneOTP } from '@/services/auth';
import { normalizePhoneNumber, validateEmail, validateFrenchPhone } from '@/utils/validation';

const SPACING = 16;

function getFirebaseResetErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/user-not-found':
      return 'Aucun compte associé à cet e-mail.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard.';
    default:
      return 'Envoi impossible. Réessayez.';
  }
}

type ResetMode = 'email' | 'phone';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const colors = useDynamicColors();
  const router = useRouter();
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    if (!isAndroid) return;
    const handler = () => {
      Alert.alert(
        'Quitter ?',
        'Êtes-vous sûr de vouloir quitter ?',
        [{ text: 'Annuler', style: 'cancel' }, { text: 'Quitter', style: 'destructive', onPress: () => router.back() }]
      );
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [router]);
  const [mode, setMode] = useState<ResetMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmitEmail = async () => {
    const trimmed = email.trim();
    setEmailError('');
    if (isOffline) {
      setToastMessage('Pas de connexion internet. Réessayez plus tard.');
      setToastVisible(true);
      return;
    }
    if (!trimmed) {
      setEmailError('Email requis');
      return;
    }
    if (!validateEmail(trimmed)) {
      setEmailError('Veuillez entrer une adresse email valide');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSuccess(true);
      setToastMessage('Un lien de réinitialisation a été envoyé à votre adresse e-mail.');
      setToastVisible(true);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      const message =
        typeof code === 'string' ? getFirebaseResetErrorMessage(code) : 'Envoi impossible. Réessayez.';
      setEmailError(message);
      setToastMessage(message);
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPhone = async () => {
    setPhoneError('');
    if (isOffline) {
      setToastMessage('Pas de connexion internet. Réessayez plus tard.');
      setToastVisible(true);
      return;
    }
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneError('Numéro de téléphone requis');
      return;
    }
    if (!validateFrenchPhone(trimmed)) {
      setPhoneError('Veuillez entrer un numéro de téléphone valide');
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizePhoneNumber(trimmed);
      await sendPhoneOTP(normalized);
      setToastMessage('Un code a été envoyé à votre numéro.');
      setToastVisible(true);
      router.push({ pathname: '/(auth)/reset-password-otp', params: { phone: normalized } } as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Envoi impossible. Réessayez.';
      setPhoneError(msg);
      setToastMessage(msg);
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'email') handleSubmitEmail();
    else handleSubmitPhone();
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
              <Text style={[styles.title, { color: colors.text }]}>Mot de passe oublié</Text>

              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => { setMode('email'); setEmailError(''); setPhoneError(''); }}
                  style={[
                    styles.modeButton,
                    { borderColor: colors.border, backgroundColor: mode === 'email' ? colors.tint + '18' : 'transparent' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={18}
                    color={mode === 'email' ? colors.tint : colors.textSecondary}
                  />
                  <Text style={[styles.modeButtonText, { color: mode === 'email' ? colors.tint : colors.textSecondary }]}>
                    Par e-mail
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setMode('phone'); setEmailError(''); setPhoneError(''); }}
                  style={[
                    styles.modeButton,
                    { borderColor: colors.border, backgroundColor: mode === 'phone' ? colors.tint + '18' : 'transparent' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={18}
                    color={mode === 'phone' ? colors.tint : colors.textSecondary}
                  />
                  <Text style={[styles.modeButtonText, { color: mode === 'phone' ? colors.tint : colors.textSecondary }]}>
                    Par téléphone
                  </Text>
                </Pressable>
              </View>

              {mode === 'email' ? (
                <>
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
                  </Text>
                  <TextInput
                    label="Email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError('');
                    }}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={!!emailError}
                    placeholder="email@exemple.com"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.tint}
                    style={styles.input}
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <MaterialCommunityIcons name="email-outline" size={20} color={colors.tint} />
                        )}
                      />
                    }
                  />
                  {emailError ? (
                    <Text style={[styles.inlineError, { color: theme.colors.error }]}>{emailError}</Text>
                  ) : null}
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    icon="email-send"
                    style={styles.submitButton}
                    buttonColor={colors.tint}
                    textColor={colors.background}
                  >
                    Envoyer le lien
                  </Button>
                  {success ? (
                    <Text style={[styles.successHint, { color: colors.tint }]}>
                      Vérifiez votre boîte de réception (et les spams).
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    Entrez votre numéro de téléphone pour recevoir un code de réinitialisation.
                  </Text>
                  <TextInput
                    label="Numéro de téléphone"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (phoneError) setPhoneError('');
                    }}
                    mode="outlined"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    error={!!phoneError}
                    placeholder="06 12 34 56 78"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.tint}
                    style={styles.input}
                    left={
                      <TextInput.Icon
                        icon={() => (
                          <MaterialCommunityIcons name="phone-outline" size={20} color={colors.tint} />
                        )}
                      />
                    }
                  />
                  {phoneError ? (
                    <Text style={[styles.inlineError, { color: theme.colors.error }]}>{phoneError}</Text>
                  ) : null}
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    icon="message-text"
                    style={styles.submitButton}
                    buttonColor={colors.tint}
                    textColor={colors.background}
                  >
                    Envoyer le code
                  </Button>
                </>
              )}

              <Button
                mode="text"
                onPress={() => router.back()}
                style={styles.backButton}
                textColor={colors.tint}
              >
                Retour à la connexion
              </Button>
            </Card.Content>
          </AuthPaperCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={5000}
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
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  cardContent: {
    padding: SPACING,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACING,
    marginBottom: SPACING,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING,
  },
  input: {
    backgroundColor: 'transparent',
  },
  inlineError: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 4,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: SPACING,
  },
  successHint: {
    fontSize: 13,
    marginTop: SPACING,
    textAlign: 'center',
  },
  backButton: {
    marginTop: SPACING,
    alignSelf: 'center',
  },
});
