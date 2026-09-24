/**
 * PaymentSummary
 * The "YOUR MONEY" hero at the top of earnings screen.
 * Large total, pending/paid breakdown, no decorative charts.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface PaymentSummaryProps {
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  period?: string;
  onViewAll?: () => void;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  totalAmount,
  pendingAmount,
  paidAmount,
  period = 'All time',
  onViewAll,
}) => {
  const formatAmount = (n: number) =>
    Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <View style={styles.container}>
      {/* YOUR MONEY label */}
      <Text style={styles.yourMoneyLabel}>YOUR MONEY</Text>

      {/* Hero total */}
      <Text style={styles.heroAmount}>₹{formatAmount(totalAmount)}</Text>
      <Text style={styles.periodLabel}>{period}</Text>

      {/* Breakdown row */}
      <View style={styles.breakdownRow}>
        {/* Pending */}
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownDot, { backgroundColor: '#F59E0B' }]} />
          <View>
            <Text style={styles.breakdownAmount}>₹{formatAmount(pendingAmount)}</Text>
            <Text style={styles.breakdownLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.breakdownDivider} />

        {/* Paid */}
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownDot, { backgroundColor: '#10B981' }]} />
          <View>
            <Text style={[styles.breakdownAmount, { color: '#10B981' }]}>₹{formatAmount(paidAmount)}</Text>
            <Text style={styles.breakdownLabel}>Received</Text>
          </View>
        </View>
      </View>

      {/* View all link */}
      {onViewAll && (
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={onViewAll}
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View all transactions →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'flex-start',
    gap: 6,
  },
  yourMoneyLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 48,
  },
  periodLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: '100%',
    gap: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  breakdownAmount: {
    color: '#F59E0B',
    fontSize: 17,
    fontWeight: '800',
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  breakdownDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewAllBtn: {
    marginTop: 4,
  },
  viewAllText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default PaymentSummary;
