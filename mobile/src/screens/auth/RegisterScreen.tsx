/**
 * RegisterScreen — Progressive 3-step signup v2
 *
 * All auth logic (useAuth.register, ROLES, validation) 100% preserved.
 *
 * Step 1: Role selection + Contact (email / phone)
 * Step 2: Password creation
 * Step 3: Identity (full name)
 *
 * Visual: EcoStepIndicator + EcoInput + EcoRoleCard + animated step transitions.
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { ROLES } from '../../utils/constants';
import { AuthBackground } from '../../components/auth/design/AuthBackground';
import { EcoInput } from '../../components/auth/design/EcoInput';
import { EcoButton, EcoSecondaryButton } from '../../components/auth/design/EcoButton';
import {
  EcoGlassCard,
  EcoStepIndicator,
  EcoRoleCard,
  EcoPasswordStrength,
} from '../../components/auth/design/EcoAuthWidgets';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { AUTH_COLORS, AUTH_ORBS, AUTH_SPACE, AUTH_RADIUS, AUTH_TIMING } from '../../components/auth/design/AuthTheme';

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
  route: RouteProp<AuthStackParamList, 'Register'>;
}

type AllowedRole = typeof ROLES.CITIZEN | typeof ROLES.INFORMAL_COLLECTOR | typeof ROLES.RECYCLER;

const ROLE_OPTIONS: {
  key: AllowedRole;
  icon: string;
  label: string;
  description: string;
  accent: string;
}[] = [
  {
    key: ROLES.CITIZEN,
    icon: '🏠',
    label: 'Citizen',
    description: 'Dispose & track your e-waste responsibly.',
    accent: AUTH_COLORS.primary,
  },
  {
    key: ROLES.INFORMAL_COLLECTOR,
    icon: '🚚',
    label: 'Collector',
    description: 'Find & manage collection opportunities.',
    accent: AUTH_COLORS.secondary,
  },
  {
    key: ROLES.RECYCLER,
    icon: '♻️',
    label: 'Recycler',
    description: 'Manage recycling & processing workflows.',
    accent: '#A78BFA',
  },
];

const TOTAL_STEPS = 3;

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { register } = useAuth();
  const { t } = useI18n();
  const initialRole: AllowedRole = (route.params?.initialRole as AllowedRole) || ROLES.CITIZEN;

  // Form state — all preserved from original
  const [currentStep, setCurrentStep] = useState(0);
  const [role, setRole] = useState<AllowedRole>(initialRole);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Per-field errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Step transition animation
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslateX = useRef(new Animated.Value(0)).current;

  // Entrance animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(headerTranslateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, headerTranslateY]);

  const animateStepTransition = (direction: 'forward' | 'back', callback: () => void) => {
    const outX = direction === 'forward' ? -30 : 30;
    const inX = direction === 'forward' ? 30 : -30;

    Animated.timing(stepOpacity, {
      toValue: 0,
      duration: AUTH_TIMING.micro,
      useNativeDriver: true,
    }).start(() => {
      stepTranslateX.setValue(inX);
      callback();
      Animated.parallel([
        Animated.timing(stepOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(stepTranslateX, { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start();
    });
  };

  const validateStep1 = (): boolean => {
    let valid = true;
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    } else {
      setEmailError(null);
    }
    return valid;
  };

  const validateStep2 = (): boolean => {
    let valid = true;
    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    } else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setPasswordError('Include both letters and numbers for a stronger password.');
      valid = false;
    } else {
      setPasswordError(null);
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords don\'t match. Please try again.');
      valid = false;
    } else {
      setConfirmPasswordError(null);
    }
    return valid;
  };

  const validateStep3 = (): boolean => {
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Please enter your full name (at least 2 characters).');
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 0 && !validateStep1()) return;
    if (currentStep === 1 && !validateStep2()) return;

    if (currentStep < TOTAL_STEPS - 1) {
      animateStepTransition('forward', () => setCurrentStep((s) => s + 1));
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigation.goBack();
      return;
    }
    setErrorMessage(null);
    animateStepTransition('back', () => setCurrentStep((s) => s - 1));
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!validateStep3()) return;

    setIsLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      };
      if (phone.trim()) payload.phone = phone.trim();
      await register(payload);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('email') || msg.includes('already')) {
        setErrorMessage('An account with this email already exists. Try signing in instead.');
      } else if (msg.includes('network')) {
        setErrorMessage('We couldn\'t reach ECOSETU right now. Check your connection and try again.');
      } else {
        setErrorMessage('Registration didn\'t go through. Please check your details and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const STEP_HEADLINES = [
    { title: 'LET\'S BUILD\nA BETTER CYCLE.', subtitle: 'Create your ECOSETU account and join the circular economy.' },
    { title: 'SECURE YOUR\nACCOUNT.', subtitle: 'Choose a strong password to protect your data.' },
    { title: 'ONE LAST\nSTEP.', subtitle: 'Tell us what to call you.' },
  ];

  return (
    <AuthBackground orbs={AUTH_ORBS.register}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={currentStep === 0 ? 'Go back' : `Back to step ${currentStep}`}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <LanguageSelector variant="compact" />
          </View>

          {/* Step Indicator */}
          <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }}>
            <EcoStepIndicator totalSteps={TOTAL_STEPS} currentStep={currentStep} />
          </Animated.View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Headline */}
            <Animated.View style={[styles.headline, { opacity: stepOpacity, transform: [{ translateX: stepTranslateX }] }]}>
              <Text style={styles.headlineTitle}>{STEP_HEADLINES[currentStep].title}</Text>
              <Text style={styles.headlineSubtitle}>{STEP_HEADLINES[currentStep].subtitle}</Text>
            </Animated.View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorText}>⚠ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Step Content */}
            <Animated.View style={{ opacity: stepOpacity, transform: [{ translateX: stepTranslateX }] }}>
              <EcoGlassCard>
                {/* ── STEP 1: Role + Email ── */}
                {currentStep === 0 && (
                  <View>
                    <Text style={styles.sectionLabel}>HOW WILL YOU USE ECOSETU?</Text>
                    <View style={styles.rolesRow}>
                      {ROLE_OPTIONS.map((opt) => (
                        <EcoRoleCard
                          key={opt.key}
                          icon={opt.icon}
                          title={opt.label}
                          description={opt.description}
                          selected={role === opt.key}
                          onPress={() => setRole(opt.key)}
                          accentColor={opt.accent}
                          accessibilityLabel={`Select ${opt.label} role`}
                        />
                      ))}
                    </View>

                    <EcoInput
                      label={t('auth.email', 'Email address')}
                      icon="✉"
                      value={email}
                      onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      error={emailError}
                      accessibilityLabel="Email address"
                    />

                    <EcoInput
                      label={t('auth.phone', 'Phone number (optional)')}
                      icon="📱"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      accessibilityLabel="Phone number (optional)"
                    />
                  </View>
                )}

                {/* ── STEP 2: Password ── */}
                {currentStep === 1 && (
                  <View>
                    <EcoInput
                      label={t('auth.password', 'Create a password')}
                      icon="🔑"
                      value={password}
                      onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); }}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                      error={passwordError}
                      accessibilityLabel="Create a password"
                      rightElement={
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                      }
                    />
                    <EcoPasswordStrength password={password} />

                    <EcoInput
                      label={t('auth.confirmPassword', 'Confirm password')}
                      icon="🔒"
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); if (confirmPasswordError) setConfirmPasswordError(null); }}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      error={confirmPasswordError}
                      accessibilityLabel="Confirm password"
                      rightElement={
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                          accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                      }
                    />

                    <Text style={styles.passwordHint}>
                      💡 Use at least 8 characters with letters and numbers for a strong password.
                    </Text>
                  </View>
                )}

                {/* ── STEP 3: Name ── */}
                {currentStep === 2 && (
                  <View>
                    <EcoInput
                      label={t('auth.name', 'Your full name')}
                      icon="👤"
                      value={name}
                      onChangeText={(v) => { setName(v); if (nameError) setNameError(null); }}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      error={nameError}
                      accessibilityLabel="Full name"
                    />

                    <Text style={styles.roleConfirm}>
                      Joining as: <Text style={styles.roleConfirmValue}>
                        {ROLE_OPTIONS.find(r => r.key === role)?.label}
                      </Text>
                    </Text>
                  </View>
                )}
              </EcoGlassCard>
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.actionsArea}>
              {currentStep < TOTAL_STEPS - 1 ? (
                <EcoButton
                  label="Continue"
                  onPress={handleNext}
                  accessibilityLabel={`Continue to step ${currentStep + 2}`}
                />
              ) : (
                <EcoButton
                  label="Create Account"
                  loadingLabel="Creating your account..."
                  onPress={handleRegister}
                  loading={isLoading}
                  accessibilityLabel="Create your ECOSETU account"
                />
              )}

              <View style={styles.signInRow}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  backArrow: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  spacer: { flex: 1 },
  scrollContent: {
    paddingHorizontal: AUTH_SPACE.screenH,
    paddingBottom: 40,
    flexGrow: 1,
    gap: 14,
  },
  headline: {
    marginBottom: 4,
  },
  headlineTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 34,
    marginBottom: 8,
  },
  headlineSubtitle: {
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: AUTH_COLORS.errorBg,
    borderWidth: 1,
    borderColor: AUTH_COLORS.errorBorder,
    borderRadius: AUTH_RADIUS.md,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: AUTH_COLORS.error,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: AUTH_COLORS.textMuted,
    marginBottom: 12,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  eyeIcon: {
    fontSize: 16,
    color: AUTH_COLORS.textMuted,
  },
  passwordHint: {
    fontSize: 12,
    color: AUTH_COLORS.textMuted,
    lineHeight: 17,
  },
  roleConfirm: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
    marginTop: 4,
  },
  roleConfirmValue: {
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
  },
  actionsArea: {
    gap: 10,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  signInText: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
  },
  signInLink: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
  },
});

export default RegisterScreen;
