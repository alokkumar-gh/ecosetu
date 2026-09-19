/**
 * AccountSuspendedScreen — Glassmorphism Edition
 * Displayed when any user logs in with SUSPENDED status.
 * Canonical Reference: docs/06_ROLES_AND_PERMISSIONS.md
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const AccountSuspendedScreen: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useI18n();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🚫</Text>
        </View>

        <Text style={styles.headline}>{t('auth.accountSuspended') || 'Account Suspended'}</Text>
        <Text style={styles.subheadline}>Access Restricted</Text>

        <GlassCard variant="elevated" style={styles.card}>
          <Text style={styles.message}>
            Your EcoSetu account has been suspended by an administrator due to a policy or compliance review.
          </Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              All platform operations, requests, pickups, and consignments are currently locked. If you believe this is an error, please contact EcoSetu compliance support.
            </Text>
          </View>
        </GlassCard>

        <View style={styles.actions}>
          <GlassButton
            label={t('auth.logout') || 'Log Out'}
            onPress={logout}
            variant="outline"
            style={styles.button}
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.spaceLg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
  },
  iconText: {
    fontSize: 38,
  },
  headline: {
    fontSize: typography.Display.fontSize,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.spaceXs,
  },
  subheadline: {
    fontSize: typography.CaptionStrong.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.spaceLg,
  },
  card: {
    width: '100%',
    marginBottom: spacing.spaceLg,
  },
  message: {
    fontSize: typography.Body.fontSize,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  noticeBox: {
    padding: spacing.spaceSm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: spacing.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  noticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
  },
  button: {
    minHeight: 48,
  },
});

export default AccountSuspendedScreen;
