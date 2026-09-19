/**
 * GlassBadge
 * Translucent semantic badge with high-contrast text.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type BadgeTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

interface GlassBadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: string;
  style?: ViewStyle;
}

export const GlassBadge: React.FC<GlassBadgeProps> = memo(({
  label,
  tone = 'default',
  icon,
  style,
}) => {
  const toneStyle = toneStyles[tone] || toneStyles.default;

  return (
    <View style={[styles.badge, toneStyle.badge, style]}>
      {icon ? <Text style={[styles.icon, { color: toneStyle.text.color }]}>{icon}</Text> : null}
      <Text style={[styles.text, toneStyle.text]}>{label}</Text>
    </View>
  );
});

GlassBadge.displayName = 'GlassBadge';

const toneStyles: Record<BadgeTone, { badge: ViewStyle; text: { color: string } }> = {
  default: {
    badge: { backgroundColor: 'rgba(15, 41, 66, 0.08)', borderColor: 'rgba(15, 41, 66, 0.15)' },
    text: { color: colors.textPrimary },
  },
  success: {
    badge: { backgroundColor: 'rgba(5, 150, 105, 0.12)', borderColor: 'rgba(5, 150, 105, 0.25)' },
    text: { color: colors.success },
  },
  warning: {
    badge: { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.25)' },
    text: { color: colors.warning },
  },
  error: {
    badge: { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: 'rgba(220, 38, 38, 0.25)' },
    text: { color: colors.error },
  },
  info: {
    badge: { backgroundColor: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.25)' },
    text: { color: colors.info },
  },
  neutral: {
    badge: { backgroundColor: 'rgba(100, 116, 139, 0.10)', borderColor: 'rgba(100, 116, 139, 0.20)' },
    text: { color: colors.textSecondary },
  },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 11,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default GlassBadge;
