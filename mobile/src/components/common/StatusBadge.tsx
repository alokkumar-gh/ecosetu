import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toUpperCase();

  let bg = '#E0E0E0';
  let text = '#424242';
  let label = normalized;

  switch (normalized) {
    case 'DRAFT':
      bg = '#E0E0E0';
      text = '#424242';
      label = 'Draft';
      break;

    case 'SUBMITTED':
    case 'PENDING':
    case 'PENDING_VERIFICATION':
      bg = '#BBDEFB';
      text = '#1565C0';
      label = normalized === 'SUBMITTED' ? 'Submitted' : 'Pending';
      break;

    case 'CREATED':
      bg = '#E3F2FD';
      text = '#1565C0';
      label = 'Created';
      break;

    case 'IN_TRANSIT':
      bg = '#FFF3E0';
      text = '#E65100';
      label = 'In Transit';
      break;

    case 'DELIVERED':
      bg = '#E0F2F1';
      text = '#00695C';
      label = 'Delivered';
      break;

    case 'RECEIVED':
      bg = '#EDE7F6';
      text = '#512DA8';
      label = 'Received';
      break;

    case 'ACCEPTED':
    case 'APPROVED':
    case 'ACTIVE':
      bg = '#C8E6C9';
      text = '#2E7D32';
      label = normalized === 'ACCEPTED' ? 'Accepted' : normalized === 'ACTIVE' ? 'Active' : 'Approved';
      break;

    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'PICKUP_SCHEDULED':
      bg = '#FFE0B2';
      text = '#E65100';
      label =
        normalized === 'PICKUP_SCHEDULED'
          ? 'Scheduled'
          : normalized === 'IN_PROGRESS'
          ? 'In Progress'
          : 'Processing';
      break;

    case 'COMPLETED':
    case 'RECYCLED':
    case 'PICKED_UP':
      bg = '#A5D6A7';
      text = '#1B5E20';
      label =
        normalized === 'PICKED_UP'
          ? 'Picked Up'
          : normalized === 'COMPLETED'
          ? 'Completed'
          : 'Recycled';
      break;

    case 'CANCELLED':
    case 'REJECTED':
    case 'SUSPENDED':
    case 'DEACTIVATED':
      bg = '#FFCDD2';
      text = '#C62828';
      label = normalized === 'CANCELLED' ? 'Cancelled' : normalized === 'REJECTED' ? 'Rejected' : normalized;
      break;

    case 'EXPIRED':
      bg = '#E0E0E0';
      text = '#616161';
      label = 'Expired';
      break;

    default:
      bg = '#E0E0E0';
      text = '#424242';
      label = normalized;
  }

  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default StatusBadge;
