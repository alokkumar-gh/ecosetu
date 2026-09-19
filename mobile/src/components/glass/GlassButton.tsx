/**
 * GlassButton
 *
 * Premium button component for glassmorphism UI.
 *
 * Variants:
 *   - 'primary'  : neon-green solid CTA
 *   - 'outline'  : glass outline / ghost
 *   - 'accent'   : translucent green-tinted
 *   - 'danger'   : translucent red-tinted
 */

import React, { useRef, memo } from 'react';
import {
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'outline' | 'accent' | 'danger';

interface GlassButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  /** Full width (default true) */
  fullWidth?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = memo(({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  fullWidth = true,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 80,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 5,
    }).start();
  };

  const btnVariant = buttonVariants[variant];
  const lblVariant = labelVariants[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled }}
      style={[fullWidth && styles.fullWidth]}
    >
      <Animated.View
        style={[
          styles.base,
          btnVariant,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textInverse : colors.primary}
          />
        ) : (
          <>
            {icon ? <Text style={[styles.icon, lblVariant]}>{icon} </Text> : null}
            <Text style={[styles.label, lblVariant, textStyle]}>
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

GlassButton.displayName = 'GlassButton';

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  base: {
    minHeight: 52,
    borderRadius: spacing.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm + 2,
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  icon: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.45,
  },
});

const buttonVariants: Record<ButtonVariant, object> = {
  primary: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  outline: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  accent: {
    backgroundColor: colors.accent,
    borderColor: '#34D399',
    elevation: 3,
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderColor: '#F87171',
    elevation: 3,
  },
};

const labelVariants: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: '#051417',
    fontWeight: '800',
  },
  outline: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  accent: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  danger: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
};

export default GlassButton;
