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
  // Animated width for each dot
  const widthAnims = Array.from({ length: total }, () =>
    useRef(new Animated.Value(DOT_W)).current
  );
  const opacityAnims = Array.from({ length: total }, (_, i) =>
    useRef(new Animated.Value(i === 0 ? 1 : 0.35)).current
  );

  useEffect(() => {
    widthAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === activeIndex ? DOT_W_ACTIVE : DOT_W,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // width animation needs layout driver
      }).start();
    });

    opacityAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === activeIndex ? 1 : i < activeIndex ? 0.6 : 0.30,
        duration: 280,
        useNativeDriver: true,
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
                width: widthAnims[i],
                opacity: opacityAnims[i],
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
