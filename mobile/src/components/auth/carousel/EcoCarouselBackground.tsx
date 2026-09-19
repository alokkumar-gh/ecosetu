import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';

export const EcoCarouselBackground: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Base Canvas */}
      <View style={styles.baseColor} />

      {/* Radial Emerald Glow Pool Top-Left */}
      <View style={styles.glowTopLeft} />

      {/* Radial Cyan Glow Pool Bottom-Right */}
      <View style={styles.glowBottomRight} />

      {/* Deep Navy Atmosphere Pool Center */}
      <View style={styles.glowCenter} />

      {/* Ambient Grid overlay */}
      <View style={styles.ambientOverlay}>
        <View style={[styles.ambientLine, { top: '25%' }]} />
        <View style={[styles.ambientLine, { top: '50%' }]} />
        <View style={[styles.ambientLine, { top: '75%' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  baseColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.carousel.bgDeep,
  },
  glowTopLeft: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(6, 182, 212, 0.10)',
  },
  glowCenter: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(15, 41, 66, 0.45)',
  },
  ambientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  ambientLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
});
