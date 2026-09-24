/**
 * NegotiationTimeline
 * Conversation-like commercial timeline for price negotiation.
 * Shows buyer/seller exchange in chronological order.
 * NOT a chat app — a commercial negotiation record.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export interface NegotiationStep {
  id: string;
  actor: 'BUYER' | 'SELLER';
  ratePerKg: number;
  timestamp?: string;
  note?: string;
  isCurrent?: boolean;
}

interface NegotiationTimelineProps {
  steps: NegotiationStep[];
  materialLabel?: string;
  quantityKg?: number;
}

export const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({
  steps,
  materialLabel,
  quantityKg,
}) => {
  return (
    <View style={styles.container}>
      {materialLabel && (
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>
            {materialLabel}{quantityKg ? ` · ${quantityKg} kg` : ''}
          </Text>
        </View>
      )}

      <View style={styles.timeline}>
        {steps.map((step, idx) => {
          const isBuyer = step.actor === 'BUYER';
          const isCurrent = step.isCurrent;
          const totalEstimate = quantityKg && step.ratePerKg
            ? Number(step.ratePerKg * quantityKg).toLocaleString('en-IN')
            : null;

          return (
            <View key={step.id} style={styles.stepWrapper}>
              {/* Actor label */}
              <Text style={[styles.actorLabel, isBuyer ? styles.actorBuyer : styles.actorSeller]}>
                {isBuyer ? 'BUYER' : 'YOU'}
              </Text>

              {/* Rate bubble */}
              <View style={[
                styles.bubble,
                isBuyer ? styles.bubbleBuyer : styles.bubbleSeller,
                isCurrent && styles.bubbleCurrent,
              ]}>
                <Text style={[
                  styles.rateText,
                  isBuyer ? styles.rateBuyer : styles.rateSeller,
                  isCurrent && styles.rateCurrent,
                ]}>
                  ₹{Number(step.ratePerKg).toLocaleString('en-IN')}/kg
                </Text>
                {totalEstimate && isCurrent && (
                  <Text style={styles.totalEstimate}>≈ ₹{totalEstimate} total</Text>
                )}
                {step.note && (
                  <Text style={styles.noteText}>{step.note}</Text>
                )}
              </View>

              {/* Timestamp */}
              {step.timestamp && (
                <Text style={styles.timestamp}>{step.timestamp}</Text>
              )}

              {/* Connector between steps */}
              {idx < steps.length - 1 && (
                <View style={styles.connector}>
                  <View style={styles.connectorLine} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  contextRow: {
    paddingHorizontal: 20,
  },
  contextLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  timeline: {
    paddingHorizontal: 20,
    gap: 0,
  },
  stepWrapper: {
    gap: 4,
  },
  actorLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actorBuyer: {
    color: '#22D3EE',
    textAlign: 'left',
  },
  actorSeller: {
    color: '#10B981',
    textAlign: 'right',
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '72%',
    borderWidth: 1,
  },
  bubbleBuyer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderColor: 'rgba(6,182,212,0.25)',
  },
  bubbleSeller: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  bubbleCurrent: {
    borderWidth: 1.5,
  },
  rateText: {
    fontSize: 18,
    fontWeight: '800',
  },
  rateBuyer: {
    color: '#67E8F9',
  },
  rateSeller: {
    color: '#34D399',
  },
  rateCurrent: {
    fontSize: 22,
  },
  totalEstimate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  noteText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    fontStyle: 'italic',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  connector: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  connectorLine: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default NegotiationTimeline;
