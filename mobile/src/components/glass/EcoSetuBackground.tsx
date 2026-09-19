/**
 * EcoSetuBackground
 * Premium atmospheric background system for EcoSetu SaaS Glassmorphism UI.
 * Renders the high-end environmental flowing wallpaper with an integrated dark scrim
 * to guarantee 100% text contrast and legibility across all screens.
 */

import React, { memo } from 'react';
import { View, StyleSheet, StatusBar, ViewStyle, ImageBackground } from 'react-native';
import { colors } from '../../theme/colors';

const BG_IMAGE = require('../../assets/images/ecosetu_bg.png');

interface EcoSetuBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const EcoSetuBackground: React.FC<EcoSetuBackgroundProps> = memo(({
  children,
  style,
  testID = 'ecosetu-background',
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <StatusBar barStyle="light-content" backgroundColor="#02080D" translucent={false} />
      <ImageBackground
        source={BG_IMAGE}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Calibrated dark scrim: leaves & flowing light shine through, but text is 100% crisp and readable */}
        <View style={styles.scrimOverlay} pointerEvents="none" />
        {/* Subtle ambient light accents matching the flowing waves */}
        <View style={styles.ambientTopOrb} pointerEvents="none" />
        <View style={styles.ambientCenterOrb} pointerEvents="none" />
        <View style={styles.ambientBottomOrb} pointerEvents="none" />
        {children}
      </ImageBackground>
    </View>
  );
});

EcoSetuBackground.displayName = 'EcoSetuBackground';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02080D',
    position: 'relative',
    overflow: 'hidden',
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
  ambientTopOrb: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  ambientCenterOrb: {
    position: 'absolute',
    top: '38%',
    left: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  ambientBottomOrb: {
    position: 'absolute',
    bottom: -80,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
});

export default EcoSetuBackground;
