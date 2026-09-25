/**
 * EcoSetu Premium Onboarding Background
 *
 * Renders a deep atmospheric canvas with:
 *  - Animated liquid radial glow pools that shift color per slide
 *  - Subtle grid mesh overlay
 *  - Floating particle orbs (GPU-safe opacity/scale only)
 *
 * All transforms are GPU-friendly (opacity, scale, translate).
 * No SVG, no third-party animation libraries.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { OnboardingSlide } from './data/slideData';

interface OnboardingBackgroundProps {
  slide: OnboardingSlide;
  /** 0..1 interpolation factor between this slide and the next */
  transitionProgress?: Animated.Value;
}

export const OnboardingBackground: React.FC<OnboardingBackgroundProps> = ({ slide }) => {
  const { width, height } = useWindowDimensions();

  // Breathing glow animation
  const breathAnim = useRef(new Animated.Value(0)).current;
  // Slow drift for particle orbs
  const drift1 = useRef(new Animated.Value(0)).current;
  const drift2 = useRef(new Animated.Value(0)).current;
  const drift3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Perpetual breathing pulse
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Particle drift loops (slow, subtle Y translations)
    const d1 = Animated.loop(
      Animated.sequence([
        Animated.timing(drift1, {
          toValue: 1,
          duration: 6800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift1, {
          toValue: 0,
          duration: 6800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const d2 = Animated.loop(
      Animated.sequence([
        Animated.timing(drift2, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift2, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const d3 = Animated.loop(
      Animated.sequence([
        Animated.timing(drift3, {
          toValue: 1,
          duration: 11500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift3, {
          toValue: 0,
          duration: 11500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    breath.start();
    d1.start();
    d2.start();
    d3.start();

    return () => {
      breath.stop();
      d1.stop();
      d2.stop();
      d3.stop();
    };
  }, [breathAnim, drift1, drift2, drift3]);

  const breathScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  const breathOpacity = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const orb1Y = drift1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const orb2Y = drift2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });
  const orb3Y = drift3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  const glowSize = Math.max(width, height) * 0.72;
  const glow2Size = Math.max(width, height) * 0.55;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base dark canvas */}
      <View style={[StyleSheet.absoluteFill, styles.base]} />

      {/* Primary glow pool — top-left, slide-tinted */}
      <Animated.View
        style={[
          styles.glowOrb,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            top: -glowSize * 0.35,
            left: -glowSize * 0.30,
            backgroundColor: slide.glowColor,
            transform: [{ scale: breathScale }],
            opacity: breathOpacity,
          },
        ]}
      />

      {/* Secondary glow pool — bottom-right, slide-tinted */}
      <Animated.View
        style={[
          styles.glowOrb,
          {
            width: glow2Size,
            height: glow2Size,
            borderRadius: glow2Size / 2,
            bottom: -glow2Size * 0.30,
            right: -glow2Size * 0.25,
            backgroundColor: slide.glowColor2,
            transform: [{ translateY: orb2Y }],
            opacity: 0.85,
          },
        ]}
      />

      {/* Floating micro orb 1 */}
      <Animated.View
        style={[
          styles.microOrb,
          {
            width: 90,
            height: 90,
            borderRadius: 45,
            top: '22%',
            left: '75%',
            backgroundColor: slide.glowColor,
            transform: [{ translateY: orb1Y }],
            opacity: 0.35,
          },
        ]}
      />

      {/* Floating micro orb 2 */}
      <Animated.View
        style={[
          styles.microOrb,
          {
            width: 60,
            height: 60,
            borderRadius: 30,
            top: '58%',
            left: '8%',
            backgroundColor: slide.glowColor2,
            transform: [{ translateY: orb3Y }],
            opacity: 0.28,
          },
        ]}
      />

      {/* Subtle horizontal rule lines */}
      <View style={[styles.ruleLine, { top: '33%' }]} />
      <View style={[styles.ruleLine, { top: '66%' }]} />

      {/* Vignette overlay — bottom fade to keep text readable */}
      <View style={styles.vignetteBottom} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#020C14',
  },
  glowOrb: {
    position: 'absolute',
  },
  microOrb: {
    position: 'absolute',
  },
  ruleLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 280,
    backgroundColor: 'rgba(2, 12, 20, 0.65)',
  },
});
