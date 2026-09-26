/**
 * MetricCard — Professional Vector Metric Card
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon, IconName } from '../ui/AppIcon';

interface MetricCardProps {
  value: number | string;
  label: string;
  icon?: IconName | string;
  accentColor?: string;
  delta?: string;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = memo(({
  value,
  label,
  icon = 'chart',
  accentColor = colors.primary,
  delta,
  onPress,
}) => {
  const resolveIcon = (rawIcon?: string): IconName => {
    switch (rawIcon) {
      case 'box':
        return 'box';
      case 'truck':
        return 'truck';
      case 'wallet':
      case 'money':
      case 'rupee':
        return 'rupee';
      case 'chart':
      case 'analytics':
        return 'chart';
      case 'check':
        return 'shieldCheck';
      case 'clock':
        return 'clock';
      case 'user':
        return 'user';
      case 'facility':
        return 'factory';
      case 'recycle':
      default:
        return 'recycle';
    }
  };

  const resolvedIcon: IconName = typeof icon === 'string' ? resolveIcon(icon) : 'chart';

  const content = (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${accentColor}18`,
            borderColor: `${accentColor}35`,
          },
        ]}
      >
        <AppIcon name={resolvedIcon} size={18} color={accentColor} strokeWidth={2} />
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {Boolean(delta) && (
        <View style={styles.deltaWrap}>
          <Text style={[styles.deltaText, { color: accentColor }]}>{delta}</Text>
        </View>
      )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceXs,
  },
  value: {
    fontSize: 20,
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
  deltaWrap: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  deltaText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
});

export default MetricCard;
