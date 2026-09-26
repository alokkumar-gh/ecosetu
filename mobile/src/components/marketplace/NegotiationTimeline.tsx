/**
 * EcoSetu Negotiation Timeline Component
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10
 *
 * Real two-sided negotiation timeline UI:
 * - Read-only chronological visualization of initial offers, counter-offers, and revisions
 * - Clear actor badges: Recycler (Buyer), Collector (Seller), Platform
 * - Factual rate, unit, quantity, and total calculation breakdown
 * - Timestamped event trail preserved from audit logs and quote notes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NegotiationEvent, RecyclerQuote, quoteService } from '../../services/quoteService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon, IconName } from '../ui/AppIcon';

interface Props {
  timeline?: NegotiationEvent[];
  quote?: RecyclerQuote;
}

export const NegotiationTimeline: React.FC<Props> = ({ timeline, quote }) => {
  let events = timeline;
  if (!events && quote) {
    events = quoteService.parseNegotiationTimeline(quote);
  }

  if (!events || events.length === 0) {
    return null;
  }

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <AppIcon name="history" size={14} color="#CBD5E1" />
        <Text style={styles.title}>Negotiation Timeline</Text>
      </View>
      <View style={styles.timelineList}>
        {events.map((event, index) => {
          const isCollector = event.actor === 'Collector';
          const isRecycler = event.actor === 'Recycler';
          const isAccepted = event.actionType === 'ACCEPTED';
          const isRejected = event.actionType === 'REJECTED';
          const isCancelled = event.actionType === 'CANCELLED';
          const actorIconName: IconName = isCollector ? 'truck' : isRecycler ? 'warehouse' : 'scale';

          return (
            <React.Fragment key={event.id || String(index)}>
              {index > 0 && (
                <View style={styles.connectorRow}>
                  <View style={styles.connectorLine} />
                  <Text style={styles.connectorText}>
                    {isAccepted ? 'Accepted Deal' : isCollector ? 'Counter Offer' : isRecycler ? 'Revised Offer' : 'Decision'}
                  </Text>
                  <View style={styles.connectorLine} />
                </View>
              )}

              <View
                style={[
                  styles.eventCard,
                  isCollector && styles.collectorCard,
                  isRecycler && styles.recyclerCard,
                  isAccepted && styles.acceptedCard,
                  (isRejected || isCancelled) && styles.rejectedCard,
                ]}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.actorBadge}>
                    <AppIcon
                      name={actorIconName}
                      size={12}
                      color={isCollector ? '#60A5FA' : isRecycler ? '#34D399' : '#CBD5E1'}
                    />
                    <Text style={styles.actorName}>{event.actorName}</Text>
                  </View>
                  <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
                </View>

                {event.rate !== undefined && event.rate !== null && (
                  <View style={styles.rateRow}>
                    <Text style={styles.rateValue}>
                      ₹{event.rate} <Text style={styles.rateUnit}>/ {event.unit || 'kg'}</Text>
                    </Text>
                    {event.total ? (
                      <Text style={styles.totalValue}>
                        Total: ₹{event.total.toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                )}

                {event.notes ? (
                  <Text style={styles.eventNotes}>
                    "{event.notes}"
                  </Text>
                ) : null}
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  timelineList: {
    paddingVertical: 4,
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  connectorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    paddingHorizontal: 8,
  },
  eventCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  collectorCard: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  recyclerCard: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  acceptedCard: {
    borderColor: 'rgba(16, 185, 129, 0.8)',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  rejectedCard: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actorIcon: {
    fontSize: 12,
  },
  actorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventTime: {
    fontSize: 11,
    color: '#64748B',
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 2,
  },
  rateValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rateUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  eventNotes: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default NegotiationTimeline;
