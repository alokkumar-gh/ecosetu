/**
 * EcoSetu Dispute Timeline Component
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 *
 * Chronological visualization of dispute milestones, counterparty responses,
 * weight/financial proposals, return tracking, and final server-authoritative resolutions.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MarketplaceDisputeEvent } from '../../services/disputeService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  events?: MarketplaceDisputeEvent[];
}

export const DisputeTimeline: React.FC<Props> = ({ events }) => {
  if (!events || events.length === 0) {
    return null;
  }

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return ts;
    }
  };

  const formatEventTitle = (eventType: string) => {
    switch (eventType) {
      case 'DISPUTE_OPENED':
        return 'Dispute Opened';
      case 'COUNTERPARTY_RESPONDED':
        return 'Response Received';
      case 'WEIGHT_PROPOSED':
        return 'Weight Proposal';
      case 'WEIGHT_ACCEPTED':
        return 'Weight Correction Accepted';
      case 'PARTIAL_ACCEPTANCE_ACCEPTED':
        return 'Partial Acceptance Settled';
      case 'RETURN_REQUESTED':
        return 'Return Initiated';
      case 'RETURN_COMPLETED':
        return 'Return Recorded as Completed';
      case 'PAYMENT_CORRECTION_APPROVED':
        return 'Payment Adjustment Approved';
      case 'DEAL_CANCELLED':
        return 'Deal Cancelled';
      case 'DISPUTE_CANCELLED':
        return 'Dispute Cancelled';
      case 'DISPUTE_RESOLVED':
        return 'Dispute Resolved';
      default:
        return eventType.replace(/_/g, ' ');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 Dispute & Resolution Timeline</Text>
      <View style={styles.timelineList}>
        {events.map((event, index) => {
          const isCollector = event.actorRole === 'INFORMAL_COLLECTOR';
          const isRecycler = event.actorRole === 'RECYCLER';
          const isAdmin = event.actorRole === 'ADMIN';
          const isResolved = ['DISPUTE_RESOLVED', 'WEIGHT_ACCEPTED', 'RETURN_COMPLETED', 'PARTIAL_ACCEPTANCE_ACCEPTED'].includes(event.eventType);
          const isCancelled = ['DISPUTE_CANCELLED', 'DEAL_CANCELLED'].includes(event.eventType);

          return (
            <React.Fragment key={event.id || String(index)}>
              {index > 0 && (
                <View style={styles.connectorRow}>
                  <View style={styles.connectorLine} />
                  <Text style={styles.connectorText}>↓</Text>
                  <View style={styles.connectorLine} />
                </View>
              )}

              <View
                style={[
                  styles.eventCard,
                  isCollector && styles.collectorCard,
                  isRecycler && styles.recyclerCard,
                  isResolved && styles.resolvedCard,
                  isCancelled && styles.cancelledCard,
                ]}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.actorBadge}>
                    <Text style={styles.actorIcon}>
                      {isCollector ? '👤' : isRecycler ? '🏭' : isAdmin ? '🛡️' : '⚙️'}
                    </Text>
                    <Text style={styles.actorName}>
                      {isCollector ? 'Collector' : isRecycler ? 'Recycler' : isAdmin ? 'Admin' : 'System'}
                    </Text>
                  </View>
                  <Text style={styles.eventTime}>{formatTime(event.createdAt)}</Text>
                </View>

                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{formatEventTitle(event.eventType)}</Text>

                  {event.newStatus && event.previousStatus && event.newStatus !== event.previousStatus && (
                    <View style={styles.statusTransitionRow}>
                      <Text style={styles.statusPill}>{event.previousStatus}</Text>
                      <Text style={styles.arrowText}>→</Text>
                      <Text style={[styles.statusPill, styles.newStatusPill]}>{event.newStatus}</Text>
                    </View>
                  )}

                  {event.note ? (
                    <Text style={styles.eventNote}>"{event.note}"</Text>
                  ) : null}

                  {event.metadata && (
                    <View style={styles.metadataBox}>
                      {event.metadata.proposedWeightKg !== undefined && (
                        <Text style={styles.metadataText}>
                          Proposed Weight: <Text style={styles.bold}>{event.metadata.proposedWeightKg} kg</Text>
                        </Text>
                      )}
                      {event.metadata.resolvedWeightKg !== undefined && (
                        <Text style={styles.metadataText}>
                          Resolved Weight: <Text style={styles.bold}>{event.metadata.resolvedWeightKg} kg</Text>
                        </Text>
                      )}
                      {event.metadata.acceptedQuantityKg !== undefined && (
                        <Text style={styles.metadataText}>
                          Accepted: <Text style={styles.bold}>{event.metadata.acceptedQuantityKg} kg</Text>
                        </Text>
                      )}
                      {event.metadata.rejectedQuantityKg !== undefined && (
                        <Text style={styles.metadataText}>
                          Returned/Rejected: <Text style={styles.bold}>{event.metadata.rejectedQuantityKg} kg</Text>
                        </Text>
                      )}
                      {event.metadata.resolvedAmount !== undefined && (
                        <Text style={styles.metadataText}>
                          Resolved Amount: <Text style={styles.bold}>₹{Number(event.metadata.resolvedAmount).toFixed(2)}</Text>
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const styles = StyleSheet.create({
  container: {
    marginVertical: space.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: space.sm,
  },
  timelineList: {
    flexDirection: 'column',
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  connectorText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: space.sm,
  },
  eventCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 12,
    padding: space.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  collectorCard: {
    borderLeftColor: colors.primary,
  },
  recyclerCard: {
    borderLeftColor: '#2563EB',
  },
  resolvedCard: {
    borderLeftColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  cancelledCard: {
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  actorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actorIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  actorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  eventTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  eventBody: {
    marginTop: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusTransitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: colors.textPrimary,
  },
  arrowText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  newStatusPill: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
  },
  eventNote: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 4,
  },
  metadataBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  metadataText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginVertical: 1,
  },
  bold: {
    fontWeight: '700',
    color: colors.primary,
  },
});
