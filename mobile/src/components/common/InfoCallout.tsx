/**
 * InfoCallout — Professional Information & Notice Banner
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { AppIcon } from '../ui/AppIcon';

interface InfoCalloutProps {
  title?: string;
  message: string;
  variant?: 'info' | 'warning' | 'success';
  style?: ViewStyle;
}

export const InfoCallout: React.FC<InfoCalloutProps> = memo(({
  title,
  message,
  variant = 'info',
  style,
}) => {
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const accentColor = isWarning
    ? colors.warning
    : isSuccess
    ? colors.primary
    : colors.info;

  const bg = isWarning
    ? 'rgba(245, 158, 11, 0.08)'
    : isSuccess
    ? 'rgba(16, 185, 129, 0.08)'
    : 'rgba(6, 182, 212, 0.08)';

  const border = isWarning
    ? 'rgba(245, 158, 11, 0.25)'
    : isSuccess
    ? 'rgba(16, 185, 129, 0.25)'
    : 'rgba(6, 182, 212, 0.25)';

  const iconName = isWarning ? 'alert' : isSuccess ? 'checkCircle' : 'info';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }, style]}>
      <View style={styles.iconWrap}>
        <AppIcon name={iconName} size={18} color={accentColor} strokeWidth={2} />
      </View>
      <View style={styles.content}>
        {Boolean(title) && <Text style={[styles.title, { color: accentColor }]}>{title}</Text>}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
});

InfoCallout.displayName = 'InfoCallout';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.spaceMd,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    marginVertical: spacing.spaceSm,
    gap: spacing.spaceSm,
  },
  iconWrap: {
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default InfoCallout;
