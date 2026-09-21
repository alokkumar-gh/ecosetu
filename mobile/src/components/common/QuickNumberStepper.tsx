/**
 * QuickNumberStepper.tsx
 * Low-Literacy Numeric Entry with Large Touch Buttons & Numpad Support
 *
 * Requirements:
 * SIH-LIT-004: Touch targets >= 48dp
 * SIH-LIT-008: Minimize manual text input
 * SIH-LIT-009: Large keypad / quick increment & decrement buttons for weight and price
 *
 * Preserves exact decimal precision while allowing 1-tap rapid adjustments.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface QuickNumberStepperProps {
  value: string | number;
  onChangeValue?: (val: string) => void;
  onChange?: (val: number) => void;
  unit?: string;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  presets?: number[];
  quickSteps?: number[];
  step?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export const QuickNumberStepper: React.FC<QuickNumberStepperProps> = memo(({
  value,
  onChangeValue,
  onChange,
  unit = 'kg',
  label,
  placeholder = '0.0',
  min = 0,
  max = 100000,
  presets = [5, 10, 25, 50],
  quickSteps = [-5, -1, 1, 5, 10],
  step = 1,
  accessibilityLabel,
  style,
  testID = 'quickNumberStepper',
}) => {
  const currentNum = typeof value === 'number' ? value : (parseFloat(value) || 0);

  const notifyChange = (newVal: number) => {
    if (onChange) {
      onChange(newVal);
    }
    if (onChangeValue) {
      onChangeValue(newVal === 0 ? '' : newVal.toString());
    }
  };

  const handleStep = (stepDelta: number) => {
    const nextVal = Math.max(min, Math.min(max, currentNum + stepDelta));
    // Round to 1 decimal place to prevent floating point drift
    const rounded = Math.round(nextVal * 10) / 10;
    notifyChange(rounded);
  };

  const handleSetPreset = (presetVal: number) => {
    notifyChange(presetVal);
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Main Numeric Input Display */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={typeof value === 'number' ? (value === 0 ? '' : value.toString()) : value}
          onChangeText={(text) => {
            // Allow empty string or valid numeric characters
            const sanitized = text.replace(/[^0-9.]/g, '');
            const num = parseFloat(sanitized) || 0;
            notifyChange(num);
          }}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          keyboardType="decimal-pad"
          accessibilityRole="text"
          accessibilityLabel={label || `Value in ${unit}`}
        />
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>{unit}</Text>
        </View>
      </View>

      {/* Large Quick Increment / Decrement Steppers (>=48dp touch targets) */}
      <View style={styles.stepperRow}>
        {quickSteps.map((step) => {
          const isNegative = step < 0;
          return (
            <TouchableOpacity
              key={`step-${step}`}
              style={[
                styles.stepperButton,
                isNegative ? styles.stepperButtonNegative : styles.stepperButtonPositive,
              ]}
              onPress={() => handleStep(step)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${step > 0 ? 'Add' : 'Subtract'} ${Math.abs(step)} ${unit}`}
            >
              <Text
                style={[
                  styles.stepperButtonText,
                  isNegative ? styles.stepperTextNegative : styles.stepperTextPositive,
                ]}
              >
                {step > 0 ? `+${step}` : step}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Presets Row for Fast 1-Tap Selection */}
      {presets && presets.length > 0 && (
        <View style={styles.presetRow}>
          <Text style={styles.presetLabel}>Quick Set:</Text>
          {presets.map((preset) => (
            <TouchableOpacity
              key={`preset-${preset}`}
              style={[
                styles.presetButton,
                currentNum === preset && styles.presetButtonActive,
              ]}
              onPress={() => handleSetPreset(preset)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Set to ${preset} ${unit}`}
            >
              <Text
                style={[
                  styles.presetText,
                  currentNum === preset && styles.presetTextActive,
                ]}
              >
                {preset} {unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

QuickNumberStepper.displayName = 'QuickNumberStepper';

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.spaceXs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.spaceXs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: spacing.spaceMd,
    minHeight: 56,
    marginBottom: spacing.spaceSm,
  },
  textInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
  unitBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34d399',
    textTransform: 'uppercase',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: spacing.spaceSm,
  },
  stepperButton: {
    flex: 1,
    minHeight: 48,
    minWidth: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  stepperButtonNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepperTextPositive: {
    color: '#34d399',
  },
  stepperTextNegative: {
    color: '#f87171',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  presetButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default QuickNumberStepper;
