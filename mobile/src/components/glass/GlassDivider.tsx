/**
 * GlassDivider
 * Subtle translucent divider line for section separation.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface GlassDividerProps {
  style?: ViewStyle;
}

export const GlassDivider: React.FC<GlassDividerProps> = memo(({ style }) => {
  return <View style={[styles.divider, style]} />;
});

GlassDivider.displayName = 'GlassDivider';

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.85)',
    marginVertical: 12,
    width: '100%',
  },
});

export default GlassDivider;
