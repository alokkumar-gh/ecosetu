/**
 * CollectorSkeletonList
 * Professional skeleton loading state for list screens.
 * Replaces ActivityIndicator spinner with content-shaped placeholders.
 */

import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface CollectorSkeletonListProps {
  rows?: number;
  rowHeight?: number;
}

const SkeletonRow: React.FC<{ height?: number; delay?: number }> = ({ height = 72, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={[styles.skeletonRow, { height, opacity }]}>
      {/* Icon placeholder */}
      <View style={styles.skeletonIcon} />
      {/* Text lines */}
      <View style={styles.skeletonTextCol}>
        <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
        <View style={[styles.skeletonLine, styles.skeletonLineNarrow]} />
      </View>
      {/* Right placeholder */}
      <View style={styles.skeletonRight} />
    </Animated.View>
  );
};

export const CollectorSkeletonList: React.FC<CollectorSkeletonListProps> = ({
  rows = 4,
  rowHeight = 72,
}) => (
  <View style={styles.container}>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} height={rowHeight} delay={i * 80} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    gap: 12,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  skeletonTextCol: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonLineWide: {
    width: '70%',
  },
  skeletonLineNarrow: {
    width: '45%',
  },
  skeletonRight: {
    width: 52,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
});

export default CollectorSkeletonList;
