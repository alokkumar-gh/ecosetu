/**
 * EcoGlassNumberInput.tsx
 * Unified EcoSetu Numeric Input Primitive
 *
 * For weight entry, operating radius, quantity, and numeric metrics.
 * - Dark translucent glass container (rgba(6, 21, 27, 0.85))
 * - Luminous border with emerald focus ring
 * - Built-in trailing unit badge (e.g. "kg", "km", "units")
 * - Numeric/decimal keypad handling
 */

import React, { useState } from 'react';
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

export interface EcoGlassNumberInputProps extends TextInputProps {
  label?: string;
  unit?: string;
  error?: string | null;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const EcoGlassNumberInput: React.FC<EcoGlassNumberInputProps> = ({
  label,
  unit,
  error,
  disabled = false,
  containerStyle,
  inputStyle,
  labelStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, disabled && styles.containerDisabled, containerStyle]}>
      {Boolean(label) && <Text style={[styles.label, labelStyle]}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
        ]}
      >
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor="#94A3B8"
          selectionColor="#10B981"
          cursorColor="#10B981"
          keyboardType={props.keyboardType || 'decimal-pad'}
          editable={!disabled && props.editable !== false}
          underlineColorAndroid="transparent"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label || props.placeholder || 'Number input'}
          {...props}
        />
        {Boolean(unit) && (
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>{unit}</Text>
          </View>
        )}
      </View>

      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default EcoGlassNumberInput;

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
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 48,
  },
  unitBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginLeft: 8,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 4,
    fontWeight: '500',
  },
});
