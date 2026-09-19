/**
 * EcoGlassTextArea.tsx
 * Unified EcoSetu Multiline Text Area Primitive
 *
 * For bio, notes, delivery instructions, cancellation reasons, and descriptions.
 * - Dark translucent glass surface (rgba(6, 21, 27, 0.85))
 * - Luminous cyan/emerald border glow on focus
 * - Character count display
 * - Zero white/pink background
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { spacing } from '../../theme/spacing';

export interface EcoGlassTextAreaProps extends TextInputProps {
  label?: string;
  error?: string | null;
  disabled?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const EcoGlassTextArea = forwardRef<TextInput, EcoGlassTextAreaProps>(
  (
    {
      label,
      error,
      disabled = false,
      maxLength,
      showCharCount = true,
      containerStyle,
      inputStyle,
      labelStyle,
      value = '',
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <View style={[styles.container, disabled && styles.containerDisabled, containerStyle]}>
        <View style={styles.headerRow}>
          {Boolean(label) && <Text style={[styles.label, labelStyle]}>{label}</Text>}
          {showCharCount && maxLength ? (
            <Text style={styles.charCount}>
              {charCount}/{maxLength}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            Boolean(error) && styles.inputWrapperError,
            disabled && styles.inputWrapperDisabled,
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            placeholderTextColor="#94A3B8"
            selectionColor="#10B981"
            cursorColor="#10B981"
            multiline
            numberOfLines={4}
            maxLength={maxLength}
            value={value}
            editable={!disabled && props.editable !== false}
            underlineColorAndroid="transparent"
            textAlignVertical="top"
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            accessibilityLabel={label || props.placeholder || 'Text area field'}
            {...props}
          />
        </View>

        {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

EcoGlassTextArea.displayName = 'EcoGlassTextArea';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.spaceMd,
    width: '100%',
  },
  containerDisabled: {
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  inputWrapper: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    minHeight: 88,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
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
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1.5,
  },
  inputWrapperDisabled: {
    backgroundColor: 'rgba(6, 21, 27, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: {
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    minHeight: 80,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default EcoGlassTextArea;
