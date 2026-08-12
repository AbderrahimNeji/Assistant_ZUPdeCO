import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Snackbar } from 'react-native-paper';

import { AppLogo } from '@/components/AppLogo';
import { AuthPaperCard } from '@/components/AuthPaperCard';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  clearPhoneConfirmationResult,
  confirmPhoneOTP,
  sendPhoneOTP,
} from '@/services/auth';
import { normalizePhoneNumber } from '@/utils/validation';

const SPACING = 16;
const OTP_LENGTH = 6;

function getOTPErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === 'auth/invalid-verification-code') return 'Code de vérification invalide.';
    if (code === 'auth/code-expired') return 'Le code a expiré. Veuillez demander un nouveau code.';
  }
  if (err instanceof Error) return err.message;
  return 'Code invalide. Veuillez réessayer.';
}

export default function PhoneOTPScreen() {
  const colors = useDynamicColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phoneParam = params.phone ?? '';
  const phone = phoneParam ? normalizePhoneNumber(phoneParam) : '';

  const [otp, setOtp] = useState<string[]>(() => new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    if (!phone) {
      router.replace('/(auth)/login' as never);
      return;
    }
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(t);
  }, [phone, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleOTPChange = (index: number, value: string) => {
    if (value && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 50);
    }
    const code = newOtp.join('');
    if (code.length === OTP_LENGTH) handleVerify(code);
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    if (loading) return;
    if (isOffline) {
      setToastMessage('Pas de connexion internet. Réessayez plus tard.');
      setToastVisible(true);
      return;
    }
    const codeToUse = code ?? otp.join('');
    if (codeToUse.length !== OTP_LENGTH) return;
    setLoading(true);
    try {
      await confirmPhoneOTP(phone, codeToUse);
      // AuthProvider will redirect to (tabs)
    } catch (err) {
      const msg = getOTPErrorMessage(err);
      setToastMessage(msg);
      setToastVisible(true);
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    if (isOffline) {
      setToastMessage('Pas de connexion internet. Réessayez plus tard.');
      setToastVisible(true);
      return;
    }
    try {
      await sendPhoneOTP(phone);
      setResendCooldown(60);
      setToastMessage('Un nouveau code a été envoyé à votre numéro.');
      setToastVisible(true);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Échec de l’envoi. Réessayez.');
      setToastVisible(true);
    }
  };

  const handleBack = () => {
    clearPhoneConfirmationResult(phone);
    router.back();
  };

  if (!phone) return null;

  const otpCode = otp.join('');

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
          <View style={styles.logoWrap}>
            <AppLogo size="medium" />
          </View>

          <AuthPaperCard style={styles.card} backgroundColor={colors.background}>
            <Card.Content>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="phone-lock" size={32} color={colors.tint} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Vérifiez votre téléphone</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Nous avons envoyé un code à 6 chiffres au numéro :
              </Text>
              <Text style={[styles.phoneNumber, { color: colors.tint }]}>{phone}</Text>
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                Entrez le code ci-dessous pour vous connecter.
              </Text>
            </Card.Content>
          </AuthPaperCard>

          <AuthPaperCard style={[styles.card, styles.otpCard]} backgroundColor={colors.background}>
            <Card.Content style={styles.otpCardContent}>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={`otp-${index}`}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      {
                        borderColor: digit ? colors.tint : colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOTPChange(index, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading}
                  />
                ))}
              </View>
              <Button
                mode="contained"
                onPress={() => handleVerify()}
                loading={loading}
                disabled={loading || otpCode.length !== OTP_LENGTH}
                icon="check-circle"
                style={styles.verifyButton}
                buttonColor={colors.tint}
                textColor={colors.background}
              >
                Se connecter
              </Button>
              <Button
                mode="text"
                onPress={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={styles.resendButton}
                textColor={resendCooldown > 0 ? colors.textSecondary : colors.tint}
              >
                {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : 'Renvoyer le code'}
              </Button>
            </Card.Content>
          </AuthPaperCard>

          <Button mode="text" onPress={handleBack} style={styles.backButton} textColor={colors.tint}>
            Retour
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={5000}
        style={{ backgroundColor: colors.danger }}
        action={{ label: 'OK', onPress: () => setToastVisible(false) }}
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
  logoWrap: { alignItems: 'center', marginBottom: SPACING * 1.5 },
  card: { marginBottom: SPACING },
  otpCard: { marginBottom: SPACING * 1.5 },
  otpCardContent: { padding: SPACING },
  iconWrap: { alignItems: 'center', marginBottom: SPACING },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  phoneNumber: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  instruction: { fontSize: 13, textAlign: 'center' },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  verifyButton: { marginBottom: 8 },
  resendButton: { marginBottom: 8 },
  backButton: { alignSelf: 'center' },
});
