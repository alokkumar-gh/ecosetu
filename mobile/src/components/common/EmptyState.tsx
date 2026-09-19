/**
 * EmptyState — Glassmorphism Edition
 * Props interface unchanged.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = memo(({
  icon = '♻',
  title = 'No Activity Yet',
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{icon}</Text>
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

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    padding: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassFill,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.glassBorderWidth,
    borderColor: colors.glassBorder,
    marginVertical: spacing.spaceMd,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentFill,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
  },
  iconText: {
    fontSize: 36,
    color: colors.primary,
  },
  title: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.spaceMd,
    maxWidth: 280,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm + 4,
    borderRadius: spacing.radiusMd,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  actionText: {
    color: colors.textInverse,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default EmptyState;
