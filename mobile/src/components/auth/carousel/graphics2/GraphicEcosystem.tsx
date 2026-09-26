/**
 * Slide 2 Graphic — One Connected Ecosystem
 *
 * Renders a premium network topology: Citizen → Collector → Recycler
 * with animated data packets traveling along glowing paths.
 * A central emerald hub pulses, surrounded by satellite nodes.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AppIcon, IconName } from '../../../ui/AppIcon';

interface Props {
  active: boolean;
}

const NODES: { icon: IconName; label: string; x: number; y: number; color: string; isHub?: boolean }[] = [
  { icon: 'user', label: 'CITIZEN', x: 8, y: 10, color: '#10B981' },
  { icon: 'users', label: 'COMMUNITY', x: 165, y: 10, color: '#10B981' },
  { icon: 'truck', label: 'COLLECTOR', x: 88, y: 85, color: '#34D399', isHub: true },
  { icon: 'refresh', label: 'RECYCLER', x: 14, y: 155, color: '#06B6D4' },
  { icon: 'recycle', label: 'CIRCULAR', x: 168, y: 155, color: '#06B6D4' },
];

export const GraphicEcosystem: React.FC<Props> = ({ active }) => {
  const hubPulse = useRef(new Animated.Value(1)).current;
  const packet1 = useRef(new Animated.Value(0)).current;
  const packet2 = useRef(new Animated.Value(0)).current;
  const packet3 = useRef(new Animated.Value(0)).current;
  const linkGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const hub = Animated.loop(
      Animated.sequence([
        Animated.timing(hubPulse, {
          toValue: 1.22,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(hubPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const p1 = Animated.loop(
      Animated.timing(packet1, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const p2 = Animated.loop(
      Animated.timing(packet2, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const p3 = Animated.loop(
      Animated.timing(packet3, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(linkGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(linkGlow, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    hub.start();
    p1.start();
    p2.start();
    p3.start();
    glow.start();

    return () => {
      hub.stop();
      p1.stop();
      p2.stop();
      p3.stop();
      glow.stop();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Packet 1: citizen → hub (top-left to center)
  const p1x = packet1.interpolate({ inputRange: [0, 1], outputRange: [22, 100] });
  const p1y = packet1.interpolate({ inputRange: [0, 1], outputRange: [24, 100] });

  // Packet 2: community → hub (top-right to center)
  const p2x = packet2.interpolate({ inputRange: [0, 1], outputRange: [178, 104] });
  const p2y = packet2.interpolate({ inputRange: [0, 1], outputRange: [24, 100] });

  // Packet 3: hub → recycler (center to bottom-left)
  const p3x = packet3.interpolate({ inputRange: [0, 1], outputRange: [104, 26] });
  const p3y = packet3.interpolate({ inputRange: [0, 1], outputRange: [100, 168] });

  return (
    <View style={styles.container}>
      {/* Connection paths */}
      {/* Citizen → Hub */}
      <Animated.View
        style={[
          styles.path,
          {
            left: 24,
            top: 26,
            width: 106,
            transform: [{ rotate: '37deg' }, { translateX: -40 }],
            opacity: linkGlow,
          },
        ]}
      />
      {/* Community → Hub */}
      <Animated.View
        style={[
          styles.path,
          {
            left: 114,
            top: 26,
            width: 106,
            transform: [{ rotate: '-37deg' }, { translateX: 40 }],
            opacity: linkGlow,
          },
        ]}
      />
      {/* Hub → Recycler */}
      <Animated.View
        style={[
          styles.path,
          {
            left: 30,
            top: 122,
            width: 100,
            transform: [{ rotate: '37deg' }, { translateX: -28 }],
            opacity: linkGlow,
          },
        ]}
      />
      {/* Hub → Circular */}
      <Animated.View
        style={[
          styles.path,
          {
            left: 115,
            top: 122,
            width: 100,
            transform: [{ rotate: '-37deg' }, { translateX: 28 }],
            opacity: linkGlow,
          },
        ]}
      />

      {/* Traveling packets */}
      <Animated.View
        style={[styles.packet, { transform: [{ translateX: p1x }, { translateY: p1y }] }]}
      />
      <Animated.View
        style={[styles.packetCyan, { transform: [{ translateX: p2x }, { translateY: p2y }] }]}
      />
      <Animated.View
        style={[styles.packet, { transform: [{ translateX: p3x }, { translateY: p3y }] }]}
      />

      {/* Nodes */}
      {NODES.map((node, i) => (
        <View
          key={i}
          style={[
            styles.nodeWrap,
            { left: node.x, top: node.y },
          ]}
        >
          {node.isHub && (
            <Animated.View
              style={[
                styles.hubRing,
                { transform: [{ scale: hubPulse }] },
              ]}
            />
          )}
          <View
            style={[
              styles.nodeCircle,
              node.isHub && styles.hubCircle,
              { borderColor: node.color + '55' },
            ]}
          >
            <AppIcon name={node.icon} size={node.isHub ? 22 : 16} color={node.color} />
          </View>
          <Text style={[styles.nodeLabel, { color: node.color }]}>{node.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    height: 220,
    position: 'relative',
  },
  path: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(52, 211, 153, 0.40)',
  },
  packet: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
    top: 0,
    left: 0,
  },
  packetCyan: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
    top: 0,
    left: 0,
  },
  nodeWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(8, 28, 38, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  hubRing: {
    position: 'absolute',
    top: -9,
    left: -9,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
  },
  nodeIcon: {
    fontSize: 18,
  },
  nodeLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 3,
  },
});
