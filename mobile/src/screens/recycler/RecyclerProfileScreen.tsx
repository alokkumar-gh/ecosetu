/**
 * RecyclerProfileScreen
 * Authenticated FORMAL_RECYCLER — Facility profile and compliance screen.
 *
 * Displays:
 *   - Facility name, operator email, registration license
 *   - Accepted e-waste categories
 *   - Environmental compliance status & CPCB authorization
 *   - Facility processing capacity
 *   - Sign out
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const ACCEPTED_CATEGORIES = [
  'Mobile Phones',
  'Laptops & Computers',
  'Circuit Boards (PCB)',
  'Lithium-Ion Batteries',
  'Cables & Adapters',
  'Cathode Ray Tubes',
];

export const RecyclerProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <TopAppBar
        title="Facility Profile"
        roleBadge="RECYCLER"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isConnected && <OfflineBanner />}

        {/* Facility Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>🏭</Text>
          </View>
          <Text style={styles.facilityName} accessibilityRole="header">
            {user?.name || 'Recycling Center'}
          </Text>
          <Text style={styles.facilityEmail}>{user?.email || 'facility@ecosetu.org'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Formal Recycler</Text>
            </View>
            <StatusBadge status="ACTIVE" />
          </View>
        </View>

        {/* CPCB Authorization Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Regulatory & Compliance</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>License No:</Text>
            <Text style={styles.infoValue}>CPCB/EW/REG/2026/0488</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Auth Status:</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>Verified & Active</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valid Until:</Text>
            <Text style={styles.infoValue}>31 March 2028</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Daily Capacity:</Text>
            <Text style={styles.infoValue}>5,000 kg / day</Text>
          </View>
        </View>

        {/* Accepted Waste Streams */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accepted E-Waste Categories</Text>
          <View style={styles.chipContainer}>
            {ACCEPTED_CATEGORIES.map((cat, idx) => (
              <View key={idx} style={styles.streamChip}>
                <Text style={styles.streamChipText}>✓ {cat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.spaceXl }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 20,
  },
  headerCard: {
    backgroundColor: colors.glassSurface,
    borderRadius: 16,
    padding: spacing.spaceLg,
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 3,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderWidth: 2,
    borderColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceSm,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatarIcon: {
    fontSize: 32,
  },
  facilityName: {
    fontSize: typography.Title.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  facilityEmail: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  roleBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryLight,
  },
  card: {
    backgroundColor: colors.glassSurface,
    borderRadius: 16,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 3,
  },
  cardTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.spaceSm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  infoLabel: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  streamChip: {
    backgroundColor: colors.glassSurfaceRaised,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streamChipText: {
    fontSize: 12,
    color: colors.accentMint,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    borderRadius: 12,
    paddingVertical: spacing.spaceMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    marginTop: spacing.spaceSm,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: typography.Button.fontSize,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default RecyclerProfileScreen;
