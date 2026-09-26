/**
 * ErrorState — Professional Vector Error Screen / Section
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon } from '../ui/AppIcon';

interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = memo(({
  title = 'Something Went Wrong',
  message,
  retryLabel = 'Try Again',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name="alert" size={30} color={colors.error} strokeWidth={2} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {Boolean(onRetry) && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          activeOpacity={0.8}
        >
          <AppIcon name="refresh" size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

ErrorState.displayName = 'ErrorState';

const styles = StyleSheet.create({
  container: {
    padding: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginVertical: spacing.spaceMd,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
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
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm + 4,
    borderRadius: spacing.radiusMd,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.textInverse,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ErrorState;
