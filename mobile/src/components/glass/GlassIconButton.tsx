/**
 * GlassIconButton
 * Accessible icon button with glass surface and >= 44dp touch target.
 */

import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';

interface GlassIconButtonProps {
  icon: string | React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  style?: ViewStyle;
  iconStyle?: TextStyle;
  disabled?: boolean;
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = memo(({
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  style,
  iconStyle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {typeof icon === 'string' ? (
        <Text style={[styles.iconText, iconStyle]}>{icon}</Text>
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
});

GlassIconButton.displayName = 'GlassIconButton';

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.90)',
  },
  iconText: {
    fontSize: 18,
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default GlassIconButton;
