/**
 * RecyclerMarketScreen — MARKET = WHAT CAN I BUY TODAY?
 *
 * COMPLETELY NEW screen. NOT the old RecyclerMarketplaceScreen.
 *
 * Architecture:
 *  1. ProcurementSummary — counters: new lots, active offers, pickups today, sourcing
 *  2. Search bar (debounced, 400ms)
 *  3. Category filter pills — horizontal scroll
 *  4. MaterialLotCard list — FlatList with pagination
 *  5. Floating SOURCING REQUEST FAB
 *
 * Data sources:
 *  - materialLotService.listLots({ status: 'OPEN' }) — marketplace lots
 *  - quoteService.getMyQuotes() or similar — my active offer count
 *  - recyclingService.getProfile() — facility info
 *
 * Design:
 *  - Dark #030C12 base
 *  - Teal (#22D3EE) primary actions
 *  - Emerald (#10B981) secondary
 *  - NO glass cards in glass cards
 *  - FlatList — NOT ScrollView with nested maps
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  RecyclerHeader,
  ProcurementSummary,
  MaterialLotCard,
  RecyclerEmptyState,
  RecyclerSkeletonList,
  RecyclerSectionHeader,
} from '../../components/recycler';
import type { MarketLot } from '../../components/recycler';
import { materialLotService } from '../../services/materialLotService';
import { useAuth } from '../../hooks/useAuth';
import { recyclingService } from '../../services/recyclingService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';

function mapLotToMarketLot(lot: any): MarketLot {
  const tax = MATERIAL_TAXONOMY[lot.category] || MATERIAL_TAXONOMY[lot.subcategory || ''];
  return {
    id:                    lot.id,
    category:              lot.category || 'Unknown',
    subcategory:           lot.subcategory,
    materialIcon:          tax?.symbol ?? '📦',
    condition:             lot.condition,
    approximateTotalWeightKg: lot.approximateTotalWeightKg || lot.weightKg,
    quantityUnits:         lot.quantityUnits,
    location:              lot.location || lot.city,
    distanceKm:            typeof lot.distanceKm === 'number' ? lot.distanceKm : undefined,
    pickupAvailable:       Boolean(lot.pickupAvailable),
    offerCount:            lot.quoteCount ?? lot.offerCount ?? 0,
    status:                lot.status || 'OPEN',
    askingPrice:           lot.askingPricePerKg || lot.pricePerKg,
    listingPurpose:        lot.listingPurpose,
  };
}

export const RecyclerMarketScreen: React.FC = () => {
  const navigation     = useNavigation<any>();
  const { user }       = useAuth();
  const { t }          = useI18n();

  const [profile, setProfile]     = useState<any>(null);
  const [lots, setLots]           = useState<MarketLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [page, setPage]           = useState(1);
  const [searchText, setSearchText] = useState('');
  const [category, setCategory]   = useState('ALL');
  const [procCounters, setProcCounters] = useState({ newLots: 0, activeOffers: 0, pickupsToday: 0 });

  const searchTimeout = useRef<any>(null);
  const currentSearch = useRef('');
  const isLoadingMore = useRef(false);

  const categoryFilters = [
    { key: 'ALL',        label: t('common.all', 'All'),             icon: '🔍' },
    { key: 'MOBILE',     label: t('categories.mobile', 'Mobiles'),  icon: '📱' },
    { key: 'LAPTOP',     label: t('categories.laptop', 'Laptops'),  icon: '💻' },
    { key: 'PCB',        label: t('categories.pcb', 'PCB'),         icon: '🔧' },
    { key: 'CABLE',      label: t('categories.cable', 'Cables'),    icon: '🔌' },
    { key: 'BATTERY',    label: t('categories.battery', 'Battery'), icon: '🔋' },
    { key: 'APPLIANCE',  label: t('categories.appliances', 'Appliances'), icon: '🏠' },
    { key: 'PRINTER',    label: t('categories.printers', 'Printers'), icon: '🖨️' },
    { key: 'MONITOR',    label: t('categories.monitors', 'Monitors'), icon: '🖥️' },
    { key: 'OTHER',      label: t('categories.other', 'Other'),     icon: '📦' },
  ];

  const loadMarket = useCallback(async (opts: {
    reset?: boolean;
    searchQ?: string;
    cat?: string;
    pg?: number;
  } = {}) => {
    const { reset = true, searchQ = currentSearch.current, cat = category, pg = 1 } = opts;
    if (reset) { setIsLoading(true); }

    try {
      const params: any = {
        status:  'OPEN',
        limit:   15,
        page:    pg,
      };
      if (cat !== 'ALL')   params.category = cat;
      if (searchQ?.trim()) params.search   = searchQ.trim();

      const res = await materialLotService.listLots(params);
      const raw = res?.lots || [];
      const mapped = raw.map(mapLotToMarketLot);

      if (reset) {
        setLots(mapped);
      } else {
        setLots((prev) => [...prev, ...mapped]);
      }
      setPage(pg);
      setHasMore(raw.length === 15);
    } catch (e) {
      console.warn('[RecyclerMarket] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [category]);

  const loadProcurementCounters = useCallback(async () => {
    try {
      const [profRes] = await Promise.allSettled([
        recyclingService.getProfile(),
      ]);
      if (profRes.status === 'fulfilled') {
        setProfile((profRes.value as any)?.profile || profRes.value);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadProcurementCounters();
    loadMarket({ reset: true, cat: 'ALL', pg: 1 });
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMarket({ reset: true, cat: category, pg: 1 });
  };

  const onEndReached = () => {
    if (isLoadingMore.current || !hasMore || isLoading) return;
    isLoadingMore.current = true;
    loadMarket({ reset: false, cat: category, pg: page + 1 })
      .finally(() => { isLoadingMore.current = false; });
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      currentSearch.current = text;
      loadMarket({ reset: true, cat: category, searchQ: text, pg: 1 });
    }, 400);
  };

  const handleCategoryChange = (key: string) => {
    setCategory(key);
    Keyboard.dismiss();
    loadMarket({ reset: true, cat: key, searchQ: currentSearch.current, pg: 1 });
  };

  const facilityName = (profile as any)?.facilityName || user?.name || t('roles.recycler', 'Recycler');
  const isAuthorized = (profile as any)?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Procurement summary */}
      {(procCounters.newLots > 0 || procCounters.activeOffers > 0) && (
        <ProcurementSummary
          counters={[
            {
              id: 'lots', count: procCounters.newLots, label: t('recycler.newLots', 'New lots'),
              icon: '📦', color: '#22D3EE',
              onPress: () => {},
            },
            {
              id: 'offers', count: procCounters.activeOffers, label: t('recycler.activeOffers', 'Active offers'),
              icon: '📋', color: '#F59E0B',
              onPress: () => navigation.navigate('RecyclerOrders'),
            },
            {
              id: 'pickups', count: procCounters.pickupsToday, label: t('recycler.pickupsToday', 'Pickups today'),
              icon: '🚚', color: '#34D399',
              onPress: () => navigation.navigate('RecyclerPickupManagement'),
            },
          ]}
        />
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('recycler.searchMaterialPlaceholder', 'Search material, category…')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          accessibilityLabel={t('recycler.searchMaterial', 'Search material')}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        data={categoryFilters}
        keyExtractor={(i) => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, category === item.key && styles.chipActive]}
            onPress={() => handleCategoryChange(item.key)}
            accessibilityRole="button"
          >
            <Text style={styles.chipIcon}>{item.icon}</Text>
            <Text style={[styles.chipLabel, category === item.key && styles.chipLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Section label */}
      <RecyclerSectionHeader
        label={category === 'ALL' ? t('recycler.availableMaterial', 'AVAILABLE MATERIAL') : categoryFilters.find(c => c.key === category)?.label?.toUpperCase() ?? t('common.results', 'RESULTS')}
        count={lots.length}
      />
    </View>
  );

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <RecyclerHeader
          facilityName={facilityName}
          isAuthorized={isAuthorized}
          city={(profile as any)?.city}
          rightAction={
            <TouchableOpacity
              style={styles.sourcingFAB}
              onPress={() => navigation.navigate('RecyclerCreateSourcingRequest')}
              accessibilityRole="button"
              accessibilityLabel={t('recycler.createSourcingRequest', 'Create sourcing request')}
            >
              <Text style={styles.sourcingFABText}>+ {t('recycler.sourcingCaps', 'SOURCING')}</Text>
            </TouchableOpacity>
          }
        />

        {isLoading ? (
          <View style={{ paddingTop: 20 }}>
            <RecyclerSkeletonList count={3} />
          </View>
        ) : (
          <FlatList
            data={lots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MaterialLotCard
                lot={item}
                onView={() => navigation.navigate('RecyclerLotDetail', { lotId: item.id, lot: item })}
                onOffer={() => navigation.navigate('RecyclerCreateQuote', {
                  lot: item,
                  materialCategory: item.category,
                  quantity: item.approximateTotalWeightKg,
                })}
              />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <RecyclerEmptyState
                type="no_lots"
                onAction={() => { handleSearch(''); handleCategoryChange('ALL'); }}
                actionLabel={t('common.clearFilters', 'Clear filters')}
              />
            }
            ListFooterComponent={hasMore && lots.length > 0 ? (
              <View style={{ paddingVertical: 20 }}>
                <RecyclerSkeletonList count={1} />
              </View>
            ) : <View style={{ height: 80 }} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={['#22D3EE']}
                tintColor="#22D3EE"
              />
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listHeader: { gap: 16, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    minHeight: 50,
    gap: 10,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 12,
  },
  clearBtn: { color: 'rgba(255,255,255,0.35)', fontSize: 16, padding: 4 },

  // Category chips
  chipList:       { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  chipActive:      { backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.4)' },
  chipIcon:        { fontSize: 14 },
  chipLabel:       { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
  chipLabelActive: { color: '#22D3EE', fontWeight: '800' },

  // Sourcing FAB
  sourcingFAB: {
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sourcingFABText: { color: '#22D3EE', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});

export default RecyclerMarketScreen;
