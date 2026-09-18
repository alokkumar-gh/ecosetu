import React from 'react';
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

export const MetricCard: React.FC<MetricCardProps> = ({
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
      <View style={[styles.iconContainer, { backgroundColor: `${accentColor}15` }]}>
        <Text style={[styles.icon, { color: accentColor }]}>{icon}</Text>
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
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    minWidth: 95,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceSm + 2,
    alignItems: 'center',
    elevation: spacing.cardElevation,
    borderWidth: 1,
    borderColor: colors.divider,
    minHeight: 110,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceXs,
  },
  icon: {
    fontSize: 18,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
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

export default MetricCard;
