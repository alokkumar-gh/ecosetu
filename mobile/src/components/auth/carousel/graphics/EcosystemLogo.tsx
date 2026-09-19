import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../../../theme/colors';

interface EcosystemLogoProps {
  active?: boolean;
}

export const EcosystemLogo: React.FC<EcosystemLogoProps> = ({ active = true }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ripple1Anim = useRef(new Animated.Value(0)).current;
  const ripple2Anim = useRef(new Animated.Value(0)).current;
  const convergeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // Center logo breathing pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Ripple 1
    const ripple1Loop = Animated.loop(
      Animated.timing(ripple1Anim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    // Ripple 2 (staggered)
    const ripple2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(ripple2Anim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Converging dots loop
    const convergeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(convergeAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(convergeAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    ripple1Loop.start();
    ripple2Loop.start();
    convergeLoop.start();

    return () => {
      pulseLoop.stop();
      ripple1Loop.stop();
      ripple2Loop.stop();
      convergeLoop.stop();
    };
  }, [active, pulseAnim, ripple1Anim, ripple2Anim, convergeAnim]);

  const ripple1Scale = ripple1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.9],
  });
  const ripple1Opacity = ripple1Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.3, 0],
  });

  const ripple2Scale = ripple2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.9],
  });
  const ripple2Opacity = ripple2Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.3, 0],
  });

  // Converging distances
  const convergeD = convergeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [45, 0],
  });

  return (
    <View style={styles.container}>
      {/* Expanding Ripple 1 */}
      <Animated.View
        style={[
          styles.rippleCircle,
          {
            transform: [{ scale: ripple1Scale }],
            opacity: ripple1Opacity,
          },
        ]}
      />

      {/* Expanding Ripple 2 */}
      <Animated.View
        style={[
          styles.rippleCircle,
          {
            transform: [{ scale: ripple2Scale }],
            opacity: ripple2Opacity,
          },
        ]}
      />

      {/* Converging Satellite Particles (Top, Bottom, Left, Right) */}
      <Animated.View style={[styles.convergeDot, { top: 25, transform: [{ translateY: convergeD }] }]} />
      <Animated.View
        style={[
          styles.convergeDot,
          { bottom: 25, transform: [{ translateY: Animated.multiply(convergeD, -1) }] },
        ]}
      />
      <Animated.View style={[styles.convergeDot, { left: 25, transform: [{ translateX: convergeD }] }]} />
      <Animated.View
        style={[
          styles.convergeDot,
          { right: 25, transform: [{ translateX: Animated.multiply(convergeD, -1) }] },
        ]}
      />

      {/* Central Majestic ECOSETU Emblem */}
      <Animated.View style={[styles.emblemContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.emblemGlass}>
          <View style={styles.emblemIconCircle}>
            <Text style={styles.emblemEmoji}>🌱</Text>
          </View>
          <Text style={styles.brandTitle}>ECOSETU</Text>
          <View style={styles.brandTagline}>
            <View style={styles.taglineLine} />
            <Text style={styles.taglineText}>BRIDGE THE GAP</Text>
            <View style={styles.taglineLine} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rippleCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: colors.carousel.accentEmerald,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  convergeDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.carousel.accentCyan,
    shadowColor: colors.carousel.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  emblemGlass: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(8, 37, 42, 0.95)',
    borderWidth: 2,
    borderColor: colors.carousel.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  emblemIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1.5,
    borderColor: colors.carousel.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emblemEmoji: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.carousel.textHero,
    letterSpacing: 2,
  },
  brandTagline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  taglineLine: {
    width: 12,
    height: 1,
    backgroundColor: colors.carousel.accentCyan,
  },
  taglineText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: colors.carousel.accentCyan,
    letterSpacing: 1.2,
  },
});
