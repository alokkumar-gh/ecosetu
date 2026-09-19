/**
 * MetricCard — Glassmorphism Edition
 * Props interface unchanged — drop-in replacement.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface MetricCardProps {
  value: number | string;
  label: string;
  icon: string;
  accentColor?: string;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = memo(({
  value,
  label,
  icon,
  accentColor = colors.primary,
  onPress,
}) => {
  const content = (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[styles.iconContainer, {
        backgroundColor: `${accentColor}22`,
        borderColor: `${accentColor}40`,
      }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
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

MetricCard.displayName = 'MetricCard';

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    minWidth: 95,
  },
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceSm + 4,
    alignItems: 'center',
    elevation: 2,
    borderWidth: spacing.glassBorderWidth,
    borderColor: colors.glassBorder,
    minHeight: 110,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceXs,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
});

export default MetricCard;
