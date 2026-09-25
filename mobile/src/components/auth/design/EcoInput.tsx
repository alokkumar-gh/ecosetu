/**
 * EcoInput — Premium animated text input with floating label.
 *
 * Features:
 * - Glass surface
 * - Animated focus border (emerald glow)
 * - Floating label that moves up on focus/value
 * - Left icon slot
 * - Right slot (show/hide password, clear, etc.)
 * - Shake animation on error
 * - Error message display below
 */

import React, { useRef, useEffect, useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Animated,
  Easing,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { AUTH_COLORS, AUTH_RADIUS, AUTH_TYPE, AUTH_TIMING } from './AuthTheme';

interface EcoInputProps extends TextInputProps {
  label: string;
  icon?: string;
  rightElement?: React.ReactNode;
  error?: string | null;
  containerStyle?: ViewStyle;
}

export const EcoInput = forwardRef<TextInput, EcoInputProps>(({
  label,
  icon,
  rightElement,
  error,
  containerStyle,
  value,
  onFocus,
  onBlur,
  ...rest
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const hasValue = Boolean(value && value.length > 0);
  const isLifted = isFocused || hasValue;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isLifted ? 1 : 0,
      duration: AUTH_TIMING.input,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isLifted, labelAnim]);

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: AUTH_TIMING.input,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isFocused, borderAnim]);

  // Shake on error
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? AUTH_COLORS.borderError : AUTH_COLORS.borderSubtle,
      error ? AUTH_COLORS.borderError : AUTH_COLORS.borderFocus,
    ],
  });

  const borderWidth = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [AUTH_COLORS.bgInput, error ? 'rgba(239,68,68,0.05)' : AUTH_COLORS.bgInputFocus],
  });

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 5],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 10],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [AUTH_COLORS.textMuted, isFocused ? AUTH_COLORS.primaryLight : AUTH_COLORS.textMuted],
  });

  return (
    <Animated.View
      style={[styles.container, containerStyle, { transform: [{ translateX: shakeAnim }] }]}
    >
      <Animated.View
        style={[
          styles.wrapper,
          {
            borderColor: error ? AUTH_COLORS.borderError : borderColor,
            borderWidth,
            backgroundColor: bgColor,
          },
        ]}
      >
        {icon ? (
          <Text style={[styles.icon, isFocused && styles.iconFocused]}>{icon}</Text>
        ) : null}

        <View style={styles.inputArea}>
          {/* Floating label */}
          <Animated.Text
            style={[
              styles.floatingLabel,
              {
                top: labelTop,
                fontSize: labelFontSize,
                color: labelColor,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>

          <TextInput
            ref={ref}
            style={styles.input}
            value={value}
            placeholderTextColor="transparent"
            selectionColor={AUTH_COLORS.primary}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
        </View>

        {rightElement ? <View style={styles.rightSlot}>{rightElement}</View> : null}
      </Animated.View>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorDot}>●</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
});

EcoInput.displayName = 'EcoInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderRadius: AUTH_RADIUS.md,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
  icon: {
    fontSize: 16,
    marginRight: 10,
    color: AUTH_COLORS.textMuted,
    marginTop: 10,
  },
  iconFocused: {
    color: AUTH_COLORS.primaryLight,
  },
  inputArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    fontWeight: '600',
    zIndex: 1,
  },
  input: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '500',
    color: AUTH_COLORS.textPrimary,
    paddingVertical: 0,
    minHeight: 28,
  },
  rightSlot: {
    marginLeft: 6,
    alignSelf: 'flex-end',
    paddingBottom: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginLeft: 4,
    gap: 5,
  },
  errorDot: {
    fontSize: 6,
    color: AUTH_COLORS.error,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: AUTH_COLORS.error,
    flex: 1,
  },
});
