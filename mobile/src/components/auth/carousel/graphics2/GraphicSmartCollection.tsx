/**
 * Slide 3 Graphic — Smart Collection
 *
 * Shows a phone scanning an e-waste item with:
 * - AI detection box animating into place
 * - Location ping rings spreading outward
 * - Collector truck icon appearing matched
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AppIcon } from '../../../ui/AppIcon';

interface Props {
  active: boolean;
}

export const GraphicSmartCollection: React.FC<Props> = ({ active }) => {
  const scanLine = useRef(new Animated.Value(0)).current;
  const aiBox = useRef(new Animated.Value(0)).current;
  const ping1 = useRef(new Animated.Value(0)).current;
  const ping2 = useRef(new Animated.Value(0)).current;
  const truckAppear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // Scan line sweeping down
    const scan = Animated.loop(
      Animated.timing(scanLine, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // AI detection box fades in then out
    const ai = Animated.loop(
      Animated.sequence([
        Animated.timing(aiBox, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
        Animated.timing(aiBox, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    );

    // Location pings expanding outward
    const p1 = Animated.loop(
      Animated.timing(ping1, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    const p2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(ping2, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Truck "matched" pop-in
    const truck = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.spring(truckAppear, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(truckAppear, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    );

    scan.start();
    ai.start();
    p1.start();
    p2.start();
    truck.start();

    return () => {
      scan.stop();
      ai.stop();
      p1.stop();
      p2.stop();
      truck.stop();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const scanLineY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 92],
  });

  const ping1Scale = ping1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] });
  const ping1Opacity = ping1.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.8, 0.3, 0] });
  const ping2Scale = ping2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] });
  const ping2Opacity = ping2.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0.2, 0] });

  return (
    <View style={styles.container}>
      {/* Phone frame */}
      <View style={styles.phone}>
        {/* Screen content area */}
        <View style={styles.phoneScreen}>
          {/* The item being scanned */}
          <AppIcon name="laptop" size={32} color="#06B6D4" />

          {/* Scanning line */}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineY }] },
            ]}
          />

          {/* AI Detection Box */}
          <Animated.View
            style={[
              styles.aiDetectionBox,
              { opacity: aiBox, transform: [{ scale: aiBox.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
            ]}
          >
            <View style={styles.aiCornerTL} />
            <View style={styles.aiCornerTR} />
            <View style={styles.aiCornerBL} />
            <View style={styles.aiCornerBR} />
          </Animated.View>

          {/* AI label */}
          <Animated.View style={[styles.aiLabel, { opacity: aiBox }]}>
            <Text style={styles.aiLabelText}>LAPTOP · 94%</Text>
          </Animated.View>
        </View>

        {/* Phone notch/camera */}
        <View style={styles.phoneNotch} />
      </View>

      {/* Location ping rings */}
      <View style={styles.pingCenter}>
        <Animated.View
          style={[
            styles.pingRing,
            {
              borderColor: 'rgba(6, 182, 212, 0.60)',
              transform: [{ scale: ping1Scale }],
              opacity: ping1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pingRing,
            {
              borderColor: 'rgba(16, 185, 129, 0.50)',
              transform: [{ scale: ping2Scale }],
              opacity: ping2Opacity,
            },
          ]}
        />
        <View style={styles.pingDot} />
      </View>

      {/* Matched collector badge */}
      <Animated.View
        style={[
          styles.matchBadge,
          {
            opacity: truckAppear,
            transform: [{ scale: truckAppear }],
          },
        ]}
      >
        <AppIcon name="truck" size={18} color="#34D399" />
        <View>
          <Text style={styles.matchTitle}>Match Found!</Text>
          <Text style={styles.matchSub}>Collector · 1.2km away</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const CORNER_SIZE = 10;
const corners = {
  position: 'absolute' as const,
  width: CORNER_SIZE,
  height: CORNER_SIZE,
  borderColor: '#06B6D4',
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 110,
    height: 160,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 20, 30, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'absolute',
    left: 75,
    top: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneNotch: {
    position: 'absolute',
    top: 6,
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },
  phoneScreen: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  scannedItem: {
    fontSize: 40,
    zIndex: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10,
    height: 2,
    backgroundColor: 'rgba(6, 182, 212, 0.80)',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    zIndex: 3,
  },
  aiDetectionBox: {
    position: 'absolute',
    width: 60,
    height: 55,
    zIndex: 4,
  },
  aiCornerTL: { ...corners, top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  aiCornerTR: { ...corners, top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  aiCornerBL: { ...corners, bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  aiCornerBR: { ...corners, bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  aiLabel: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.20)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    zIndex: 5,
  },
  aiLabelText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#A5F3FC',
    letterSpacing: 0.6,
  },
  pingCenter: {
    position: 'absolute',
    left: 158,
    bottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  pingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06B6D4',
  },
  matchBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 7,
    maxWidth: 155,
  },
  matchIcon: {
    fontSize: 20,
  },
  matchTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  matchSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
});
