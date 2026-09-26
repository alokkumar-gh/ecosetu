/**
 * Slide 5 Graphic — Join the Mission / Impact
 *
 * A glowing Earth/India map impression with:
 * - Growing tree icons erupting from ground
 * - Spinning circular arrow (circular economy symbol)
 * - Coin/reward burst particles
 * - CO2 counter ticking up
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AppIcon, IconName } from '../../../ui/AppIcon';

interface Props {
  active: boolean;
}

const LEAF_ICONS: IconName[] = ['leaf', 'sparkles', 'recycle', 'leaf', 'award'];

export const GraphicImpact: React.FC<Props> = ({ active }) => {
  const ringRotate = useRef(new Animated.Value(0)).current;
  const leafAnims = useRef(LEAF_ICONS.map(() => new Animated.Value(0))).current;
  const coinBurst = useRef(new Animated.Value(0)).current;
  const globeGlow = useRef(new Animated.Value(0.7)).current;
  const counterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // Spinning circular arrow
    const ring = Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Leaves growing sequentially
    const leafSeq = LEAF_ICONS.map((_, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 350),
          Animated.spring(leafAnims[i], {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.delay(2200),
          Animated.timing(leafAnims[i], {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ])
      )
    );

    // Coin burst cycle
    const coins = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(coinBurst, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(coinBurst, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    );

    // Globe glow breathing
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(globeGlow, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(globeGlow, {
          toValue: 0.6,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    ring.start();
    leafSeq.forEach(a => a.start());
    coins.start();
    glow.start();

    return () => {
      ring.stop();
      leafSeq.forEach(a => a.stop());
      coins.stop();
      glow.stop();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotateDeg = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const LEAF_POSITIONS = [
    { x: 28, y: 70 },
    { x: 68, y: 52 },
    { x: 108, y: 62 },
    { x: 148, y: 50 },
    { x: 188, y: 72 },
  ];

  return (
    <View style={styles.container}>
      {/* Central globe glow */}
      <Animated.View style={[styles.globeGlow, { opacity: globeGlow }]} />

      {/* Globe */}
      <View style={styles.globeWrap}>
        <AppIcon name="globe" size={68} color="#10B981" />

        {/* Spinning circular arrow ring */}
        <Animated.View
          style={[
            styles.ringOuter,
            { transform: [{ rotate: rotateDeg }] },
          ]}
        >
          <View style={styles.ringDot} />
        </Animated.View>
      </View>

      {/* Ground line */}
      <View style={styles.ground} />

      {/* Growing leaves */}
      {LEAF_ICONS.map((icon, i) => (
        <Animated.View
          key={i}
          style={[
            styles.leafWrap,
            {
              left: LEAF_POSITIONS[i].x,
              top: LEAF_POSITIONS[i].y,
              opacity: leafAnims[i],
              transform: [
                {
                  scale: leafAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 1],
                  }),
                },
                {
                  translateY: leafAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <AppIcon name={icon} size={18} color="#34D399" />
        </Animated.View>
      ))}

      {/* Coin burst badge */}
      <Animated.View
        style={[
          styles.coinBadge,
          {
            opacity: coinBurst,
            transform: [{ scale: coinBurst }],
          },
        ]}
      >
        <AppIcon name="award" size={14} color="#FBBF24" />
        <Text style={styles.coinText}>+₹500</Text>
      </Animated.View>

      {/* CO2 Saved label */}
      <View style={styles.co2Badge}>
        <AppIcon name="leaf" size={12} color="#10B981" />
        <Text style={styles.co2Text}>CO₂ Saved</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  globeGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    top: 28,
    alignSelf: 'center',
  },
  globeWrap: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeEmoji: {
    fontSize: 72,
  },
  ringOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.40)',
    borderStyle: 'dashed',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  ringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginLeft: -4,
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  ground: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 52,
    height: 2,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
    borderRadius: 1,
  },
  leafWrap: {
    position: 'absolute',
  },
  leafIcon: {
    fontSize: 22,
  },
  coinBadge: {
    position: 'absolute',
    right: 8,
    top: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  coinIcon: { fontSize: 14 },
  coinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  co2Badge: {
    position: 'absolute',
    left: 8,
    top: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 4,
  },
  co2Icon: { fontSize: 12 },
  co2Text: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6EE7B7',
  },
});
