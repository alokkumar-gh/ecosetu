/**
 * StatusBadge — Glassmorphism Edition
 * All status logic preserved exactly. Only visual colors updated for dark theme.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../i18n';

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

  return (
    <View
      style={[styles.badge, { backgroundColor: bg, borderColor: textColor + '40' }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 3,
    borderRadius: spacing.radiusPill,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default StatusBadge;
