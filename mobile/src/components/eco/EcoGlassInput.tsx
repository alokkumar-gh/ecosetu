/**
 * EcoGlassInput.tsx
 * Unified EcoSetu Glassmorphic Input Primitive
 *
 * Visual Invariants:
 * - Zero opaque white or pale-pink/cream surfaces.
 * - Dark translucent glass surface (rgba(6, 21, 27, 0.85) / rgba(255,255,255,0.08)).
 * - Luminous border (rgba(45, 212, 191, 0.22)) with emerald focus ring (#10B981).
 * - Label sits clearly ABOVE the field.
 * - Cursor and selection tinted emerald (#10B981).
 * - Native TextInput background is transparent.
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
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon } from '../ui/AppIcon';

export interface EcoGlassInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  success?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  inputWrapperStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  hint?: string;
}

export const EcoGlassInput = forwardRef<TextInput, EcoGlassInputProps>(
  (
    {
      label,
      error,
      success,
      disabled = false,
      leftIcon,
      rightIcon,
      isPassword = false,
      secureTextEntry,
      containerStyle,
      inputWrapperStyle,
      inputStyle,
      labelStyle,
      hint,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isSecure = isPassword ? !showPassword : secureTextEntry;

    return (
      <View style={[styles.container, disabled && styles.containerDisabled, containerStyle]}>
        {Boolean(label) && <Text style={[styles.label, labelStyle]}>{label}</Text>}

        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            success && !error && styles.inputWrapperSuccess,
            Boolean(error) && styles.inputWrapperError,
            disabled && styles.inputWrapperDisabled,
            inputWrapperStyle,
          ]}
        >
          {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            placeholderTextColor="#94A3B8"
            selectionColor="#10B981"
            cursorColor="#10B981"
            secureTextEntry={isSecure}
            editable={!disabled && props.editable !== false}
            underlineColorAndroid="transparent"
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

          {isPassword ? (
            <TouchableOpacity
              style={styles.rightAction}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppIcon name={showPassword ? 'eye' : 'eyeOff'} size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={styles.rightAction}>{rightIcon}</View>
          ) : null}
        </View>

        {Boolean(error) ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : Boolean(hint) ? (
          <Text style={styles.hintText}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

EcoGlassInput.displayName = 'EcoGlassInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.spaceMd,
    width: '100%',
  },
  containerDisabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    minHeight: 48,
    paddingHorizontal: spacing.spaceMd,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWrapperFocused: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
  },
  inputWrapperSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1.5,
  },
  inputWrapperDisabled: {
    backgroundColor: 'rgba(6, 21, 27, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftIconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 48,
  },
  rightAction: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 4,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});

export default EcoGlassInput;
