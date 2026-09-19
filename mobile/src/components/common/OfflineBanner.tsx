/**
 * OfflineBanner — Glassmorphism Edition
 * All logic unchanged. Visual updated for dark theme.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const OfflineBanner: React.FC = memo(() => {
  const { isConnected, pendingActionsCount } = useNetwork();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.icon}>⚡</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Offline Mode</Text>
        <Text style={styles.subtitle}>
          Actions saved locally — syncing when online.
          {pendingActionsCount > 0 ? ` (${pendingActionsCount} pending)` : ''}
        </Text>
      </View>
    </View>
  );
});

OfflineBanner.displayName = 'OfflineBanner';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningFill,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '50',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.spaceSm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
    marginTop: 1,
  },
});

export default OfflineBanner;
