/**
 * RecyclerNegotiationTimeline
 * Commercial negotiation history — NOT a social chat.
 * Shows: offer entries with amounts, timestamps, who submitted.
 * Highlights current/latest offer clearly.
 * Accept/Counter actions below.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export interface NegotiationEntry {
  id: string;
  party: 'SELLER' | 'BUYER';
  partyLabel: string;
  unitPricePer: number;
  totalValue?: number;
  weightKg?: number;
  notes?: string;
  timestamp: string;
  isLatest?: boolean;
}

interface RecyclerNegotiationTimelineProps {
  entries: NegotiationEntry[];
  material: string;
  weightKg: number;
  unit?: string;
  onAccept?: () => void;
  onCounter?: () => void;
  onReject?: () => void;
  myRole?: 'BUYER' | 'SELLER';
  isMyTurn?: boolean;
  canAct?: boolean;
}

export const RecyclerNegotiationTimeline: React.FC<RecyclerNegotiationTimelineProps> = ({
  entries,
  material,
  weightKg,
  unit = 'kg',
  onAccept,
  onCounter,
  onReject,
  myRole = 'BUYER',
  isMyTurn = false,
  canAct = true,
}) => {
  const latestEntry = entries[entries.length - 1];
  const totalVal    = latestEntry ? latestEntry.unitPricePer * weightKg : null;

  return (
    <View style={styles.container}>
      {/* Context header */}
      <View style={styles.contextHeader}>
        <Text style={styles.materialLabel}>{material} · {weightKg} {unit}</Text>
        {totalVal !== null && (
          <Text style={styles.totalVal}>
            ₹{totalVal.toLocaleString('en-IN')} total
          </Text>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {entries.map((entry, i) => {
          const isMe    = entry.party === myRole;
          const isLast  = i === entries.length - 1;
          return (
            <View key={entry.id} style={styles.entryRow}>
              {/* Line connector */}
              <View style={styles.lineCol}>
                <View style={[
                  styles.dot,
                  isLast && styles.dotLatest,
                  isMe ? styles.dotMe : styles.dotThem,
                ]} />
                {!isLast && <View style={styles.connector} />}
              </View>

              {/* Bubble */}
              <View style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleThem,
                isLast && styles.bubbleLatest,
              ]}>
                <View style={styles.bubbleHeader}>
                  <Text style={styles.partyLabel}>{entry.partyLabel}</Text>
                  <Text style={styles.timestamp}>{entry.timestamp}</Text>
                </View>
                <Text style={[styles.price, isMe ? styles.priceMe : styles.priceThem]}>
                  ₹{entry.unitPricePer}/{unit}
                </Text>
                {entry.totalValue !== undefined && (
                  <Text style={styles.subtotal}>
                    ≈ ₹{entry.totalValue.toLocaleString('en-IN')} total
                  </Text>
                )}
                {entry.notes ? (
                  <Text style={styles.notes}>{entry.notes}</Text>
                ) : null}
                {isLast && (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>CURRENT OFFER</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      {canAct && isMyTurn && entries.length > 0 && (
        <View style={styles.actions}>
          {onAccept && (
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              accessibilityRole="button"
            >
              <Text style={styles.acceptText}>✓ ACCEPT</Text>
            </TouchableOpacity>
          )}
          {onCounter && (
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={onCounter}
              accessibilityRole="button"
            >
              <Text style={styles.counterText}>↔ COUNTER</Text>
            </TouchableOpacity>
          )}
          {onReject && (
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={onReject}
              accessibilityRole="button"
            >
              <Text style={styles.rejectText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isMyTurn && entries.length > 0 && (
        <View style={styles.waitingRow}>
          <Text style={styles.waitingText}>⏳ Waiting for seller response</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  materialLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  totalVal:      { color: '#22D3EE', fontSize: 15, fontWeight: '900' },
  timeline:      { gap: 0 },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
  },
  lineCol: {
    alignItems: 'center',
    width: 20,
    paddingTop: 4,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  dotMe:     { borderColor: '#22D3EE', backgroundColor: '#22D3EE' },
  dotThem:   { borderColor: '#10B981', backgroundColor: '#10B981' },
  dotLatest: { width: 14, height: 14, borderRadius: 7, marginLeft: -2 },
  connector: {
    width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 4, marginBottom: 4,
    minHeight: 20,
  },
  bubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  bubbleMe:     { borderColor: 'rgba(34,211,238,0.2)', backgroundColor: 'rgba(34,211,238,0.05)' },
  bubbleThem:   { borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.04)' },
  bubbleLatest: { borderWidth: 1.5 },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partyLabel:   { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700' },
  timestamp:    { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '500' },
  price:        { fontSize: 22, fontWeight: '900', marginTop: 2 },
  priceMe:      { color: '#22D3EE' },
  priceThem:    { color: '#34D399' },
  subtotal:     { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  notes:        { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  latestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  latestBadgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptText:  { color: '#071E22', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
  counterBtn: {
    flex: 1,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  counterText: { color: '#22D3EE', fontSize: 14, fontWeight: '800' },
  rejectBtn: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { color: '#FCA5A5', fontSize: 16, fontWeight: '900' },
  waitingRow: {
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  waitingText: { color: '#FDE68A', fontSize: 13, fontWeight: '600' },
});

export default RecyclerNegotiationTimeline;
