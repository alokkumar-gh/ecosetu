/**
 * DealStatusRow
 * Compact deal pipeline row for the Deals tab list.
 * Shows stage, material, buyer, amount, primary action in one swipeable row.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CompactStatusBadge } from './CompactStatusBadge';
import { AppIcon, IconName } from '../ui/AppIcon';

interface DealStatusRowProps {
  id: string;
  material: string;
  materialIcon?: string;
  referenceNumber: string;
  status: string;
  quantityKg?: number;
  totalAmount?: number;
  buyerName?: string;
  actionLabel?: string;
  onPress: () => void;
  onAction?: () => void;
  isHighlighted?: boolean;
}

const mapMaterialIcon = (mat: string, fallback?: string): IconName => {
  const m = (mat || '').toLowerCase();
  if (m.includes('phone') || m.includes('mobile')) return 'phone';
  if (m.includes('laptop') || m.includes('computer') || m.includes('pc')) return 'laptop';
  if (m.includes('battery')) return 'battery';
  if (m.includes('pcb') || m.includes('circuit')) return 'sparkles';
  if (m.includes('cable') || m.includes('wire')) return 'recycle';
  return 'box';
};

export const DealStatusRow: React.FC<DealStatusRowProps> = ({
  material,
  materialIcon,
  referenceNumber,
  status,
  quantityKg,
  totalAmount,
  buyerName,
  actionLabel,
  onPress,
  onAction,
  isHighlighted = false,
}) => (
  <TouchableOpacity
    style={[styles.row, isHighlighted && styles.rowHighlighted]}
    onPress={onPress}
    activeOpacity={0.75}
    accessibilityRole="button"
  >
    {/* Icon */}
    <View style={[styles.iconBox, isHighlighted && styles.iconBoxHighlighted]}>
      <AppIcon name={mapMaterialIcon(material, materialIcon)} size={18} color="#10B981" />
    </View>

    {/* Main info */}
    <View style={styles.infoCol}>
      <View style={styles.topRow}>
        <Text style={styles.materialText} numberOfLines={1}>{material}</Text>
        <CompactStatusBadge status={status} />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.refText}>#{referenceNumber.slice(-6)}</Text>
        {quantityKg !== undefined && (
          <Text style={styles.metaText}>{quantityKg} kg</Text>
        )}
        {buyerName && (
          <Text style={styles.metaText} numberOfLines={1}>· {buyerName}</Text>
        )}
      </View>
    </View>

    {/* Right: amount + action */}
    <View style={styles.rightCol}>
      {totalAmount !== undefined && totalAmount > 0 && (
        <Text style={styles.amountText}>
          ₹{Number(totalAmount).toLocaleString('en-IN')}
        </Text>
      )}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.actionPill}
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionPillText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
  },
  rowHighlighted: {
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBoxHighlighted: {
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  icon: {
    fontSize: 22,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  materialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  metaText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  amountText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  actionPill: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 20,
    fontWeight: '300',
    marginTop: 2,
  },
});

export default DealStatusRow;
