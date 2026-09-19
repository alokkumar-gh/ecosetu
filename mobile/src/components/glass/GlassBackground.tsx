/**
 * GlassBackground
 * Ambient canvas background for all EcoSetu glass screens.
 * Features subtle off-white multi-tone ambient lighting and soft radial glow layers.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface GlassBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const GlassBackground: React.FC<GlassBackgroundProps> = memo(({
  children,
  style,
  testID = 'glass-background',
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.topOrb} pointerEvents="none" />
      <View style={styles.bottomOrb} pointerEvents="none" />
      {children}
    </View>
  );
});

GlassBackground.displayName = 'GlassBackground';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
    position: 'relative',
    overflow: 'hidden',
  },
  topOrb: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(5, 150, 105, 0.04)',
  },
});

export default GlassBackground;
