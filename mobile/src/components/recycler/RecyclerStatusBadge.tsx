/**
 * RecyclerStatusBadge
 * Unified status pill for all Recycler-side entities.
 * Covers lot status, order status, payment status, consignment status.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useI18n } from '../../i18n';

const STATUS_STYLE_MAP: Record<string, { key: string; defaultLabel: string; bg: string; text: string; border: string }> = {
  OPEN:             { key: 'status.available',     defaultLabel: 'Available',   bg: 'rgba(16,185,129,0.12)',  text: '#34D399', border: 'rgba(16,185,129,0.3)'  },
  QUOTED:           { key: 'status.quoted',        defaultLabel: 'Quoted',      bg: 'rgba(6,182,212,0.12)',   text: '#22D3EE', border: 'rgba(6,182,212,0.3)'   },
  ACCEPTED:         { key: 'status.accepted',      defaultLabel: 'Accepted',    bg: 'rgba(139,92,246,0.12)', text: '#C4B5FD', border: 'rgba(139,92,246,0.3)'  },
  HANDOVER_PENDING: { key: 'status.handover',      defaultLabel: 'Handover',    bg: 'rgba(236,72,153,0.12)', text: '#F9A8D4', border: 'rgba(236,72,153,0.3)'  },
  COMPLETED:        { key: 'status.completed',     defaultLabel: 'Completed',   bg: 'rgba(16,185,129,0.18)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  },
  CANCELLED:        { key: 'status.cancelled',     defaultLabel: 'Cancelled',   bg: 'rgba(239,68,68,0.12)',  text: '#FCA5A5', border: 'rgba(239,68,68,0.3)'   },
  DRAFT:            { key: 'status.draft',         defaultLabel: 'Draft',       bg: 'rgba(148,163,184,0.12)',text: '#CBD5E1', border: 'rgba(148,163,184,0.25)' },
  PENDING:          { key: 'status.pending',       defaultLabel: 'Pending',     bg: 'rgba(245,158,11,0.12)', text: '#FDE68A', border: 'rgba(245,158,11,0.3)'  },
  PAID:             { key: 'status.paid',          defaultLabel: 'Paid',        bg: 'rgba(16,185,129,0.18)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  },
  PARTIALLY_PAID:   { key: 'status.partiallyPaid', defaultLabel: 'Part Paid',   bg: 'rgba(249,115,22,0.12)', text: '#FDBA74', border: 'rgba(249,115,22,0.3)'  },
  DELIVERED:        { key: 'status.delivered',     defaultLabel: 'Delivered',   bg: 'rgba(16,185,129,0.12)', text: '#34D399', border: 'rgba(16,185,129,0.3)'  },
  IN_TRANSIT:       { key: 'status.inTransit',     defaultLabel: 'In Transit',  bg: 'rgba(6,182,212,0.12)',  text: '#22D3EE', border: 'rgba(6,182,212,0.3)'   },
  IN_PROGRESS:      { key: 'status.inProgress',    defaultLabel: 'In Progress', bg: 'rgba(249,115,22,0.12)', text: '#FDBA74', border: 'rgba(249,115,22,0.3)'  },
  SCHEDULED:        { key: 'status.scheduled',     defaultLabel: 'Scheduled',   bg: 'rgba(6,182,212,0.12)',  text: '#A5F3FC', border: 'rgba(6,182,212,0.3)'   },
  CREATED:          { key: 'status.created',       defaultLabel: 'Created',     bg: 'rgba(148,163,184,0.12)',text: '#CBD5E1', border: 'rgba(148,163,184,0.25)' },
  REJECTED:         { key: 'status.rejected',      defaultLabel: 'Rejected',    bg: 'rgba(239,68,68,0.12)',  text: '#FCA5A5', border: 'rgba(239,68,68,0.3)'   },
  OPEN_SOURCING:    { key: 'status.open',          defaultLabel: 'Open',        bg: 'rgba(16,185,129,0.12)', text: '#34D399', border: 'rgba(16,185,129,0.3)'  },
  FULFILLED:        { key: 'status.fulfilled',     defaultLabel: 'Fulfilled',   bg: 'rgba(16,185,129,0.18)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  },
  EXPIRED:          { key: 'status.expired',       defaultLabel: 'Expired',     bg: 'rgba(148,163,184,0.12)',text: '#94A3B8', border: 'rgba(148,163,184,0.2)'  },
  ACTIVE:           { key: 'status.active',        defaultLabel: 'Active',      bg: 'rgba(16,185,129,0.12)', text: '#34D399', border: 'rgba(16,185,129,0.3)'  },
  INACTIVE:         { key: 'status.inactive',      defaultLabel: 'Inactive',    bg: 'rgba(148,163,184,0.12)',text: '#94A3B8', border: 'rgba(148,163,184,0.2)'  },
};

interface RecyclerStatusBadgeProps {
  status: string;
  label?: string;
}

export const RecyclerStatusBadge: React.FC<RecyclerStatusBadgeProps> = ({ status, label }) => {
  const { t } = useI18n();
  const cfg = STATUS_STYLE_MAP[status] || {
    key: `status.${status.toLowerCase()}`,
    defaultLabel: status.replace(/_/g, ' '),
    bg: 'rgba(255,255,255,0.07)',
    text: '#CBD5E1',
    border: 'rgba(255,255,255,0.12)',
  };

  const displayText = label ?? t(cfg.key, cfg.defaultLabel);

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  text:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});

export default RecyclerStatusBadge;
