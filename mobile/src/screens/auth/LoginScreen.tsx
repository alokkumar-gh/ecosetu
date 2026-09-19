/**
 * LoginScreen — Government-Grade Public Service Edition
 * Restrained, trustworthy, institutional visual language for ECOSETU.
 * Zero AI-generated artwork, zero neon, zero floating blobs.
 * Preserves all authentication business logic (Firebase, JWT, RBAC).
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { PhoneAuthModal } from '../../components/auth/PhoneAuthModal';
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top Bar: Language Selector ──────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBrandRow}>
          <View style={styles.govMarkSmall}>
            <Text style={styles.govMarkSmallText}>♻</Text>
          </View>
          <Text style={styles.topBarTitle}>ECOSETU</Text>
        </View>
        <LanguageSelector variant="compact" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Institutional Header Section ──────────────────────────────── */}
        <View style={styles.headerSection}>
          <View style={styles.emblemContainer}>
            <View style={styles.emblemCircle}>
              <Text style={styles.emblemIcon}>♻</Text>
            </View>
          </View>
          <Text style={styles.appName}>ECOSETU</Text>
          <Text style={styles.appSubtitle}>
            {t('auth.appSubtitle') || 'Electronic Waste Collection & Recycling'}
          </Text>
          <View style={styles.headerUnderline} />
        </View>

        {/* ── Main Authentication Form Card ──────────────────────────────── */}
        <View style={styles.formCard}>
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
            style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.continueWithGoogle') || 'Continue with Google'}
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#0F2942" />
            ) : (
              <View style={styles.buttonContentRow}>
                <Text style={styles.googleIconText}>G</Text>
                <Text style={styles.googleButtonText}>
                  {t('auth.continueWithGoogle') || 'Continue with Google'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or') || 'OR'}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 3. Email & Password Inputs */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.email') || 'Email'}</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="name@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              accessibilityLabel={t('auth.email') || 'Email Address'}
              accessibilityHint="Enter your registered email address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.password') || 'Password'}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  passwordFocused && styles.inputFocused,
                ]}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
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
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeIconText}>{showPassword ? '👁' : '🔒'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || isGoogleLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.signIn') || 'Sign In'}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('auth.signIn') || 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* 5. Create Account Link */}
          <TouchableOpacity
            style={styles.createAccountRow}
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            accessibilityLabel={t('auth.createAccount') || 'Create Account'}
          >
            <Text style={styles.noAccountText}>
              {t('auth.noAccountYet') || "Don't have an account?"}{' '}
            </Text>
            <Text style={styles.createAccountLink}>
              {t('auth.createAccount') || 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Divider before Phone */}
          <View style={styles.dividerRowSmall}>
            <View style={styles.dividerLine} />
          </View>

          {/* 6. Continue with Phone */}
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => setPhoneModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.continueWithPhone') || 'Continue with Phone'}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContentRow}>
              <Text style={styles.phoneIconText}>📱</Text>
              <Text style={styles.phoneButtonText}>
                {t('auth.continueWithPhone') || 'Continue with Phone'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Government-Style Trust & Information Section ───────────────── */}
        <View style={styles.trustCard} accessibilityLabel="Security and Privacy Information">
          <View style={styles.trustHeader}>
            <Text style={styles.trustShieldIcon}>🛡</Text>
            <Text style={styles.trustStatement}>
              {t('auth.trustStatement') || 'Your information is used only to provide ECOSETU services.'}
            </Text>
          </View>

          <View style={styles.trustDivider} />

          <View style={styles.trustPointsList}>
            <View style={styles.trustPointRow}>
              <Text style={styles.trustBullet}>•</Text>
              <Text style={styles.trustPointText}>
                {t('auth.secureAuth') || 'Secure authentication'}
              </Text>
            </View>
            <View style={styles.trustPointRow}>
              <Text style={styles.trustBullet}>•</Text>
              <Text style={styles.trustPointText}>
                {t('auth.roleBasedAccess') || 'Role-based access'}
              </Text>
            </View>
            <View style={styles.trustPointRow}>
              <Text style={styles.trustBullet}>•</Text>
              <Text style={styles.trustPointText}>
                {t('auth.traceableWorkflow') || 'Traceable collection workflow'}
              </Text>
            </View>
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
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Institutional off-white surface
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  govMarkSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F2942',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  govMarkSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2942',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    flexGrow: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  emblemContainer: {
    marginBottom: 6,
  },
  emblemCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F2942',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  emblemIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  headerUnderline: {
    width: 44,
    height: 3,
    backgroundColor: '#15803D', // Dignified green accent
    marginTop: 6,
    borderRadius: 1.5,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.90)',
    padding: 18,
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  errorIcon: {
    color: '#B91C1C',
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },
  googleButton: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2942',
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeButton: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  eyeIconText: {
    fontSize: 16,
    color: '#64748B',
  },
  inputFocused: {
    borderColor: '#0F2942',
    borderWidth: 1.5,
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: '#0F2942',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  createAccountRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  noAccountText: {
    fontSize: 14,
    color: '#475569',
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2942',
  },
  phoneButton: {
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  phoneIconText: {
    fontSize: 16,
    marginRight: 8,
  },
  phoneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F2942',
  },
  trustCard: {
    width: '100%',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    padding: 12,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trustShieldIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  trustStatement: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  trustDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  trustPointsList: {
    paddingLeft: 4,
  },
  trustPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trustBullet: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: 'bold',
    marginRight: 8,
  },
  trustPointText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  aboutPlatformButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  aboutPlatformText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
