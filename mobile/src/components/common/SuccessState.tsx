/**
 * SuccessState — Professional Vector Success Screen / Section
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon } from '../ui/AppIcon';

interface SuccessStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SuccessState: React.FC<SuccessStateProps> = memo(({
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name="shieldCheck" size={32} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {Boolean(actionLabel && onAction) && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

SuccessState.displayName = 'SuccessState';

const styles = StyleSheet.create({
  container: {
    padding: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginVertical: spacing.spaceMd,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
  },
  title: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.spaceMd,
    maxWidth: 290,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm + 4,
    borderRadius: spacing.radiusMd,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: colors.textInverse,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default SuccessState;
