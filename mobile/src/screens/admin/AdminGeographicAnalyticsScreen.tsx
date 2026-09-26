/**
 * AdminGeographicAnalyticsScreen.tsx
 * EcoSetu — Phase 19, Task 11: Admin Geographic Analytics + Privacy-Safe Map Visualization
 *
 * Requirements:
 * - Administrator role only (ROLES.ADMIN)
 * - Privacy-safe: ZERO individual citizen pins, ZERO exact citizen coordinates, ZERO house numbers
 * - Dual segmented views: [ Overview ] and [ Map ]
 * - Overview: Platform circular metrics and regional distribution
 * - Map: Reusable EcoSetuMap showing verified recycler facilities and regional coverage
 * - Filters: State, District, City, and E-Waste Category
 * - Map Legend: Verified Recycler Facility, Regional Activity Zone, Collector Coverage
 * - Offline-first: Caches data and renders OfflineBanner when disconnected
 * - Multilingual support: 100% key parity via useI18n()
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { AdminShell } from '../../components/admin/AdminShell';
import { AppIcon } from '../../components/ui/AppIcon';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { EcoSetuMap, EcoSetuPin } from '../../components/map/EcoSetuMap';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { ROLES, EWASTE_CATEGORIES } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  navigation?: any;
}

export const AdminGeographicAnalyticsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  // Role Guard: Administrator access only
  const isAdmin = user?.role === ROLES.ADMIN;

  // View Mode: 'overview' | 'map'
  const [activeTab, setActiveTab] = useState<'overview' | 'map'>('overview');

  // Data state
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [recyclers, setRecyclers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Map Filter states
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Pin on Map
  const [selectedPin, setSelectedPin] = useState<EcoSetuPin | null>(null);

  const refreshingRef = useRef<boolean>(false);

  // Load geographic analytics and verified recyclers
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const data = await adminService.getGeographicAnalytics();
      setAnalytics(data.analytics);
      setRecyclers(data.recyclers || []);
      setFromCache(data.fromCache);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load geographic analytics data.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData(false);
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, loadData]);

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadData(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadData]);

  // Extract unique regions for filters
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    recyclers.forEach((r) => {
      if (r.state) states.add(r.state.trim());
    });
    return Array.from(states).sort();
  }, [recyclers]);

  const availableDistricts = useMemo(() => {
    const districts = new Set<string>();
    recyclers.forEach((r) => {
      if (
        (selectedState === 'ALL' || r.state?.trim() === selectedState) &&
        r.district
      ) {
        districts.add(r.district.trim());
      }
    });
    return Array.from(districts).sort();
  }, [recyclers, selectedState]);

  // Extract unique accepted categories for filters
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    recyclers.forEach((r) => {
      if (Array.isArray(r.acceptedCategories)) {
        r.acceptedCategories.forEach((c: string) => {
          if (c) cats.add(c.trim());
        });
      }
    });
    return Array.from(cats).sort();
  }, [recyclers]);

  // Filtered Recyclers
  const filteredRecyclers = useMemo(() => {
    return recyclers.filter((r) => {
      if (selectedState !== 'ALL' && r.state?.trim() !== selectedState) return false;
      if (selectedDistrict !== 'ALL' && r.district?.trim() !== selectedDistrict)
        return false;
      if (
        selectedCategory !== 'ALL' &&
        (!Array.isArray(r.acceptedCategories) ||
          !r.acceptedCategories.includes(selectedCategory))
      ) {
        return false;
      }
      return true;
    });
  }, [recyclers, selectedState, selectedDistrict, selectedCategory]);

  // Regional breakdown metrics (States and Districts)
  const regionalBreakdown = useMemo(() => {
    const regions: Record<
      string,
      { state: string; district: string; facilityCount: number; totalConsignments: number }
    > = {};

    filteredRecyclers.forEach((r) => {
      const key = `${r.state || 'Unknown'} - ${r.district || r.city || 'General'}`;
      if (!regions[key]) {
        regions[key] = {
          state: r.state || 'Unknown',
          district: r.district || r.city || 'General',
          facilityCount: 0,
          totalConsignments: 0,
        };
      }
      regions[key].facilityCount += 1;
      regions[key].totalConsignments += r.totalConsignments || 0;
    });

    return Object.values(regions);
  }, [filteredRecyclers]);

  // Map Pins: Strictly verified recycler facilities (organizational only)
  // ZERO citizen pins, ZERO exact citizen coordinates, ZERO house numbers, ZERO personal phones
  const mapPins: EcoSetuPin[] = useMemo(() => {
    return filteredRecyclers
      .filter((r) => r.facilityLat != null && r.facilityLng != null)
      .map((r) => ({
        id: r.id,
        latitude: Number(r.facilityLat),
        longitude: Number(r.facilityLng),
        title: r.facilityName,
        description: `${r.city || ''}, ${r.state || ''}`,
        isApproximate: false,
        data: {
          id: r.id,
          facilityName: r.facilityName,
          facilityAddress: r.facilityAddress,
          city: r.city,
          district: r.district,
          state: r.state,
          acceptedCategories: r.acceptedCategories,
          totalConsignments: r.totalConsignments,
        },
      }));
  }, [filteredRecyclers]);

  // Center coordinate for map view
  const mapCenter = useMemo(() => {
    if (mapPins.length > 0) {
      return {
        latitude: mapPins[0].latitude,
        longitude: mapPins[0].longitude,
      };
    }
    // Default national center coordinates for India
    return { latitude: 20.5937, longitude: 78.9629 };
  }, [mapPins]);

  // ── Role Authorization Guard ──────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('admin.geographic.title') || 'Geographic Analytics'}
          subtitle={t('admin.geographic.subtitle') || 'Regional Activity & Facility Map'}
          showBack={true}
          onBack={() => navigation?.goBack?.()}
        />
        <View style={styles.centerContainer}>
          <EmptyState
            title="Access Restricted"
            message="Geographic platform analytics is strictly restricted to authorized administrators."
            actionLabel="Go Back"
            onAction={() => navigation?.goBack?.()}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary platform metrics ──────────────────────────────────────────────
  const totalRequests = analytics?.requests?.total ?? 0;
  const completedPickups = analytics?.pickups?.completed ?? 0;
  const totalWeightKg = analytics?.pickups?.totalWeightKg ?? 0;
  const totalOutputWeightKg = analytics?.recycling?.totalOutputWeightKg ?? 0;
  const activeCollectors = analytics?.users?.byRole?.INFORMAL_COLLECTOR ?? 0;
  const verifiedRecyclersCount = recyclers.length;

  return (
    <AdminShell
      title={t('admin.geographic.title') || 'Geographic Analytics'}
      subtitle={t('admin.geographic.subtitle') || 'Regional Activity & Facility Map'}
      activeScreen="AdminGeographicAnalytics"
      navigation={navigation}
    >
      <OfflineBanner />

      {/* Segmented View Controls: [ Overview ] [ Map ] */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'overview' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('overview')}
          accessibilityRole="tab"
          accessibilityLabel={t('admin.geographic.overview') || 'Overview'}
          accessibilityState={{ selected: activeTab === 'overview' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon
              name="chart"
              size={15}
              color={activeTab === 'overview' ? colors.textInverse : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === 'overview' && styles.segmentButtonTextActive,
              ]}
            >
              {t('admin.geographic.overview') || 'Overview'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'map' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('map')}
          accessibilityRole="tab"
          accessibilityLabel={t('admin.geographic.mapView') || 'Map View'}
          accessibilityState={{ selected: activeTab === 'map' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon
              name="mapPin"
              size={15}
              color={activeTab === 'map' ? colors.textInverse : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === 'map' && styles.segmentButtonTextActive,
              ]}
            >
              {t('admin.geographic.mapView') || 'Map View'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Privacy Notice Banner */}
      <View style={styles.privacyBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="shield" size={14} color={colors.primary} />
          <Text style={[styles.privacyBannerText, { flex: 1 }]}>
            {t('admin.geographic.privacyNotice') ||
              'Privacy Protected: Citizen household locations and doorstep addresses are strictly aggregated and never displayed on maps.'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContainer}>
          <Skeleton width="100%" height={100} borderRadius={8} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton width="100%" height={160} borderRadius={8} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton width="100%" height={220} borderRadius={8} />
        </ScrollView>
      ) : error && !analytics && recyclers.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Geographic Data Unavailable"
            message={error}
            actionLabel="Retry"
            onAction={() => loadData(false)}
          />
        </View>
      ) : activeTab === 'overview' ? (
        // ── OVERVIEW TAB ──────────────────────────────────────────────────────
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Section: Aggregated Platform Metrics */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {t('admin.geographic.collectionActivity') || 'Collection & Recycling Activity'}
            </Text>
            <View style={styles.authoritativeBadge}>
              <Text style={styles.authoritativeBadgeText}>
                {t('admin.geographic.platformTotals') || 'Platform-Wide Totals (Authoritative)'}
              </Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <MetricCard
              value={totalRequests}
              label={t('admin.geographic.totalRequests') || 'Total Requests'}
              icon="clipboard"
              accentColor="#6A1B9A"
            />
            <MetricCard
              value={completedPickups}
              label={t('admin.geographic.completedPickups') || 'Pickups Done'}
              icon="checkCircle"
              accentColor="#00695C"
            />
            <MetricCard
              value={`${totalWeightKg} kg`}
              label={t('admin.geographic.eWasteCollected') || 'Collected Wt'}
              icon="scale"
              accentColor="#2E7D32"
            />
            <MetricCard
              value={`${totalOutputWeightKg} kg`}
              label={t('admin.geographic.eWasteRecycled') || 'Recycled Wt'}
              icon="recycle"
              accentColor="#1565C0"
            />
            <MetricCard
              value={activeCollectors}
              label={t('admin.geographic.activeCollectors') || 'Active Collectors'}
              icon="truck"
              accentColor="#E65100"
            />
            <MetricCard
              value={verifiedRecyclersCount}
              label={t('admin.geographic.verifiedRecyclers') || 'Verified Recyclers'}
              icon="factory"
              accentColor="#0277BD"
            />
          </View>

          {/* Section: Regional Facility & Activity Distribution */}
          <Text style={styles.sectionTitle}>
            {t('admin.geographic.collectorCoverage') || 'Regional Facility & Coverage Breakdown'}
          </Text>

          {regionalBreakdown.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                {t('admin.geographic.noGeographicData') ||
                  'No regional activity records available.'}
              </Text>
            </View>
          ) : (
            regionalBreakdown.map((item, idx) => (
              <View key={idx} style={styles.card}>
                <View style={styles.regionHeader}>
                  <Text style={styles.regionState}>{item.state}</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{item.district}</Text>
                  </View>
                </View>
                <View style={styles.regionStatsRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="factory" size={13} color={colors.textSecondary} />
                    <Text style={styles.regionStatLabel}>
                      {t('admin.geographic.recyclerFacilities') || 'Recycler Facilities'}:
                    </Text>
                  </View>
                  <Text style={styles.regionStatValue}>{item.facilityCount}</Text>
                </View>
                <View style={styles.regionStatsRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="package" size={13} color={colors.textSecondary} />
                    <Text style={styles.regionStatLabel}>
                      {t('admin.geographic.consignmentsReceived') || 'Consignments Processed'}:
                    </Text>
                  </View>
                  <Text style={styles.regionStatValue}>{item.totalConsignments}</Text>
                </View>
                <View style={styles.regionStatsRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="shield" size={13} color="#10B981" />
                    <Text style={styles.regionStatLabel}>
                      {t('admin.geographic.district') || 'District'} {t('admin.geographic.collectionActivity') || 'Collection'}:
                    </Text>
                  </View>
                  <Text style={styles.protectedBadgeText}>
                    {t('admin.geographic.privacyProtected') || 'Privacy Protected'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        // ── MAP TAB ───────────────────────────────────────────────────────────
        <View style={styles.mapContainer}>
          {/* Regional Filter Bar (State Chips) */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {/* State Chips */}
              <TouchableOpacity
                style={[styles.filterChip, selectedState === 'ALL' && styles.filterChipActive]}
                onPress={() => {
                  setSelectedState('ALL');
                  setSelectedDistrict('ALL');
                }}
                accessibilityRole="button"
                accessibilityLabel="All States"
              >
                <Text style={[styles.filterChipText, selectedState === 'ALL' && styles.filterChipTextActive]}>
                  {t('admin.geographic.allStates') || 'All States'}
                </Text>
              </TouchableOpacity>
              {availableStates.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterChip, selectedState === st && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedState(st);
                    setSelectedDistrict('ALL');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`State: ${st}`}
                >
                  <Text style={[styles.filterChipText, selectedState === st && styles.filterChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Reset Filter Action Chip if filters active */}
              {(selectedState !== 'ALL' || selectedDistrict !== 'ALL' || selectedCategory !== 'ALL') && (
                <TouchableOpacity
                  style={styles.resetFilterChip}
                  onPress={() => {
                    setSelectedState('ALL');
                    setSelectedDistrict('ALL');
                    setSelectedCategory('ALL');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Reset all filters"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AppIcon name="x" size={12} color="#EF4444" />
                    <Text style={styles.resetFilterChipText}>
                      {t('admin.geographic.resetFilters') || 'Reset'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* District Chips (if state selected or multiple available) */}
          {availableDistricts.length > 0 && (
            <View style={styles.subFilterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedDistrict === 'ALL' && styles.filterChipActive]}
                  onPress={() => setSelectedDistrict('ALL')}
                  accessibilityRole="button"
                  accessibilityLabel="All Districts"
                >
                  <Text style={[styles.filterChipText, selectedDistrict === 'ALL' && styles.filterChipTextActive]}>
                    {t('admin.geographic.allDistricts') || 'All Districts'}
                  </Text>
                </TouchableOpacity>
                {availableDistricts.map((dst) => (
                  <TouchableOpacity
                    key={dst}
                    style={[styles.filterChip, selectedDistrict === dst && styles.filterChipActive]}
                    onPress={() => setSelectedDistrict(dst)}
                    accessibilityRole="button"
                    accessibilityLabel={`District: ${dst}`}
                  >
                    <Text style={[styles.filterChipText, selectedDistrict === dst && styles.filterChipTextActive]}>
                      {dst}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Category Chips (if available) */}
          {availableCategories.length > 0 && (
            <View style={styles.subFilterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedCategory === 'ALL' && styles.filterChipActive]}
                  onPress={() => setSelectedCategory('ALL')}
                  accessibilityRole="button"
                  accessibilityLabel="All Categories"
                >
                  <Text style={[styles.filterChipText, selectedCategory === 'ALL' && styles.filterChipTextActive]}>
                    {t('admin.geographic.allCategories') || 'All Categories'}
                  </Text>
                </TouchableOpacity>
                {availableCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                    accessibilityRole="button"
                    accessibilityLabel={`Category: ${cat}`}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                      {cat.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Map View Wrapper with Floating Overlays */}
          <View style={styles.mapViewWrapper}>
            <EcoSetuMap
              latitude={mapCenter.latitude}
              longitude={mapCenter.longitude}
              markers={mapPins}
              draggable={false}
              isOffline={fromCache}
              showApproximateCircles={false}
              onMarkerPress={(pin) => setSelectedPin(pin)}
              style={styles.map}
              testID="admin-geographic-map"
            />

            {/* Map Legend Floating HUD */}
            <View style={styles.legendHud}>
              <Text style={styles.legendTitle}>{t('admin.geographic.mapLegend') || 'Map Legend'}</Text>
              <View style={styles.legendItem}>
                <AppIcon name="factory" size={13} color="#38BDF8" />
                <Text style={[styles.legendText, { marginLeft: 6 }]}>
                  {t('admin.geographic.recyclerFacilities') || 'Verified Recycler Facility'} ({mapPins.length})
                </Text>
              </View>
              <View style={styles.legendItem}>
                <AppIcon name="shield" size={13} color="#10B981" />
                <Text style={[styles.legendText, { marginLeft: 6 }]}>
                  {t('admin.geographic.privacyProtected') || 'Privacy Safeguarded (No Citizen Pins)'}
                </Text>
              </View>
            </View>

            {/* Empty State Overlay when active filters match 0 facilities */}
            {mapPins.length === 0 && (
              <View style={styles.emptyMapOverlay}>
                <Text style={styles.emptyMapTitle}>
                  {t('admin.geographic.noFacilitiesFound') || 'No Facilities Found'}
                </Text>
                <Text style={styles.emptyMapSubtitle}>
                  {t('admin.geographic.noFacilitiesMatchingFilter') ||
                    'No verified recycler facilities match your active filter criteria.'}
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterButton}
                  onPress={() => {
                    setSelectedState('ALL');
                    setSelectedDistrict('ALL');
                    setSelectedCategory('ALL');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Reset all filters"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <AppIcon name="refreshCw" size={14} color="#FFFFFF" />
                    <Text style={styles.resetFilterText}>
                      {t('admin.geographic.resetFilters') || 'Reset Filters'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Recycler Facility Detail Callout */}
            {selectedPin && (
              <View style={styles.facilityCallout}>
                <View style={styles.calloutHeader}>
                  <Text style={styles.calloutTitle}>{selectedPin.title}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedPin(null)}
                    style={styles.calloutCloseBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close callout"
                  >
                    <AppIcon name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.calloutAddress}>{selectedPin.data?.facilityAddress}</Text>
                <View style={styles.calloutBadges}>
                  <StatusBadge status="APPROVED" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AppIcon name="package" size={13} color={colors.textSecondary} />
                    <Text style={styles.calloutConsignments}>
                      {selectedPin.data?.totalConsignments || 0} consignments
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceXs,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: colors.textInverse,
  },
  privacyBanner: {
    marginHorizontal: spacing.spaceMd,
    marginVertical: spacing.spaceXs,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  privacyBannerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.spaceXs,
    marginBottom: spacing.spaceMd,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceXs,
  },
  regionState: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(96, 165, 250, 0.20)',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#93C5FD',
  },
  regionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  regionStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  regionStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.spaceMd,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  filterBar: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  subFilterBar: {
    backgroundColor: colors.surface,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterScroll: {
    paddingHorizontal: spacing.spaceMd,
  },
  filterChip: {
    paddingHorizontal: 12,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginRight: spacing.spaceXs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  filterChipActive: {
    backgroundColor: colors.accentFillStrong,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  mapViewWrapper: {
    flex: 1,
    position: 'relative',
  },
  legendHud: {
    position: 'absolute',
    top: spacing.spaceSm,
    left: spacing.spaceMd,
    backgroundColor: 'rgba(10, 26, 13, 0.92)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  legendIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  facilityCallout: {
    position: 'absolute',
    bottom: spacing.spaceLg,
    left: spacing.spaceMd,
    right: spacing.spaceMd,
    backgroundColor: colors.backgroundBase,
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  calloutCloseBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutCloseText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  calloutAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
  },
  calloutBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
    flexWrap: 'wrap',
  },
  authoritativeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  authoritativeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    textTransform: 'uppercase',
  },
  protectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  resetFilterChip: {
    paddingHorizontal: 12,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    marginRight: spacing.spaceXs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resetFilterChipText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  emptyMapOverlay: {
    position: 'absolute',
    top: '32%',
    left: spacing.spaceLg,
    right: spacing.spaceLg,
    backgroundColor: 'rgba(10, 26, 13, 0.94)',
    borderRadius: 12,
    padding: spacing.spaceLg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyMapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyMapSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  resetFilterButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  calloutConsignments: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default AdminGeographicAnalyticsScreen;
