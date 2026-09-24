/**
 * ActionHero
 * Contextual attention block — shows what needs the collector's attention right now.
 * Replaces the "Needs Your Attention" section with a more prominent, scannable hero.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface AttentionItem {
  id: string;
  icon: string;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  onPress: () => void;
}

interface ActionHeroProps {
  items: AttentionItem[];
  totalCount?: number;
}

export const ActionHero: React.FC<ActionHeroProps> = ({ items, totalCount }) => {
  if (!items || items.length === 0) return null;

  const visibleCount = totalCount ?? items.reduce((s, i) => s + i.count, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>NEEDS ATTENTION</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{visibleCount}</Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsRow}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}
            onPress={item.onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.count}`}
          >
            <View style={styles.itemTop}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={[styles.itemCountBadge, { backgroundColor: item.color }]}>
                <Text style={styles.itemCountText}>{item.count}</Text>
              </View>
            </View>
            <Text style={[styles.itemLabel, { color: item.color }]} numberOfLines={2}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  countPill: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countPillText: {
    color: '#1A0A00',
    fontSize: 11,
    fontWeight: '900',
  },
  itemsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  item: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemIcon: {
    fontSize: 24,
  },
  itemCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCountText: {
    color: '#071E22',
    fontSize: 13,
    fontWeight: '900',
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});

export default ActionHero;
