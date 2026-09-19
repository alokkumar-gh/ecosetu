/**
 * RegisterScreen — Government-Grade Public Service Edition
 * Unified with LoginScreen design tokens: clean off-white background,
 * solid white card surfaces, deep navy primary accents, readable typography.
 * All business logic (useAuth, validation, register payload, role constraints) is 100% preserved.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { ROLES } from '../../utils/constants';

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
  route: RouteProp<AuthStackParamList, 'Register'>;
}

type AllowedRole = typeof ROLES.CITIZEN | typeof ROLES.INFORMAL_COLLECTOR | typeof ROLES.RECYCLER;

const ROLE_OPTIONS: { key: AllowedRole; label: string; icon: string }[] = [
  { key: ROLES.CITIZEN, label: 'Citizen', icon: '🏠' },
  { key: ROLES.INFORMAL_COLLECTOR, label: 'Collector', icon: '🚚' },
  { key: ROLES.RECYCLER, label: 'Recycler', icon: '♻' },
];

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { register } = useAuth();
  const { t } = useI18n();
  const initialRole: AllowedRole = (route.params?.initialRole as AllowedRole) || ROLES.CITIZEN;

  const [role, setRole] = useState<AllowedRole>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    // Client-side validations (100% preserved)
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setErrorMessage('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      };
      if (phone.trim()) {
        payload.phone = phone.trim();
      }
      await register(payload);
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check your details.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ── Top Bar: Back, Branding & Language Selector ──────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.govMarkSmall}>
            <Text style={styles.govMarkSmallText}>♻</Text>
          </View>
          <Text style={styles.topBarTitle}>ECOSETU</Text>
        </View>
        <LanguageSelector variant="compact" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ─────────────────────────────────────── */}
          <View style={styles.headerSection}>
            <Text style={styles.welcomeLabel}>ECOSETU • PUBLIC SERVICE E-WASTE PORTAL</Text>
            <Text style={styles.headline}>Create an Account</Text>
            <Text style={styles.subtitle}>
              Join ECOSETU to participate in formal, verified e-waste collection and circular recycling.
            </Text>
          </View>

          {/* ── Form Card ──────────────────────────────────── */}
          <View style={styles.formCard}>
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorIcon}>⚠</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Role Selector */}
            <Text style={styles.inputLabel}>SELECT YOUR ROLE *</Text>
            <View style={styles.roleSelector}>
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = role === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
                    onPress={() => setRole(opt.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${opt.label} Role`}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleIcon}>{opt.icon}</Text>
                    <Text style={[styles.roleOptionText, isSelected && styles.roleOptionTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Full Name */}
            <Text style={styles.inputLabel}>FULL NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Full Name"
            />

            {/* Email */}
            <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ramesh@ecosetu.org"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email Address"
            />

            {/* Phone */}
            <Text style={styles.inputLabel}>PHONE NUMBER (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone Number"
            />

            {/* Password */}
            <Text style={styles.inputLabel}>PASSWORD * (MIN 8 CHARACTERS, LETTER + NUMBER)</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a strong password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
            />

            {/* Confirm Password */}
            <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              accessibilityLabel="Confirm Password"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="link"
                accessibilityLabel="Go to Log In"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 22,
    color: '#0F2942',
    fontWeight: 'bold',
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
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 14,
  },
  welcomeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D', // Institutional green accent
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  errorIcon: {
    color: '#B91C1C',
    fontSize: 15,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#334155',
    marginBottom: 6,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleOption: {
    flex: 1,
    minHeight: 52,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  roleOptionSelected: {
    backgroundColor: '#0F2942',
    borderColor: '#0F2942',
  },
  roleIcon: {
    fontSize: 18,
  },
  roleOptionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#475569',
  },
  roleOptionTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 14,
  },
  primaryBtn: {
    minHeight: 48,
    backgroundColor: '#0F2942',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#475569',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2942',
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
