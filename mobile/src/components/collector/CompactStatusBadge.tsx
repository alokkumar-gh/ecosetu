/**
 * CompactStatusBadge
 * Pill-style status badge for material lots, offers, payments.
 * Keeps status readable but never dominant.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useI18n } from '../../i18n';

type StatusKey =
  | 'DRAFT'
  | 'OPEN'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'HANDOVER_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | string;

interface CompactStatusBadgeProps {
  status: StatusKey;
  label?: string;
}

const STATUS_STYLE_MAP: Record<string, { key: string; defaultLabel: string; bg: string; text: string; border: string }> = {
  DRAFT:            { key: 'status.draft',           defaultLabel: 'Draft',         bg: 'rgba(148,163,184,0.12)', text: '#CBD5E1', border: 'rgba(148,163,184,0.25)' },
  OPEN:             { key: 'status.open',            defaultLabel: 'Listed',        bg: 'rgba(16,185,129,0.12)',  text: '#34D399', border: 'rgba(16,185,129,0.3)'  },
  QUOTED:           { key: 'status.quoted',          defaultLabel: 'Offer',         bg: 'rgba(59,130,246,0.12)',  text: '#93C5FD', border: 'rgba(59,130,246,0.3)'  },
  ACCEPTED:         { key: 'status.accepted',        defaultLabel: 'Accepted',      bg: 'rgba(139,92,246,0.12)', text: '#C4B5FD', border: 'rgba(139,92,246,0.3)'  },
  HANDOVER_PENDING: { key: 'status.handoverPending', defaultLabel: 'Handover',      bg: 'rgba(236,72,153,0.12)', text: '#F9A8D4', border: 'rgba(236,72,153,0.3)'  },
  COMPLETED:        { key: 'status.completed',       defaultLabel: 'Completed',     bg: 'rgba(16,185,129,0.18)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  },
  CANCELLED:        { key: 'status.cancelled',       defaultLabel: 'Cancelled',     bg: 'rgba(239,68,68,0.12)',  text: '#FCA5A5', border: 'rgba(239,68,68,0.3)'   },
  PENDING:          { key: 'status.pending',         defaultLabel: 'Pending',       bg: 'rgba(245,158,11,0.12)', text: '#FDE68A', border: 'rgba(245,158,11,0.3)'  },
  PAID:             { key: 'status.paid',            defaultLabel: 'Paid',          bg: 'rgba(16,185,129,0.18)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  },
  PARTIALLY_PAID:   { key: 'status.partiallyPaid',   defaultLabel: 'Part Paid',     bg: 'rgba(249,115,22,0.12)', text: '#FDBA74', border: 'rgba(249,115,22,0.3)'  },
  SCHEDULED:        { key: 'status.scheduled',      defaultLabel: 'Scheduled',     bg: 'rgba(6,182,212,0.12)',  text: '#A5F3FC', border: 'rgba(6,182,212,0.3)'   },
  IN_PROGRESS:      { key: 'status.inProgress',      defaultLabel: 'In Progress',   bg: 'rgba(249,115,22,0.12)', text: '#FDBA74', border: 'rgba(249,115,22,0.3)'  },
};

export const CompactStatusBadge: React.FC<CompactStatusBadgeProps> = ({ status, label }) => {
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
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default CompactStatusBadge;
