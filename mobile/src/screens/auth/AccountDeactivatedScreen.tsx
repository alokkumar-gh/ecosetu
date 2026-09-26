/**
 * AccountDeactivatedScreen — Glassmorphism Edition
 * Displayed when any user logs in with DEACTIVATED status.
 * Canonical Reference: docs/06_ROLES_AND_PERMISSIONS.md
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { AppIcon } from '../../components/ui/AppIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const AccountDeactivatedScreen: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useI18n();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <AppIcon name="lock" size={32} color={colors.warning} />
        </View>

        <Text style={styles.headline}>{t('auth.accountDeactivated') || 'Account Deactivated'}</Text>
        <Text style={styles.subheadline}>Account Closed</Text>

        <GlassCard variant="elevated" style={styles.card}>
          <Text style={styles.message}>
            This EcoSetu account has been deactivated.
          </Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              All associated sessions and operational access have been closed. To reactivate your account, please submit a request to the platform administrator.
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
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.4)',
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
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.spaceXs,
  },
  subheadline: {
    fontSize: typography.CaptionStrong.fontSize,
    fontWeight: '700',
    color: colors.textTertiary,
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: spacing.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: colors.textTertiary,
  },
  noticeText: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
  },
  button: {
    minHeight: 48,
  },
});

export default AccountDeactivatedScreen;
