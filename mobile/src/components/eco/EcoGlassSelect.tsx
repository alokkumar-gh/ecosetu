/**
 * EcoGlassSelect.tsx
 * Unified EcoSetu Dropdown / Selection Primitive
 *
 * Visual Invariants:
 * - Zero white dropdown panel or white option lists.
 * - Dark translucent trigger button (rgba(6, 21, 27, 0.85)) with chevron indicator.
 * - Dark glass modal dialog (#071A21) with luminous border and emerald selection badge.
 * - Label sits clearly ABOVE the field.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { spacing } from '../../theme/spacing';

export interface EcoSelectOption {
  label: string;
  value: string;
  icon?: string;
  sublabel?: string;
}

export interface EcoGlassSelectProps {
  label?: string;
  options: EcoSelectOption[];
  selectedValue?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  triggerStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

export const EcoGlassSelect: React.FC<EcoGlassSelectProps> = ({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option...',
  error,
  disabled = false,
  containerStyle,
  triggerStyle,
  labelStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled, containerStyle]}>
      {Boolean(label) && <Text style={[styles.label, labelStyle]}>{label}</Text>}

      <TouchableOpacity
        style={[
          styles.trigger,
          Boolean(error) && styles.triggerError,
          disabled && styles.triggerDisabled,
          triggerStyle,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="combobox"
        accessibilityLabel={label || placeholder}
      >
        <Text
          style={[styles.triggerText, !selectedOption && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedOption ? (
            <>
              {selectedOption.icon ? `${selectedOption.icon}  ` : ''}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}

      {/* Dark Glass Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {item.icon ? `${item.icon}  ` : ''}
                        {item.label}
                      </Text>
                      {Boolean(item.sublabel) && (
                        <Text style={styles.optionSublabel}>{item.sublabel}</Text>
                      )}
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              style={styles.optionsList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default EcoGlassSelect;

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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  triggerError: {
    borderColor: '#EF4444',
  },
  triggerDisabled: {
    backgroundColor: 'rgba(6, 21, 27, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  chevron: {
    fontSize: 16,
    color: '#34D399',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 4,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#071A21',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    padding: spacing.spaceMd,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 212, 191, 0.15)',
    marginBottom: spacing.spaceSm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  optionsList: {
    maxHeight: 320,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#34D399',
    fontWeight: '700',
  },
  optionSublabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    color: '#34D399',
    fontWeight: '700',
    marginLeft: 10,
  },
});
