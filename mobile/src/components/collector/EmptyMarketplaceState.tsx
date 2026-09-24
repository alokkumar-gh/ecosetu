/**
 * EmptyMarketplaceState
 * Contextual empty states — no "Nothing found." 
 * Each state is specific, honest, and includes an action.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type EmptyContext =
  | 'no_listings'
  | 'no_offers'
  | 'no_earnings'
  | 'no_pickups'
  | 'no_deals'
  | 'no_transactions'
  | 'no_completed';

interface EmptyMarketplaceStateProps {
  context: EmptyContext;
  onAction?: () => void;
  actionLabel?: string;
}

const EMPTY_CONFIG: Record<EmptyContext, { icon: string; title: string; message: string; defaultAction: string }> = {
  no_listings: {
    icon: '📦',
    title: 'No Listings Yet',
    message: "You haven't listed any material. Start by photographing what you've collected.",
    defaultAction: 'SELL MATERIAL',
  },
  no_offers: {
    icon: '📩',
    title: 'No Offers Yet',
    message: 'Your listed material will appear here when buyers send offers.',
    defaultAction: 'View Listings',
  },
  no_earnings: {
    icon: '₹',
    title: 'No Earnings Yet',
    message: 'Complete your first sale to see your earnings here.',
    defaultAction: 'SELL MATERIAL',
  },
  no_pickups: {
    icon: '🚚',
    title: 'No Pickups Scheduled',
    message: 'You have no pickup assignments right now. Check the Browse screen for available citizen requests.',
    defaultAction: 'Browse Requests',
  },
  no_deals: {
    icon: '🤝',
    title: 'No Active Deals',
    message: 'List material on the marketplace to start receiving offers from recyclers.',
    defaultAction: 'SELL MATERIAL',
  },
  no_transactions: {
    icon: '📋',
    title: 'No Transactions',
    message: 'Completed sales will appear here as transaction records.',
    defaultAction: 'View Earnings',
  },
  no_completed: {
    icon: '✅',
    title: 'No Completed Deals',
    message: "Your completed and paid deals will appear here.",
    defaultAction: 'View All Deals',
  },
};

export const EmptyMarketplaceState: React.FC<EmptyMarketplaceStateProps> = ({
  context,
  onAction,
  actionLabel,
}) => {
  const cfg = EMPTY_CONFIG[context];

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{cfg.icon}</Text>
      <Text style={styles.title}>{cfg.title}</Text>
      <Text style={styles.message}>{cfg.message}</Text>
      {onAction && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAction}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>{actionLabel ?? cfg.defaultAction}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
    gap: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
  },
  actionBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnText: {
    color: '#071E22',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});

export default EmptyMarketplaceState;
