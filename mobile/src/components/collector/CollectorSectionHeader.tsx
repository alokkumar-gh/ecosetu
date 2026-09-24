/**
 * CollectorSectionHeader
 * Clean section label with optional action link.
 * Uses typography + spacing hierarchy instead of card containers.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CollectorSectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  count?: number;
}

export const CollectorSectionHeader: React.FC<CollectorSectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
  count,
}) => (
  <View style={styles.row}>
    <View style={styles.left}>
      <Text style={styles.title}>{title}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
    {actionLabel && onAction && (
      <TouchableOpacity
        onPress={onAction}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
      >
        <Text style={styles.action}>{actionLabel} →</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    color: '#071E22',
    fontSize: 11,
    fontWeight: '900',
  },
  action: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CollectorSectionHeader;
