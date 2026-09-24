/**
 * EarningsRow
 * Single transaction row for the earnings ledger.
 * Shows: material, date, qty, rate, total, payment status.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CompactStatusBadge } from './CompactStatusBadge';

interface EarningsRowProps {
  material: string;
  materialIcon?: string;
  date: string;
  quantityKg?: number;
  ratePerKg?: number;
  totalAmount: number;
  paymentStatus: string;
  onPress?: () => void;
  onViewBill?: () => void;
}

export const EarningsRow: React.FC<EarningsRowProps> = ({
  material,
  materialIcon = '📦',
  date,
  quantityKg,
  ratePerKg,
  totalAmount,
  paymentStatus,
  onPress,
  onViewBill,
}) => {
  const isPaid = paymentStatus === 'PAID';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      {/* Icon */}
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{materialIcon}</Text>
      </View>

      {/* Info */}
      <View style={styles.infoCol}>
        <Text style={styles.materialText} numberOfLines={1}>{material}</Text>
        <Text style={styles.dateText}>{date}</Text>
        {quantityKg !== undefined && ratePerKg !== undefined && (
          <Text style={styles.detailText}>
            {quantityKg} kg · ₹{Number(ratePerKg).toLocaleString('en-IN')}/kg
          </Text>
        )}
      </View>

      {/* Amount + status */}
      <View style={styles.rightCol}>
        <Text style={[styles.amount, isPaid ? styles.amountPaid : styles.amountPending]}>
          ₹{Number(totalAmount).toLocaleString('en-IN')}
        </Text>
        <CompactStatusBadge status={paymentStatus} />
        {onViewBill && (
          <TouchableOpacity
            onPress={onViewBill}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.billLink}>Bill →</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  materialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  detailText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  amount: {
    fontSize: 16,
    fontWeight: '900',
  },
  amountPaid: {
    color: '#10B981',
  },
  amountPending: {
    color: '#F59E0B',
  },
  billLink: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default EarningsRow;
