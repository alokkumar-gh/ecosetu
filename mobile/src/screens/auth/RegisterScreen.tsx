/**
 * RegisterScreen — Premium SaaS Glassmorphism Edition
 *
 * Unified with LoginScreen design language:
 * - EcoSetu atmospheric background
 * - Translucent glass registration card
 * - Emerald glowing primary CTA button
 * - Translucent role selector chips
 * - Crisp white typography and accessible touch targets
 * - All business logic (useAuth, validation, register payload, role constraints) 100% preserved
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
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
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
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Bar: Back, Branding & Language Selector */}
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
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.welcomeLabelBadge}>
                <Text style={styles.welcomeLabelText}>ECOSETU • PUBLIC SERVICE E-WASTE</Text>
              </View>
              <Text style={styles.headline}>Create an Account</Text>
              <Text style={styles.subtitle}>
                Join ECOSETU to participate in formal, verified e-waste collection and circular recycling.
              </Text>
            </View>

            {/* Glass Form Card */}
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
                placeholderTextColor="rgba(255, 255, 255, 0.40)"
                value={name}
                onChangeText={setName}
                accessibilityLabel="Full Name"
              />

              {/* Email */}
              <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ramesh@ecosetu.org"
                placeholderTextColor="rgba(255, 255, 255, 0.40)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.40)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.40)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.40)"
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
                  <ActivityIndicator size="small" color="#051417" />
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account →</Text>
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
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  govMarkSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  govMarkSmallText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 14,
  },
  welcomeLabelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  welcomeLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  formCard: {
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
  errorBox: {
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: 'rgba(255, 255, 255, 0.85)',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(7, 30, 34, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  roleOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderColor: '#34D399',
  },
  roleIcon: {
    fontSize: 18,
  },
  roleOptionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  roleOptionTextSelected: {
    color: '#34D399',
  },
  input: {
    backgroundColor: 'rgba(7, 30, 34, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 14,
  },
  primaryBtn: {
    minHeight: 50,
    backgroundColor: '#10B981',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#051417',
    fontSize: 16,
    fontWeight: '800',
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
    color: 'rgba(255, 255, 255, 0.65)',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
});

export default RegisterScreen;
