import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../../../theme/colors';

interface DeviceSilhouettesProps {
  active?: boolean;
}

export const DeviceSilhouettes: React.FC<DeviceSilhouettesProps> = ({ active = true }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const chipPulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!active) return;

    // Gentle floating loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Blinking standby LED pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Chip trace pulse
    const chipLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(chipPulseAnim, {
          toValue: 0.9,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(chipPulseAnim, {
          toValue: 0.25,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();
    chipLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
      chipLoop.stop();
    };
  }, [active, floatAnim, pulseAnim, chipPulseAnim]);

  const translateY1 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const translateY2 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const translateY3 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <View style={styles.container}>
      {/* Background Ambient Glow Pool */}
      <View style={styles.glowPool} />

      {/* Floating Laptop Outline (Center-Left) */}
      <Animated.View style={[styles.laptopWrapper, { transform: [{ translateY: translateY1 }] }]}>
        <View style={styles.laptopScreen}>
          <View style={styles.laptopCamera} />
          <View style={styles.laptopDisplay}>
            {/* Screen static lines */}
            <View style={[styles.displayLine, { width: '65%' }]} />
            <View style={[styles.displayLine, { width: '80%' }]} />
            <View style={[styles.displayLine, { width: '45%' }]} />
            <Animated.View style={[styles.ledDot, { opacity: pulseAnim }]} />
          </View>
        </View>
        <View style={styles.laptopBase}>
          <View style={styles.trackpad} />
        </View>
      </Animated.View>

      {/* Floating Smartphone Outline (Center-Right) */}
      <Animated.View style={[styles.phoneWrapper, { transform: [{ translateY: translateY2 }] }]}>
        <View style={styles.phoneBody}>
          <View style={styles.speakerGrille} />
          <View style={styles.phoneScreen}>
            <View style={styles.batteryIcon}>
              <View style={styles.batteryLevel} />
              <View style={styles.batteryTip} />
            </View>
            <Animated.View style={[styles.circuitNode, { opacity: chipPulseAnim }]} />
          </View>
          <View style={styles.homeIndicator} />
        </View>
      </Animated.View>

      {/* Microchip / Circuit Component (Top Right) */}
      <Animated.View style={[styles.chipWrapper, { transform: [{ translateY: translateY3 }] }]}>
        <View style={styles.chipBody}>
          <View style={styles.chipCore}>
            <Animated.View style={[styles.chipCoreInner, { opacity: chipPulseAnim }]} />
          </View>
          {/* Pins */}
          <View style={[styles.pin, styles.pinTop1]} />
          <View style={[styles.pin, styles.pinTop2]} />
          <View style={[styles.pin, styles.pinBottom1]} />
          <View style={[styles.pin, styles.pinBottom2]} />
          <View style={[styles.pin, styles.pinLeft1]} />
          <View style={[styles.pin, styles.pinRight1]} />
        </View>
      </Animated.View>

      {/* Battery Cell (Bottom Left) */}
      <Animated.View style={[styles.batteryCellWrapper, { transform: [{ translateY: translateY2 }] }]}>
        <View style={styles.cellCap} />
        <View style={styles.cellBody}>
          <View style={styles.recycleSymbolRow}>
            <View style={styles.recycleLine1} />
            <View style={styles.recycleLine2} />
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
  glowPool: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.12)',
  },
  // Laptop styles
  laptopWrapper: {
    position: 'absolute',
    left: 20,
    top: 35,
    alignItems: 'center',
  },
  laptopScreen: {
    width: 140,
    height: 92,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  laptopCamera: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
  },
  laptopDisplay: {
    flex: 1,
    width: '100%',
    borderRadius: 4,
    backgroundColor: 'rgba(8, 37, 42, 0.65)',
    padding: 8,
    justifyContent: 'center',
    gap: 5,
  },
  displayLine: {
    height: 2.5,
    backgroundColor: 'rgba(20, 184, 166, 0.35)',
    borderRadius: 2,
  },
  ledDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  laptopBase: {
    width: 160,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(15, 41, 66, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackpad: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
  },
  // Phone styles
  phoneWrapper: {
    position: 'absolute',
    right: 18,
    bottom: 25,
  },
  phoneBody: {
    width: 68,
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.carousel.accentTeal,
    backgroundColor: 'rgba(4, 18, 22, 0.92)',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speakerGrille: {
    width: 18,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 2,
  },
  phoneScreen: {
    flex: 1,
    width: '100%',
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  batteryIcon: {
    width: 24,
    height: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2.5,
    padding: 1.5,
    position: 'relative',
  },
  batteryLevel: {
    width: '65%',
    height: '100%',
    backgroundColor: colors.carousel.accentEmerald,
    borderRadius: 1,
  },
  batteryTip: {
    position: 'absolute',
    right: -3,
    top: 3,
    width: 2,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  circuitNode: {
    position: 'absolute',
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.carousel.accentCyan,
  },
  homeIndicator: {
    width: 22,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 2,
  },
  // Microchip styles
  chipWrapper: {
    position: 'absolute',
    right: 32,
    top: 15,
  },
  chipBody: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    backgroundColor: 'rgba(8, 37, 42, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chipCore: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.carousel.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCoreInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.carousel.accentEmerald,
  },
  pin: {
    position: 'absolute',
    backgroundColor: 'rgba(52, 211, 153, 0.6)',
  },
  pinTop1: { top: -4, left: 12, width: 2, height: 4 },
  pinTop2: { top: -4, right: 12, width: 2, height: 4 },
  pinBottom1: { bottom: -4, left: 12, width: 2, height: 4 },
  pinBottom2: { bottom: -4, right: 12, width: 2, height: 4 },
  pinLeft1: { left: -4, top: 20, width: 4, height: 2 },
  pinRight1: { right: -4, top: 20, width: 4, height: 2 },
  // Battery cell styles
  batteryCellWrapper: {
    position: 'absolute',
    left: 28,
    bottom: 20,
    alignItems: 'center',
  },
  cellCap: {
    width: 10,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  cellBody: {
    width: 28,
    height: 48,
    borderRadius: 5,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(6, 21, 27, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recycleSymbolRow: {
    alignItems: 'center',
    gap: 3,
  },
  recycleLine1: {
    width: 14,
    height: 2,
    backgroundColor: colors.carousel.accentEmerald,
    borderRadius: 1,
  },
  recycleLine2: {
    width: 8,
    height: 2,
    backgroundColor: colors.carousel.accentCyan,
    borderRadius: 1,
  },
});
