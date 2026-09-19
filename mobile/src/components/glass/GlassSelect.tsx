/**
 * GlassSelect
 * Accessible dropdown selector with modal picker dialog and glass aesthetics.
 */

import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface SelectOption {
  label: string;
  value: string;
  icon?: string;
}

interface GlassSelectProps {
  label?: string;
  options: SelectOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = memo(({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
  style,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        style={[styles.selectBox, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selectedOption?.label || placeholder}` : placeholder}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.selectedText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedOption ? (
            `${selectedOption.icon ? `${selectedOption.icon} ` : ''}${selectedOption.label}`
          ) : (
            placeholder
          )}
        </Text>
        <Text style={styles.arrowIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || placeholder}</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close selection dialog"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isItemActive = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      isItemActive && styles.optionRowActive,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setIsOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isItemActive && styles.optionTextActive,
                      ]}
                    >
                      {item.icon ? `${item.icon} ` : ''}
                      {item.label}
                    </Text>
                    {isItemActive && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

GlassSelect.displayName = 'GlassSelect';

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.spaceXs,
  },
  label: {
    fontSize: typography.Label.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.spaceXs,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.spaceMd,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.85)',
  },
  selectedText: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textTertiary,
  },
  arrowIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 41, 66, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.90)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.80)',
    backgroundColor: 'rgba(248, 250, 252, 0.90)',
  },
  modalTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 41, 66, 0.05)',
  },
  closeIcon: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241, 245, 249, 0.80)',
  },
  optionRowActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  optionText: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextActive: {
    fontWeight: '700',
    color: colors.accent,
  },
  checkIcon: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
  },
});

export default GlassSelect;
