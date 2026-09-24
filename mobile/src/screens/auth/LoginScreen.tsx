/**
 * LoginScreen — Premium SaaS Glassmorphism Edition
 *
 * Implements the official EcoSetu visual design system:
 * - Deep atmospheric canvas with ambient emerald and cyan light orbs
 * - Glowing ECOSETU emblem & SaaS typography hierarchy
 * - Translucent glass Google button
 * - Dark glass input surfaces with subtle inner borders and emerald focus glow
 * - High-impact glowing emerald primary CTA button: [ Sign In → ]
 * - Translucent secondary actions and phone pill button
 * - Compact glass security badges: Secure Authentication, Role-based Access, Traceable Impact
 * - Language selector in compact header
 * - Zero raster images, 100% programmatic vector / glass rendering
 * - Preserves all authentication logic (Firebase, Google, Phone, JWT, RBAC)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';

const LOGO_IMAGE = require('../../assets/images/logo.png');
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { PhoneAuthModal } from '../../components/auth/PhoneAuthModal';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { firebaseAuthService } from '../../services/firebaseAuthService';

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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage(t('auth.invalidEmail') || 'Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = firebaseAuthService.mapFirebaseError(err);
      setErrorMessage(msg);
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
      firebaseAuthService.logDiagnostic('BACKEND_FIREBASE_LOGIN_SUCCESS', { status: 200 });
      firebaseAuthService.logDiagnostic('ECOSETU_SESSION_CREATED', { hasSession: Boolean(result?.accessToken) });
      firebaseAuthService.logDiagnostic('PROFILE_FETCH_SUCCESS', { hasProfile: Boolean(result?.user) });
      firebaseAuthService.logDiagnostic('ROLE_RESOLVED', { role: result?.user?.role || 'CITIZEN' });
      firebaseAuthService.logDiagnostic('AUTH_COMPLETE');
    } catch (err: any) {
      firebaseAuthService.logDiagnostic('BACKEND_FIREBASE_LOGIN_FAILED', {
        code: err?.code || 'AUTH_FAILURE',
        errorClass: err?.name || 'AppError',
        safeMessage: err?.message || 'Backend authentication failed',
      });
      // User cancellation: cleanly return without showing error banner
      if (err?.code === 'SIGN_IN_CANCELLED' || err?.message?.includes?.('cancelled')) {
        return;
      }
      const msg = firebaseAuthService.mapFirebaseError(err);
      setErrorMessage(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flexContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Bar: Compact Language Selector */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.emblemBadge}>
                <Text style={styles.emblemText}>♻</Text>
              </View>
              <Text style={styles.brandTitle}>ECOSETU</Text>
            </View>
            <LanguageSelector variant="compact" />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* SaaS Hero Header */}
            <View style={styles.heroSection}>
              <View style={styles.largeLogoGlow}>
                <Image source={LOGO_IMAGE} style={styles.largeLogoImage} resizeMode="cover" />
              </View>
              <Text style={styles.heroTitle}>ECOSETU</Text>
              <Text style={styles.heroSubtitle}>
                {t('auth.appSubtitle') || 'Electronic Waste Collection & Recycling'}
              </Text>
              <Text style={styles.welcomeHeading}>{t('auth.welcomeBack', 'Welcome Back')}</Text>
              <Text style={styles.welcomeSubtext}>{t('auth.welcomeSubtext', 'Same planet. A cleaner future.')}</Text>
            </View>

            {/* Glass Authentication Card */}
            <View style={styles.glassAuthCard}>
              {/* Error Banner */}
              {errorMessage ? (
                <View
                  style={styles.errorBanner}
                  accessibilityRole="alert"
                  accessibilityLabel={`Authentication Error: ${errorMessage}`}
                >
                  <Text style={styles.errorIcon}>⚠</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* 1. Continue with Google */}
              <TouchableOpacity
                style={[styles.googleGlassButton, isGoogleLoading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.continueWithGoogle') || 'Continue with Google'}
                activeOpacity={0.8}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContentRow}>
                    <View style={styles.googleGLogo}>
                      <Text style={styles.googleGText}>G</Text>
                    </View>
                    <Text style={styles.googleGlassButtonText}>
                      {t('auth.continueWithGoogle') || 'Continue with Google'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* 2. Or continue with email Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {t('auth.or') ? `or continue with ${t('auth.email') || 'email'}` : 'or continue with email'}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 3. Glass Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.email') || 'Email address'}</Text>
                <View style={[styles.glassInputWrapper, emailFocused && styles.glassInputFocused]}>
                  <Text style={styles.inputPrefixIcon}>✉</Text>
                  <TextInput
                    style={styles.glassTextInput}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(255, 255, 255, 0.40)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    accessibilityLabel={t('auth.email') || 'Email Address'}
                    accessibilityHint="Enter your registered email address"
                  />
                </View>
              </View>

              {/* 4. Glass Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.password') || 'Password'}</Text>
                <View style={[styles.glassInputWrapper, passwordFocused && styles.glassInputFocused]}>
                  <Text style={styles.inputPrefixIcon}>🔒</Text>
                  <TextInput
                    style={styles.glassTextInput}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255, 255, 255, 0.40)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    accessibilityLabel={t('auth.password') || 'Password'}
                    accessibilityHint="Enter your password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={styles.eyeIconText}>{showPassword ? '👁' : '🔒'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordWrapper}
                onPress={() => {}}
                accessibilityRole="button"
              >
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword', 'Forgot Password?')}</Text>
              </TouchableOpacity>

              {/* 5. Primary Glowing Emerald CTA Button */}
              <TouchableOpacity
                style={[styles.primaryCTAButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || isGoogleLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.signIn') || 'Sign In'}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#051417" />
                ) : (
                  <View style={styles.ctaContentRow}>
                    <Text style={styles.primaryCTAButtonText}>
                      {t('auth.signIn') || 'Sign In'}
                    </Text>
                    <Text style={styles.ctaArrow}>→</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* 6. Create Account Link */}
              <View style={styles.createAccountRow}>
                <Text style={styles.noAccountText}>
                  {t('auth.noAccountYet') || "Don't have an account?"}{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.createAccount') || 'Create Account'}
                >
                  <Text style={styles.createAccountLink}>
                    {t('auth.createAccount') || 'Create Account'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 7. Continue with Phone (Glass Pill) */}
              <TouchableOpacity
                style={styles.phoneGlassButton}
                onPress={() => setPhoneModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('auth.continueWithPhone') || 'Continue with Phone'}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContentRow}>
                  <Text style={styles.phoneIcon}>📱</Text>
                  <Text style={styles.phoneGlassButtonText}>
                    {t('auth.continueWithPhone') || 'Continue with Phone'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>


            {/* ── Compact Glass Security Indicators ─────────────────────────── */}
            <View style={styles.securityChipsRow}>
              <View style={styles.securityChip}>
                <Text style={styles.securityCheck}>✓</Text>
                <Text style={styles.securityLabel}>{t('auth.security.secure', 'Secure')}</Text>
              </View>
              <View style={styles.securityChip}>
                <Text style={styles.securityCheck}>✓</Text>
                <Text style={styles.securityLabel}>{t('auth.security.roleBased', 'Role-based')}</Text>
              </View>
              <View style={styles.securityChip}>
                <Text style={styles.securityCheck}>✓</Text>
                <Text style={styles.securityLabel}>{t('auth.security.traceable', 'Traceable')}</Text>
              </View>
            </View>

            {/* ── Link to review introductory carousel ───────────────────────── */}
            <TouchableOpacity
              style={styles.aboutPlatformButton}
              onPress={() => navigation.navigate('Landing', { forceShow: true })}
              accessibilityRole="button"
              accessibilityLabel={t('auth.aboutPlatform') || 'How ECOSETU Works'}
            >
              <Text style={styles.aboutPlatformText}>
                ℹ {t('auth.aboutPlatform') || 'How ECOSETU Works'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* ── Phone OTP Verification Modal ─────────────────────────────────── */}
          <PhoneAuthModal
            visible={phoneModalVisible}
            onClose={() => setPhoneModalVisible(false)}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flexContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  emblemText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  largeLogoGlow: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  largeLogoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  welcomeHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 14,
    letterSpacing: -0.3,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 3,
  },
  glassAuthCard: {
    width: '100%',
    backgroundColor: 'rgba(16, 44, 48, 0.72)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorIcon: {
    color: '#F87171',
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FCA5A5',
    lineHeight: 18,
    fontWeight: '500',
  },
  googleGlassButton: {
    minHeight: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleGText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F2942',
  },
  googleGlassButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.50)',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 6,
  },
  glassInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: 'rgba(7, 30, 34, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  glassInputFocused: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
  },
  inputPrefixIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.60)',
    marginRight: 8,
  },
  glassTextInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 14,
    color: '#FFFFFF',
  },
  eyeButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  eyeIconText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  forgotPasswordWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  primaryCTAButton: {
    minHeight: 50,
    backgroundColor: '#10B981',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCTAButtonText: {
    color: '#051417',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginRight: 6,
  },
  ctaArrow: {
    color: '#051417',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountRow: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  noAccountText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  createAccountLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  phoneGlassButton: {
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  phoneIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  phoneGlassButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  securityChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  securityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 44, 48, 0.60)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  securityCheck: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: 'bold',
    marginRight: 4,
  },
  securityLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  aboutPlatformButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  aboutPlatformText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
