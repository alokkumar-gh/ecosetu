/**
 * ProcurementSummary
 * "PROCUREMENT TODAY" hero block at top of Market screen.
 * Shows 3–4 compact counters: new lots, active offers, pickups today, sourcing.
 * Only renders counts >0. Tapping navigates to the relevant section.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ProcurementCounter {
  id: string;
  count: number;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface ProcurementSummaryProps {
  counters: ProcurementCounter[];
  todayDate?: string;
}

export const ProcurementSummary: React.FC<ProcurementSummaryProps> = ({
  counters,
  todayDate,
}) => {
  const activeCounters = counters.filter((c) => c.count > 0);
  if (activeCounters.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>PROCUREMENT TODAY</Text>
        {todayDate && <Text style={styles.date}>{todayDate}</Text>}
      </View>

      <View style={styles.countersRow}>
        {activeCounters.slice(0, 4).map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.counter}
            onPress={c.onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${c.count} ${c.label}`}
          >
            <View style={styles.counterTop}>
              <Text style={styles.counterIcon}>{c.icon}</Text>
              <Text style={[styles.counterNum, { color: c.color }]}>{c.count}</Text>
            </View>
            <Text style={styles.counterLabel} numberOfLines={2}>{c.label}</Text>
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
    justifyContent: 'space-between',
  },
  title: {
    color: '#22D3EE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  date: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '500',
  },
  countersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  counter: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    minHeight: 72,
    justifyContent: 'space-between',
  },
  counterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterIcon: {
    fontSize: 18,
  },
  counterNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  counterLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
});

export default ProcurementSummary;
