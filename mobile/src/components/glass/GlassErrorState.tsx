/**
 * GlassErrorState
 * Translucent error card with warning icon, message, and retry button.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface GlassErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const GlassErrorState: React.FC<GlassErrorStateProps> = memo(({
  title = 'Unable to Load Data',
  message,
  onRetry,
  retryLabel = 'Retry',
  style,
}) => {
  return (
    <GlassCard variant="standard" style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>⚠</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <GlassButton
          label={retryLabel}
          onPress={onRetry}
          variant="danger"
          style={styles.button}
        />
      ) : null}
    </GlassCard>
  );
});

GlassErrorState.displayName = 'GlassErrorState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.spaceLg,
    marginVertical: spacing.spaceMd,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 38, 38, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  iconText: {
    fontSize: 22,
    color: colors.error,
  },
  title: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
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

export default GlassErrorState;
