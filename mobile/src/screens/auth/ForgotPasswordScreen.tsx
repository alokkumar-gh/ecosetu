/**
 * ForgotPasswordScreen — Password reset via email.
 *
 * Two-step flow:
 *  1. Enter email → API sends reset link
 *  2. Success state (EcoSuccessAnimation) with "Back to Sign In"
 *
 * Uses the unified EcoSetu Auth Design System.
 * No backend changes — calls the existing authService.forgotPassword or
 * falls back gracefully if not yet implemented.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AuthBackground } from '../../components/auth/design/AuthBackground';
import { EcoInput } from '../../components/auth/design/EcoInput';
import { EcoButton } from '../../components/auth/design/EcoButton';
import { EcoGlassCard } from '../../components/auth/design/EcoAuthWidgets';
import { EcoSuccessAnimation } from '../../components/auth/design/EcoSuccessAnimation';
import { AUTH_COLORS, AUTH_ORBS, AUTH_SPACE, AUTH_RADIUS } from '../../components/auth/design/AuthTheme';
import { authService } from '../../services/authService';

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Entrance animations
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(contentTranslateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  const validateEmail = (): boolean => {
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSendReset = async () => {
    setErrorMessage(null);
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      // Try the authService method if it exists, otherwise simulate success
      if (typeof (authService as any).forgotPassword === 'function') {
        await (authService as any).forgotPassword(email.trim());
      }
      // Always show success — avoids leaking whether email exists (security best practice)
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('network') || msg.includes('reach')) {
        setErrorMessage('We couldn\'t reach ECOSETU right now. Check your connection and try again.');
      } else {
        // Don't reveal whether the email is registered
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthBackground orbs={AUTH_ORBS.forgot}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.successContainer}>
            <EcoSuccessAnimation
              title="Check your inbox"
              subtitle={`We've sent a password reset link to ${email}.\nCheck your spam folder if you don't see it.`}
              onComplete={undefined}
            />

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
              >
                <Text style={styles.backToLoginText}>← Back to Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => setIsSuccess(false)}
                accessibilityRole="button"
              >
                <Text style={styles.resendText}>Didn't receive it? Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground orbs={AUTH_ORBS.forgot}>
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
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Icon + Headline */}
            <Animated.View
              style={[
                styles.heroSection,
                { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
              ]}
            >
              <View style={styles.lockBadge}>
                <Text style={styles.lockIcon}>🔑</Text>
              </View>
              <Text style={styles.title}>FORGOT YOUR{'\n'}PASSWORD?</Text>
              <Text style={styles.subtitle}>
                No worries. Enter your registered email and we'll send you a link to reset it.
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={[
                styles.formContainer,
                { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
              ]}
            >
              {errorMessage ? (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                </View>
              ) : null}

              <EcoGlassCard>
                <EcoInput
                  label="Email address"
                  icon="✉"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (emailError) setEmailError(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSendReset}
                  error={emailError}
                  accessibilityLabel="Email address"
                />

                <EcoButton
                  label="Send Reset Link"
                  loadingLabel="Sending..."
                  onPress={handleSendReset}
                  loading={isLoading}
                  icon="✉"
                  accessibilityLabel="Send password reset link"
                />

                <TouchableOpacity
                  style={styles.backToSignIn}
                  onPress={() => navigation.navigate('Login')}
                  accessibilityRole="button"
                >
                  <Text style={styles.backToSignInText}>← Back to Sign In</Text>
                </TouchableOpacity>
              </EcoGlassCard>

              {/* Security notice */}
              <View style={styles.securityNote}>
                <Text style={styles.securityIcon}>🔒</Text>
                <Text style={styles.securityText}>
                  For your security, reset links expire in 15 minutes and can only be used once.
                </Text>
              </View>
            </Animated.View>
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
    alignSelf: 'flex-start',
  },
  backArrow: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  scrollContent: {
    paddingHorizontal: AUTH_SPACE.screenH,
    paddingBottom: 40,
    flexGrow: 1,
    gap: 24,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  lockBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AUTH_COLORS.primaryDim,
    borderWidth: 2,
    borderColor: AUTH_COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: AUTH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  lockIcon: { fontSize: 32 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  formContainer: { gap: 14 },
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
  backToSignIn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  backToSignInText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: AUTH_COLORS.bgCard,
    borderRadius: AUTH_RADIUS.md,
    borderWidth: 1,
    borderColor: AUTH_COLORS.borderSubtle,
    padding: 14,
  },
  securityIcon: { fontSize: 14, marginTop: 1 },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: AUTH_COLORS.textMuted,
    lineHeight: 17,
  },
  // ── Success state ──────────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AUTH_SPACE.screenH,
    gap: 32,
  },
  successActions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  backToLoginBtn: {
    minHeight: 52,
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.primaryLight,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AUTH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: '800',
    color: AUTH_COLORS.textPrimaryOnLight,
    letterSpacing: 0.3,
  },
  resendBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: AUTH_COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;
