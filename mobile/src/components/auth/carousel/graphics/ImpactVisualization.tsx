import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../../../theme/colors';

interface ImpactVisualizationProps {
  active?: boolean;
}

export const ImpactVisualization: React.FC<ImpactVisualizationProps> = ({ active = true }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // Slow continuous rotation of circular arc ring
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Heartbeat pulse of core
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Satellite float
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();
    floatLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [active, rotateAnim, pulseAnim, floatAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const satY1 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const satY2 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <View style={styles.container}>
      {/* Outer Rotating Dash Ring */}
      <Animated.View style={[styles.outerRing, { transform: [{ rotate: spin }] }]}>
        <View style={styles.ringArc1} />
        <View style={styles.ringArc2} />
        <View style={styles.ringArc3} />
      </Animated.View>

      {/* Central Circular Core */}
      <Animated.View style={[styles.centralCore, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.coreInner}>
          <Text style={styles.coreEmoji}>🌱</Text>
          <Text style={styles.coreText}>CIRCULAR</Text>
          <Text style={styles.coreSubText}>ECONOMY</Text>
        </View>
      </Animated.View>

      {/* Satellite Metric 1: Metal Extraction (Top Left) */}
      <Animated.View style={[styles.satelliteCard, styles.satTopLeft, { transform: [{ translateY: satY1 }] }]}>
        <View style={styles.satIconBubble}>
          <Text style={styles.satEmoji}>💎</Text>
        </View>
        <View>
          <Text style={styles.satTitle}>PRECIOUS METALS</Text>
          <Text style={styles.satDesc}>Gold • Copper • Lithium</Text>
        </View>
      </Animated.View>

      {/* Satellite Metric 2: Landfill Prevention (Bottom Left) */}
      <Animated.View style={[styles.satelliteCard, styles.satBottomLeft, { transform: [{ translateY: satY2 }] }]}>
        <View style={styles.satIconBubble}>
          <Text style={styles.satEmoji}>🛡️</Text>
        </View>
        <View>
          <Text style={styles.satTitle}>ZERO DUMPING</Text>
          <Text style={styles.satDesc}>Non-toxic remediation</Text>
        </View>
      </Animated.View>

      {/* Satellite Metric 3: Carbon Reduction (Top Right) */}
      <Animated.View style={[styles.satelliteCard, styles.satTopRight, { transform: [{ translateY: satY2 }] }]}>
        <View style={styles.satIconBubble}>
          <Text style={styles.satEmoji}>☁️</Text>
        </View>
        <View>
          <Text style={styles.satTitle}>CO₂ REDUCTION</Text>
          <Text style={styles.satDesc}>Traceable offset audit</Text>
        </View>
      </Animated.View>

      {/* Satellite Metric 4: Formal Channeling (Bottom Right) */}
      <Animated.View style={[styles.satelliteCard, styles.satBottomRight, { transform: [{ translateY: satY1 }] }]}>
        <View style={styles.satIconBubble}>
          <Text style={styles.satEmoji}>🤝</Text>
        </View>
        <View>
          <Text style={styles.satTitle}>FAIR LIVELIHOOD</Text>
          <Text style={styles.satDesc}>Empowering collectors</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ringArc1: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.carousel.accentEmerald,
    marginTop: -5,
  },
  ringArc2: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.carousel.accentCyan,
    marginBottom: -4,
  },
  ringArc3: {
    position: 'absolute',
    left: -4,
    top: 80,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.carousel.accentTeal,
  },
  centralCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(8, 37, 42, 0.95)',
    borderWidth: 2,
    borderColor: colors.carousel.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 5,
  },
  coreInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  coreText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.carousel.textHero,
    letterSpacing: 0.8,
  },
  coreSubText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: colors.carousel.accentCyan,
    letterSpacing: 0.5,
  },
  satelliteCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 7,
    gap: 6,
    zIndex: 10,
  },
  satIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  satEmoji: {
    fontSize: 12,
  },
  satTitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.carousel.textHero,
    letterSpacing: 0.4,
  },
  satDesc: {
    fontSize: 7,
    color: colors.carousel.textMicro,
  },
  satTopLeft: {
    left: 4,
    top: 15,
  },
  satBottomLeft: {
    left: 4,
    bottom: 15,
  },
  satTopRight: {
    right: 4,
    top: 15,
  },
  satBottomRight: {
    right: 4,
    bottom: 15,
  },
});
