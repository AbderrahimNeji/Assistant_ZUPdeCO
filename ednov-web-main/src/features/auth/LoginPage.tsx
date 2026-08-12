import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmationResult } from 'firebase/auth';
import { OtpModal } from '@/components/common/modals/OtpModal';
import { useInvitationSetup } from '@/hooks/useInvitationSetup';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useLogin } from '@/hooks/useLogin';
import { isValidEmail } from '@/utils/validation';
import { sendPasswordResetEmail } from '@/services/auth.service';
import { handleFirebaseError } from '@/utils/firebase-errors';
import { toast } from '@/lib/toast';
import { Toaster } from '@/components/ui/toaster';
import {
  AuthCard,
  LoginForm,
  ResetPasswordForm,
  SetupPasswordForm,
  PhoneSetupForm,
} from './components';

type LoginView = 'login' | 'reset-password' | 'setup-password' | 'phone-setup';
type ResetState = 'initial' | 'sending' | 'success';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { logos, isDarkMode } = useThemeStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    isSetupMode,
    isEmailSetup,
    isPhoneSetup,
    isActivateSetup,
    phone: invitePhone,
    invitationEmail,
    setupPassword,
    activateAccount,
    verifyPhoneSetup,
    sendPhoneSetupOtp,
    isLoading: setupLoading,
    error: setupError,
  } = useInvitationSetup();

  const [view, setView] = React.useState<LoginView>('login');

  const [identifierTouched, setIdentifierTouched] = React.useState(false);
  const [passwordTouched, setPasswordTouched] = React.useState(false);
  const [resetEmailTouched, setResetEmailTouched] = React.useState(false);
  const [setupEmailTouched, setSetupEmailTouched] = React.useState(false);
  const [setupPasswordTouched, setSetupPasswordTouched] = React.useState(false);
  const [setupConfirmPasswordTouched, setSetupConfirmPasswordTouched] = React.useState(false);

  const {
    mode,
    identifier,
    password,
    rememberMe,
    isLoading,
    setPassword,
    setRememberMe,
    handleIdentifierChange,
    switchToPhone,
    handleEmailLogin,
    handleSendOtp,
    handleVerifyOtp,
  } = useLogin();

  const [showOtpModal, setShowOtpModal] = React.useState(false);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(
    null,
  );

  const [resetEmail, setResetEmail] = React.useState('');
  const [resetState, setResetState] = React.useState<ResetState>('initial');
  const [resetError, setResetError] = React.useState<string | undefined>();

  const [setupPasswordData, setSetupPasswordData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [otpValue, setOtpValue] = React.useState('');
  const [phoneConfirmationResult, setPhoneConfirmationResult] =
    React.useState<ConfirmationResult | null>(null);
  const [countdown, setCountdown] = React.useState(60);

  React.useEffect(() => {
    if (isEmailSetup || isActivateSetup) {
      setView('setup-password');
      if (invitationEmail) {
        setSetupPasswordData((prev) => ({ ...prev, email: invitationEmail }));
      }
    } else if (isPhoneSetup) {
      setView('phone-setup');
    }
  }, [isEmailSetup, isActivateSetup, isPhoneSetup, invitationEmail]);

  React.useEffect(() => {
    if (isAuthenticated && !isSetupMode) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isSetupMode, navigate]);

  React.useEffect(() => {
    if (view === 'phone-setup' && invitePhone && !phoneConfirmationResult) {
      sendPhoneSetupOtp(invitePhone)
        .then(setPhoneConfirmationResult)
        .catch(() => {});
    }
  }, [view, invitePhone, phoneConfirmationResult]);

  React.useEffect(() => {
    if (view === 'phone-setup' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [view, countdown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'email') {
      await handleEmailLogin();
    } else if (mode === 'phone') {
      const result = await handleSendOtp();
      setConfirmationResult(result);
      setShowOtpModal(true);
    }
  };

  const handleOtpVerify = async (code: string) => {
    if (!confirmationResult) return;

    try {
      await handleVerifyOtp(confirmationResult, code);
      setShowOtpModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Code incorrect');
      throw err;
    }
  };

  const handleOtpResend = async () => {
    try {
      const result = await handleSendOtp();
      setConfirmationResult(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du renvoi');
      throw err;
    }
  };

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError(undefined);

    if (!resetEmail.trim()) {
      setResetError('Veuillez saisir votre adresse email');
      return;
    }

    if (!isValidEmail(resetEmail)) {
      setResetError('Adresse email invalide');
      return;
    }

    setResetState('sending');

    try {
      await sendPasswordResetEmail(resetEmail);
      toast.success('Un lien de réinitialisation a été envoyé à votre adresse email.');
      setResetEmail('');
      setResetState('initial');
      setView('login');
      setResetError(undefined);
    } catch (err) {
      setResetError(handleFirebaseError(err));
      setResetState('initial');
    }
  };

  const handleBackToLogin = () => {
    setView('login');
    setResetEmail('');
    setResetState('initial');
    setResetError(undefined);
  };

  const handleSetupPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // mode=activate (JWT 14j): the token carries the identity; only the password is needed.
    if (isActivateSetup) {
      await activateAccount(setupPasswordData.password, setupPasswordData.confirmPassword);
      return;
    }

    if (!setupPasswordData.email) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    if (!isValidEmail(setupPasswordData.email)) {
      toast.error('Adresse email invalide');
      return;
    }

    await setupPassword(
      setupPasswordData.email,
      setupPasswordData.password,
      setupPasswordData.confirmPassword,
    );
  };

  const handlePhoneSetupVerify = async (code: string) => {
    if (!phoneConfirmationResult) {
      toast.error('Aucune confirmation en attente');
      return;
    }

    await verifyPhoneSetup(phoneConfirmationResult, code);
  };

  const handleResendPhoneSetupOtp = async () => {
    if (!invitePhone) return;

    setCountdown(60);
    const result = await sendPhoneSetupOtp(invitePhone);
    setPhoneConfirmationResult(result);
    toast.success('Code renvoyé avec succès !');
  };

  const logo = React.useMemo(() => {
    const mode = isDarkMode ? 'dark' : 'light';
    const altMode = isDarkMode ? 'light' : 'dark';
    return logos.logo1[mode] || logos.logo1[altMode] || '';
  }, [isDarkMode, logos]);

  return (
    <>
      <div className="login-container">
        <div className="login-background">
          <div className="login-orb-small login-orb-color-2 login-orb-1" />
          <div className="login-orb-small login-orb-color-2 login-orb-2" />
          <div className="login-orb-small login-orb-color-2 login-orb-3" />
          <div className="login-orb-small login-orb-color-2 login-orb-4" />
          <div className="login-orb-small login-orb-color-2 login-orb-5" />

          <div className="login-orb-small login-orb-color-1 login-orb-6" />
          <div className="login-orb-small login-orb-color-1 login-orb-7" />
          <div className="login-orb-small login-orb-color-1 login-orb-8" />
          <div className="login-orb-small login-orb-color-1 login-orb-9" />

          <div className="login-orb-small login-orb-color-3 login-orb-10" />
          <div className="login-orb-small login-orb-color-3 login-orb-11" />
          <div className="login-orb-small login-orb-color-3 login-orb-12" />
          <div className="login-orb-small login-orb-color-3 login-orb-13" />
        </div>

        <div className="login-fullscreen-container">
          <div className="login-background-elements">
            <div className="floating-particles">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`particle-${i}`}
                  className={`particle particle-${(i % 3) + 1} particle-index-${i}`}
                />
              ))}
            </div>

            <svg className="animated-wave wave-1" viewBox="0 0 1200 400" preserveAspectRatio="none">
              <path d="M0,200 Q300,100 600,200 T1200,200 L1200,400 L0,400 Z" />
            </svg>
            <svg className="animated-wave wave-2" viewBox="0 0 1200 400" preserveAspectRatio="none">
              <path d="M0,250 Q300,150 600,250 T1200,250 L1200,400 L0,400 Z" />
            </svg>
            <svg className="animated-wave wave-3" viewBox="0 0 1200 400" preserveAspectRatio="none">
              <path d="M0,300 Q300,200 600,300 T1200,300 L1200,400 L0,400 Z" />
            </svg>

            <svg className="edu-icon edu-book" viewBox="0 0 100 100">
              <path
                className="draw-path"
                d="M20,30 L20,80 L50,70 L80,80 L80,30 L50,40 Z M50,40 L50,70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <svg className="edu-icon edu-lightbulb" viewBox="0 0 100 100">
              <path
                className="draw-path"
                d="M50,20 L50,15 M35,28 L31,24 M65,28 L69,24 M50,25 A15,15 0 0,1 65,40 A15,15 0 0,1 50,55 A15,15 0 0,1 35,40 A15,15 0 0,1 50,25 M42,55 L42,65 L58,65 L58,55 M45,65 L45,70 L55,70 L55,65 M48,70 L48,75 L52,75 L52,70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <svg className="edu-icon edu-rocket" viewBox="0 0 100 100">
              <path
                className="draw-path"
                d="M50,15 L60,50 L70,60 L60,65 L50,85 L40,65 L30,60 L40,50 Z M35,65 L25,75 M65,65 L75,75 M45,50 A5,5 0 1,1 55,50 A5,5 0 1,1 45,50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <svg className="edu-icon edu-star" viewBox="0 0 100 100">
              <path
                className="draw-path"
                d="M50,20 L58,45 L85,45 L63,60 L70,85 L50,70 L30,85 L37,60 L15,45 L42,45 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <svg className="edu-icon edu-atom" viewBox="0 0 100 100">
              <ellipse
                className="draw-path"
                cx="50"
                cy="50"
                rx="35"
                ry="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <ellipse
                className="draw-path"
                cx="50"
                cy="50"
                rx="35"
                ry="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                transform="rotate(60 50 50)"
              />
              <ellipse
                className="draw-path"
                cx="50"
                cy="50"
                rx="35"
                ry="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                transform="rotate(120 50 50)"
              />
              <circle cx="50" cy="50" r="4" fill="currentColor" />
            </svg>

            <svg className="particle-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line className="connection-line connection-line-1" x1="20" y1="30" x2="80" y2="70" />
              <line className="connection-line connection-line-2" x1="40" y1="60" x2="70" y2="30" />
              <line className="connection-line connection-line-3" x1="30" y1="80" x2="60" y2="40" />
            </svg>
          </div>

          <div className="login-illustrations-scattered">
            <div className="scattered-illustration illustration-color-2 illus-pos-1 illus-mask-1" />
            <div className="scattered-illustration illustration-color-1 illus-pos-2 illus-mask-2" />
            <div className="scattered-illustration illustration-color-3 illus-pos-3 illus-mask-3" />
            <div className="scattered-illustration illustration-color-2 illus-pos-4 illus-mask-4" />
            <div className="scattered-illustration illustration-color-1 illus-pos-5 illus-mask-5" />
            <div className="scattered-illustration illustration-color-3 illus-pos-6 illus-mask-6" />
            <div className="scattered-illustration illustration-color-2 illus-pos-7 illus-mask-7" />
          </div>

          <AuthCard>
            {view === 'login' && (
              <LoginForm
                logo={logo}
                mode={mode}
                identifier={identifier}
                password={password}
                rememberMe={rememberMe}
                isLoading={isLoading}
                identifierTouched={identifierTouched}
                passwordTouched={passwordTouched}
                onIdentifierChange={(value) => {
                  handleIdentifierChange(value);
                  setIdentifierTouched(true);
                }}
                onPasswordChange={(value) => {
                  setPassword(value);
                  setPasswordTouched(true);
                }}
                onRememberMeChange={setRememberMe}
                onIdentifierBlur={() => setIdentifierTouched(true)}
                onPasswordBlur={() => setPasswordTouched(true)}
                onSubmit={handleSubmit}
                onForgotPassword={() => setView('reset-password')}
                onSwitchToPhone={switchToPhone}
              />
            )}

            {view === 'reset-password' && (
              <ResetPasswordForm
                email={resetEmail}
                isLoading={resetState === 'sending'}
                emailTouched={resetEmailTouched}
                error={resetError}
                onEmailChange={(value) => {
                  setResetEmail(value);
                  setResetError(undefined);
                  setResetEmailTouched(false);
                }}
                onEmailBlur={() => setResetEmailTouched(true)}
                onSubmit={handleResetSubmit}
                onBackToLogin={handleBackToLogin}
              />
            )}

            {view === 'setup-password' && (
              <SetupPasswordForm
                logo={logo}
                email={setupPasswordData.email}
                password={setupPasswordData.password}
                confirmPassword={setupPasswordData.confirmPassword}
                emailTouched={setupEmailTouched}
                passwordTouched={setupPasswordTouched}
                confirmPasswordTouched={setupConfirmPasswordTouched}
                isLoading={setupLoading}
                error={setupError}
                isEmailDisabled={!!invitationEmail}
                onEmailChange={(value) => {
                  setSetupPasswordData((prev) => ({ ...prev, email: value }));
                  setSetupEmailTouched(true);
                }}
                onPasswordChange={(value) => {
                  setSetupPasswordData((prev) => ({ ...prev, password: value }));
                  setSetupPasswordTouched(true);
                }}
                onConfirmPasswordChange={(value) => {
                  setSetupPasswordData((prev) => ({ ...prev, confirmPassword: value }));
                  setSetupConfirmPasswordTouched(true);
                }}
                onEmailBlur={() => setSetupEmailTouched(true)}
                onPasswordBlur={() => setSetupPasswordTouched(true)}
                onConfirmPasswordBlur={() => setSetupConfirmPasswordTouched(true)}
                onSubmit={handleSetupPassword}
              />
            )}

            {view === 'phone-setup' && (
              <PhoneSetupForm
                logo={logo}
                phone={invitePhone || ''}
                otpValue={otpValue}
                countdown={countdown}
                isLoading={setupLoading}
                error={setupError}
                onOtpChange={setOtpValue}
                onOtpComplete={handlePhoneSetupVerify}
                onResendOtp={handleResendPhoneSetupOtp}
                onVerify={() => handlePhoneSetupVerify(otpValue)}
              />
            )}
          </AuthCard>
        </div>

        {showOtpModal && (
          <OtpModal
            open={showOtpModal}
            onClose={() => {
              setShowOtpModal(false);
            }}
            onVerify={handleOtpVerify}
            onResend={handleOtpResend}
            phoneNumber={identifier}
          />
        )}

        <div id="recaptcha-container" />
      </div>
      <Toaster hasNavbar={false} />
    </>
  );
};
