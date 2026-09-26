/**
 * GlassEmptyState
 * Translucent empty state container with icon, title, description, and action button.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

import { AppIcon, IconName } from '../ui/AppIcon';

interface GlassEmptyStateProps {
  icon?: IconName | string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const GlassEmptyState: React.FC<GlassEmptyStateProps> = memo(({
  icon = 'box',
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  const iconName: IconName = typeof icon === 'string' && icon.length > 0 ? (icon as IconName) : 'box';

  return (
    <GlassCard variant="standard" style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <AppIcon name={iconName} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <GlassButton
          label={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.button}
        />
      ) : null}
    </GlassCard>
  );
});

GlassEmptyState.displayName = 'GlassEmptyState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.spaceLg,
    marginVertical: spacing.spaceMd,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 41, 66, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.spaceMd,
  },
  button: {
    marginTop: spacing.spaceXs,
  },
});

export default GlassEmptyState;
