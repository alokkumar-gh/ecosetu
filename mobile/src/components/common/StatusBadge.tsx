/**
 * StatusBadge — Professional Vector & Accessible Status Indicator
 *
 * Fully replaces emoji status indicators with clean vector icons,
 * high-contrast accessible typography, and subtle tinted badges.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../i18n';
import { AppIcon, IconName } from '../ui/AppIcon';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = memo(({ status }) => {
  const { t } = useI18n();
  const normalized = (status || '').toUpperCase();

  let bg = colors.badge.draft.bg;
  let textColor = colors.badge.draft.text;
  let label = normalized;
  let iconName: IconName = 'check';

  switch (normalized) {
    case 'DRAFT':
      bg = colors.badge.draft.bg;
      textColor = colors.badge.draft.text;
      label = t('status.draft') || 'Draft';
      iconName = 'edit';
      break;

    case 'SUBMITTED':
    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'PENDING_COLLECTION':
      bg = colors.badge.pending.bg;
      textColor = colors.badge.pending.text;
      label =
        normalized === 'SUBMITTED'
          ? t('status.submitted') || 'Submitted'
          : t('status.pending') || 'Pending';
      iconName = 'clock';
      break;

    case 'CREATED':
    case 'OPEN':
    case 'QUOTED':
      bg = colors.badge.created.bg;
      textColor = colors.badge.created.text;
      label = t('status.created') || 'Created';
      iconName = 'clipboard';
      break;

    case 'IN_TRANSIT':
      bg = colors.badge.inTransit.bg;
      textColor = colors.badge.inTransit.text;
      label = t('status.inTransit') || 'In Transit';
      iconName = 'truck';
      break;

    case 'DELIVERED':
    case 'RECEIVED':
      bg = colors.badge.delivered.bg;
      textColor = colors.badge.delivered.text;
      label =
        normalized === 'RECEIVED'
          ? t('status.received') || 'Received'
          : t('status.delivered') || 'Delivered';
      iconName = 'box';
      break;

    case 'ACCEPTED':
    case 'APPROVED':
    case 'ACTIVE':
    case 'CONFIRMED':
    case 'PAID':
      bg = colors.badge.approved.bg;
      textColor = colors.badge.approved.text;
      label =
        normalized === 'ACCEPTED'
          ? t('status.accepted') || 'Accepted'
          : normalized === 'ACTIVE'
          ? 'Active'
          : normalized === 'PAID'
          ? 'Paid'
          : 'Approved';
      iconName = 'check';
      break;

    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'PICKUP_SCHEDULED':
    case 'HANDOVER_PENDING':
      bg = colors.badge.progress.bg;
      textColor = colors.badge.progress.text;
      label =
        normalized === 'PICKUP_SCHEDULED'
          ? t('status.pickupScheduled') || 'Scheduled'
          : normalized === 'IN_PROGRESS'
          ? t('status.inProgress') || 'In Progress'
          : t('status.processing') || 'Processing';
      iconName = 'refresh';
      break;

    case 'COMPLETED':
    case 'RECYCLED':
    case 'PICKED_UP':
    case 'COLLECTED':
      bg = colors.badge.completed.bg;
      textColor = colors.badge.completed.text;
      label =
        normalized === 'PICKED_UP'
          ? t('status.pickedUp') || 'Picked Up'
          : normalized === 'COLLECTED'
          ? t('status.collected') || 'Collected'
          : normalized === 'COMPLETED'
          ? t('status.completed') || 'Completed'
          : t('status.recycled') || 'Recycled';
      iconName = 'shieldCheck';
      break;

    case 'CANCELLED':
    case 'REJECTED':
    case 'SUSPENDED':
    case 'DEACTIVATED':
    case 'FAILED':
      bg = colors.badge.cancelled.bg;
      textColor = colors.badge.cancelled.text;
      label =
        normalized === 'CANCELLED'
          ? t('status.cancelled') || 'Cancelled'
          : normalized === 'REJECTED'
          ? t('status.rejected') || 'Rejected'
          : normalized;
      iconName = 'close';
      break;

    case 'EXPIRED':
      bg = colors.badge.expired.bg;
      textColor = colors.badge.expired.text;
      label = 'Expired';
      iconName = 'clock';
      break;

    default:
      bg = colors.badge.draft.bg;
      textColor = colors.badge.draft.text;
      label = normalized;
      iconName = 'check';
  }

  return (
    <View
      style={[styles.badge, { backgroundColor: bg, borderColor: textColor + '40' }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <AppIcon name={iconName} size={11} color={textColor} strokeWidth={2.2} />
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 3,
    borderRadius: spacing.radiusPill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    minHeight: 24,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default StatusBadge;
