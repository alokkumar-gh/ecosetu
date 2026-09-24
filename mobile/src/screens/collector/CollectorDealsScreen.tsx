/**
 * CollectorDealsScreen — NEW DEALS / MARKETPLACE INBOX
 *
 * Completely replaces CollectorLotsScreen.
 *
 * New concept: DEALS = Marketplace Inbox
 * NOT a database list. NOT a filter tab grid.
 *
 * Structure:
 *  ── NEEDS ACTION    (QUOTED + ACCEPTED lots — highlighted, first)
 *  ── ACTIVE          (OPEN lots — listed, waiting)
 *  ── COMPLETED       (COMPLETED lots — collapsed by default)
 *
 * Each item = DealStatusRow (compact, actionable, not a card-within-card)
 * FAB: + Sell Material (always visible)
 * Filter pills: ALL / ACTION NEEDED / LISTED / COMPLETED (simplified)
 *
 * Preserves: materialLotService, MATERIAL_TAXONOMY, navigation to
 *   CollectorLotDetail, CollectorQuotes, CollectorHandover
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  CollectorHeader,
  DealStatusRow,
  CollectorSkeletonList,
  EmptyMarketplaceState,
  CollectorSectionHeader,
} from '../../components/collector';
import { colors } from '../../theme/colors';
import { materialLotService, MaterialLotItem } from '../../services/materialLotService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';

// ─────────────────────────────────────────────────────────────────────────────
type FilterTab = 'ALL' | 'ACTION' | 'OPEN' | 'COMPLETED';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'ALL',       label: 'All'           },
  { id: 'ACTION',    label: '● Action'      },
  { id: 'OPEN',      label: 'Listed'        },
  { id: 'COMPLETED', label: 'Completed'     },
];

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
}

export const CollectorDealsScreen: React.FC<Props> = ({ navigation }) => {
  const { t }    = useI18n();
  const insets   = useSafeAreaInsets();

  const [lots, setLots]             = useState<MaterialLotItem[]>([]);
  const [filter, setFilter]         = useState<FilterTab>('ALL');
  const [isLoading, setIsLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchLots = useCallback(async () => {
    try {
      const result = await materialLotService.listLots({ limit: 50 });
      setLots(result.lots || []);
    } catch (err) {
      console.warn('[CollectorDeals] fetch error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLots(); }, [fetchLots]);

  const onRefresh = () => { setIsRefreshing(true); fetchLots(); };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredLots = useMemo(() => {
    switch (filter) {
      case 'ACTION':    return lots.filter((l) => l.status === 'QUOTED' || l.status === 'ACCEPTED');
      case 'OPEN':      return lots.filter((l) => l.status === 'OPEN');
      case 'COMPLETED': return lots.filter((l) => l.status === 'COMPLETED' || l.status === 'HANDOVER_PENDING');
      default:          return lots;
    }
  }, [lots, filter]);

  // Counts for badge
  const actionCount = lots.filter(
    (l) => l.status === 'QUOTED' || l.status === 'ACCEPTED'
  ).length;

  // ── Item renderer ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: MaterialLotItem }) => {
      const catMeta = MATERIAL_TAXONOMY[item.category] || { symbol: '📦', defaultName: item.category };
      const catName = (catMeta as any).i18nKey ? t((catMeta as any).i18nKey, catMeta.defaultName) : catMeta.defaultName;
      const isHighlighted = item.status === 'QUOTED' || item.status === 'ACCEPTED';
      const actionLabel =
        item.status === 'QUOTED'   ? t('collector.offers', 'Offers')   :
        item.status === 'ACCEPTED' ? t('collector.handover', 'Handover') :
        undefined;

      return (
        <DealStatusRow
          id={item.id}
          material={item.subcategory || catName}
          materialIcon={catMeta.symbol}
          referenceNumber={item.referenceNumber}
          status={item.status}
          quantityKg={item.approximateTotalWeightKg}
          totalAmount={item.askingPrice ? Number(item.askingPrice) : undefined}
          isHighlighted={isHighlighted}
          actionLabel={actionLabel}
          onPress={() =>
            navigation.navigate('CollectorLotDetail', { lotId: item.id, lot: item })
          }
          onAction={
            item.status === 'QUOTED'
              ? () => navigation.navigate('CollectorQuotes', { lotId: item.id, lot: item })
              : item.status === 'ACCEPTED'
              ? () => navigation.navigate('CollectorHandover', { lotId: item.id, lot: item })
              : undefined
          }
        />
      );
    },
    [navigation, t]
  );

  // ── Section separator when filter = ALL ─────────────────────────────────────
  const renderSectionLabel = (label: string) => (
    <Text style={styles.groupLabel}>{label}</Text>
  );

  // Build displayed items with section headers for ALL view
  const displayItems = useMemo(() => {
    if (filter !== 'ALL') return filteredLots.map((l) => ({ type: 'item' as const, data: l }));

    const groups: Array<{ type: 'header'; label: string } | { type: 'item'; data: MaterialLotItem }> = [];

    const action    = lots.filter((l) => l.status === 'QUOTED' || l.status === 'ACCEPTED');
    const active    = lots.filter((l) => l.status === 'OPEN');
    const done      = lots.filter((l) => l.status === 'COMPLETED' || l.status === 'HANDOVER_PENDING');
    const drafts    = lots.filter((l) => l.status === 'DRAFT' || (l as any).isOfflineDraft);

    if (action.length > 0) {
      groups.push({ type: 'header', label: t('collector.needsAction', 'NEEDS ACTION') });
      action.forEach((l) => groups.push({ type: 'item', data: l }));
    }
    if (active.length > 0) {
      groups.push({ type: 'header', label: t('collector.listedWaiting', 'LISTED — WAITING') });
      active.forEach((l) => groups.push({ type: 'item', data: l }));
    }
    if (drafts.length > 0) {
      groups.push({ type: 'header', label: t('collector.drafts', 'DRAFTS') });
      drafts.forEach((l) => groups.push({ type: 'item', data: l }));
    }
    if (done.length > 0) {
      groups.push({ type: 'header', label: t('collector.completed', 'COMPLETED') });
      done.forEach((l) => groups.push({ type: 'item', data: l }));
    }
    return groups;
  }, [lots, filter, filteredLots, t]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <CollectorHeader
          name={t('collector.myDeals', 'My Deals')}
          subtitle={lots.length > 0 ? `${lots.length} ${t('common.total', 'total')}` : undefined}
        />

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {[
            { id: 'ALL' as FilterTab,       label: t('common.all', 'All') },
            { id: 'ACTION' as FilterTab,    label: `● ${t('collector.action', 'Action')}` },
            { id: 'OPEN' as FilterTab,      label: t('collector.listed', 'Listed') },
            { id: 'COMPLETED' as FilterTab, label: t('collector.completedTitle', 'Completed') },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
                {tab.id === 'ACTION' && actionCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{actionCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            <CollectorSkeletonList rows={5} rowHeight={72} />
          </View>
        ) : (
          <FlatList
            data={displayItems as any[]}
            keyExtractor={(item, idx) =>
              item.type === 'item' ? item.data.id : `header-${idx}`
            }
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return renderSectionLabel(item.label);
              }
              return renderItem({ item: item.data });
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyMarketplaceState
                context="no_listings"
                onAction={() => navigation.navigate('CollectorSell')}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}

        {/* FAB — always visible */}
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(insets.bottom + 16, 24) }]}
          onPress={() => navigation.navigate('CollectorSell')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('collector.sellMaterial', 'Sell Material')}
        >
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabText}>{t('collector.sellMaterialCaps', 'SELL MATERIAL')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 36,
  },
  filterPillActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  filterPillText:       { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
  filterPillTextActive: { color: '#10B981' },
  filterBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 9, width: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { color: '#1A0A00', fontSize: 10, fontWeight: '900' },
  skeletonWrapper: { flex: 1, paddingTop: 16 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingVertical: 8,
    paddingTop: 14,
  },
  fab: {
    position: 'absolute',
    right: 18,
    backgroundColor: '#10B981',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 7,
    minHeight: 56,
  },
  fabIcon: { color: '#071E22', fontSize: 22, fontWeight: '900' },
  fabText: { color: '#071E22', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
});

export default CollectorDealsScreen;
