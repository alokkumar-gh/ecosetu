/**
 * OrderStatusRow
 * Compact procurement order row for the ORDERS screen.
 * Shows: material, counterparty, qty, deal value, status, primary action.
 * Highlights urgency with a left accent color.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RecyclerStatusBadge } from './RecyclerStatusBadge';

export interface OrderItem {
  id: string;
  material: string;
  materialIcon?: string;
  counterparty?: string;
  weightKg?: number;
  agreedRate?: number;
  totalValue?: number;
  status: string;
  actionLabel?: string;
  urgency?: 'high' | 'medium' | 'low';
  updatedAt?: string;
  offerCount?: number;
}

interface OrderStatusRowProps {
  order: OrderItem;
  onPress: () => void;
  onAction?: () => void;
}

const URGENCY_COLOR: Record<string, string> = {
  high:   '#F59E0B',
  medium: '#22D3EE',
  low:    'rgba(255,255,255,0.1)',
};

export const OrderStatusRow: React.FC<OrderStatusRowProps> = ({
  order,
  onPress,
  onAction,
}) => {
  const accentColor = URGENCY_COLOR[order.urgency || 'low'];

  return (
    <TouchableOpacity
      style={[styles.row, { borderLeftColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Order: ${order.material}, status ${order.status}`}
    >
      <View style={styles.main}>
        <View style={styles.topRow}>
          <View style={styles.materialBlock}>
            <Text style={styles.icon}>{order.materialIcon || '📦'}</Text>
            <View>
              <Text style={styles.material} numberOfLines={1}>{order.material}</Text>
              {order.counterparty && (
                <Text style={styles.counterparty} numberOfLines={1}>{order.counterparty}</Text>
              )}
            </View>
          </View>
          <RecyclerStatusBadge status={order.status} />
        </View>

        <View style={styles.metricsRow}>
          {order.weightKg !== undefined && (
            <Text style={styles.metric}>{order.weightKg} kg</Text>
          )}
          {order.agreedRate !== undefined && (
            <Text style={styles.metric}>₹{order.agreedRate}/kg</Text>
          )}
          {order.totalValue !== undefined && (
            <Text style={[styles.metric, styles.totalValue]}>
              ₹{order.totalValue.toLocaleString('en-IN')}
            </Text>
          )}
          {order.updatedAt && (
            <Text style={styles.time}>{order.updatedAt}</Text>
          )}
        </View>
      </View>

      {order.actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{order.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 10,
  },
  main:          { flex: 1, gap: 8 },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  icon:          { fontSize: 20 },
  material:      { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  counterparty:  { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  metricsRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metric:        { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  totalValue:    { color: '#22D3EE', fontWeight: '800' },
  time:          { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', marginLeft: 'auto' as any },
  actionBtn: {
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  actionText: { color: '#22D3EE', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});

export default OrderStatusRow;
