/**
 * CollectorHeader
 * Replaces TopAppBar for Collector screens.
 * Shows: greeting, name, verification badge, connectivity dot, availability pill.
 * No heavy glass card — pure typography + surface hierarchy.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { ConnectivityDot } from './ConnectivityDot';

interface CollectorHeaderProps {
  name: string;
  isVerified?: boolean;
  isAvailable?: boolean;
  onAvailabilityPress?: () => void;
  greeting?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const CollectorHeader: React.FC<CollectorHeaderProps> = ({
  name,
  isVerified = false,
  isAvailable = true,
  onAvailabilityPress,
  greeting,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const initial = (name || 'C').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Back button or Avatar */}
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}

        {/* Title area */}
        <View style={styles.titleCol}>
          {greeting ? (
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}
            </Text>
          ) : null}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right: connectivity + availability */}
        <View style={styles.rightCol}>
          <ConnectivityDot />
          {onAvailabilityPress && (
            <TouchableOpacity
              style={[styles.availabilityPill, isAvailable ? styles.availabilityOn : styles.availabilityOff]}
              onPress={onAvailabilityPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.availDot, { backgroundColor: isAvailable ? '#10B981' : '#64748B' }]} />
              <Text style={[styles.availText, { color: isAvailable ? '#10B981' : '#94A3B8' }]}>
                {isAvailable ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          )}
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#10B981',
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
  },
  greeting: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  verifiedText: {
    color: '#071E22',
    fontSize: 10,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  availabilityOn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  availabilityOff: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default CollectorHeader;
