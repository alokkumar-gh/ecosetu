/**
 * GlassLoadingState
 * Centered activity indicator inside a translucent glass card.
 */

import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface GlassLoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export const GlassLoadingState: React.FC<GlassLoadingStateProps> = memo(({
  message = 'Loading...',
  style,
}) => {
  return (
    <GlassCard variant="standard" style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </GlassCard>
  );
});

GlassLoadingState.displayName = 'GlassLoadingState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceXl,
    marginVertical: spacing.spaceMd,
  },
  message: {
    marginTop: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default GlassLoadingState;
