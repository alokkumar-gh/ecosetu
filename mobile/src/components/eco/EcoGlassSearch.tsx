/**
 * EcoGlassSearch.tsx
 * Unified EcoSetu Search Input Primitive
 *
 * Visual Invariants:
 * - Dark translucent glass capsule (rgba(6, 21, 27, 0.85))
 * - Luminous cyan/emerald border glow on focus
 * - Integrated search icon and instant clear button (✕)
 * - Zero white/pale background
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { spacing } from '../../theme/spacing';

export interface EcoGlassSearchProps extends TextInputProps {
  onClear?: () => void;
  containerStyle?: ViewStyle;
}

export const EcoGlassSearch: React.FC<EcoGlassSearchProps> = ({
  value = '',
  onChangeText,
  onClear,
  placeholder = 'Search...',
  containerStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        containerStyle,
      ]}
    >
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        selectionColor="#10B981"
        cursorColor="#10B981"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        underlineColorAndroid="transparent"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={placeholder}
        {...props}
      />
      {Boolean(value) && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search text"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.clearBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EcoGlassSearch;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    paddingHorizontal: spacing.spaceMd,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  containerFocused: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
});
