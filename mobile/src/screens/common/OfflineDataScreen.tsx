import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { offlineQueue } from '../../services/offlineQueue';
import { offlineStore } from '../../services/offlineStore';
import { storage } from '../../utils/storage';
import { AppIcon } from '../../components/ui/AppIcon';
import { QUEUE_STATUS } from '../../utils/constants';

interface QueueItemDiagnostic {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  status: string;
  createdAt: string;
  retries: number;
  error?: {
    code?: string;
    message?: string;
  } | null;
}

interface CacheCounts {
  requests: number;
  items: number;
  lots: number;
  pickups: number;
  recyclingRecords: number;
  consignments: number;
}

export const OfflineDataScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isConnected, connectionType } = useNetwork();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queueItems, setQueueItems] = useState<QueueItemDiagnostic[]>([]);
  const [diagnostics, setDiagnostics] = useState<{
    pending: number;
    failed: number;
    conflict: number;
    total: number;
    isSyncing: boolean;
  }>({ pending: 0, failed: 0, conflict: 0, total: 0, isSyncing: false });
  const [cacheCounts, setCacheCounts] = useState<CacheCounts>({
    requests: 0,
    items: 0,
    lots: 0,
    pickups: 0,
    recyclingRecords: 0,
    consignments: 0,
  });
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Diagnostics & Queue Items
      const diag = await offlineQueue.getDiagnostics();
      setDiagnostics(diag);

      const allQueue = await offlineQueue.getQueue();
      const currentUserId = user?.id || (user as any)?.userId;
      const userQueue = currentUserId
        ? allQueue.filter((item: any) => !item.userId || item.userId === currentUserId)
        : allQueue;
      setQueueItems(userQueue as QueueItemDiagnostic[]);

      // 2. Local Domain Cache Counts
      const [requests, items, lots, pickups] = await Promise.all([
        offlineStore.getCachedRequests(),
        offlineStore.getCachedItems(),
        storage.getItem('@ecosetu_cache_material_lots'),
        offlineStore.getCachedPickups(),
      ]);

      const recyclingRecords = (await storage.getItem('@ecosetu_recycler_records')) || [];
      const consignments = (await storage.getItem('@ecosetu_cache_consignments')) || [];

      setCacheCounts({
        requests: Array.isArray(requests) ? requests.length : 0,
        items: Array.isArray(items) ? items.length : 0,
        lots: Array.isArray(lots) ? lots.length : 0,
        pickups: Array.isArray(pickups) ? pickups.length : 0,
        recyclingRecords: Array.isArray(recyclingRecords) ? recyclingRecords.length : 0,
        consignments: Array.isArray(consignments) ? consignments.length : 0,
      });

      // 3. Storage Usage Calculation
      const allKeys = await storage.getAllKeys();
      const ecosetuKeys = allKeys.filter((k) => k.startsWith('@ecosetu_'));
      const pairs = await storage.multiGet(ecosetuKeys);
      let total = 0;
      for (const [_, val] of pairs) {
        if (val !== null && val !== undefined) {
          total += typeof val === 'string' ? val.length : JSON.stringify(val).length;
        }
      }
      setStorageBytes(total);
    } catch (err) {
      console.error('[OfflineDataScreen] Error loading diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const unsubscribe = offlineQueue.addListener(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const formatStorageSize = (bytes: number): string => {
    if (bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSyncNow = async () => {
    if (!isConnected) {
      Alert.alert(
        'Network Offline',
        'Cannot sync while disconnected from the internet. Please restore your connection and try again.'
      );
      return;
    }

    setIsSyncing(true);
    try {
      const res = await offlineQueue.syncNow();
      setLastSyncTime(new Date().toLocaleTimeString());
      await loadData();

      if (res?.offline) {
        Alert.alert('Offline', 'Cannot sync while offline.');
      } else if (res?.alreadySyncing) {
        Alert.alert('Sync In Progress', 'Synchronization is already running.');
      } else {
        const synced = res?.syncedCount || 0;
        const failed = res?.failedCount || 0;
        const conflicts = res?.conflictCount || 0;
        Alert.alert(
          'Sync Completed',
          `Successfully processed: ${synced} item(s).\nFailed: ${failed}\nConflicts: ${conflicts}`
        );
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message || 'Failed to complete synchronization.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!isConnected) {
      Alert.alert('Network Offline', 'Cannot retry failed sync items while offline.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await offlineQueue.retryFailed();
      setLastSyncTime(new Date().toLocaleTimeString());
      await loadData();
      Alert.alert(
        'Retry Completed',
        `Processed retries.\nSynced: ${res?.syncedCount || 0}\nFailed: ${res?.failedCount || 0}`
      );
    } catch (err: any) {
      Alert.alert('Retry Error', err?.message || 'Failed to retry queue operations.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Local Cache',
      'This will clear local cached read records to free up memory. Unsynced pending queue operations will be preserved safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.clearAllUserCaches(false);
              await loadData();
              Alert.alert('Cache Cleared', 'Local read cache cleared. Pending offline queue items preserved.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to clear local cache.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteQueueItem = (id: string) => {
    Alert.alert(
      'Remove Queue Item',
      'Are you sure you want to discard this unsynced operation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await offlineQueue.removeQueueItem(id);
            await loadData();
          },
        },
      ]
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case QUEUE_STATUS.PENDING:
        return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgePendingText}>PENDING</Text></View>;
      case QUEUE_STATUS.SYNCING:
      case QUEUE_STATUS.PROCESSING:
        return <View style={[styles.badge, styles.badgeSyncing]}><Text style={styles.badgeSyncingText}>SYNCING</Text></View>;
      case QUEUE_STATUS.FAILED:
        return <View style={[styles.badge, styles.badgeFailed]}><Text style={styles.badgeFailedText}>FAILED</Text></View>;
      case QUEUE_STATUS.CONFLICT:
        return <View style={[styles.badge, styles.badgeConflict]}><Text style={styles.badgeConflictText}>CONFLICT</Text></View>;
      default:
        return <View style={[styles.badge, styles.badgeDefault]}><Text style={styles.badgeDefaultText}>{status}</Text></View>;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppIcon name="chevronLeft" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Data & Storage</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={loadData}
          disabled={isLoading}
        >
          <AppIcon name="refresh" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* ── NETWORK & SYNC STATUS CARD ───────────────────────────── */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLabelGroup}>
              <View style={[styles.statusDot, isConnected ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.statusTitle}>
                {isConnected ? 'Connection Online' : 'Network Offline'}
              </Text>
            </View>
            <View style={[styles.typePill, isConnected ? styles.pillOnline : styles.pillOffline]}>
              <Text style={styles.typePillText}>{connectionType ? connectionType.toUpperCase() : (isConnected ? 'CONNECTED' : 'DISCONNECTED')}</Text>
            </View>
          </View>
          <Text style={styles.statusSubtitle}>
            {isConnected
              ? 'Local operations will sync automatically with the EcoSetu backend.'
              : 'App is running in offline mode. Changes will be queued locally.'}
          </Text>
          {lastSyncTime && (
            <Text style={styles.lastSyncText}>Last sync attempt: {lastSyncTime}</Text>
          )}
        </View>

        {/* ── PENDING SYNC QUEUE ───────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SYNC QUEUE</Text>
            <View style={styles.countsContainer}>
              <Text style={styles.countItem}>Pending: {diagnostics.pending}</Text>
              {diagnostics.failed > 0 && <Text style={[styles.countItem, styles.countFailed]}>Failed: {diagnostics.failed}</Text>}
              {diagnostics.conflict > 0 && <Text style={[styles.countItem, styles.countConflict]}>Conflicts: {diagnostics.conflict}</Text>}
            </View>
          </View>

          {queueItems.length === 0 ? (
            <View style={styles.emptyQueueBox}>
              <AppIcon name="checkCircle" size={28} color="#10B981" />
              <Text style={styles.emptyQueueTitle}>All Offline Data Synced</Text>
              <Text style={styles.emptyQueueSub}>There are no pending local operations in your sync queue.</Text>
            </View>
          ) : (
            queueItems.map((item) => (
              <View key={item.id} style={styles.queueCard}>
                <View style={styles.queueCardHeader}>
                  <Text style={styles.actionTypeLabel}>{item.type}</Text>
                  {renderStatusBadge(item.status)}
                </View>
                <Text style={styles.endpointLabel}>{item.method} {item.endpoint}</Text>
                <Text style={styles.timeLabel}>Queued: {new Date(item.createdAt).toLocaleString()}</Text>

                {item.error?.message && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      Error ({item.error.code || 'FAIL'}): {item.error.message}
                    </Text>
                  </View>
                )}

                <View style={styles.queueCardFooter}>
                  <Text style={styles.retriesLabel}>Retries: {item.retries}</Text>
                  <TouchableOpacity
                    style={styles.discardBtn}
                    onPress={() => handleDeleteQueueItem(item.id)}
                  >
                    <Text style={styles.discardBtnText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── LOCAL CACHED DATA METRICS ────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>LOCAL DOMAIN CACHE</Text>
          <View style={styles.metricsGrid}>
            {(user?.role === 'CITIZEN' || !user?.role) && (
              <>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{cacheCounts.requests}</Text>
                  <Text style={styles.metricLabel}>Cached Requests</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{cacheCounts.items}</Text>
                  <Text style={styles.metricLabel}>Cached Items</Text>
                </View>
              </>
            )}

            {user?.role === 'INFORMAL_COLLECTOR' && (
              <>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{cacheCounts.lots}</Text>
                  <Text style={styles.metricLabel}>Material Lots</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{cacheCounts.pickups}</Text>
                  <Text style={styles.metricLabel}>Cached Pickups</Text>
                </View>
              </>
            )}

            {user?.role === 'RECYCLER' && (
              <>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{cacheCounts.recyclingRecords}</Text>
                  <Text style={styles.metricLabel}>Recycling Records</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{cacheCounts.consignments}</Text>
                  <Text style={styles.metricLabel}>Consignments</Text>
                </View>
              </>
            )}

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatStorageSize(storageBytes)}</Text>
              <Text style={styles.metricLabel}>Calculated Storage</Text>
            </View>
          </View>
        </View>

        {/* ── ACTIONS ──────────────────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isConnected || isSyncing) && styles.btnDisabled]}
            onPress={handleSyncNow}
            disabled={!isConnected || isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <AppIcon name="refresh" size={18} color="#0F172A" />
                <Text style={styles.primaryBtnText}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>

          {(diagnostics.failed > 0 || diagnostics.conflict > 0) && (
            <TouchableOpacity
              style={[styles.secondaryBtn, styles.retryBtn, (!isConnected || isSyncing) && styles.btnDisabled]}
              onPress={handleRetryFailed}
              disabled={!isConnected || isSyncing}
              activeOpacity={0.8}
            >
              <AppIcon name="alert" size={18} color="#F59E0B" />
              <Text style={styles.retryBtnText}>Retry Failed Operations ({diagnostics.failed + diagnostics.conflict})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleClearCache}
            activeOpacity={0.8}
          >
            <AppIcon name="trash" size={18} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Clear Local Cache</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OfflineDataScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F172A',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    padding: 4,
  },
  contentContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#F59E0B',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pillOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  countsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countItem: {
    fontSize: 12,
    color: '#94A3B8',
  },
  countFailed: {
    color: '#EF4444',
  },
  countConflict: {
    color: '#F59E0B',
  },
  emptyQueueBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyQueueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyQueueSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  queueCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  queueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  actionTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePending: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  badgePendingText: { color: '#60A5FA', fontSize: 11, fontWeight: '700' },
  badgeSyncing: { backgroundColor: 'rgba(168, 85, 247, 0.15)' },
  badgeSyncingText: { color: '#C084FC', fontSize: 11, fontWeight: '700' },
  badgeFailed: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  badgeFailedText: { color: '#F87171', fontSize: 11, fontWeight: '700' },
  badgeConflict: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  badgeConflictText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },
  badgeDefault: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  badgeDefaultText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  endpointLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
  },
  queueCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  retriesLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  discardBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discardBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  retryBtn: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
