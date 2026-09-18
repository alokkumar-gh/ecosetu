import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const OfflineBanner: React.FC = () => {
  const { isConnected, pendingActionsCount } = useNetwork();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>You are currently offline</Text>
        <Text style={styles.subtitle}>
          Actions will be saved locally and synchronized automatically when online.
          {pendingActionsCount > 0 ? ` (${pendingActionsCount} pending)` : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.spaceSm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: '#000000',
  },
  subtitle: {
    fontSize: 11,
    color: '#212121',
    lineHeight: 14,
  },
});

export default OfflineBanner;
