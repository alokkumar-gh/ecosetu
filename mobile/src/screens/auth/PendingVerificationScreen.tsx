/**
 * PendingVerificationScreen — Glassmorphism Edition
 * Displayed when an INFORMAL_COLLECTOR or RECYCLER logs in with PENDING_VERIFICATION status.
 * Canonical Reference: docs/06_ROLES_AND_PERMISSIONS.md, docs/07_BUSINESS_WORKFLOWS.md
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

interface Props {
  role?: string;
}

export const PendingVerificationScreen: React.FC<Props> = ({ role = 'User' }) => {
  const { logout } = useAuth();
  const { t } = useI18n();

  const roleLabel = role === 'INFORMAL_COLLECTOR' ? 'Collector' : role === 'RECYCLER' ? 'Recycler' : role;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⏳</Text>
        </View>

        <Text style={styles.headline}>{t('auth.accountPending') || 'Verification Pending'}</Text>
        <Text style={styles.roleNotice}>
          {roleLabel} Registration Under Review
        </Text>

        <GlassCard variant="elevated" style={styles.card}>
          <Text style={styles.message}>
            Your application and submitted documents are currently under review by an EcoSetu administrator to ensure regulatory and safety compliance.
          </Text>

          <View style={styles.stepsContainer}>
            <View style={styles.stepRow}>
              <Text style={styles.stepDot}>✓</Text>
              <Text style={styles.stepText}>Account Registered & Profile Created</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepDotActive}>●</Text>
              <Text style={styles.stepTextActive}>Administrative Document & KYC Verification</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepDotPending}>○</Text>
              <Text style={styles.stepTextPending}>Full Platform Access & Operations</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Verification typically takes 24–48 business hours. You will receive an alert once your credentials are verified.
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
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
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
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.spaceXs,
  },
  roleNotice: {
    fontSize: typography.CaptionStrong.fontSize,
    fontWeight: '700',
    color: colors.warning,
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
  stepsContainer: {
    gap: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  stepDot: {
    color: colors.success,
    fontWeight: '700',
  },
  stepText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  stepDotActive: {
    color: colors.warning,
    fontWeight: '700',
  },
  stepTextActive: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.warning,
  },
  stepDotPending: {
    color: colors.textTertiary,
  },
  stepTextPending: {
    fontSize: typography.Caption.fontSize,
    color: colors.textTertiary,
  },
  infoBox: {
    marginTop: spacing.spaceMd,
    padding: spacing.spaceSm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: spacing.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
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

export default PendingVerificationScreen;
