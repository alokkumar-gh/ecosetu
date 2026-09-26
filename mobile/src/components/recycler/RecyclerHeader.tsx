/**
 * RecyclerHeader
 * Professional header for all Recycler screens.
 * Shows: facility name, authorization badge, city, connectivity.
 * Cleaner than the old GlassAvatar + GlassCard header.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { AppIcon } from '../ui/AppIcon';

interface RecyclerHeaderProps {
  facilityName: string;
  isAuthorized?: boolean;
  city?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  subtitle?: string;
}

const AuthBadge: React.FC<{ authorized: boolean }> = ({ authorized }) => (
  <View style={[badge.pill, authorized ? badge.pillAuth : badge.pillPending]}>
    <View style={[badge.dot, { backgroundColor: authorized ? '#10B981' : '#F59E0B' }]} />
    <Text style={[badge.text, { color: authorized ? '#10B981' : '#F59E0B' }]}>
      {authorized ? 'AUTHORIZED' : 'PENDING'}
    </Text>
  </View>
);
const badge = StyleSheet.create({
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  pillAuth:    { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  pillPending: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  dot:         { width: 6, height: 6, borderRadius: 3 },
  text:        { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});

export const RecyclerHeader: React.FC<RecyclerHeaderProps> = ({
  facilityName,
  isAuthorized = false,
  city,
  showBack = false,
  onBack,
  rightAction,
  subtitle,
}) => {
  const initial = (facilityName || 'R').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.facilityAvatar}>
            <Text style={styles.facilityAvatarText}>{initial}</Text>
          </View>
        )}

        <View style={styles.titleCol}>
          <Text style={styles.facilityName} numberOfLines={1}>{facilityName}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : city ? (
            <View style={styles.cityRow}>
              <AppIcon name="location" size={12} color="rgba(255,255,255,0.45)" />
              <Text style={styles.subtitle} numberOfLines={1}>{city}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rightCol}>
          {!showBack && <AuthBadge authorized={isAuthorized} />}
          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  facilityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(6,182,212,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(6,182,212,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  facilityAvatarText: {
    color: '#22D3EE',
    fontSize: 17,
    fontWeight: '800',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  facilityName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '500',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
});

export default RecyclerHeader;
