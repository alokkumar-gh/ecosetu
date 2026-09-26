/**
 * LoginScreen — Premium v2
 *
 * Uses the unified EcoSetu Auth Design System.
 * All authentication logic (useAuth, Firebase, mapFirebaseError) is 100% preserved.
 *
 * Visual features:
 * - Animated hero logo with breathing ring
 * - EcoInput floating-label inputs with focus glow + shake-on-error
 * - EcoButton with spring press + loading state
 * - EcoSocialButton for Google + Phone
 * - EcoAuthDivider
 * - Friendly error messages (no raw API errors)
 * - PhoneAuthModal preserved
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { AuthBackground } from '../../components/auth/design/AuthBackground';
import { EcoInput } from '../../components/auth/design/EcoInput';
import { EcoButton, EcoSocialButton } from '../../components/auth/design/EcoButton';
import { EcoAuthDivider, EcoGlassCard } from '../../components/auth/design/EcoAuthWidgets';
import { PhoneAuthModal } from '../../components/auth/PhoneAuthModal';
import { RoleSelectionModal } from '../../components/auth/RoleSelectionModal';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { AppIcon } from '../../components/ui/AppIcon';
import { AUTH_COLORS, AUTH_ORBS, AUTH_SPACE, AUTH_RADIUS } from '../../components/auth/design/AuthTheme';
import { ROLES } from '../../utils/constants';

const LOGO_IMAGE = require('../../assets/images/logo.png');

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loginWithFirebase } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<{ idToken: string; name?: string; email?: string } | null>(null);

  // Hero animations
  const ringRotate = useRef(new Animated.Value(0)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ring rotation
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Logo breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, { toValue: 1.06, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathScale, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Entrance
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(formOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.spring(formTranslateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rotateDeg = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const validateFields = (): boolean => {
    let valid = true;
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      valid = false;
    } else if (!email.includes('@')) {
      setEmailError('That doesn\'t look like a valid email.');
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      valid = false;
    } else {
      setPasswordError(null);
    }

    return valid;
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!validateFields()) return;

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const raw = firebaseAuthService.mapFirebaseError(err);
      // Map technical errors to friendly messages
      if (raw.includes('password') || raw.includes('credentials') || raw.includes('wrong')) {
        setErrorMessage('We couldn\'t sign you in with those details. Check your password and try again.');
      } else if (raw.includes('user') || raw.includes('email') || raw.includes('not found')) {
        setErrorMessage('No account found with that email. Check it and try again, or create a new account.');
      } else if (raw.includes('network') || raw.includes('reach')) {
        setErrorMessage('We couldn\'t reach ECOSETU right now. Check your connection and try again.');
      } else {
        setErrorMessage(raw || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const { idToken, provider } = await firebaseAuthService.signInWithGoogle();
      firebaseAuthService.logDiagnostic('BACKEND_FIREBASE_LOGIN_STARTED', { provider });
      const result = await loginWithFirebase({ idToken, provider });

      if (result?.isNewUser) {
        setPendingGoogleAuth({ idToken, name: result.name, email: result.email });
        setRoleModalVisible(true);
        return;
      }

      if (result?.message) {
        Alert.alert('Existing Account Found', result.message);
      }

      firebaseAuthService.logDiagnostic('AUTH_COMPLETE', { role: result?.user?.role });
    } catch (err: any) {
      if (err?.code === 'SIGN_IN_CANCELLED' || err?.message?.includes?.('cancelled')) return;
      setErrorMessage('Google sign-in didn\'t work. Please try again or use email.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSelectRoleFromModal = async (chosenRole: string) => {
    if (!pendingGoogleAuth?.idToken) return;

    if (chosenRole === ROLES.CITIZEN) {
      // Immediate citizen registration
      await loginWithFirebase({
        idToken: pendingGoogleAuth.idToken,
        role: ROLES.CITIZEN,
      });
      setRoleModalVisible(false);
      setPendingGoogleAuth(null);
    } else if (chosenRole === ROLES.INFORMAL_COLLECTOR) {
      setRoleModalVisible(false);
      navigation.navigate('CollectorOnboarding', {
        idToken: pendingGoogleAuth.idToken,
        name: pendingGoogleAuth.name,
        email: pendingGoogleAuth.email,
      });
    } else if (chosenRole === ROLES.RECYCLER) {
      setRoleModalVisible(false);
      navigation.navigate('RecyclerOnboarding', {
        idToken: pendingGoogleAuth.idToken,
        name: pendingGoogleAuth.name,
        email: pendingGoogleAuth.email,
      });
    }
  };

  const GoogleIcon = () => (
    <View style={styles.googleG}>
      <Text style={styles.googleGText}>G</Text>
    </View>
  );

  return (
    <AuthBackground orbs={AUTH_ORBS.login}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AuthGateway')}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <LanguageSelector variant="compact" />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Animated Hero */}
            <Animated.View style={[styles.heroSection, { opacity: heroOpacity }]}>
              {/* Breathing glow */}
              <Animated.View style={[styles.glowHalo, { transform: [{ scale: breathScale }] }]} />

              {/* Rotating ring */}
              <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: rotateDeg }] }]}>
                <View style={styles.ringDot} />
              </Animated.View>

              {/* Logo */}
              <View style={styles.logoCircle}>
                <Image source={LOGO_IMAGE} style={styles.logoImage} resizeMode="cover" />
              </View>

              <Text style={styles.brandName}>ECOSETU</Text>
              <Text style={styles.heroTitle}>{t('auth.welcomeBack', 'Welcome back')}</Text>
              <Text style={styles.heroSubtitle}>
                {t('auth.welcomeSubtext', 'Continue your journey toward responsible e-waste recycling.')}
              </Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              style={[
                styles.formContainer,
                { opacity: formOpacity, transform: [{ translateY: formTranslateY }] },
              ]}
            >
              {/* Error Banner */}
              {errorMessage ? (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <AppIcon name="alert" size={16} color={AUTH_COLORS.error} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              <EcoGlassCard>
                {/* Google */}
                <EcoSocialButton
                  label={t('auth.continueWithGoogle', 'Continue with Google')}
                  onPress={handleGoogleSignIn}
                  loading={isGoogleLoading}
                  disabled={isLoading}
                  leftContent={<GoogleIcon />}
                  accessibilityLabel="Sign in with Google"
                />

                <EcoAuthDivider label="or continue with email" />

                {/* Email */}
                <EcoInput
                  label={t('auth.email', 'Email address')}
                  icon="mail"
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); if (errorMessage) setErrorMessage(null); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  error={emailError}
                  accessibilityLabel={t('auth.email', 'Email address')}
                />

                {/* Password */}
                <EcoInput
                  label={t('auth.password', 'Password')}
                  icon="lock"
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); if (errorMessage) setErrorMessage(null); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  error={passwordError}
                  accessibilityLabel={t('auth.password', 'Password')}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      style={styles.eyeBtn}
                    >
                      <AppIcon name={showPassword ? 'eyeOff' : 'eye'} size={18} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  }
                />

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotRow}
                  onPress={() => navigation.navigate('ForgotPassword')}
                  accessibilityRole="button"
                >
                  <Text style={styles.forgotText}>{t('auth.forgotPassword', 'Forgot password?')}</Text>
                </TouchableOpacity>

                {/* Sign In CTA */}
                <EcoButton
                  label={t('auth.signIn', 'Sign In')}
                  loadingLabel="Signing you in..."
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={isGoogleLoading}
                  accessibilityLabel={t('auth.signIn', 'Sign In')}
                />

                {/* Create account */}
                <View style={styles.createRow}>
                  <Text style={styles.createText}>{t('auth.noAccountYet', "Don't have an account?")} </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.createLink}>{t('auth.createAccount', 'Create account')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Phone auth */}
                <EcoSocialButton
                  label={t('auth.continueWithPhone', 'Continue with Phone')}
                  onPress={() => setPhoneModalVisible(true)}
                  disabled={isLoading || isGoogleLoading}
                  leftContent={<AppIcon name="phone" size={16} color="#FFFFFF" />}
                  accessibilityLabel="Sign in with phone number"
                />
              </EcoGlassCard>

              {/* Security chips */}
              <View style={styles.securityRow}>
                {[
                  { name: 'shieldCheck' as const, label: 'Secure' },
                  { name: 'user' as const, label: 'Role-based' },
                  { name: 'recycle' as const, label: 'Traceable' },
                ].map((chip) => (
                  <View key={chip.label} style={styles.securityChip}>
                    <AppIcon name={chip.name} size={12} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
                    <Text style={styles.securityChipText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        <PhoneAuthModal
          visible={phoneModalVisible}
          onClose={() => setPhoneModalVisible(false)}
        />

        <RoleSelectionModal
          visible={roleModalVisible}
          userName={pendingGoogleAuth?.name}
          userEmail={pendingGoogleAuth?.email}
          onSelectRole={handleSelectRoleFromModal}
          onCancel={() => {
            setRoleModalVisible(false);
            setPendingGoogleAuth(null);
          }}
        />
      </SafeAreaView>
    </AuthBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AUTH_SPACE.screenH,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: AUTH_COLORS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  spacer: { flex: 1 },
  scrollContent: {
    paddingHorizontal: AUTH_SPACE.screenH,
    paddingBottom: 40,
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  glowHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    top: 12,
  },
  rotatingRing: {
    position: 'absolute',
    top: 14,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.22)',
    borderStyle: 'dashed',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  ringDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: AUTH_COLORS.primaryLight,
    marginLeft: -3.5,
    shadowColor: AUTH_COLORS.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: AUTH_COLORS.primaryGlow,
    backgroundColor: AUTH_COLORS.primaryDim,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: AUTH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '800',
    color: AUTH_COLORS.primaryLight,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
  },
  formContainer: { gap: 14 },
  errorBanner: {
    backgroundColor: AUTH_COLORS.errorBg,
    borderWidth: 1,
    borderColor: AUTH_COLORS.errorBorder,
    borderRadius: AUTH_RADIUS.md,
    padding: 12,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: AUTH_COLORS.error,
    lineHeight: 18,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
    color: AUTH_COLORS.textMuted,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: AUTH_COLORS.primaryLight,
  },
  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    marginVertical: 4,
  },
  createText: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
  },
  createLink: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
  },
  googleG: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleGText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F2942',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  securityChip: {
    backgroundColor: AUTH_COLORS.bgCard,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1,
    borderColor: AUTH_COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  securityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: AUTH_COLORS.textSecondary,
  },
});

export default LoginScreen;
