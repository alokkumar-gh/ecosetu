import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../../../theme/colors';

interface TraceabilityTimelineProps {
  active?: boolean;
}

const STEPS = [
  { id: '1', label: 'REQUEST LOGGED', code: 'CITIZEN', icon: '📝', verified: true },
  { id: '2', label: 'OTP VERIFIED', code: 'COLLECTOR', icon: '🔐', verified: true },
  { id: '3', label: 'BATCH CONSIGNED', code: 'LOGISTICS', icon: '📦', verified: true },
  { id: '4', label: 'INWARD INSPECTED', code: 'RECYCLER', icon: '🔍', verified: true },
  { id: '5', label: 'MATERIAL RECOVERED', code: 'CIRCULAR', icon: '✨', verified: true, isFinal: true },
];

export const TraceabilityTimeline: React.FC<TraceabilityTimelineProps> = ({ active = true }) => {
  const beamAnim = useRef(new Animated.Value(0)).current;
  const finalPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;

    // Beam traveling down the spine
    const beamLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(beamAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse for final recycled node
    const finalPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(finalPulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(finalPulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    beamLoop.start();
    finalPulseLoop.start();

    return () => {
      beamLoop.stop();
      finalPulseLoop.stop();
    };
  }, [active, beamAnim, finalPulseAnim]);

  const beamTranslateY = beamAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 170],
  });

  return (
    <View style={styles.container}>
      {/* Background Central Spine Line */}
      <View style={styles.spineBase} />

      {/* Traveling Laser Light Dot */}
      <Animated.View
        style={[
          styles.travelingBeam,
          {
            transform: [{ translateY: beamTranslateY }],
          },
        ]}
      />

      {/* Step Rows */}
      {STEPS.map((step, index) => {
        const isEven = index % 2 === 0;
        return (
          <View key={step.id} style={styles.stepRow}>
            {/* Left Column */}
            <View style={[styles.sideCol, styles.leftCol]}>
              {isEven && (
                <View style={styles.cardBubble}>
                  <Text style={styles.cardLabel}>{step.label}</Text>
                  <Text style={styles.cardCode}>{step.code}</Text>
                </View>
              )}
            </View>

            {/* Center Node Indicator */}
            <View style={styles.centerNodeWrapper}>
              {step.isFinal ? (
                <Animated.View
                  style={[
                    styles.nodeFinal,
                    {
                      transform: [{ scale: finalPulseAnim }],
                    },
                  ]}
                >
                  <Text style={styles.finalCheck}>✓</Text>
                </Animated.View>
              ) : (
                <View style={styles.nodeStandard}>
                  <Text style={styles.nodeSmallIcon}>{step.icon}</Text>
                </View>
              )}
            </View>

            {/* Right Column */}
            <View style={[styles.sideCol, styles.rightCol]}>
              {!isEven && (
                <View style={[styles.cardBubble, styles.cardBubbleRight]}>
                  <Text style={styles.cardLabel}>{step.label}</Text>
                  <Text style={styles.cardCode}>{step.code}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 230,
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 10,
  },
  spineBase: {
    position: 'absolute',
    top: 25,
    bottom: 25,
    width: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    left: '50%',
    marginLeft: -1,
  },
  travelingBeam: {
    position: 'absolute',
    top: 25,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.carousel.accentEmerald,
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 36,
  },
  sideCol: {
    flex: 1,
    justifyContent: 'center',
  },
  leftCol: {
    alignItems: 'flex-end',
    paddingRight: 14,
  },
  rightCol: {
    alignItems: 'flex-start',
    paddingLeft: 14,
  },
  centerNodeWrapper: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  nodeStandard: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 21, 27, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(45, 212, 191, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeSmallIcon: {
    fontSize: 10,
  },
  nodeFinal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.carousel.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  finalCheck: {
    fontSize: 14,
    fontWeight: '900',
    color: '#02080D',
  },
  cardBubble: {
    backgroundColor: 'rgba(8, 37, 42, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardBubbleRight: {
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.carousel.textHero,
    letterSpacing: 0.5,
  },
  cardCode: {
    fontSize: 7.5,
    fontWeight: '600',
    color: colors.carousel.accentCyan,
    letterSpacing: 0.8,
    marginTop: 1,
  },
});
