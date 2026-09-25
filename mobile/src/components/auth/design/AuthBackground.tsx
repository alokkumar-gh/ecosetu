/**
 * AuthBackground — Unified atmospheric background for all pre-auth screens.
 *
 * Wraps the existing EcoSetuBackground with:
 * - Configurable orb placement per screen
 * - Subtle breathing animation on orbs
 * - Zero performance cost (static + single opacity loop)
 */

import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { EcoSetuBackground } from '../../glass/EcoSetuBackground';
import { OrbConfig } from './AuthTheme';

interface Props {
  children: React.ReactNode;
  orbs?: OrbConfig[];
}

const BreathingOrb: React.FC<{ orb: OrbConfig; delay?: number }> = ({ orb, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          top: orb.top as any,
          bottom: orb.bottom as any,
          left: orb.left as any,
          right: orb.right as any,
          width: orb.width,
          height: orb.height,
          borderRadius: orb.width / 2,
          backgroundColor: orb.color,
          opacity,
        },
      ]}
      pointerEvents="none"
    />
  );
};

export const AuthBackground: React.FC<Props> = memo(({ children, orbs = [] }) => {
  return (
    <EcoSetuBackground>
      {orbs.map((orb, i) => (
        <BreathingOrb key={i} orb={orb} delay={i * 1200} />
      ))}
      {children}
    </EcoSetuBackground>
  );
});

AuthBackground.displayName = 'AuthBackground';

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
