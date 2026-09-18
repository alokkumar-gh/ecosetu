import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { ROLES } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
  route: RouteProp<AuthStackParamList, 'Register'>;
}

type AllowedRole = typeof ROLES.CITIZEN | typeof ROLES.INFORMAL_COLLECTOR | typeof ROLES.RECYCLER;

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { register } = useAuth();
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

    // Client-side validations
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
      // On success, RootNavigator detects isAuthenticated and routes automatically
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check your details.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar title="Register" showBack onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create an Account</Text>
            <Text style={styles.cardSubtitle}>
              Join EcoSetu to participate in formal and transparent e-waste recycling.
            </Text>

            {errorMessage && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Role Selection Tabs */}
            <Text style={styles.label}>Select Your Role *</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, role === ROLES.CITIZEN && styles.roleOptionSelected]}
                onPress={() => setRole(ROLES.CITIZEN)}
                accessibilityRole="button"
                accessibilityLabel="Citizen Role"
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    role === ROLES.CITIZEN && styles.roleOptionTextSelected,
                  ]}
                >
                  Citizen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === ROLES.INFORMAL_COLLECTOR && styles.roleOptionSelected,
                ]}
                onPress={() => setRole(ROLES.INFORMAL_COLLECTOR)}
                accessibilityRole="button"
                accessibilityLabel="Collector Role"
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    role === ROLES.INFORMAL_COLLECTOR && styles.roleOptionTextSelected,
                  ]}
                >
                  Collector
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, role === ROLES.RECYCLER && styles.roleOptionSelected]}
                onPress={() => setRole(ROLES.RECYCLER)}
                accessibilityRole="button"
                accessibilityLabel="Recycler Role"
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    role === ROLES.RECYCLER && styles.roleOptionTextSelected,
                  ]}
                >
                  Recycler
                </Text>
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Full Name"
            />

            {/* Email Address */}
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ramesh@ecosetu.org"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email Address"
            />

            {/* Phone (Optional) */}
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone Number"
            />

            {/* Password */}
            <Text style={styles.label}>Password * (min 8 chars, letter + number)</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a strong password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
            />

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              accessibilityLabel="Confirm Password"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="link"
                accessibilityLabel="Go to Log In"
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: spacing.spaceMd,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceLg,
    elevation: spacing.cardElevation,
  },
  cardTitle: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  cardSubtitle: {
    fontSize: typography.Body.fontSize,
    lineHeight: typography.Body.lineHeight,
    color: colors.textSecondary,
    marginBottom: spacing.spaceLg,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: spacing.spaceSm,
    borderRadius: 4,
    marginBottom: spacing.spaceMd,
  },
  errorText: {
    fontSize: typography.Caption.fontSize,
    color: colors.error,
    fontWeight: '500',
  },
  label: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  roleOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceXs,
  },
  roleOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  roleOptionText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roleOptionTextSelected: {
    color: colors.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 6,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    minHeight: 48,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.spaceMd,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceLg,
    elevation: spacing.cardElevation,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.surface,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.secondary,
  },
});

export default RegisterScreen;
