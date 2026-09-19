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
    borderRadius: 14,
    backgroundColor: 'rgba(16, 44, 48, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  selectedText: {
    fontSize: typography.Body.fontSize,
    color: '#FFFFFF',
    flex: 1,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.50)',
  },
  arrowIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.70)',
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 23, 0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: 'rgba(7, 30, 34, 0.96)',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(16, 44, 48, 0.85)',
  },
  modalTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  closeIcon: {
    fontSize: 14,
    color: '#FFFFFF',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionRowActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  optionText: {
    fontSize: typography.Body.fontSize,
    color: '#FFFFFF',
    flex: 1,
  },
  optionTextActive: {
    fontWeight: '700',
    color: '#10B981',
  },
  checkIcon: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
  },
});

export default GlassSelect;
