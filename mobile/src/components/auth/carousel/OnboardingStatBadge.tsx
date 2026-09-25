/**
 * OnboardingStatBadge — A floating glass badge showing a metric
 *
 * Appears with a spring pop-in animation when the slide activates.
 * Uses glassmorphism surface with tinted border.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StatBadge } from './data/slideData';

interface Props {
  badge: StatBadge;
  /** Delay before the badge animates in (ms) */
  delay?: number;
  active: boolean;
  /** Accent color for border/value text */
  accentColor: string;
}

export const OnboardingStatBadge: React.FC<Props> = ({
  badge,
  delay = 0,
  active,
  accentColor,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      anim.setValue(0);
      const timer = setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [active, delay, anim]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          opacity: anim,
          transform: [{ scale }, { translateY }],
          borderColor: accentColor + '35',
        },
      ]}
    >
      <Text style={styles.icon}>{badge.icon}</Text>
      <View style={styles.textWrap}>
        <Text style={[styles.value, { color: accentColor }]}>{badge.value}</Text>
        <Text style={styles.label}>{badge.label}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 25, 35, 0.82)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    // subtle glow via shadow
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 18,
  },
  textWrap: {
    gap: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
  },
});
