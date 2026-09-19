/**
 * GlassInput — Reusable Glassmorphism Form Field
 * Restrained public-service styling with translucent surface, high-contrast typography,
 * focus ring, accessibility attributes, and WCAG AA compliance.
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isPassword?: boolean;
}

export const GlassInput = forwardRef<TextInput, GlassInputProps>(
  ({ label, error, containerStyle, inputStyle, isPassword = false, secureTextEntry, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isSecure = isPassword ? !showPassword : secureTextEntry;

    return (
      <View style={[styles.container, containerStyle]}>
        {Boolean(label) && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            Boolean(error) && styles.inputWrapperError,
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={isSecure}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            accessibilityLabel={label || props.placeholder || 'Input field'}
            {...props}
          />
          {isPassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeIconText}>{showPassword ? '👁' : '🔒'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

GlassInput.displayName = 'GlassInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.spaceMd,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: spacing.radiusSm,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    minHeight: 48,
    paddingHorizontal: spacing.spaceMd,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 10,
    minHeight: 48,
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
});

export default GlassInput;
