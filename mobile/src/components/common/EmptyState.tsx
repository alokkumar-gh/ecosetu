/**
 * EmptyState — Professional Vector Edition
 *
 * Fully replaces emoji-based empty states with clean vector icons,
 * structured typography, and clear call-to-action triggers.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon, IconName } from '../ui/AppIcon';

interface EmptyStateProps {
  icon?: IconName | string;
  title?: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = memo(({
  icon = 'recycle',
  title = 'No Activity Yet',
  message,
  description,
  actionLabel,
  onAction,
}) => {
  const displayMessage = message || description || 'No items available.';
  // Map icon strings to AppIcon names
  const resolveIconName = (rawIcon?: string): IconName => {
    switch (rawIcon) {
      case 'box':
        return 'box';
      case 'truck':
        return 'truck';
      case 'requests':
      case 'clipboard':
        return 'clipboard';
      case 'search':
        return 'search';
      case 'wallet':
        return 'wallet';
      case 'factory':
        return 'factory';
      case 'document':
        return 'document';
      case 'bell':
        return 'bell';
      case 'shield':
        return 'shield';
      case 'recycle':
      default:
        return 'recycle';
    }
  };

  const resolvedIcon: IconName = typeof icon === 'string' ? resolveIconName(icon) : 'recycle';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name={resolvedIcon} size={32} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{displayMessage}</Text>
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentFill,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
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
