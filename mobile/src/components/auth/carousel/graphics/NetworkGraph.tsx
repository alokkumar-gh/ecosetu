import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../../../theme/colors';

interface NetworkGraphProps {
  active?: boolean;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ active = true }) => {
  const packet1Anim = useRef(new Animated.Value(0)).current;
  const packet2Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;

    // Packet 1 (Citizen -> Collector)
    const packet1Loop = Animated.loop(
      Animated.timing(packet1Anim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Packet 2 (Collector -> Recycler)
    const packet2Loop = Animated.loop(
      Animated.timing(packet2Anim, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Node aura breathing pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    packet1Loop.start();
    packet2Loop.start();
    pulseLoop.start();

    return () => {
      packet1Loop.stop();
      packet2Loop.stop();
      pulseLoop.stop();
    };
  }, [active, packet1Anim, packet2Anim, pulseAnim]);

  // Traveling packet 1: from Node 1 (left: 45, top: 40) to Node 2 (center: 140, top: 110)
  const packet1X = packet1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 95],
  });
  const packet1Y = packet1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 70],
  });

  // Traveling packet 2: from Node 2 (center: 140, top: 110) to Node 3 (right: 235, top: 40)
  const packet2X = packet2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 95],
  });
  const packet2Y = packet2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  return (
    <View style={styles.container}>
      {/* Central glow halo */}
      <Animated.View style={[styles.halo, { transform: [{ scale: pulseAnim }] }]} />

      {/* Connection lines (programmatic SVG-free angled and horizontal bars) */}
      <View style={styles.pathLineDiagonal1} />
      <View style={styles.pathLineDiagonal2} />
      <View style={styles.pathLineBottom1} />
      <View style={styles.pathLineBottom2} />

      {/* Traveling Data Packet 1 */}
      <Animated.View
        style={[
          styles.packet,
          {
            left: 45,
            top: 40,
            transform: [{ translateX: packet1X }, { translateY: packet1Y }],
          },
        ]}
      />

      {/* Traveling Data Packet 2 */}
      <Animated.View
        style={[
          styles.packetCyan,
          {
            left: 140,
            top: 110,
            transform: [{ translateX: packet2X }, { translateY: packet2Y }],
          },
        ]}
      />

      {/* Node 1: Citizen (Top-Left) */}
      <View style={[styles.nodeContainer, styles.nodeCitizen]}>
        <View style={styles.nodeCircle}>
          <Text style={styles.nodeIcon}>👤</Text>
        </View>
        <Text style={styles.nodeLabel}>CITIZEN</Text>
      </View>

      {/* Node 2: Collector (Center Hub) */}
      <View style={[styles.nodeContainer, styles.nodeCollector]}>
        <Animated.View style={[styles.activeNodeRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={[styles.nodeCircle, styles.nodeCircleActive]}>
          <Text style={styles.nodeIcon}>🚚</Text>
        </View>
        <Text style={[styles.nodeLabel, styles.nodeLabelActive]}>COLLECTOR</Text>
      </View>

      {/* Node 3: Recycler (Top-Right) */}
      <View style={[styles.nodeContainer, styles.nodeRecycler]}>
        <View style={styles.nodeCircle}>
          <Text style={styles.nodeIcon}>🏭</Text>
        </View>
        <Text style={styles.nodeLabel}>RECYCLER</Text>
      </View>

      {/* Node 4: Formal Recovery / Loop Close (Bottom-Center) */}
      <View style={[styles.nodeContainer, styles.nodeRecovery]}>
        <View style={[styles.nodeCircle, styles.nodeCircleRecovery]}>
          <Text style={styles.nodeIcon}>♻️</Text>
        </View>
        <Text style={styles.nodeLabel}>CIRCULAR FLOW</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 290,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.20)',
  },
  // Connection paths
  pathLineDiagonal1: {
    position: 'absolute',
    left: 65,
    top: 55,
    width: 110,
    height: 2,
    backgroundColor: colors.carousel.pathLine,
    transform: [{ rotate: '36deg' }],
  },
  pathLineDiagonal2: {
    position: 'absolute',
    right: 65,
    top: 55,
    width: 110,
    height: 2,
    backgroundColor: colors.carousel.pathLine,
    transform: [{ rotate: '-36deg' }],
  },
  pathLineBottom1: {
    position: 'absolute',
    left: 80,
    bottom: 45,
    width: 80,
    height: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    transform: [{ rotate: '-40deg' }],
  },
  pathLineBottom2: {
    position: 'absolute',
    right: 80,
    bottom: 45,
    width: 80,
    height: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    transform: [{ rotate: '40deg' }],
  },
  // Traveling packets
  packet: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.carousel.accentEmerald,
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  packetCyan: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.carousel.accentCyan,
    shadowColor: colors.carousel.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  // Nodes
  nodeContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  nodeCitizen: {
    left: 20,
    top: 15,
  },
  nodeCollector: {
    left: 115,
    top: 85,
  },
  nodeRecycler: {
    right: 20,
    top: 15,
  },
  nodeRecovery: {
    left: 105,
    bottom: 10,
  },
  nodeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleActive: {
    borderColor: colors.carousel.accentEmerald,
    backgroundColor: 'rgba(8, 37, 42, 0.95)',
    borderWidth: 2,
  },
  nodeCircleRecovery: {
    borderColor: colors.carousel.accentCyan,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activeNodeRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  nodeIcon: {
    fontSize: 20,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.carousel.textMicro,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  nodeLabelActive: {
    color: colors.carousel.accentEmerald,
  },
});
