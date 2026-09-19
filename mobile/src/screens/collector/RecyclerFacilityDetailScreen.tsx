/**
 * RecyclerFacilityDetailScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Verified Formal Recycler Facility Detail & Map Location.
 *
 * Operational Chain:
 *   COLLECTOR → RECYCLER DIRECTORY → FACILITY DETAIL → EXTERNAL NAVIGATION / CONSIGN
 *
 * Rules:
 * - Read-only discovery of authorized formal recycling facility.
 * - Exact authorized coordinates displayed via EcoSetuMap (no circles, non-draggable).
 * - Zero Places, Geocoding, Directions API, or navigation SDKs.
 * - External turn-by-turn navigation launched via native Android Google Maps intent sequence:
 *     1. google.navigation:q=lat,lng
 *     2. geo:lat,lng
 *     3. web maps fallback
 * - Zero MapView / react-native-maps direct imports (reuses EcoSetuMap).
 * - Zero private recycler account credentials exposed.
 * - Full 4-language i18n support and glassmorphism styling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EcoSetuMap } from '../../components/map/EcoSetuMap';
import { recyclingService } from '../../services/recyclingService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      recyclerId?: string;
      recycler?: any;
    };
  };
}

const formatCategoryName = (cat: string): string => {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const RecyclerFacilityDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();

  const routeRecycler = route?.params?.recycler;
  const recyclerId = route?.params?.recyclerId || routeRecycler?.id;

  const [recycler, setRecycler] = useState<any | null>(routeRecycler || null);
  const [isLoading, setIsLoading] = useState<boolean>(!routeRecycler);

  // Load recycler if only id was provided
  useEffect(() => {
    if (!recycler && recyclerId) {
      let isMounted = true;
      (async () => {
        try {
          const res = await recyclingService.getRecyclers();
          if (isMounted && res.recyclers) {
            const found = res.recyclers.find((r: any) => r.id === recyclerId);
            if (found) setRecycler(found);
          }
        } catch {
          // Handled gracefully with fallback
        } finally {
          if (isMounted) setIsLoading(false);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [recycler, recyclerId]);

  const facilityName = recycler?.facilityName || 'Authorized Recycling Facility';
  const facilityAddress = recycler?.facilityAddress || 'Address not listed';
  const city = recycler?.city || null;
  const district = recycler?.district || null;
  const state = recycler?.state || null;
  const pincode = recycler?.pincode || null;
  const categories: string[] = Array.isArray(recycler?.acceptedCategories)
    ? recycler.acceptedCategories
    : [];
  const totalConsignments = recycler?.totalConsignments ?? 0;

  // Exact coordinates provided authoritatively by backend
  const lat = typeof recycler?.facilityLat === 'number' ? recycler.facilityLat : null;
  const lng = typeof recycler?.facilityLng === 'number' ? recycler.facilityLng : null;

  const hasValidCoordinates =
    lat !== null &&
    lng !== null &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  // External Google Maps Navigation Launcher
  const handleNavigateToFacility = useCallback(async () => {
    if (!hasValidCoordinates || lat === null || lng === null) {
      Alert.alert(
        t('collector.recyclers.navigationUnavailable') || 'Navigation Unavailable',
        t('collector.recyclers.noFacilityLocation') || 'Facility location coordinates are not specified.'
      );
      return;
    }

    if (!isConnected) {
      Alert.alert(
        t('offline.title') || 'Offline',
        t('collector.recyclers.navigationUnavailableDesc') || 'Facility coordinates are not available for navigation.'
      );
      return;
    }

    const encodedName = encodeURIComponent(facilityName);
    const navUrl = `google.navigation:q=${lat},${lng}`;
    const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${encodedName})`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    try {
      const canOpenNav = await Linking.canOpenURL(navUrl);
      if (canOpenNav) {
        await Linking.openURL(navUrl);
        return;
      }
    } catch {
      // Fall through to geoUrl
    }

    try {
      const canOpenGeo = await Linking.canOpenURL(geoUrl);
      if (canOpenGeo) {
        await Linking.openURL(geoUrl);
        return;
      }
    } catch {
      // Fall through to webUrl
    }

    try {
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert(
        t('collector.recyclers.navigationUnavailable') || 'Navigation Unavailable',
        t('collector.recyclers.navigationUnavailableDesc') || 'Could not open external Google Maps application.'
      );
    }
  }, [hasValidCoordinates, lat, lng, facilityName, isConnected, t]);

  const handleReadAloudFacility = useCallback(() => {
    const catsStr = categories.map(formatCategoryName).join(', ') || 'e-waste';
    const locationStr = [city, district].filter(Boolean).join(', ') || 'local area';
    const spoken = `Verified recycler facility: ${facilityName} in ${locationStr}. Accepted categories: ${catsStr}.`;

    voiceService.speak(spoken, {
      priority: AnnouncementPriority.LOW,
      language,
      force: true, // Manual action
    });
  }, [facilityName, city, district, categories, language]);

  const handleConsignEWaste = useCallback(() => {
    if (navigation?.navigate && recycler) {
      navigation.navigate('CreateConsignment', {
        recyclerId: recycler.id,
        recycler,
      });
    }
  }, [navigation, recycler]);

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('collector.recyclers.facilityDetails') || 'Facility Details'}
        showBack
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Header Summary Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🏭</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.facilityTitle}>{facilityName}</Text>
              <Text style={styles.verifiedSub}>
                {t('collector.recyclers.verifiedRecycler') || 'Verified Formal Recycler'}
              </Text>
            </View>
            <StatusBadge status="ACTIVE" />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statIcon}>📦</Text>
              <Text style={styles.statLabel}>
                {totalConsignments} {t('collector.recyclers.consignmentsProcessed') || 'Consignments Processed'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.readAloudBtn}
              onPress={handleReadAloudFacility}
              accessibilityRole="button"
              accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
              accessibilityHint="Reads recycler facility summary aloud"
              activeOpacity={0.8}
            >
              <Text style={styles.readAloudBtnText}>🔊 {t('voice.readAloud') || 'Read Aloud'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Location Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>
            📍 {t('collector.recyclers.facilityLocation') || 'Facility Location'}
          </Text>

          {hasValidCoordinates && lat !== null && lng !== null ? (
            <View style={styles.mapContainer}>
              <EcoSetuMap
                latitude={lat}
                longitude={lng}
                draggable={false}
                showApproximateCircles={false}
                pinTitle={facilityName}
                pinDescription={facilityAddress}
                isOffline={!isConnected}
                style={styles.map}
              />
            </View>
          ) : (
            <View style={styles.noLocationContainer}>
              <Text style={styles.noLocationIcon}>📍</Text>
              <Text style={styles.noLocationText}>
                {t('collector.recyclers.noFacilityLocation') || 'Facility location coordinates are not specified.'}
              </Text>
            </View>
          )}

          {/* External Google Maps Navigation Action */}
          <TouchableOpacity
            style={[styles.navButton, !hasValidCoordinates && styles.navButtonDisabled]}
            onPress={handleNavigateToFacility}
            disabled={!hasValidCoordinates}
            accessibilityRole="button"
            accessibilityLabel={t('collector.recyclers.navigateToFacility') || 'Navigate to Facility via Google Maps'}
            activeOpacity={0.8}
          >
            <Text style={styles.navButtonIcon}>🧭</Text>
            <Text style={styles.navButtonText}>
              {t('collector.recyclers.navigateToFacility') || 'Navigate to Facility'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Address Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>
            🏢 {t('collector.recyclers.address') || 'Address'}
          </Text>
          <Text style={styles.fullAddressText}>{facilityAddress}</Text>

          <View style={styles.addressGrid}>
            {Boolean(city) && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t('collector.recyclers.city') || 'City'}</Text>
                <Text style={styles.gridValue}>{city}</Text>
              </View>
            )}
            {Boolean(district) && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t('collector.recyclers.district') || 'District'}</Text>
                <Text style={styles.gridValue}>{district}</Text>
              </View>
            )}
            {Boolean(state) && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t('collector.recyclers.state') || 'State'}</Text>
                <Text style={styles.gridValue}>{state}</Text>
              </View>
            )}
            {Boolean(pincode) && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t('collector.recyclers.pincode') || 'PIN Code'}</Text>
                <Text style={styles.gridValue}>{pincode}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Accepted Categories Card */}
        {categories.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>
              ♻ {t('collector.recyclers.acceptedCategories') || 'Accepted E-Waste Categories'}
            </Text>
            <View style={styles.categoryChipsContainer}>
              {categories.map((cat, idx) => (
                <View key={`${cat}-${idx}`} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{formatCategoryName(cat)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Primary CTA: Consign E-Waste */}
        <TouchableOpacity
          style={styles.consignCTA}
          onPress={handleConsignEWaste}
          accessibilityRole="button"
          accessibilityLabel={`Consign e-waste to ${facilityName}`}
          activeOpacity={0.85}
        >
          <Text style={styles.consignCTAText}>
            📦 {t('collector.recyclers.consignEwaste') || 'Consign E-Waste'} →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.spaceSm,
    marginRight: spacing.spaceXs,
  },
  facilityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  verifiedSub: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  statsRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.spaceSm,
  },
  readAloudBtn: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 44,
    paddingHorizontal: spacing.spaceSm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readAloudBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  mapContainer: {
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  map: {
    flex: 1,
  },
  noLocationContainer: {
    height: 120,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  noLocationIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  noLocationText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    minHeight: 48,
  },
  navButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  navButtonIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#FFFFFF',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fullAddressText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.spaceSm,
  },
  addressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  gridItem: {
    width: '46%',
  },
  gridLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gridValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  consignCTA: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.spaceSm,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  consignCTAText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default RecyclerFacilityDetailScreen;
