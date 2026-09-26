/**
 * EcoSetu Official Brand Logo Component
 * Canonical Reference: mobile/src/assets/images/logo.png
 * Renders the official high-resolution circular EcoSetu emblem
 * with optional breathing glow, badge border, and customizable dimensions.
 */

import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';

export const OFFICIAL_ECOSETU_LOGO = require('../../assets/images/logo.png');

export interface EcoSetuLogoProps {
  size?: number;
  showGlow?: boolean;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

export const EcoSetuLogo: React.FC<EcoSetuLogoProps> = ({
  size = 48,
  showGlow = false,
  bordered = true,
  style,
  imageStyle,
  accessibilityLabel = 'ECOSETU Logo',
}) => {
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
        },
        bordered && styles.bordered,
        showGlow && styles.glow,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={OFFICIAL_ECOSETU_LOGO}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
          },
          imageStyle,
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#071E22',
  },
  bordered: {
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  glow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default EcoSetuLogo;
