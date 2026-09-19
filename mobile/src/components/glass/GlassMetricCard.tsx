/**
 * GlassMetricCard
 *
 * Drop-in glassmorphism replacement for MetricCard.
 * Identical props interface — swap MetricCard → GlassMetricCard in any screen.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface GlassMetricCardProps {
  value: number | string;
  label: string;
  icon: string;
  accentColor?: string;
  onPress?: () => void;
}

export const GlassMetricCard: React.FC<GlassMetricCardProps> = memo(({
  value,
  label,
  icon,
  accentColor = colors.primary,
  onPress,
}) => {
  const iconBg = `${accentColor}22`;

  const content = (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      {/* Icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg, borderColor: `${accentColor}40` }]}>
        <Text style={[styles.iconText]}>{icon}</Text>
      </View>

      {/* Metric value */}
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>

      {/* Label */}
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Tap to view.`}
        style={styles.touchable}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{content}</View>;
});

GlassMetricCard.displayName = 'GlassMetricCard';

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    minWidth: 95,
  },
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.glassBorderWidth,
    borderColor: colors.glassBorder,
    padding: spacing.spaceMd,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceXs,
  },
  iconText: {
    fontSize: 20,
  },
  value: {
    fontSize: 26,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
});

export default GlassMetricCard;
