/**
 * GradientBackground
 *
 * Full-screen dark gradient background wrapper.
 * Uses layered Views to simulate a multi-stop gradient — no external dep.
 * Wraps SafeAreaView and composes with children.
 */

import React, { memo } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { colors } from '../../theme/colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
  /** Use 'screen' to fill entire screen, 'flex' to just flex-fill */
  mode?: 'screen' | 'flex';
  /** Override inner SafeAreaView padding style */
  contentStyle?: object;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = memo(({
  children,
  mode = 'screen',
  contentStyle,
}) => {
  const outerStyle = mode === 'screen' ? styles.screenRoot : styles.flexRoot;
  return (
    <View style={outerStyle}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      {/* Layer 1 — soft canvas base */}
      <View style={styles.gradBase} />
      {/* Layer 2 — subtle ambient tint */}
      <View style={styles.gradMid} />
      {/* Layer 3 — subtle top tint */}
      <View style={styles.gradTop} />
      {/* Ambient subtle glow — top-right navy tint */}
      <View style={styles.radialGlowTR} />
      {/* Ambient subtle glow — bottom-left eco green tint */}
      <View style={styles.radialGlowBL} />

      <SafeAreaView style={[styles.safeArea, contentStyle]}>
        {children}
      </SafeAreaView>
    </View>
  );
});

GradientBackground.displayName = 'GradientBackground';

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  gradBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
  gradMid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '25%',
    bottom: 0,
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  gradTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '60%',
    bottom: 0,
    backgroundColor: '#E2E8F0',
    opacity: 0.25,
  },
  radialGlowTR: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(15, 41, 66, 0.02)',
    top: -60,
    right: -80,
  },
  radialGlowBL: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(5, 150, 105, 0.03)',
    bottom: 60,
    left: -60,
  },
});

export default GradientBackground;
