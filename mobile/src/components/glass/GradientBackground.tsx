/**
 * GradientBackground
 *
 * Full-screen dark gradient background wrapper.
 * Renders the user-selected high-end environmental wallpaper with an integrated dark scrim.
 * Wraps SafeAreaView and composes with children.
 */

import React, { memo } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, ImageBackground } from 'react-native';
import { colors } from '../../theme/colors';

const BG_IMAGE = require('../../assets/images/ecosetu_bg.png');

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
      <StatusBar barStyle="light-content" backgroundColor="#02080D" />
      <ImageBackground
        source={BG_IMAGE}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.scrimOverlay} pointerEvents="none" />
        <View style={styles.radialGlowTR} pointerEvents="none" />
        <View style={styles.radialGlowBL} pointerEvents="none" />

        <SafeAreaView style={[styles.safeArea, contentStyle]}>
          {children}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
});

GradientBackground.displayName = 'GradientBackground';

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#02080D',
  },
  flexRoot: {
    flex: 1,
    backgroundColor: '#02080D',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 8, 13, 0.68)',
  },
  safeArea: {
    flex: 1,
  },
  radialGlowTR: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    top: -60,
    right: -80,
  },
  radialGlowBL: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    bottom: 60,
    left: -60,
  },
});

export default GradientBackground;
