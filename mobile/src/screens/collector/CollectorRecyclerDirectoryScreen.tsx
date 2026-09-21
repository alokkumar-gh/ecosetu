/**
 * CollectorRecyclerDirectoryScreen.tsx
 * Recycler Directory & Aggregator Discovery for Informal Collectors
 * Canonical Reference: SIH 26229 Prompt 10, docs/25_SIH_26229_REQUIREMENTS.md Section 7
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../i18n';
import {
  recyclerDirectoryService,
  RecyclerDirectoryItem,
  DirectoryFilters,
} from '../../services/recyclerDirectoryService';
import { EWASTE_CATEGORIES, RECYCLER_AUTHORIZATION_STATUS, PICKUP_AVAILABILITY } from '../../utils/constants';

interface Props {
  navigation?: any;
}

const CATEGORY_CHIPS = [
  { id: 'ALL', label: 'All Materials', value: null },
  { id: EWASTE_CATEGORIES.BATTERY, label: 'Batteries', value: EWASTE_CATEGORIES.BATTERY },
  { id: EWASTE_CATEGORIES.CIRCUIT_BOARD, label: 'PCBs & Boards', value: EWASTE_CATEGORIES.CIRCUIT_BOARD },
  { id: EWASTE_CATEGORIES.CABLE_CHARGER, label: 'Cables & Wire', value: EWASTE_CATEGORIES.CABLE_CHARGER },
  { id: EWASTE_CATEGORIES.MOBILE_PHONE, label: 'Mobiles', value: EWASTE_CATEGORIES.MOBILE_PHONE },
  { id: EWASTE_CATEGORIES.LAPTOP, label: 'Laptops', value: EWASTE_CATEGORIES.LAPTOP },
  { id: EWASTE_CATEGORIES.MONITOR, label: 'Screens / CRTs', value: EWASTE_CATEGORIES.MONITOR },
  { id: EWASTE_CATEGORIES.OTHER, label: 'Other Scrap', value: EWASTE_CATEGORIES.OTHER },
];

const AUTH_FILTERS = [
  { id: 'ALL', label: 'All Statuses', value: null },
  { id: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED, label: '✓ Authorized Only', value: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED },
  { id: RECYCLER_AUTHORIZATION_STATUS.PROVISIONAL, label: '⚠️ Provisional', value: RECYCLER_AUTHORIZATION_STATUS.PROVISIONAL },
  { id: RECYCLER_AUTHORIZATION_STATUS.PENDING_REVIEW, label: '⏳ Pending', value: RECYCLER_AUTHORIZATION_STATUS.PENDING_REVIEW },
];

export const CollectorRecyclerDirectoryScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [recyclers, setRecyclers] = useState<RecyclerDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAuthStatus, setSelectedAuthStatus] = useState<string | null>(null);
  const [pickupOnly, setPickupOnly] = useState<boolean>(false);
  const [ratesOnly, setRatesOnly] = useState<boolean>(false);

  const fetchDirectory = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const filters: DirectoryFilters = {
        category: selectedCategory,
        authorizationStatus: selectedAuthStatus,
        pickupAvailable: pickupOnly ? PICKUP_AVAILABILITY.AVAILABLE : null,
        hasRates: ratesOnly ? true : null,
        search: searchQuery.trim() || null,
      };

      const res = await recyclerDirectoryService.getDirectory(filters);
      setRecyclers(res.recyclers || []);
      setIsOfflineCached(Boolean(res.isOfflineCached));
      setIsStale(Boolean(res.isStale));
      setCachedAt(res.cachedAt || null);
    } catch (err: any) {
      console.warn('[CollectorRecyclerDirectoryScreen] Fetch error:', err.message);
      setErrorMessage(t('recyclerDirectory.loadError') || 'Unable to load recycler directory');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedAuthStatus, pickupOnly, ratesOnly, searchQuery, t]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleRefresh = () => {
    fetchDirectory(true);
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleViewDetails = (item: RecyclerDirectoryItem) => {
    navigation?.navigate('CollectorRecyclerDetail', {
      recyclerId: item.id,
      recycler: item,
    });
  };

  // Render Authorization Badge (Strict differentiation; no fake verified badge)
  const renderAuthBadge = (status: string) => {
    if (status === 'AUTHORIZED') {
      return (
        <View style={[styles.badge, styles.badgeAuthorized]}>
          <Text style={styles.badgeTextAuthorized}>✓ {t('recyclerDirectory.statusAuthorized') || 'Authorized'}</Text>
        </View>
      );
    }
    if (status === 'PROVISIONAL') {
      return (
        <View style={[styles.badge, styles.badgeProvisional]}>
          <Text style={styles.badgeTextProvisional}>⚠️ {t('recyclerDirectory.statusProvisional') || 'Provisional'}</Text>
        </View>
      );
    }
    if (status === 'PENDING' || status === 'PENDING_REVIEW') {
      return (
        <View style={[styles.badge, styles.badgePending]}>
          <Text style={styles.badgeTextPending}>⏳ {t('recyclerDirectory.statusPending') || 'Pending Review'}</Text>
        </View>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <View style={[styles.badge, styles.badgeSuspended]}>
          <Text style={styles.badgeTextSuspended}>⏸️ {t('recyclerDirectory.statusSuspended') || 'Suspended'}</Text>
        </View>
      );
    }
    if (status === 'REJECTED') {
      return (
        <View style={[styles.badge, styles.badgeRejected]}>
          <Text style={styles.badgeTextRejected}>❌ {t('recyclerDirectory.statusRejected') || 'Rejected'}</Text>
        </View>
      );
    }
    if (status === 'EXPIRED') {
      return (
        <View style={[styles.badge, styles.badgeExpired]}>
          <Text style={styles.badgeTextExpired}>⌛ {t('recyclerDirectory.statusExpired') || 'Expired'}</Text>
        </View>
      );
    }
    if (status === 'INACTIVE') {
      return (
        <View style={[styles.badge, styles.badgeInactive]}>
          <Text style={styles.badgeTextInactive}>⛔ {t('recyclerDirectory.statusInactive') || 'Inactive'}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeUnknown]}>
        <Text style={styles.badgeTextUnknown}>ℹ️ {t('recyclerDirectory.statusUnavailable') || 'Status Unknown'}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: RecyclerDirectoryItem }) => {
    const categories = (item.acceptedCategories || []).slice(0, 3);
    const locationText = [item.city, item.state].filter(Boolean).join(', ') || item.serviceArea || 'Service Area Listed';
    const hasPhone = Boolean(item.user?.phone);

    return (
      <View style={styles.card}>
        {/* Header: Facility Name + Auth Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.facilityNameText} numberOfLines={2}>
              {item.facilityName}
            </Text>
            <Text style={styles.locationSubText}>
              📍 {locationText}
            </Text>
          </View>
          {renderAuthBadge(item.authorizationStatus)}
        </View>

        {/* Accepted Material Category Chips */}
        {categories.length > 0 && (
          <View style={styles.categoryRow}>
            {categories.map((cat, idx) => (
              <View key={idx} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  ♻️ {cat.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
            {(item.acceptedCategories || []).length > 3 && (
              <Text style={styles.moreCategoriesText}>
                +{item.acceptedCategories.length - 3} more
              </Text>
            )}
          </View>
        )}

        {/* Status Indicators Row: Pickup + Rate Availability + Distance */}
        <View style={styles.metaIndicatorsRow}>
          {/* Pickup */}
          <View style={styles.metaIndicator}>
            <Text style={styles.metaIndicatorText}>
              {item.pickupAvailable === 'AVAILABLE'
                ? '🚚 ' + (t('recyclerDirectory.pickup') || 'Pickup Available')
                : item.pickupAvailable === 'NOT_AVAILABLE'
                ? '🏢 ' + (t('recyclerDirectory.dropoffOnly') || 'Drop-off Only')
                : '❓ ' + (t('recyclerDirectory.pickupUnknown') || 'Pickup Unknown')}
            </Text>
          </View>

          {/* Active Rates */}
          <View style={styles.metaIndicator}>
            <Text
              style={[
                styles.metaIndicatorText,
                item.hasActiveRates && { color: '#10B981', fontWeight: 'bold' },
              ]}
            >
              {item.hasActiveRates
                ? `💰 ${item.activeRatesCount} ${t('recyclerDirectory.activeRates') || 'Rates Available'}`
                : `ℹ️ ${t('recyclerDirectory.noRates') || 'Rate on Request'}`}
            </Text>
          </View>

          {/* Approximate Distance (if available) */}
          {item.distanceKm != null && (
            <View style={styles.metaIndicator}>
              <Text style={[styles.metaIndicatorText, { color: '#38BDF8' }]}>
                📏 ~{item.distanceKm} km
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons: View Details + Quick Call */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => handleViewDetails(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t('recyclerDirectory.viewDetails')}: ${item.facilityName}`}
          >
            <Text style={styles.viewDetailsBtnText}>
              🏢 {t('recyclerDirectory.viewDetails') || 'View Details'}
            </Text>
          </TouchableOpacity>

          {hasPhone && (
            <TouchableOpacity
              style={styles.quickCallBtn}
              onPress={() => handleCall(item.user?.phone)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Call ${item.facilityName}`}
            >
              <Text style={styles.quickCallBtnText}>
                📞 {t('recyclerDirectory.call') || 'Call'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('recyclerDirectory.title') || 'Recycler Directory'}
          subtitle={t('recyclerDirectory.subtitle') || 'Discover verified formal recyclers & aggregators'}
        />

        {/* Offline / Cache Banner */}
        {isOfflineCached && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              📴 {t('recyclerDirectory.offlineBanner') || 'Offline — showing cached recycler information'}
            </Text>
            {isStale && (
              <Text style={styles.staleBannerText}>
                ⚠️ {t('recyclerDirectory.staleWarning') || 'Data cached over 24 hours ago. Rates may have changed.'}
              </Text>
            )}
          </View>
        )}

        {/* Search Input Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('recyclerDirectory.searchPlaceholder') || 'Search recycler name, city, or material...'}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityLabel={t('recyclerDirectory.searchRecyclers') || 'Search recyclers'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips: Material Categories */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = selectedCategory === chip.value;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(isSelected ? null : chip.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Second Filter Row: Authorization & Pickup Toggles */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginTop: 6 }]}>
            {AUTH_FILTERS.map((chip) => {
              const isSelected = selectedAuthStatus === chip.value;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.subFilterChip, isSelected && styles.subFilterChipActive]}
                  onPress={() => setSelectedAuthStatus(isSelected ? null : chip.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.subFilterChipText, isSelected && styles.subFilterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Pickup Only Toggle */}
            <TouchableOpacity
              style={[styles.subFilterChip, pickupOnly && styles.subFilterChipActive]}
              onPress={() => setPickupOnly(!pickupOnly)}
              activeOpacity={0.7}
            >
              <Text style={[styles.subFilterChipText, pickupOnly && styles.subFilterChipTextActive]}>
                🚚 Pickup Only
              </Text>
            </TouchableOpacity>

            {/* Rates Available Only Toggle */}
            <TouchableOpacity
              style={[styles.subFilterChip, ratesOnly && styles.subFilterChipActive]}
              onPress={() => setRatesOnly(!ratesOnly)}
              activeOpacity={0.7}
            >
              <Text style={[styles.subFilterChipText, ratesOnly && styles.subFilterChipTextActive]}>
                💰 Has Rates
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content Area */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#14B8A6'} />
            <Text style={styles.loadingText}>
              {t('recyclerDirectory.loading') || 'Searching recyclers...'}
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDirectory()}>
              <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={recyclers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary || '#14B8A6'}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏢</Text>
                <Text style={styles.emptyTitle}>
                  {t('recyclerDirectory.noRecyclersFound') || 'No Recyclers Found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {t('recyclerDirectory.noRecyclersDesc') || 'No recyclers match the active filters or search terms. Try clearing filters.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: spacing.spaceSm,
    marginHorizontal: spacing.spaceMd,
    marginTop: 6,
    borderRadius: 8,
  },
  offlineBannerText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
  staleBannerText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 10,
  },
  clearText: {
    color: '#94A3B8',
    fontSize: 16,
    padding: 4,
  },
  filtersContainer: {
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  filterScroll: {
    paddingHorizontal: spacing.spaceMd,
    gap: 6,
  },
  filterChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: '#14B8A6',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#2DD4BF',
    fontWeight: 'bold',
  },
  subFilterChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  subFilterChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  subFilterChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  subFilterChipTextActive: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: spacing.spaceMd,
    paddingBottom: 40,
    gap: spacing.spaceMd,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: spacing.spaceMd,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  facilityNameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationSubText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeAuthorized: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  badgeTextAuthorized: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeProvisional: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  badgeTextProvisional: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgePending: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  badgeTextPending: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  badgeTextExpired: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeSuspended: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#F97316',
  },
  badgeTextSuspended: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  badgeTextRejected: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeInactive: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: '#64748B',
  },
  badgeTextInactive: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeUnknown: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#94A3B8',
  },
  badgeTextUnknown: {
    color: '#94A3B8',
    fontSize: 11,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryChipText: {
    color: '#2DD4BF',
    fontSize: 11,
    fontWeight: '500',
  },
  moreCategoriesText: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 2,
  },
  metaIndicatorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaIndicator: {
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaIndicatorText: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: colors.primary || '#14B8A6',
    borderRadius: 8,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewDetailsBtnText: {
    color: '#051417',
    fontWeight: 'bold',
    fontSize: 14,
  },
  quickCallBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCallBtnText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    margin: spacing.spaceMd,
    padding: spacing.spaceMd,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default CollectorRecyclerDirectoryScreen;
