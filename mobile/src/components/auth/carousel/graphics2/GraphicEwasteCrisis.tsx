/**
 * Slide 1 Graphic — The E-Waste Crisis
 *
 * Renders a floating pile of glowing e-waste device silhouettes
 * with a "crack" fracture effect and pulsing danger ring.
 * GPU-safe: only opacity, scale, translateY transforms.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface Props {
  active: boolean;
}

const DEVICES = [
  { icon: '📱', x: 70, y: 20, size: 40 },
  { icon: '💻', x: 130, y: 50, size: 48 },
  { icon: '🖥️', x: 40, y: 80, size: 44 },
  { icon: '🖨️', x: 190, y: 30, size: 38 },
  { icon: '📺', x: 155, y: 95, size: 40 },
  { icon: '🔋', x: 90, y: 115, size: 34 },
];

export const GraphicEwasteCrisis: React.FC<Props> = ({ active }) => {
  const dangerRing = useRef(new Animated.Value(1)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const floatAnims = DEVICES.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    if (!active) return;

    // Pulsing danger ring
    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(dangerRing, {
          toValue: 1.25,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dangerRing, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Slight tilt wobble
    const wob = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Individual device float
    const floats = floatAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2800 + i * 420,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2800 + i * 420,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );

    ring.start();
    wob.start();
    floats.forEach(f => f.start());

    return () => {
      ring.stop();
      wob.stop();
      floats.forEach(f => f.stop());
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const wobbleRotate = wobble.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'],
  });

  return (
    <View style={styles.container}>
      {/* Danger ring */}
      <Animated.View
        style={[
          styles.dangerRing,
          { transform: [{ scale: dangerRing }] },
        ]}
      />
      <Animated.View
        style={[
          styles.dangerRingInner,
          { transform: [{ scale: dangerRing }], opacity: 0.45 },
        ]}
      />

      {/* Device pile */}
      <Animated.View
        style={[
          styles.devicePile,
          { transform: [{ rotate: wobbleRotate }] },
        ]}
      >
        {DEVICES.map((d, i) => {
          const floatY = floatAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0, -6 - (i % 3) * 3],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.deviceItem,
                {
                  position: 'absolute',
                  left: d.x,
                  top: d.y,
                  transform: [{ translateY: floatY }],
                },
              ]}
            >
              <View
                style={[
                  styles.deviceBubble,
                  { width: d.size, height: d.size, borderRadius: d.size * 0.25 },
                ]}
              >
                <Text style={{ fontSize: d.size * 0.5 }}>{d.icon}</Text>
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Warning badge */}
      <View style={styles.warningBadge}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>UNTRACKED</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderStyle: 'dashed',
  },
  dangerRingInner: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 78,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  devicePile: {
    width: 250,
    height: 175,
    position: 'relative',
  },
  deviceItem: {
    zIndex: 2,
  },
  deviceBubble: {
    backgroundColor: 'rgba(10, 30, 40, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBadge: {
    position: 'absolute',
    bottom: 4,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  warningIcon: {
    fontSize: 11,
  },
  warningText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 1,
  },
});
