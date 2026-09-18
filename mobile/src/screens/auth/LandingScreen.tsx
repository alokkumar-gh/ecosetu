import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Landing'>;
}

export const LandingScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>♻</Text>
          </View>
          <Text style={styles.appName}>EcoSetu</Text>
          <Text style={styles.tagline}>Bridge to Sustainable E-Waste Management</Text>
          <Text style={styles.missionText}>
            Connecting citizens, informal collectors, and authorized recyclers into a transparent,
            traceable circular economy.
          </Text>
        </View>

        {/* Primary Login Button */}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Log in to existing account"
          activeOpacity={0.8}
        >
          <Text style={styles.buttonPrimaryText}>Log In</Text>
        </TouchableOpacity>

        {/* Role Registration Section */}
        <View style={styles.registerSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>NEW TO ECOSETU?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('Register', { initialRole: 'CITIZEN' })}
            accessibilityRole="button"
            accessibilityLabel="Register as a Citizen"
            activeOpacity={0.8}
          >
            <Text style={styles.buttonSecondaryText}>Register as Citizen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('Register', { initialRole: 'INFORMAL_COLLECTOR' })}
            accessibilityRole="button"
            accessibilityLabel="Register as an Informal Collector"
            activeOpacity={0.8}
          >
            <Text style={styles.buttonSecondaryText}>Register as Collector</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('Register', { initialRole: 'RECYCLER' })}
            accessibilityRole="button"
            accessibilityLabel="Register as an Authorized Recycler"
            activeOpacity={0.8}
          >
            <Text style={styles.buttonSecondaryText}>Register as Recycler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.spaceLg,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.spaceXl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
    elevation: spacing.cardElevation,
  },
  logoIcon: {
    fontSize: 44,
    color: colors.surface,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.spaceXs,
  },
  tagline: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.spaceSm,
  },
  missionText: {
    fontSize: typography.Body.fontSize,
    lineHeight: typography.Body.lineHeight,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.spaceSm,
    paddingHorizontal: spacing.spaceMd,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    elevation: spacing.cardElevation,
    marginBottom: spacing.spaceLg,
  },
  buttonPrimaryText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.surface,
  },
  registerSection: {
    width: '100%',
    gap: spacing.spaceSm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginHorizontal: spacing.spaceSm,
    letterSpacing: 1,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
  },
  buttonSecondaryText: {
    fontSize: typography.Body.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default LandingScreen;
