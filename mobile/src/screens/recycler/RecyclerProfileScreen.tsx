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

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EcoSetuBackground } from '../../components/eco';
import { recyclingService } from '../../services/recyclingService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon } from '../../components/ui/AppIcon';

const getAuthStatusInfo = (status?: string | null) => {
  switch (status) {
    case 'AUTHORIZED':
      return { label: 'Verified & Active', color: colors.primary };
    case 'PROVISIONAL':
      return { label: 'Provisional', color: colors.warning };
    case 'PENDING':
      return { label: 'Pending Verification', color: colors.warning };
    case 'PENDING_REVIEW':
      return { label: 'Pending Review', color: colors.warning };
    case 'REJECTED':
      return { label: 'Rejected', color: colors.error };
    case 'SUSPENDED':
      return { label: 'Suspended', color: colors.error };
    case 'EXPIRED':
      return { label: 'Expired', color: colors.error };
    case 'REVOKED':
      return { label: 'Revoked', color: colors.error };
    case 'INACTIVE':
      return { label: 'Inactive', color: colors.textSecondary };
    default:
      return status
        ? { label: status, color: colors.textSecondary }
        : { label: 'Pending verification', color: colors.textSecondary };
  }
};

const formatValidDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Not specified';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not specified';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Not specified';
  }
};

export const RecyclerProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const result = await recyclingService.getProfile();
      if (result?.profile) {
        setProfile(result.profile);
      }
    } catch {
      // Non-fatal error handling: profile fallback from user context
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  const authStatusInfo = getAuthStatusInfo(profile?.authorizationStatus);
  const acceptedCategories: string[] =
    Array.isArray(profile?.acceptedCategories) && profile.acceptedCategories.length > 0
      ? profile.acceptedCategories
      : [];

  const serviceCoverage =
    profile?.serviceArea ||
    (profile?.serviceRadiusKm ? `${profile.serviceRadiusKm} km radius` : 'Not specified');

  return (
    <EcoSetuBackground>
      <TopAppBar
        title="Facility Profile"
        roleBadge="RECYCLER"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProfile(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {!isConnected && <OfflineBanner />}

        {isLoading && !profile ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Facility Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.avatarCircle}>
                <AppIcon name="home" size={28} color={colors.primary || '#14B8A6'} />
              </View>
              <Text style={styles.facilityName} accessibilityRole="header">
                {profile?.facilityName || user?.name || 'Recycling Center'}
              </Text>
              <Text style={styles.facilityEmail}>
                {profile?.operationalEmail || profile?.user?.email || user?.email || '—'}
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Formal Recycler</Text>
                </View>
                <StatusBadge status={profile?.user?.status || user?.status || 'ACTIVE'} />
              </View>
            </View>

            {/* CPCB / SPCB Authorization Details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Regulatory & Compliance</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>License No:</Text>
                <Text style={styles.infoValue}>
                  {profile?.licenseNumber || 'Not provided'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Auth Status:</Text>
                <Text style={[styles.infoValue, { color: authStatusInfo.color }]}>
                  {authStatusInfo.label}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Valid Until:</Text>
                <Text style={styles.infoValue}>
                  {formatValidDate(profile?.authorizationValidTill)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Daily Capacity:</Text>
                <Text style={styles.infoValue}>
                  {serviceCoverage}
                </Text>
              </View>
            </View>

            {/* Accepted Waste Streams */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Accepted E-Waste Categories</Text>
              {acceptedCategories.length > 0 ? (
                <View style={styles.chipContainer}>
                  {acceptedCategories.map((cat, idx) => (
                    <View key={idx} style={styles.streamChip}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <AppIcon name="check" size={12} color="#22D3EE" />
                        <Text style={styles.streamChipText}>{cat}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyCategoriesText}>Not specified</Text>
              )}
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
          </>
        )}
      </ScrollView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 20,
  },
  loadingContainer: {
    paddingVertical: spacing.spaceXl * 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyCategoriesText: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
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
