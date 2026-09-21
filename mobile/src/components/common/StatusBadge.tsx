/**
 * StatusBadge — Glassmorphism Edition
 * All status logic preserved exactly. Only visual colors updated for dark theme.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../i18n';

export const STATUS_SYMBOLS: Record<string, string> = Object.freeze({
  DRAFT: '📝',
  PENDING: '⏳',
  CREATED: '🏷️',
  IN_TRANSIT: '🚚',
  DELIVERED: '📥',
  RECEIVED: '📥',
  ACCEPTED: '✓',
  CONFIRMED: '✓',
  COMPLETED: '✓',
  PAID: '✓',
  IN_PROGRESS: '⚙️',
  PARTIALLY_PAID: '⚖️',
  CANCELLED: '✕',
  REJECTED: '✕',
  EXPIRED: '⏰',
});

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = memo(({ status }) => {
  const { t } = useI18n();
  const normalized = (status || '').toUpperCase();

  let bg = colors.badge.draft.bg;
  let textColor = colors.badge.draft.text;
  let label = normalized;

  switch (normalized) {
    case 'DRAFT':
      bg = colors.badge.draft.bg;
      textColor = colors.badge.draft.text;
      label = t('status.draft') || 'Draft';
      break;

    case 'SUBMITTED':
    case 'PENDING':
    case 'PENDING_VERIFICATION':
      bg = colors.badge.pending.bg;
      textColor = colors.badge.pending.text;
      label = normalized === 'SUBMITTED' ? (t('status.submitted') || 'Submitted') : (t('status.pending') || 'Pending');
      break;

    case 'CREATED':
      bg = colors.badge.created.bg;
      textColor = colors.badge.created.text;
      label = t('status.created') || 'Created';
      break;

    case 'IN_TRANSIT':
      bg = colors.badge.inTransit.bg;
      textColor = colors.badge.inTransit.text;
      label = t('status.inTransit') || 'In Transit';
      break;

    case 'DELIVERED':
      bg = colors.badge.delivered.bg;
      textColor = colors.badge.delivered.text;
      label = t('status.delivered') || 'Delivered';
      break;

    case 'RECEIVED':
      bg = colors.badge.received.bg;
      textColor = colors.badge.received.text;
      label = t('status.received') || 'Received';
      break;

    case 'ACCEPTED':
    case 'APPROVED':
    case 'ACTIVE':
      bg = colors.badge.approved.bg;
      textColor = colors.badge.approved.text;
      label = normalized === 'ACCEPTED' ? (t('status.accepted') || 'Accepted') : normalized === 'ACTIVE' ? 'Active' : 'Approved';
      break;

    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'PICKUP_SCHEDULED':
      bg = colors.badge.progress.bg;
      textColor = colors.badge.progress.text;
      label =
        normalized === 'PICKUP_SCHEDULED'
          ? (t('status.pickupScheduled') || 'Scheduled')
          : normalized === 'IN_PROGRESS'
          ? (t('status.inProgress') || 'In Progress')
          : (t('status.processing') || 'Processing');
      break;

    case 'COMPLETED':
    case 'RECYCLED':
    case 'PICKED_UP':
    case 'COLLECTED':
      bg = colors.badge.completed.bg;
      textColor = colors.badge.completed.text;
      label =
        normalized === 'PICKED_UP'
          ? (t('status.pickedUp') || 'Picked Up')
          : normalized === 'COLLECTED'
          ? (t('status.collected') || 'Collected')
          : normalized === 'COMPLETED'
          ? (t('status.completed') || 'Completed')
          : (t('status.recycled') || 'Recycled');
      break;

    case 'CANCELLED':
    case 'REJECTED':
    case 'SUSPENDED':
    case 'DEACTIVATED':
      bg = colors.badge.cancelled.bg;
      textColor = colors.badge.cancelled.text;
      label = normalized === 'CANCELLED' ? (t('status.cancelled') || 'Cancelled') : normalized === 'REJECTED' ? (t('status.rejected') || 'Rejected') : normalized;
      break;

    case 'EXPIRED':
      bg = colors.badge.expired.bg;
      textColor = colors.badge.expired.text;
      label = 'Expired';
      break;

    default:
      bg = colors.badge.draft.bg;
      textColor = colors.badge.draft.text;
      label = normalized;
  }

  // SIH-LIT-003: Visual status indicator MUST use icon/symbol + text + color (never color alone)
  let statusIcon = '●';
  switch (normalized) {
    case 'DRAFT':
      statusIcon = '📝';
      break;
    case 'SUBMITTED':
    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'PENDING_COLLECTION':
      statusIcon = '⏳';
      break;
    case 'CREATED':
      statusIcon = '📋';
      break;
    case 'OPEN':
    case 'QUOTED':
      statusIcon = '🏷️';
      break;
    case 'IN_TRANSIT':
      statusIcon = '🚚';
      break;
    case 'DELIVERED':
    case 'RECEIVED':
      statusIcon = '📥';
      break;
    case 'ACCEPTED':
    case 'APPROVED':
    case 'ACTIVE':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'RECYCLED':
    case 'PICKED_UP':
    case 'COLLECTED':
    case 'PAID':
      statusIcon = '✓';
      break;
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'PICKUP_SCHEDULED':
    case 'HANDOVER_PENDING':
      statusIcon = '⚙️';
      break;
    case 'PARTIALLY_PAID':
      statusIcon = '⚖️';
      break;
    case 'CANCELLED':
    case 'REJECTED':
    case 'SUSPENDED':
    case 'DEACTIVATED':
    case 'FAILED':
      statusIcon = '✕';
      break;
    case 'EXPIRED':
      statusIcon = '⏰';
      break;
    default:
      statusIcon = '●';
  }

  return (
    <View
      style={[styles.badge, { backgroundColor: bg, borderColor: textColor + '40' }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <Text style={[styles.badgeIcon, { color: textColor }]}>{statusIcon}</Text>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 3,
    borderRadius: spacing.radiusPill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    minHeight: 24,
  },
  badgeIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default StatusBadge;
