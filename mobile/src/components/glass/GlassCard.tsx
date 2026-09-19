/**
 * GlassCard
 *
 * Reusable glass surface container. The primary building block for all
 * glass-morphism layouts in EcoSetu.
 *
 * Variants:
 *   - 'standard'  : rgba fill + border (default)
 *   - 'elevated'  : stronger fill + Android elevation
 *   - 'hero'      : large rounded hero panel
 *   - 'flat'      : no border, very subtle fill
 */

import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type GlassVariant = 'standard' | 'elevated' | 'hero' | 'flat';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  /** Animate in from below on mount */
  animated?: boolean;
  /** Delay for staggered entrance (ms) */
  animationDelay?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const GlassCard: React.FC<GlassCardProps> = memo(({
  children,
  variant = 'standard',
  animated = false,
  animationDelay = 0,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const translateY = useRef(new Animated.Value(animated ? 20 : 0)).current;
  const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) return;
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 9,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [animated, animationDelay, opacity, translateY]);

  const variantStyle = variantStyles[variant];

  const inner = (
    <Animated.View
      style={[styles.base, variantStyle, style, { opacity, transform: [{ translateY }] }]}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
});

GlassCard.displayName = 'GlassCard';

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: spacing.glassBorderWidth,
  },
});

const variantStyles: Record<GlassVariant, object> = {
  standard: {
    backgroundColor: colors.glassFill,
    borderColor: colors.glassBorder,
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceMd,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  elevated: {
    backgroundColor: colors.glassFillElevated,
    borderColor: colors.glassBorderStrong,
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceMd,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: spacing.glassElevation,
  },
  hero: {
    backgroundColor: colors.glassFillHero,
    borderColor: colors.glassBorderStrong,
    borderRadius: spacing.radiusLg,
    padding: spacing.spaceLg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  flat: {
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderColor: 'transparent',
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceMd,
  },
};

export default GlassCard;
