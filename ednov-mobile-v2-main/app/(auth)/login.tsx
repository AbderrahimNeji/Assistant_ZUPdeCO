import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Snackbar, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppLogo } from '@/components/AppLogo';
import { AuthPaperCard } from '@/components/AuthPaperCard';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { env } from '@/config/env';
import { auth } from '@/lib/firebase';
import { fetchLoginProfile, sendPhoneOTP } from '@/services/auth';
import { useCompanyStore } from '@/store/companyStore';
import {
  COMPACT_PHONE_MAX_WIDTH,
  LOGIN_TABLET_MAX_CONTENT_WIDTH,
  LOGIN_WEB_DESKTOP_LAYOUT_MAX_WIDTH,
  TABLET_MIN_WIDTH,
  WEB_DESKTOP_MIN_WIDTH,
} from '@/constants/breakpoints';
import { isAndroid, isWeb } from '@/constants/Platform';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { isEmailOrPhone, normalizePhoneNumber, validateEmail, validateFrenchPhone } from '@/utils/validation';

const SPACING = 16;

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard.';
    default:
      return 'Connexion impossible. Réessayez.';
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const colors = useDynamicColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWebDesktop = isWeb && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const isTabletLoginLayout = !isWebDesktop && windowWidth >= TABLET_MIN_WIDTH;
  const isCompactPhone = !isWebDesktop && windowWidth < COMPACT_PHONE_MAX_WIDTH;
  const isShortViewport = windowHeight < 640;
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const handleSubmitRef = useRef<() => void>(() => {});
  const { isOffline } = useNetworkStatus();

  const identifierType = isEmailOrPhone(identifier);

  const validateForm = (): boolean => {
    setIdentifierError('');
    setPasswordError('');
    let valid = true;

    if (!identifier.trim()) {
      setIdentifierError('Email ou téléphone requis');
      valid = false;
    } else if (identifierType === 'email') {
      if (!validateEmail(identifier)) {
        setIdentifierError('Veuillez entrer une adresse email valide');
        valid = false;
      }
    } else if (identifierType === 'phone') {
      if (!validateFrenchPhone(identifier)) {
        setIdentifierError('Veuillez entrer un numéro de téléphone valide');
        valid = false;
      }
    } else {
      setIdentifierError("Veuillez entrer un email ou un numéro de téléphone valide");
      valid = false;
    }

    if (identifierType === 'email') {
      if (!password) {
        setPasswordError('Mot de passe requis');
        valid = false;
      } else if (password.length < 6) {
        setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
        valid = false;
      }
    }

    return valid;
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    if (!isAndroid) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Quitter l\'application ?',
        'Voulez-vous vraiment fermer l\'application ?',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => {} },
          { text: 'Quitter', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isWeb) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName?.toLowerCase() !== 'input' && target?.tagName?.toLowerCase() !== 'textarea') return;
      e.preventDefault();
      void handleSubmitRef.current();
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [isWeb]);

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (loading) return;
    if (isOffline) {
      setToastMessage('Pas de connexion internet. Réessayez plus tard.');
      setToastVisible(true);
      return;
    }
    if (__DEV__) {
      console.log('[Login] handleSubmit start', {
        identifierType,
        hasApiUrl: !!env.apiUrl,
        useStaticData: env.useStaticData,
      });
    }

    if (identifierType === 'phone') {
      const normalizedPhone = normalizePhoneNumber(identifier.trim());
      setLoading(true);
      setIdentifierError('');
      try {
        await sendPhoneOTP(normalizedPhone);
        router.push({ pathname: '/(auth)/phone-otp', params: { phone: normalizedPhone } } as never);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        let message = 'Envoi du code impossible. Réessayez.';
        if (code === 'auth/invalid-phone-number') message = 'Numéro de téléphone invalide.';
        else if (code === 'auth/too-many-requests') message = 'Trop de tentatives. Réessayez plus tard.';
        else if (err instanceof Error) message = err.message;
        setIdentifierError(message);
        setToastMessage(message);
        setToastVisible(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    const trimmedEmail = identifier.trim();
    setLoading(true);
    setIdentifierError('');
    setPasswordError('');

    try {
      if (__DEV__) console.log('[Login] Calling signInWithEmailAndPassword…');
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      if (__DEV__) console.log('[Login] Firebase sign-in OK');
      if (env.apiUrl && !env.useStaticData) {
        try {
          if (__DEV__) console.log('[Login] Calling fetchLoginProfile (GET /users/login)…');
          const profile = await fetchLoginProfile();
          if (__DEV__) console.log('[Login] fetchLoginProfile OK, companyId:', profile.companyId ?? '(null)');
          useCompanyStore.getState().setCompanyId(profile.companyId ?? null);
        } catch (apiErr: unknown) {
          if (__DEV__) console.warn('[Login] fetchLoginProfile failed', apiErr);
          await auth.signOut();
          const status =
            apiErr && typeof apiErr === 'object' && 'status' in apiErr
              ? (apiErr as { status: number }).status
              : 0;
          const rawMsg =
            apiErr && typeof apiErr === 'object' && 'message' in apiErr &&
            typeof (apiErr as { message: string }).message === 'string'
              ? (apiErr as { message: string }).message
              : '';
          const isNetworkError = status === 0 || /network/i.test(rawMsg);
          const message =
            status === 401 || status === 404
              ? 'Compte non reconnu. Contactez votre administrateur.'
              : isNetworkError
                ? 'Impossible de joindre le serveur. Sur iPhone/Android, vérifiez EXPO_PUBLIC_DEV_HOST (IP de votre PC) et que le backend écoute sur le réseau local.'
                : rawMsg || 'Connexion impossible. Réessayez.';
          setIdentifierError(message);
          setToastMessage(message);
          setToastVisible(true);
          return;
        }
      }
    } catch (err: unknown) {
      if (__DEV__) console.warn('[Login] signIn or profile failed', err);
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      const message = typeof code === 'string' ? getFirebaseErrorMessage(code) : 'Connexion impossible. Réessayez.';

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError('Mot de passe incorrect');
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setIdentifierError('Aucun compte trouvé avec cet email');
      } else if (code === 'auth/user-disabled') {
        setIdentifierError('Ce compte a été désactivé');
      } else {
        setIdentifierError(message);
      }
      setToastMessage(message);
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  const formFields = (
    <>
      <TextInput
        testID="login-identifier"
        label="Email ou Téléphone"
        value={identifier}
        onChangeText={(text) => {
          setIdentifier(text);
          if (identifierError) setIdentifierError('');
        }}
        mode="outlined"
        keyboardType={identifierType === 'phone' ? 'phone-pad' : 'email-address'}
        autoCapitalize="none"
        autoComplete="off"
        error={!!identifierError}
        placeholder="email@exemple.com ou +33123456789"
        outlineColor={colors.border}
        activeOutlineColor={colors.tint}
        style={styles.input}
        left={
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons
                name={identifierType === 'phone' ? 'phone-outline' : 'email-outline'}
                size={20}
                color={colors.tint}
              />
            )}
          />
        }
      />
      {identifierError ? (
        <Text style={[styles.inlineError, { color: theme.colors.error }]}>{identifierError}</Text>
      ) : null}

      {identifierType === 'email' ? (
        <>
          <TextInput
            testID="login-password"
            label="Mot de passe"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError('');
            }}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoComplete="password"
            error={!!passwordError}
            placeholder="••••••••"
            outlineColor={colors.border}
            activeOutlineColor={colors.tint}
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
            style={[styles.input, styles.inputPassword]}
            left={
              <TextInput.Icon
                icon={() => <MaterialCommunityIcons name="lock-outline" size={20} color={colors.tint} />}
              />
            }
            right={
              <TextInput.Icon
                icon={() => (
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                )}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />
          {passwordError ? (
            <Text style={[styles.inlineError, { color: theme.colors.error }]}>{passwordError}</Text>
          ) : null}
        </>
      ) : null}

      {identifierType === 'phone' ? (
        <Text style={[styles.phoneHint, { color: colors.textSecondary }]}>
          Vous recevrez un code de vérification par SMS
        </Text>
      ) : null}

      <AppButton
        testID="login-submit"
        title="Se connecter"
        onPress={handleSubmit}
        variant="primary"
        icon="login"
        loading={loading}
        disabled={loading}
        accessibilityLabel="Se connecter"
        style={styles.submitButton}
      />

      {identifierType === 'email' ? (
        <Button
          mode="text"
          onPress={() => router.push('/(auth)/forgot-password' as never)}
          style={styles.linkButton}
          textColor={colors.tint}
        >
          Mot de passe oublié ?
        </Button>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.pageBackground }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompactPhone && styles.scrollContentCompact,
            isShortViewport && !isWebDesktop && styles.scrollContentShort,
            isTabletLoginLayout && styles.scrollContentTablet,
            isWebDesktop && styles.scrollContentWebDesktop,
            isWebDesktop && {
              minHeight: windowHeight,
              justifyContent: 'center',
              paddingHorizontal: Math.max(24, Math.min(72, 24 + (windowWidth - LOGIN_WEB_DESKTOP_LAYOUT_MAX_WIDTH) / 4)),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={isWebDesktop}
        >
          {isWebDesktop ? (
            <View style={styles.webDesktopShell}>
              <View style={[styles.webHero, { borderColor: colors.border }]}>
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.tint, opacity: 0.1 }]}
                />
                <View style={styles.webHeroInner}>
                  <AppLogo size={288} style={styles.webHeroLogo} />
                  <Text style={[styles.webHeroHeadline, { color: colors.text }]}>
                    Votre espace pédagogique
                  </Text>
                  <Text style={[styles.webHeroTagline, { color: colors.textSecondary }]}>
                    Planifiez vos séances, rédigez vos comptes-rendus et suivez vos apprenants depuis le web.
                  </Text>
                  <View style={styles.webHeroBullets}>
                    <View style={[styles.webHeroBulletPill, { borderColor: colors.border }]}>
                      <View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFillObject,
                          { backgroundColor: colors.tint, opacity: 0.1, borderRadius: 14 },
                        ]}
                      />
                      <View style={styles.webHeroBullet}>
                        <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.tint} />
                        <Text style={[styles.webHeroBulletText, { color: colors.textSecondary }]}>
                          Séances et calendrier
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.webHeroBulletPill, { borderColor: colors.border }]}>
                      <View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFillObject,
                          { backgroundColor: colors.tint, opacity: 0.1, borderRadius: 14 },
                        ]}
                      />
                      <View style={styles.webHeroBullet}>
                        <MaterialCommunityIcons name="file-document-edit-outline" size={24} color={colors.tint} />
                        <Text style={[styles.webHeroBulletText, { color: colors.textSecondary }]}>
                          Comptes-rendus structurés
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.webHeroBulletPill, { borderColor: colors.border }]}>
                      <View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFillObject,
                          { backgroundColor: colors.tint, opacity: 0.1, borderRadius: 14 },
                        ]}
                      />
                      <View style={styles.webHeroBullet}>
                        <MaterialCommunityIcons name="shield-check-outline" size={24} color={colors.tint} />
                        <Text style={[styles.webHeroBulletText, { color: colors.textSecondary }]}>
                          Connexion sécurisée
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.webFormShell}>
                <AuthPaperCard style={[styles.webFormCard, { borderColor: colors.border }]} backgroundColor={colors.background}>
                  <Card.Content style={styles.webFormCardContent}>
                    <Text style={[styles.welcomeTitleDesktop, { color: colors.text }]}>Bienvenue</Text>
                    <Text style={[styles.welcomeSubtitleDesktop, { color: colors.textSecondary }]}>
                      Connectez-vous à votre compte
                    </Text>
                    <View style={[styles.webWelcomeRule, { backgroundColor: colors.border }]} />
                    {formFields}
                  </Card.Content>
                </AuthPaperCard>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.mobileTabletColumn,
                isTabletLoginLayout && {
                  maxWidth: LOGIN_TABLET_MAX_CONTENT_WIDTH,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}
            >
              <View style={[styles.logoWrap, isTabletLoginLayout && styles.logoWrapTablet]}>
                <AppLogo size={isTabletLoginLayout ? 'large' : 'medium'} />
              </View>

              {isTabletLoginLayout ? (
                <AuthPaperCard style={[styles.card, styles.formCard]} backgroundColor={colors.background}>
                  <Card.Content style={styles.formContent}>
                    <Text style={[styles.welcomeTitle, styles.welcomeTitleTablet, { color: colors.text }]}>
                      Bienvenue
                    </Text>
                    <Text style={[styles.welcomeSubtitle, styles.welcomeSubtitleTablet, { color: colors.textSecondary }]}>
                      Connectez-vous à votre compte
                    </Text>
                    <View style={[styles.tabletWelcomeRule, { backgroundColor: colors.border }]} />
                    {formFields}
                  </Card.Content>
                </AuthPaperCard>
              ) : (
                <>
                  <AuthPaperCard style={styles.card} backgroundColor={colors.background}>
                    <Card.Content>
                      <Text
                        style={[
                          styles.welcomeTitle,
                          isCompactPhone && styles.welcomeTitleCompact,
                          { color: colors.text },
                        ]}
                      >
                        Bienvenue
                      </Text>
                      <Text
                        style={[
                          styles.welcomeSubtitle,
                          isCompactPhone && styles.welcomeSubtitleCompact,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Connectez-vous à votre compte
                      </Text>
                    </Card.Content>
                  </AuthPaperCard>

                  <AuthPaperCard style={[styles.card, styles.formCard]} backgroundColor={colors.background}>
                    <Card.Content style={styles.formContent}>{formFields}</Card.Content>
                  </AuthPaperCard>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={4000}
        style={{ backgroundColor: colors.danger }}
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
  scrollContentCompact: {
    paddingTop: 20,
    paddingBottom: 28,
  },
  scrollContentShort: {
    paddingTop: 16,
    justifyContent: 'flex-start',
  },
  scrollContentTablet: {
    paddingHorizontal: SPACING + 8,
    paddingTop: 32,
    paddingBottom: 36,
  },
  mobileTabletColumn: {
    width: '100%',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING * 1.5,
  },
  logoWrapTablet: {
    marginBottom: SPACING * 2,
  },
  card: {
    marginBottom: SPACING,
  },
  formCard: {
    marginBottom: SPACING * 1.5,
  },
  formContent: {
    padding: SPACING,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  welcomeTitleCompact: {
    fontSize: 20,
  },
  welcomeTitleTablet: {
    fontSize: 24,
    textAlign: 'left',
  },
  welcomeSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  welcomeSubtitleCompact: {
    fontSize: 13,
    marginTop: 2,
  },
  welcomeSubtitleTablet: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'left',
    lineHeight: 22,
  },
  tabletWelcomeRule: {
    height: StyleSheet.hairlineWidth,
    marginTop: 20,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  input: {
    backgroundColor: 'transparent',
  },
  inputPassword: {
    marginTop: SPACING,
  },
  inlineError: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 4,
    marginLeft: 4,
  },
  phoneHint: {
    fontSize: 12,
    marginTop: SPACING,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: SPACING,
    minHeight: 48,
    width: '100%',
  },
  linkButton: {
    marginTop: SPACING / 2,
    alignSelf: 'center',
  },
  scrollContentWebDesktop: {
    paddingVertical: 40,
    alignItems: 'center',
    width: '100%',
  },
  webDesktopShell: {
    width: '100%',
    maxWidth: LOGIN_WEB_DESKTOP_LAYOUT_MAX_WIDTH,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    alignSelf: 'center',
  },
  webHero: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 468,
    minWidth: 300,
    maxWidth: 520,
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1), 0 4px 14px rgba(0, 0, 0, 0.06)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 40,
      },
      default: {
        elevation: 18,
      },
    }),
  },
  webHeroLogo: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  webHeroInner: {
    paddingHorizontal: 40,
    paddingVertical: 44,
    gap: 18,
    width: '100%',
    maxWidth: '100%',
  },
  webHeroHeadline: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 38,
    marginTop: 4,
  },
  webHeroTagline: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: '100%',
  },
  webHeroBullets: {
    marginTop: 8,
    gap: 12,
  },
  webHeroBulletPill: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  webHeroBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  webHeroBulletText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  webFormShell: {
    flexGrow: 0,
    flexShrink: 0,
    width: 440,
    maxWidth: '100%',
    minWidth: 300,
    justifyContent: 'center',
  },
  webFormCard: {
    marginBottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1), 0 4px 14px rgba(0, 0, 0, 0.06)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 40,
      },
      default: {
        elevation: 18,
      },
    }),
  },
  webFormCardContent: {
    paddingVertical: 40,
    paddingHorizontal: 36,
  },
  welcomeTitleDesktop: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: -0.4,
  },
  welcomeSubtitleDesktop: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'left',
    lineHeight: 24,
  },
  webWelcomeRule: {
    height: 1,
    marginTop: 28,
    marginBottom: 12,
    borderRadius: 1,
  },
});
