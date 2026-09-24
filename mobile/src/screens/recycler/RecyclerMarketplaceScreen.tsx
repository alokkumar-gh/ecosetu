/**
 * EcoSetu Recycler Marketplace Sourcing Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 & 10
 *
 * Real two-sided e-waste marketplace discovery:
 * - Primary Header: "Find E-Waste"
 * - Search material by text / subcategory / location
 * - Factual filters: Category, Condition, Weight / Sort
 * - Prioritized listing cards (Material, Subcategory, Weight, Condition, Area, Distance, Pickup, Offers, Time)
 * - Primary CTA: "View Lot" | Secondary CTA: "Make Offer"
 * - Honest empty states when 0 lots exist in database
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/apiClient';
import networkService from '../../services/networkService';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'BATTERY', label: '🔋 Battery' },
  { key: 'PCB', label: '📟 PCB' },
  { key: 'DISPLAY', label: '🖥️ Display' },
  { key: 'WIRE_CABLE', label: '🔌 Cables' },
  { key: 'BULK_APPLIANCE', label: '📦 Appliance' },
  { key: 'IT_EQUIPMENT', label: '💻 IT Gear' },
  { key: 'MIXED_METALS', label: '🔩 Metals' },
];

const CONDITIONS = [
  { key: 'ALL', label: 'All Conditions' },
  { key: 'WORKING', label: 'Working' },
  { key: 'REPAIRABLE', label: 'Repairable' },
  { key: 'DAMAGED', label: 'Damaged' },
  { key: 'SCRAP', label: 'Scrap' },
];

const SORT_OPTIONS = [
  { key: 'NEWEST', label: '⏱ Newest' },
  { key: 'WEIGHT_HIGH', label: '⚖️ Weight (High-Low)' },
  { key: 'WEIGHT_LOW', label: '⚖️ Weight (Low-High)' },
];

export const RecyclerMarketplaceScreen: React.FC = () => {
  const { t } = useI18n();
  const navigation = useNavigation<any>();

  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('NEWEST');

  const [overview, setOverview] = useState<any>(null);
  const [marketStats, setMarketStats] = useState<any>(null);
  const [showMarketModal, setShowMarketModal] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const fetchLots = useCallback(async () => {
    setError(null);
    try {
      const params: any = {};
      if (selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }
      if (selectedCondition !== 'ALL') {
        params.condition = selectedCondition;
      }
      if (searchText.trim().length > 0) {
        params.search = searchText.trim();
      }
      if (selectedSort) {
        params.sortBy = selectedSort;
      }

      const [response, ov] = await Promise.all([
        apiClient.get('/material-lots', { params }),
        apiClient.get('/material-lots/marketplace/overview'),
      ]);

      if (response.data && response.data.success) {
        setLots(response.data.data?.lots || []);
      }
      if (ov.data && ov.data.success) {
        setOverview(ov.data.data);
      }
    } catch (err: any) {
      if (!networkService.isOnline()) {
        setError(t('common.offline') || 'You are offline. Connect to view active marketplace listings.');
      } else {
        setError(err.message || 'Failed to load marketplace lots');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedCondition, selectedSort, searchText, t]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLots();
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchLots();
  };

  const inspectMarketStats = async (categoryKey: string) => {
    const cat = categoryKey === 'ALL' ? (selectedCategory === 'ALL' ? 'BATTERY' : selectedCategory) : categoryKey;
    try {
      setLoadingStats(true);
      setShowMarketModal(true);
      const res = await apiClient.get('/material-lots/marketplace/market-stats', {
        params: { category: cat },
      });
      if (res.data && res.data.success) {
        setMarketStats(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load market stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const metrics = overview?.metrics;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Find E-Waste</Text>
            <Text style={styles.headerSubtitle}>
              {t('recycler.marketplace.subtitle') || 'Sourcing marketplace for authorized buyers'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.insightsButton}
            onPress={() => inspectMarketStats(selectedCategory)}
            accessibilityRole="button"
          >
            <Text style={styles.insightsButtonText}>📊 Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Real Marketplace Metrics Summary (Phase 3) */}
        {metrics && (
          <View style={styles.metricsSummaryCard}>
            <View style={styles.metricItemCol}>
              <Text style={styles.metricValueText}>{metrics.availableLots || 0}</Text>
              <Text style={styles.metricLabelText}>Available Lots</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItemCol}>
              <Text style={styles.metricValueText}>{metrics.nearbyLots || 0}</Text>
              <Text style={styles.metricLabelText}>Nearby Lots</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItemCol}>
              <Text style={styles.metricValueText}>{metrics.newToday || 0}</Text>
              <Text style={styles.metricLabelText}>New Today</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItemCol}>
              <Text style={[styles.metricValueText, (metrics.myActiveOffers || 0) > 0 && styles.activeOfferText]}>
                {metrics.myActiveOffers || 0}
              </Text>
              <Text style={styles.metricLabelText}>My Offers</Text>
            </View>
          </View>
        )}

        {/* Source Material Demand Management Banner */}
        <TouchableOpacity
          style={styles.sourcingBanner}
          onPress={() => navigation.navigate('RecyclerSourcing')}
          activeOpacity={0.8}
        >
          <View style={styles.sourcingBannerContent}>
            <Text style={styles.sourcingBannerIcon}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourcingBannerTitle}>Need Specific Material? Post Sourcing Request</Text>
              <Text style={styles.sourcingBannerSubtitle}>Publish demand so eligible collectors can respond</Text>
            </View>
            <Text style={styles.sourcingBannerArrow}>Manage →</Text>
          </View>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBarContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search material, subcategory, area..."
              placeholderTextColor="#64748B"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('');
                  setLoading(true);
                }}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Category Filter Scroll */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.key && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat.key && styles.filterChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sort & Condition Bar */}
        <View style={styles.secondaryFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secondaryFilterScroll}>
            {/* Condition chips */}
            {CONDITIONS.map((cond) => (
              <TouchableOpacity
                key={cond.key}
                style={[
                  styles.secondaryChip,
                  selectedCondition === cond.key && styles.secondaryChipActive,
                ]}
                onPress={() => setSelectedCondition(cond.key)}
              >
                <Text
                  style={[
                    styles.secondaryChipText,
                    selectedCondition === cond.key && styles.secondaryChipTextActive,
                  ]}
                >
                  {cond.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Sort chips */}
            {SORT_OPTIONS.map((sort) => (
              <TouchableOpacity
                key={sort.key}
                style={[
                  styles.sortChip,
                  selectedSort === sort.key && styles.sortChipActive,
                ]}
                onPress={() => setSelectedSort(sort.key)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    selectedSort === sort.key && styles.sortChipTextActive,
                  ]}
                >
                  {sort.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
        >
          {/* Loading Indicator */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchLots}>
                <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Empty State - Honest, no fake listings */}
          {!loading && !error && lots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>
                No material lots currently available.
              </Text>
              <Text style={styles.emptyDescription}>
                {t('recycler.marketplace.noLotsDesc') ||
                  'No collectors have listed open material matching your active search or filters. Check back soon or reset filters.'}
              </Text>
              {selectedCategory !== 'ALL' || selectedCondition !== 'ALL' || searchText.length > 0 ? (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => {
                    setSelectedCategory('ALL');
                    setSelectedCondition('ALL');
                    setSearchText('');
                    setSelectedSort('NEWEST');
                  }}
                >
                  <Text style={styles.clearFilterButtonText}>🔄 {t('recycler.marketplace.resetFilters') || 'Reset Filters'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Lots List */}
          {!loading && !error && lots.map((lot) => {
            const offerCount = lot._count?.quotes || 0;
            const photoUrl = lot.photos && lot.photos.length > 0 ? lot.photos[0].photoUrl : null;
            const weight = lot.approximateTotalWeightKg || '—';
            const location = lot.collector?.city
              ? `${lot.collector.city}${lot.collector.state ? `, ${lot.collector.state}` : ''}`
              : (lot.collector?.serviceArea || 'Location on file');

            return (
              <View key={lot.id} style={styles.lotCard}>
                {/* Header: Material Category & Number of Offers */}
                <View style={styles.lotHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>📦 {lot.category}</Text>
                  </View>
                  <View style={[styles.offerBadge, offerCount > 0 ? styles.offerBadgeActive : null]}>
                    <Text style={styles.offerBadgeText}>
                      💬 {offerCount} {offerCount === 1 ? 'offer' : 'offers'}
                    </Text>
                  </View>
                </View>

                {/* Body: Thumbnail + Prioritized Information */}
                <View style={styles.lotBody}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.lotThumbnail} resizeMode="cover" />
                  ) : null}
                  <View style={styles.lotInfo}>
                    <Text style={styles.lotRef}>{lot.referenceNumber}</Text>
                    {lot.subcategory ? (
                      <Text style={styles.lotSubcategory}>Subcategory: {lot.subcategory}</Text>
                    ) : null}
                    <Text style={styles.lotDetail}>⚖️ Weight: <Text style={styles.boldWhite}>{weight} kg</Text></Text>
                    <Text style={styles.lotDetail}>🔧 Condition: <Text style={styles.boldWhite}>{lot.condition || 'UNKNOWN'}</Text></Text>
                    <Text style={styles.lotDetail}>📍 Area: <Text style={styles.boldWhite}>{location}</Text></Text>
                    <Text style={styles.lotDetail}>🚚 Pickup: <Text style={styles.boldWhite}>Required / In-Person</Text></Text>
                    <Text style={styles.lotTime}>
                      🕒 Listed: {new Date(lot.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {lot.description ? (
                  <Text style={styles.lotDescription} numberOfLines={2}>
                    📝 {lot.description}
                  </Text>
                ) : null}

                {/* Primary CTA: "View Lot" | Secondary CTA: "Make Offer" */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.viewLotButton}
                    onPress={() => navigation.navigate('RecyclerLotDetail', { lotId: lot.id, lot })}
                    accessibilityRole="button"
                    accessibilityLabel="View Lot"
                  >
                    <Text style={styles.viewLotButtonText}>🔍 View Lot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.makeOfferButton}
                    onPress={() => navigation.navigate('RecyclerCreateQuote', { lot })}
                    accessibilityRole="button"
                    accessibilityLabel="Make Offer"
                  >
                    <Text style={styles.makeOfferButtonText}>💰 Make Offer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Phase 3: Market & Demand Insights Modal */}
        {showMarketModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.marketModalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.marketModalTitle}>📊 MARKET & DEMAND INSIGHTS</Text>
                <TouchableOpacity onPress={() => setShowMarketModal(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.marketModalCategory}>
                Material: <Text style={styles.boldWhite}>{selectedCategory}</Text>
              </Text>

              {loadingStats ? (
                <View style={styles.loadingStatsContainer}>
                  <ActivityIndicator color="#10B981" />
                  <Text style={styles.loadingStatsText}>Querying factual market statistics...</Text>
                </View>
              ) : marketStats ? (
                <View style={styles.statsContainer}>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{marketStats.availableLotsCount || 0}</Text>
                      <Text style={styles.statBoxLabel}>Available Lots</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{marketStats.activeBuyerOffersCount || 0}</Text>
                      <Text style={styles.statBoxLabel}>Active Buyer Offers</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{marketStats.recentCompletedSalesCount || 0}</Text>
                      <Text style={styles.statBoxLabel}>Completed Sales</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNum}>{marketStats.activeRecyclerRatesCount || 0}</Text>
                      <Text style={styles.statBoxLabel}>Active Recycler Rates</Text>
                    </View>
                  </View>

                  <View style={styles.standardCard}>
                    <Text style={styles.standardHeader}>Verified Price Standard:</Text>
                    {marketStats.verifiedPriceStandard ? (
                      <View>
                        <Text style={styles.standardValue}>
                          ₹{marketStats.verifiedPriceStandard.buyingPrice} / {marketStats.verifiedPriceStandard.unit === 'PER_KG' ? 'kg' : marketStats.verifiedPriceStandard.unit}
                        </Text>
                        <Text style={styles.standardSource}>
                          Source: {marketStats.verifiedPriceStandard.sourceLabel}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.standardUnavailable}>
                        No verified standard price record in database.
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyStatsText}>No verified market activity available.</Text>
              )}

              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowMarketModal(false)}
              >
                <Text style={styles.modalDoneText}>Close Insights</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  insightsButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  insightsButtonText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsSummaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 35, 40, 0.90)',
    marginHorizontal: space.md,
    marginTop: space.xs,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItemCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeOfferText: {
    color: '#60A5FA',
  },
  metricLabelText: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.md,
    zIndex: 999,
  },
  marketModalCard: {
    backgroundColor: '#0F2A2E',
    borderRadius: 20,
    padding: space.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  marketModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  marketModalCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: space.md,
  },
  loadingStatsContainer: {
    paddingVertical: space.lg,
    alignItems: 'center',
    gap: space.xs,
  },
  loadingStatsText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statsContainer: {
    gap: space.md,
    marginBottom: space.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statBoxNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  standardCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  standardHeader: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  standardValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
  },
  standardSource: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  standardUnavailable: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  emptyStatsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: space.md,
  },
  modalDoneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: space.sm,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  filterSection: {
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterScroll: {
    paddingHorizontal: space.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  secondaryFilterBar: {
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  secondaryFilterScroll: {
    paddingHorizontal: space.md,
    gap: 6,
  },
  secondaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  secondaryChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  secondaryChipTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sortChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  sortChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#FCD34D',
    fontWeight: '700',
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: space.md,
    alignItems: 'center',
    marginBottom: space.md,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    backgroundColor: 'rgba(15, 35, 40, 0.7)',
    borderRadius: 16,
    padding: space.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: space.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: space.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: space.md,
  },
  clearFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  clearFilterButtonText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  lotCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryBadgeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  offerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  offerBadgeActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  offerBadgeText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  lotBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  lotThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  lotInfo: {
    flex: 1,
  },
  lotRef: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  lotSubcategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  lotDetail: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lotTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  lotDescription: {
    fontSize: 12,
    color: '#CBD5E1',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  viewLotButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewLotButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  makeOfferButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  makeOfferButtonText: {
    color: '#071E22',
    fontSize: 13,
    fontWeight: '800',
  },
  sourcingBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
  },
  sourcingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sourcingBannerIcon: {
    fontSize: 22,
  },
  sourcingBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  sourcingBannerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sourcingBannerArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
});

export default RecyclerMarketplaceScreen;
