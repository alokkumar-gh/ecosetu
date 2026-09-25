/**
 * EcoSuccessAnimation — Animated checkmark success state.
 *
 * Use after OTP verified, account created, password reset, etc.
 * A circular ring animates in, then a checkmark draws, then a particle burst.
 * Auto-calls onComplete after ~900ms.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AUTH_COLORS } from './AuthTheme';

interface Props {
  title: string;
  subtitle?: string;
  onComplete?: () => void;
  delay?: number;
}

export const EcoSuccessAnimation: React.FC<Props> = ({
  title,
  subtitle,
  onComplete,
  delay = 900,
}) => {
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Particle positions
  const PARTICLE_COUNT = 6;
  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Ring scales in
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // 2. Checkmark pops in
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      // 3. Glow pulse + particles
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ...particleAnims.map((p, i) => {
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
          const dist = 48 + Math.random() * 20;
          return Animated.parallel([
            Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(p.x, {
              toValue: Math.cos(angle) * dist,
              duration: 450,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.y, {
              toValue: Math.sin(angle) * dist,
              duration: 450,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(300),
              Animated.timing(p.opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]),
          ]);
        }),
      ]),
      // 4. Text fade in
      Animated.timing(textOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      if (onComplete) {
        setTimeout(onComplete, delay);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      {/* Glow halo */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      {/* Particles */}
      {particleAnims.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }],
            },
          ]}
        />
      ))}

      {/* Ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      >
        {/* Checkmark */}
        <Animated.Text
          style={[
            styles.check,
            { transform: [{ scale: checkScale }] },
          ]}
        >
          ✓
        </Animated.Text>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    borderColor: AUTH_COLORS.primaryLight,
    backgroundColor: AUTH_COLORS.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  check: {
    fontSize: 40,
    color: AUTH_COLORS.primaryLight,
    fontWeight: '900',
    lineHeight: 48,
  },
  particle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: AUTH_COLORS.primaryLight,
  },
  textBlock: {
    marginTop: 24,
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AUTH_COLORS.textPrimary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
