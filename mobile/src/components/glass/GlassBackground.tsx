/**
 * GlassBackground
 * Ambient canvas background for all EcoSetu glass screens.
 * Renders the user-selected high-end environmental wallpaper with an integrated dark scrim.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle, ImageBackground, StatusBar } from 'react-native';
import { colors } from '../../theme/colors';

const BG_IMAGE = require('../../assets/images/ecosetu_bg.png');

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
      <StatusBar barStyle="light-content" backgroundColor="#02080D" translucent={false} />
      <ImageBackground
        source={BG_IMAGE}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.scrimOverlay} pointerEvents="none" />
        <View style={styles.topOrb} pointerEvents="none" />
        <View style={styles.bottomOrb} pointerEvents="none" />
        {children}
      </ImageBackground>
    </View>
  );
});

GlassBackground.displayName = 'GlassBackground';

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
  topOrb: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
});

export default GlassBackground;
