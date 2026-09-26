/**
 * Slide 4 Graphic — Full Traceability Chain
 *
 * Shows a vertical timeline of the e-waste journey:
 * Step 1 → Step 2 → Step 3 → Step 4
 * Each step lights up sequentially with a glowing connector.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AppIcon, IconName } from '../../../ui/AppIcon';

interface Props {
  active: boolean;
}

const STEPS: { icon: IconName; label: string; color: string; sublabel: string }[] = [
  { icon: 'home', label: 'Citizen Drop-off', color: '#10B981', sublabel: 'QR scanned' },
  { icon: 'truck', label: 'Collection', color: '#06B6D4', sublabel: 'GPS verified' },
  { icon: 'refresh', label: 'Facility Intake', color: '#A78BFA', sublabel: 'Weight logged' },
  { icon: 'recycle', label: 'Recycled', color: '#34D399', sublabel: 'Certificate issued' },
];

export const GraphicTraceability: React.FC<Props> = ({ active }) => {
  const stepAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const connectorAnims = useRef(STEPS.slice(0, -1).map(() => new Animated.Value(0))).current;
  const checkAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) return;

    // Sequentially illuminate each step
    const sequence = STEPS.flatMap((_, i) => [
      Animated.timing(stepAnims[i], {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(checkAnims[i], {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      ...(i < STEPS.length - 1
        ? [
            Animated.timing(connectorAnims[i], {
              toValue: 1,
              duration: 380,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]
        : []),
      Animated.delay(200),
    ]);

    const chain = Animated.loop(
      Animated.sequence([
        ...sequence,
        Animated.delay(1800),
        ...stepAnims.map(a =>
          Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true })
        ),
        ...connectorAnims.map(a =>
          Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true })
        ),
        ...checkAnims.map(a =>
          Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true })
        ),
        Animated.delay(400),
      ])
    );

    chain.start();

    return () => {
      chain.stop();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      {/* Traceable chain column */}
      <View style={styles.chain}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            {/* Node */}
            <Animated.View
              style={[
                styles.nodeWrap,
                {
                  opacity: stepAnims[i],
                  transform: [
                    {
                      scale: stepAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.nodeCircle, { borderColor: step.color + '70' }]}>
                <AppIcon name={step.icon} size={18} color={step.color} />
              </View>

              {/* Checkmark */}
              <Animated.View
                style={[
                  styles.checkmark,
                  {
                    opacity: checkAnims[i],
                    transform: [{ scale: checkAnims[i] }],
                    backgroundColor: step.color,
                  },
                ]}
              >
                <AppIcon name="check" size={10} color="#071E22" />
              </Animated.View>
            </Animated.View>

            {/* Step info */}
            <Animated.View style={[styles.stepInfo, { opacity: stepAnims[i] }]}>
              <Text style={[styles.stepLabel, { color: step.color }]}>{step.label}</Text>
              <View style={styles.sublabelWrap}>
                <View style={[styles.sublabelDot, { backgroundColor: step.color }]} />
                <Text style={styles.sublabelText}>{step.sublabel}</Text>
              </View>
            </Animated.View>

            {/* Connector line to next step */}
            {i < STEPS.length - 1 && (
              <Animated.View
                style={[
                  styles.connector,
                  { opacity: connectorAnims[i], backgroundColor: STEPS[i + 1].color + '55' },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Certificate badge */}
      <View style={styles.certBadge}>
        <AppIcon name="award" size={13} color="#FBBF24" />
        <Text style={styles.certText}>CPCB Traceable</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 268,
    height: 230,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chain: {
    alignItems: 'flex-start',
    width: 230,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
    height: 48,
  },
  nodeWrap: {
    position: 'relative',
    marginRight: 14,
  },
  nodeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(8, 25, 35, 0.92)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeIcon: {
    fontSize: 18,
  },
  checkmark: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontSize: 9,
    fontWeight: '900',
    color: '#020C14',
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sublabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sublabelDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.7,
  },
  sublabelText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  connector: {
    position: 'absolute',
    left: 20,
    top: 44,
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  certBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  certIcon: { fontSize: 14 },
  certText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E9D5FF',
    letterSpacing: 0.5,
  },
});
