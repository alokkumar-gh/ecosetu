/**
 * OnboardingProgress — Premium pill-dot progress indicator
 *
 * Active dot expands into a pill shape with an animated fill.
 * Past dots remain as small glowing circles.
 * Future dots are dim.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';

interface Props {
  total: number;
  activeIndex: number;
  onSelectIndex?: (index: number) => void;
  accentColor?: string;
}

const DOT_W = 6;
const DOT_W_ACTIVE = 26;
const DOT_H = 6;

export const OnboardingProgress: React.FC<Props> = ({
  total,
  activeIndex,
  onSelectIndex,
  accentColor = '#10B981',
}) => {
  // Stable animated values ref
  const widthAnims = useRef<Animated.Value[]>([]);
  const opacityAnims = useRef<Animated.Value[]>([]);

  if (widthAnims.current.length !== total) {
    widthAnims.current = Array.from({ length: total }, (_, i) => new Animated.Value(i === activeIndex ? DOT_W_ACTIVE : DOT_W));
  }
  if (opacityAnims.current.length !== total) {
    opacityAnims.current = Array.from({ length: total }, (_, i) => new Animated.Value(i === activeIndex ? 1 : i < activeIndex ? 0.6 : 0.35));
  }

  useEffect(() => {
    widthAnims.current.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === activeIndex ? DOT_W_ACTIVE : DOT_W,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });

    opacityAnims.current.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === activeIndex ? 1 : i < activeIndex ? 0.6 : 0.30,
        duration: 280,
        useNativeDriver: false, // Must be false when sharing same Animated.View with width
      }).start();
    });
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onSelectIndex?.(i)}
          activeOpacity={0.7}
          style={styles.hitArea}
        >
          <Animated.View
            style={[
              styles.dot,
              {
                width: widthAnims.current[i] || DOT_W,
                opacity: opacityAnims.current[i] || 0.35,
                backgroundColor: i <= activeIndex ? accentColor : 'rgba(255,255,255,0.55)',
              },
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hitArea: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: DOT_H,
    borderRadius: DOT_H / 2,
  },
});
