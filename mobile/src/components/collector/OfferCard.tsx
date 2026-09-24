/**
 * OfferCard
 * Marketplace inbox card — shows the actual commercial decision.
 * Buyer, material, qty, rate, total, pickup, validity, status.
 * Primary action: REVIEW OFFER
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CompactStatusBadge } from './CompactStatusBadge';

export interface OfferCardData {
  id: string;
  buyerName: string;
  material: string;
  materialIcon?: string;
  quantityKg: number;
  ratePerKg: number;
  totalAmount: number;
  pickupInfo?: string;
  validUntil?: string;
  status: string;
  isCounterPending?: boolean;
  counterRate?: number;
}

interface OfferCardProps {
  offer: OfferCardData;
  onReview: () => void;
  onAccept?: () => void;
  onCounter?: () => void;
  onDecline?: () => void;
  expanded?: boolean;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onReview,
  onAccept,
  onCounter,
  onDecline,
  expanded = false,
}) => {
  const totalFormatted = Number(offer.totalAmount).toLocaleString('en-IN');
  const rateFormatted = Number(offer.ratePerKg).toLocaleString('en-IN');

  return (
    <View style={styles.card}>
      {/* Header row: buyer + status */}
      <View style={styles.headerRow}>
        <View style={styles.buyerBlock}>
          <View style={styles.buyerAvatar}>
            <Text style={styles.buyerAvatarText}>{(offer.buyerName || 'R').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.buyerInfo}>
            <Text style={styles.buyerName} numberOfLines={1}>{offer.buyerName}</Text>
            <Text style={styles.buyerLabel}>Buyer</Text>
          </View>
        </View>
        <CompactStatusBadge status={offer.status} />
      </View>

      {/* Material + financial summary */}
      <View style={styles.financialRow}>
        <View style={styles.materialBlock}>
          <Text style={styles.materialIcon}>{offer.materialIcon || '📦'}</Text>
          <Text style={styles.materialLabel} numberOfLines={1}>{offer.material}</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{offer.quantityKg} kg</Text>
            <Text style={styles.metricLabel}>Weight</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>₹{rateFormatted}/kg</Text>
            <Text style={styles.metricLabel}>Rate</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={[styles.metricValue, styles.totalValue]}>₹{totalFormatted}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Counter info if negotiating */}
      {offer.isCounterPending && offer.counterRate && (
        <View style={styles.counterRow}>
          <Text style={styles.counterLabel}>Your counter:</Text>
          <Text style={styles.counterValue}>₹{Number(offer.counterRate).toLocaleString('en-IN')}/kg</Text>
        </View>
      )}

      {/* Pickup + validity */}
      {(offer.pickupInfo || offer.validUntil) && (
        <View style={styles.infoRow}>
          {offer.pickupInfo && (
            <Text style={styles.infoText} numberOfLines={1}>🚚 {offer.pickupInfo}</Text>
          )}
          {offer.validUntil && (
            <Text style={styles.infoText} numberOfLines={1}>⏱ Valid: {offer.validUntil}</Text>
          )}
        </View>
      )}

      {/* Action row */}
      {expanded ? (
        <View style={styles.expandedActions}>
          {onAccept && (
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} accessibilityRole="button">
              <Text style={styles.acceptBtnText}>ACCEPT</Text>
            </TouchableOpacity>
          )}
          {onCounter && (
            <TouchableOpacity style={styles.counterBtn} onPress={onCounter} accessibilityRole="button">
              <Text style={styles.counterBtnText}>COUNTER</Text>
            </TouchableOpacity>
          )}
          {onDecline && (
            <TouchableOpacity style={styles.declineBtn} onPress={onDecline} accessibilityRole="button">
              <Text style={styles.declineBtnText}>DECLINE</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.reviewBtn} onPress={onReview} accessibilityRole="button">
          <Text style={styles.reviewBtnText}>REVIEW OFFER →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buyerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  buyerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6,182,212,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(6,182,212,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerAvatarText: {
    color: '#22D3EE',
    fontSize: 15,
    fontWeight: '800',
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buyerLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
  },
  financialRow: {
    gap: 10,
  },
  materialBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  materialIcon: {
    fontSize: 20,
  },
  materialLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    color: '#10B981',
    fontSize: 15,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  counterValue: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  infoRow: {
    gap: 4,
  },
  infoText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewBtn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewBtnText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#071E22',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  counterBtn: {
    flex: 1,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  counterBtnText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
  },
  declineBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default OfferCard;
