/**
 * EcoStatus — Semantic Status Indicator Pill
 * Reusable dark-glass status primitive with high-contrast text and luminous indicators.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type EcoStatusType =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'PROCESSING'
  | 'PENDING';

interface EcoStatusProps {
  status: string;
  label?: string;
  style?: ViewStyle;
}

export const EcoStatus: React.FC<EcoStatusProps> = memo(({
  status,
  label,
  style,
}) => {
  const normStatus = (status || 'PENDING').toUpperCase();
  const displayLabel = label || normStatus.replace(/_/g, ' ');

  let bg = 'rgba(255, 255, 255, 0.08)';
  let border = 'rgba(255, 255, 255, 0.18)';
  let text: string = colors.textPrimary;
  let dot: string = colors.textSecondary;

  if (['COMPLETED', 'DELIVERED', 'RECEIVED', 'ACCEPTED'].includes(normStatus)) {
    bg = 'rgba(16, 185, 129, 0.16)';
    border = 'rgba(16, 185, 129, 0.40)';
    text = '#A7F3D0';
    dot = '#34D399';
  } else if (['IN_PROGRESS', 'IN_TRANSIT', 'PROCESSING', 'SCHEDULED'].includes(normStatus)) {
    bg = 'rgba(6, 182, 212, 0.16)';
    border = 'rgba(6, 182, 212, 0.40)';
    text = '#A5F3FC';
    dot = '#22D3EE';
  } else if (['SUBMITTED', 'PENDING'].includes(normStatus)) {
    bg = 'rgba(245, 158, 11, 0.16)';
    border = 'rgba(245, 158, 11, 0.40)';
    text = '#FDE68A';
    dot = '#F59E0B';
  } else if (['CANCELLED', 'REJECTED'].includes(normStatus)) {
    bg = 'rgba(239, 68, 68, 0.16)';
    border = 'rgba(239, 68, 68, 0.40)';
    text = '#FCA5A5';
    dot = '#EF4444';
  }

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }, style]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.text, { color: text }]}>{displayLabel}</Text>
    </View>
  );
});

EcoStatus.displayName = 'EcoStatus';

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default EcoStatus;
