/**
 * EcoOTPInput — Premium 6-digit OTP input.
 *
 * Features:
 * - 6 individual glass cells
 * - Auto-focus advance on input
 * - Backspace retreat
 * - Paste support
 * - Animated active cell glow
 * - Error state
 * - Success state (cells turn green)
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { AUTH_COLORS, AUTH_RADIUS, AUTH_TIMING } from './AuthTheme';
import { AppIcon } from '../../ui/AppIcon';

const OTP_LENGTH = 6;

interface EcoOTPInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string | null;
  success?: boolean;
  autoFocus?: boolean;
}

export const EcoOTPInput: React.FC<EcoOTPInputProps> = ({
  value,
  onChange,
  error,
  success = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '');
  const cellAnims = useRef(
    Array.from({ length: OTP_LENGTH }, () => new Animated.Value(0))
  ).current;

  const [focusedIndex, setFocusedIndex] = useState<number>(autoFocus ? 0 : -1);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRefs.current[0]?.focus(), 350);
    }
  }, [autoFocus]);

  // Animate active cell
  useEffect(() => {
    cellAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === focusedIndex ? 1 : 0,
        duration: AUTH_TIMING.input,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [focusedIndex, cellAnims]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');

    // Handle paste of full OTP
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, OTP_LENGTH);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      setFocusedIndex(nextIndex);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    const newVal = newDigits.join('');
    onChange(newVal);

    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const isFocused = focusedIndex === i;
          const hasDigit = Boolean(digits[i]);
          const borderColor = cellAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [
              error
                ? AUTH_COLORS.borderError
                : hasDigit
                  ? 'rgba(52,211,153,0.45)'
                  : AUTH_COLORS.borderSubtle,
              success
                ? AUTH_COLORS.primaryLight
                : error
                  ? AUTH_COLORS.borderError
                  : AUTH_COLORS.borderFocus,
            ],
          });

          const bgColor = cellAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [
              AUTH_COLORS.bgCard,
              success ? AUTH_COLORS.primaryDim : AUTH_COLORS.bgInputFocus,
            ],
          });

          return (
            <Animated.View
              key={i}
              style={[
                styles.cell,
                {
                  borderColor,
                  backgroundColor: bgColor,
                  transform: [
                    {
                      scale: cellAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.04],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TextInput
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[
                  styles.cellInput,
                  { color: success ? AUTH_COLORS.primaryLight : AUTH_COLORS.textPrimary },
                ]}
                value={digits[i]}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(-1)}
                keyboardType="number-pad"
                maxLength={Platform.OS === 'android' ? 1 : 6} // Android: max 1, iOS handles paste via maxLength bypass
                textAlign="center"
                selectionColor={AUTH_COLORS.primary}
                accessibilityLabel={`OTP digit ${i + 1}`}
                caretHidden
              />
            </Animated.View>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <AppIcon name="alert" size={13} color={AUTH_COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  cell: {
    width: 46,
    height: 56,
    borderRadius: AUTH_RADIUS.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellInput: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0,
  },
  errorRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: AUTH_COLORS.error,
  },
});
