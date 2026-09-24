/**
 * RecyclerOrdersScreen — ORDERS = PROCUREMENT PIPELINE
 *
 * COMPLETELY NEW. NOT the old RecyclerIncomingScreen or ConsignmentDetailScreen.
 *
 * Shows procurement orders grouped by urgency:
 *  1. NEEDS ACTION — counter-offers, handover confirmations, pickup actions
 *  2. NEGOTIATING — active back-and-forth
 *  3. ACCEPTED — deals waiting for pickup/handover
 *  4. IN PROGRESS — pickup/handover underway
 *  5. COMPLETED — done purchases
 *
 * Data:
 *  - recyclingService.getConsignments() for accepted/handover
 *  - quoteService.getMyQuotes-equivalent via available APIs
 *  - pickupBatchService if available
 *
 * Design:
 *  - OrderStatusRow with urgency-colored left border
 *  - Filter pills at top
 *  - Grouped by pipeline stage, not creation time
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  RecyclerHeader,
  OrderStatusRow,
  RecyclerEmptyState,
  RecyclerSkeletonList,
  RecyclerSectionHeader,
} from '../../components/recycler';
import type { OrderItem } from '../../components/recycler';
import { recyclingService } from '../../services/recyclingService';
import { useAuth } from '../../hooks/useAuth';
import pickupBatchService from '../../services/pickupBatchService';
import { useI18n } from '../../i18n';

const FILTER_TABS = [
  { key: 'ALL',        label: 'All' },
  { key: 'ACTION',     label: '● Action' },
  { key: 'NEGOTIATING',label: 'Offers' },
  { key: 'ACCEPTED',   label: 'Accepted' },
  { key: 'IN_PROGRESS',label: 'In Progress' },
  { key: 'COMPLETED',  label: 'Done' },
];

function consignmentToOrder(c: any): OrderItem {
  const needsAction =
    c.status === 'DELIVERED' ||
    c.status === 'IN_TRANSIT' ||
    c.status === 'PENDING_PAYMENT';

  return {
    id:           c.id,
    material:     c.materialCategory || c.category || 'Material',
    materialIcon: '📦',
    counterparty: c.collectorName || c.collector?.name,
    weightKg:     c.actualWeightKg ?? c.approximateWeightKg ?? c.totalWeightKg,
    agreedRate:   c.agreedPricePerKg ?? c.pricePerKg,
    totalValue:   c.totalValue ?? c.amount,
    status:       c.status,
    urgency:      needsAction ? 'high' : c.status === 'ACCEPTED' ? 'medium' : 'low',
    updatedAt:    c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : undefined,
    actionLabel:  needsAction ? 'ACT' : undefined,
  };
}

function pickupToOrder(p: any): OrderItem {
  return {
    id:           p.id,
    material:     p.materialCategory || 'Pickup',
    materialIcon: '🚚',
    counterparty: p.collectorName || p.collector?.name,
    weightKg:     p.totalWeightKg,
    totalValue:   p.totalValue,
    status:       p.status || 'SCHEDULED',
    urgency:      p.status === 'SCHEDULED' ? 'high' : 'medium',
    actionLabel:  p.status === 'SCHEDULED' ? 'VIEW' : undefined,
  };
}

export const RecyclerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user }   = useAuth();
  const { t }      = useI18n();

  const [orders, setOrders]           = useState<OrderItem[]>([]);
  const [profile, setProfile]         = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filterTabs = [
    { key: 'ALL',        label: t('common.all', 'All') },
    { key: 'ACTION',     label: `● ${t('collector.action', 'Action')}` },
    { key: 'NEGOTIATING',label: t('recycler.offers', 'Offers') },
    { key: 'ACCEPTED',   label: t('status.accepted', 'Accepted') },
    { key: 'IN_PROGRESS',label: t('status.inProgress', 'In Progress') },
    { key: 'COMPLETED',  label: t('collector.done', 'Done') },
  ];

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [profRes, consRes, batchRes] = await Promise.allSettled([
        recyclingService.getProfile(),
        recyclingService.getConsignments({ limit: 100 }),
        pickupBatchService.getBatches({ limit: 50 }).catch(() => null),
      ]);

      if (profRes.status === 'fulfilled') {
        setProfile((profRes.value as any)?.profile || profRes.value);
      }

      const allOrders: OrderItem[] = [];

      if (consRes.status === 'fulfilled') {
        const consVal = consRes.value as any;
        const consList = consVal?.consignments || consVal?.data || (Array.isArray(consVal) ? consVal : []);
        allOrders.push(...consList.map(consignmentToOrder));
      }

      if (batchRes.status === 'fulfilled' && batchRes.value) {
        const batchVal = batchRes.value as any;
        const batchList = batchVal?.batches || batchVal?.data || (Array.isArray(batchVal) ? batchVal : []);
        const pickupOrders = batchList
          .filter((b: any) => b.status === 'SCHEDULED' || b.status === 'IN_PROGRESS')
          .map(pickupToOrder);
        allOrders.push(...pickupOrders);
      }

      // Sort: high urgency first, then by updatedAt
      allOrders.sort((a, b) => {
        const urgencyScore = { high: 3, medium: 2, low: 1 };
        return (urgencyScore[b.urgency || 'low'] || 1) - (urgencyScore[a.urgency || 'low'] || 1);
      });

      setOrders(allOrders);
    } catch (e) {
      console.warn('[RecyclerOrders] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const onRefresh = () => { setIsRefreshing(true); loadOrders(true); };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTION')      return o.urgency === 'high';
    if (activeFilter === 'NEGOTIATING') return o.status === 'QUOTED' || o.status === 'COUNTER_OFFERED';
    if (activeFilter === 'ACCEPTED')    return o.status === 'ACCEPTED';
    if (activeFilter === 'IN_PROGRESS') return o.status === 'IN_TRANSIT' || o.status === 'IN_PROGRESS';
    if (activeFilter === 'COMPLETED')   return o.status === 'COMPLETED' || o.status === 'DELIVERED';
    return true;
  });

  const actionCount = orders.filter((o) => o.urgency === 'high').length;
  const facilityName = (profile as any)?.facilityName || user?.name || t('roles.recycler', 'Recycler');
  const isAuthorized = (profile as any)?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';

  const navigateToOrder = (order: OrderItem) => {
    if (order.material === 'Pickup' || order.materialIcon === '🚚') {
      navigation.navigate('RecyclerBatchDetail', { batchId: order.id });
    } else {
      navigation.navigate('ConsignmentDetail', { consignmentId: order.id });
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <RecyclerHeader
          facilityName={facilityName}
          isAuthorized={isAuthorized}
          subtitle={t('recycler.activeOrders', 'Active Orders')}
        />

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={filterTabs}
            keyExtractor={(t) => t.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => {
              const isActive = activeFilter === item.key;
              const showCount = item.key === 'ACTION' && actionCount > 0;
              return (
                <TouchableOpacity
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(item.key)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                    {item.label}{showCount ? ` (${actionCount})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {isLoading ? (
          <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
            <RecyclerSkeletonList count={4} />
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OrderStatusRow
                order={item}
                onPress={() => navigateToOrder(item)}
                onAction={item.actionLabel ? () => navigateToOrder(item) : undefined}
              />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            ListHeaderComponent={
              <RecyclerSectionHeader
                label={activeFilter === 'ALL' ? t('recycler.allOrders', 'ALL ORDERS') : filterTabs.find(t => t.key === activeFilter)?.label?.toUpperCase() ?? ''}
                count={filteredOrders.length}
              />
            }
            ListEmptyComponent={
              <RecyclerEmptyState
                type="no_orders"
                onAction={() => navigation.navigate('RecyclerMarket')}
                actionLabel={t('recycler.browseMaterial', 'Browse Material')}
              />
            }
            ListFooterComponent={<View style={{ height: 80 }} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={['#22D3EE']}
                tintColor="#22D3EE"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 2,
  },
  filterList:     { paddingHorizontal: 16, gap: 6, paddingVertical: 8 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 36,
    justifyContent: 'center',
  },
  filterTabActive:  { backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.4)' },
  filterLabel:      { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  filterLabelActive:{ color: '#22D3EE', fontWeight: '800' },
  listContent: { paddingTop: 12, paddingBottom: 80, backgroundColor: 'rgba(255,255,255,0.02)', marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
});

export default RecyclerOrdersScreen;
