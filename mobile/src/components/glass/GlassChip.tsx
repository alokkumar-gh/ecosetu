import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface GlassChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
}

export const GlassChip: React.FC<GlassChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
  labelStyle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        disabled && styles.chipDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelUnselected,
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: spacing.radiusSm,
    borderWidth: 1,
    marginRight: 6,
    marginVertical: 4,
  },
  chipUnselected: {
    backgroundColor: colors.glassFill,
    borderColor: colors.glassBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightMedium,
  },
  labelUnselected: {
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.textInverse,
    fontWeight: typography.fontWeightBold,
  },
});

export default GlassChip;
