/**
 * RecyclerInventoryScreen — INVENTORY = WHAT HAVE I BOUGHT?
 *
 * COMPLETELY NEW. NOT the old RecyclerRecordsScreen.
 *
 * Shows purchased/received material grouped by processing stage:
 *  RECENTLY RECEIVED → IN PROCESSING → READY → COMPLETED
 *
 * Data:
 *  - recyclingService.getRecyclingRecords() for processing records
 *  - recyclingService.getConsignments({ status: 'ACCEPTED,DELIVERED' }) for received
 *
 * Design:
 *  - InventoryLotCard rows in sections
 *  - Lifecycle progress bar at top
 *  - Filter pills: All / Received / Processing / Completed
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
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  RecyclerHeader,
  InventoryLotCard,
  RecyclerEmptyState,
  RecyclerSkeletonList,
  RecyclerSectionHeader,
} from '../../components/recycler';
import { recyclingService } from '../../services/recyclingService';
import { useAuth } from '../../hooks/useAuth';

export const RecyclerInventoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user }   = useAuth();
  const { t }      = useI18n();

  const [inventory, setInventory]     = useState<any[]>([]);
  const [profile, setProfile]         = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filterTabs = [
    { key: 'ALL',        label: t('common.all', 'All') },
    { key: 'RECEIVED',   label: t('recycler.received', 'Received') },
    { key: 'PROCESSING', label: t('status.PROCESSING', 'Processing') },
    { key: 'COMPLETED',  label: t('collector.completedTitle', 'Completed') },
  ];

  const mapConsignmentToInventory = (c: any) => {
    const condLabel = c.condition === 'WORKING' ? t('condition.working', 'Working')
      : c.condition === 'REPAIRABLE' ? t('condition.repairable', 'Repairable')
      : c.condition === 'DAMAGED' ? t('condition.partiallyWorking', 'Partial')
      : c.condition === 'NOT_WORKING' ? t('condition.notWorking', 'Non-working')
      : c.condition ? t(`condition.${c.condition.toLowerCase()}`, c.condition)
      : undefined;

    return {
      id:              c.id,
      material:        c.materialCategory || c.category || t('common.material', 'Material'),
      materialIcon:    '📦',
      weightKg:        c.actualWeightKg ?? c.approximateWeightKg ?? 0,
      condition:       condLabel,
      receivedDate:    c.deliveredAt
        ? new Date(c.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
        : c.updatedAt
        ? new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
        : undefined,
      source:          c.collectorName || c.collector?.name || t('roles.collector', 'Collector'),
      transactionRef:  c.transactionId ? `TXN-${c.transactionId.slice(-6).toUpperCase()}` : undefined,
      inventoryStatus: c.status === 'COMPLETED' ? 'COMPLETED' : c.status === 'DELIVERED' ? 'DELIVERED' : 'ACCEPTED',
      type:            'consignment',
      rawId:           c.id,
    };
  };

  const mapRecordToInventory = (r: any) => {
    return {
      id:              `rec-${r.id}`,
      material:        r.materialCategory || r.category || t('recycler.recyclingRecord', 'Recycling Record'),
      materialIcon:    '♻️',
      weightKg:        r.verifiedWeightKg ?? r.totalWeightKg ?? 0,
      condition:       undefined,
      receivedDate:    r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
        : undefined,
      source:          r.facilityName || t('recycler.inFacility', 'In-facility'),
      transactionRef:  r.id ? `REC-${r.id.slice(-6).toUpperCase()}` : undefined,
      inventoryStatus: r.status || 'IN_PROGRESS',
      type:            'record',
      rawId:           r.id,
    };
  };

  const loadInventory = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [profRes, consRes, recRes] = await Promise.allSettled([
        recyclingService.getProfile(),
        recyclingService.getConsignments({ limit: 100 }),
        recyclingService.getRecyclingRecords({ limit: 50 }),
      ]);

      if (profRes.status === 'fulfilled') {
        setProfile((profRes.value as any)?.profile || profRes.value);
      }

      const allItems: any[] = [];

      if (consRes.status === 'fulfilled') {
        const val = consRes.value as any;
        const list = val?.consignments || val?.data || (Array.isArray(val) ? val : []);
        allItems.push(...list
          .filter((c: any) => ['ACCEPTED', 'DELIVERED', 'COMPLETED'].includes(c.status))
          .map(mapConsignmentToInventory));
      }

      if (recRes.status === 'fulfilled') {
        const val = recRes.value as any;
        const list = val?.records || val?.data || (Array.isArray(val) ? val : []);
        allItems.push(...list.map(mapRecordToInventory));
      }

      // Sort: most recent first
      allItems.sort((a, b) => {
        if (!a.receivedDate || !b.receivedDate) return 0;
        return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
      });

      setInventory(allItems);
    } catch (e) {
      console.warn('[RecyclerInventory] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);
  const onRefresh = () => { setIsRefreshing(true); loadInventory(true); };

  const filteredInventory = inventory.filter((i) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'RECEIVED')   return i.inventoryStatus === 'DELIVERED' || i.inventoryStatus === 'ACCEPTED';
    if (activeFilter === 'PROCESSING') return i.inventoryStatus === 'IN_PROGRESS' || i.type === 'record';
    if (activeFilter === 'COMPLETED')  return i.inventoryStatus === 'COMPLETED';
    return true;
  });

  const facilityName = (profile as any)?.facilityName || user?.name || t('roles.recycler', 'Recycler');
  const isAuthorized = (profile as any)?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';

  const navigateToDetail = (item: any) => {
    if (item.type === 'record') {
      navigation.navigate('RecyclingRecordDetail', { recordId: item.rawId });
    } else {
      navigation.navigate('ConsignmentDetail', { consignmentId: item.rawId });
    }
  };

  // Summary stats
  const totalWeightKg = inventory.reduce((s, i) => s + (i.weightKg || 0), 0);
  const completedCount = inventory.filter((i) => i.inventoryStatus === 'COMPLETED').length;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <RecyclerHeader
          facilityName={facilityName}
          isAuthorized={isAuthorized}
          subtitle={t('recycler.inventorySubtitle', 'Inventory')}
        />

        {/* Summary strip */}
        {!isLoading && inventory.length > 0 && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryVal}>{inventory.length}</Text>
              <Text style={styles.summaryLbl}>{t('recycler.totalItems', 'Total Items')}</Text>
            </View>
            <View style={styles.summaryDiv} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryVal}>{totalWeightKg.toFixed(0)} kg</Text>
              <Text style={styles.summaryLbl}>{t('recycler.totalWeight', 'Total Weight')}</Text>
            </View>
            <View style={styles.summaryDiv} />
            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryVal, { color: '#34D399' }]}>{completedCount}</Text>
              <Text style={styles.summaryLbl}>{t('collector.completedTitle', 'Completed')}</Text>
            </View>
          </View>
        )}

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={filterTabs}
            keyExtractor={(t) => t.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterTab, activeFilter === item.key && styles.filterTabActive]}
                onPress={() => setActiveFilter(item.key)}
                accessibilityRole="button"
              >
                <Text style={[styles.filterLabel, activeFilter === item.key && styles.filterLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {isLoading ? (
          <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
            <RecyclerSkeletonList count={4} />
          </View>
        ) : (
          <FlatList
            data={filteredInventory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <InventoryLotCard
                material={item.material}
                materialIcon={item.materialIcon}
                weightKg={item.weightKg}
                condition={item.condition}
                receivedDate={item.receivedDate}
                source={item.source}
                transactionRef={item.transactionRef}
                inventoryStatus={item.inventoryStatus}
                onPress={() => navigateToDetail(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
              <RecyclerSectionHeader
                label={filterTabs.find(t => t.key === activeFilter)?.label?.toUpperCase() ?? t('navigation.inventory', 'INVENTORY')}
                count={filteredInventory.length}
              />
            }
            ListEmptyComponent={
              <RecyclerEmptyState
                type="no_inventory"
                onAction={() => navigation.navigate('RecyclerMarket')}
                actionLabel={t('recycler.browseMarket', 'Browse Market')}
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
  summaryStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  summaryBlock: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal:   { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  summaryLbl:   { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  summaryDiv:   { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  filterRow:    { paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  filterList:   { paddingHorizontal: 16, gap: 6, paddingVertical: 8 },
  filterTab:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', minHeight: 36, justifyContent: 'center' },
  filterTabActive:   { backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.4)' },
  filterLabel:       { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  filterLabelActive: { color: '#22D3EE', fontWeight: '800' },
  listContent:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
});

export default RecyclerInventoryScreen;
