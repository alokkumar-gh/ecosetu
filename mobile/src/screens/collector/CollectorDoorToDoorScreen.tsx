import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { materialLotService } from '../../services/materialLotService';
import { offlineStore } from '../../services/offlineStore';
import { offlineQueue } from '../../services/offlineQueue';
import { AppIcon } from '../../components/ui/AppIcon';
import { AuthorizedImage } from '../../components/common/AuthorizedImage';

export interface CollectionItemView {
  id: string;
  referenceNumber: string;
  clientReferenceId?: string;
  category: string;
  subcategory?: string;
  description?: string;
  condition: string;
  approximateTotalWeightKg?: number;
  estimatedValue?: number;
  photoUrl?: string;
  collectionTimestamp: string;
  status: string;
  isOfflineDraft: boolean;
  pendingSync: boolean;
  materialLotId?: string;
}

export const CollectorDoorToDoorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isConnected } = useNetwork();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [collections, setCollections] = useState<CollectionItemView[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'SYNCED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<CollectionItemView | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      // 1. Load cached drafts / offline store lots
      const cachedLots: any[] = (await offlineStore.getCachedLots()) || [];

      // 2. Fetch server lots if online
      let serverLots: any[] = [];
      if (isConnected) {
        try {
          const res = await materialLotService.listLots({ limit: 50 });
          serverLots = res?.lots || [];
        } catch (err) {
          console.warn('[CollectorDoorToDoorScreen] Failed to fetch server lots:', err);
        }
      }

      // 3. Map & Reconcile without duplication
      const currentUserId = user?.id || (user as any)?.userId;
      const reconciledMap = new Map<string, CollectionItemView>();

      // Process server lots first (authoritative)
      for (const lot of serverLots) {
        if (currentUserId && lot.collectorId && lot.collectorId !== currentUserId) {
          continue; // Tenancy isolation
        }

        const photo = Array.isArray(lot.photos) && lot.photos.length > 0
          ? (typeof lot.photos[0] === 'string' ? lot.photos[0] : lot.photos[0]?.photoUrl)
          : undefined;

        const mapped: CollectionItemView = {
          id: lot.id,
          referenceNumber: lot.referenceNumber || `LOT-${lot.id.substring(0, 6).toUpperCase()}`,
          clientReferenceId: lot.clientReferenceId,
          category: lot.category || 'EWASTE',
          subcategory: lot.subcategory,
          description: lot.description,
          condition: lot.condition || 'UNKNOWN',
          approximateTotalWeightKg: lot.approximateTotalWeightKg || lot.approximateWeightKg,
          estimatedValue: lot.estimatedValue,
          photoUrl: photo,
          collectionTimestamp: lot.collectionTimestamp || lot.createdAt || new Date().toISOString(),
          status: lot.status || 'OPEN',
          isOfflineDraft: false,
          pendingSync: false,
          materialLotId: lot.referenceNumber || lot.id,
        };

        const key = lot.clientReferenceId || lot.id;
        reconciledMap.set(key, mapped);
      }

      // Process cached / local draft lots
      for (const lot of cachedLots) {
        if (currentUserId && lot.collectorId && lot.collectorId !== currentUserId && lot.collectorId !== 'local_collector') {
          continue;
        }

        const key = lot.clientReferenceId || lot.id;
        if (reconciledMap.has(key)) {
          continue; // Server authoritative version takes precedence
        }

        const photo = Array.isArray(lot.photos) && lot.photos.length > 0
          ? (typeof lot.photos[0] === 'string' ? lot.photos[0] : lot.photos[0]?.photoUrl)
          : undefined;

        const mapped: CollectionItemView = {
          id: lot.id,
          referenceNumber: lot.referenceNumber || `TEMP-${lot.id.substring(0, 6).toUpperCase()}`,
          clientReferenceId: lot.clientReferenceId,
          category: lot.category || 'EWASTE',
          subcategory: lot.subcategory,
          description: lot.description,
          condition: lot.condition || 'UNKNOWN',
          approximateTotalWeightKg: lot.approximateTotalWeightKg || lot.approximateWeightKg,
          estimatedValue: lot.estimatedValue,
          photoUrl: photo,
          collectionTimestamp: lot.collectionTimestamp || lot.createdAt || new Date().toISOString(),
          status: lot.status || 'DRAFT',
          isOfflineDraft: Boolean(lot.isOfflineDraft),
          pendingSync: Boolean(lot.pendingSync || lot.isOfflineDraft),
          materialLotId: lot.isOfflineDraft ? undefined : lot.referenceNumber,
        };

        reconciledMap.set(key, mapped);
      }

      const list = Array.from(reconciledMap.values());
      // Sort newest collection first
      list.sort((a, b) => new Date(b.collectionTimestamp).getTime() - new Date(a.collectionTimestamp).getTime());
      setCollections(list);
    } catch (err) {
      console.error('[CollectorDoorToDoorScreen] Error loading collections:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isConnected, user]);

  useEffect(() => {
    loadCollections();
    const unsub = offlineQueue.addListener(() => {
      loadCollections();
    });
    return () => {
      unsub();
    };
  }, [loadCollections]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCollections();
  };

  const filteredCollections = collections.filter((item) => {
    if (activeFilter === 'PENDING' && !item.pendingSync) return false;
    if (activeFilter === 'SYNCED' && item.pendingSync) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = item.category.toLowerCase().includes(q);
      const matchSub = item.subcategory?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchRef = item.referenceNumber.toLowerCase().includes(q);
      const matchLot = item.materialLotId?.toLowerCase().includes(q);
      return matchCat || matchSub || matchDesc || matchRef || matchLot;
    }

    return true;
  });

  const renderCard = ({ item }: { item: CollectionItemView }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedCollection(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category.replace('_', ' ')}</Text>
          </View>
          {item.pendingSync ? (
            <View style={[styles.statusPill, styles.statusPending]}>
              <View style={styles.dotPending} />
              <Text style={styles.statusPendingText}>PENDING SYNC</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, styles.statusSynced]}>
              <AppIcon name="checkCircle" size={12} color="#10B981" />
              <Text style={styles.statusSyncedText}>SYNCED</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          {item.photoUrl ? (
            <AuthorizedImage uri={item.photoUrl} style={styles.cardImage} resizeMode="cover" allowFullscreen={false} categoryLabel={item.category} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <AppIcon name="package" size={32} color="#64748B" />
            </View>
          )}

          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>
              {item.subcategory || item.description || `${item.category} Collection`}
            </Text>
            <Text style={styles.cardRef}>
              {item.materialLotId ? `Material Lot: ${item.materialLotId}` : `Ref: ${item.referenceNumber}`}
            </Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricChip}>
                <Text style={styles.metricChipLabel}>Condition</Text>
                <Text style={styles.metricChipVal}>{item.condition}</Text>
              </View>

              {item.approximateTotalWeightKg !== undefined && (
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipLabel}>Weight</Text>
                  <Text style={styles.metricChipVal}>{item.approximateTotalWeightKg} kg</Text>
                </View>
              )}

              {item.estimatedValue !== undefined && item.estimatedValue > 0 && (
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipLabel}>Acquisition</Text>
                  <Text style={styles.metricChipVal}>₹{item.estimatedValue}</Text>
                </View>
              )}
            </View>

            <Text style={styles.timestampText}>
              {new Date(item.collectionTimestamp).toLocaleDateString()} at {new Date(item.collectionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {item.pendingSync && (
          <View style={styles.pendingNoticeBar}>
            <AppIcon name="alert" size={14} color="#F59E0B" />
            <Text style={styles.pendingNoticeText}>Saved locally. Waiting for internet connection to sync.</Text>
          </View>
        )}
      </TouchableOpacity>
    );
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
        <Text style={styles.headerTitle}>Door-to-Door Collections</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CollectorCreateLot')}
        >
          <AppIcon name="plus" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* ── SEARCH & FILTER STRIP ──────────────────────────────────── */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <AppIcon name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search category, condition, lot ID…"
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.pillsRow}>
          {(['ALL', 'PENDING', 'SYNCED'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterPillText, activeFilter === filter && styles.filterPillTextActive]}>
                {filter === 'ALL' ? 'All Collections' : filter === 'PENDING' ? 'Pending Sync' : 'Synced'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── COLLECTIONS LIST ───────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading collections…</Text>
        </View>
      ) : filteredCollections.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          <AppIcon name="package" size={48} color="#64748B" />
          <Text style={styles.emptyTitle}>No door-to-door collections yet</Text>
          <Text style={styles.emptySubtitle}>
            Record e-waste collected door-to-door offline or online to track your inventory.
          </Text>
          <TouchableOpacity
            style={styles.recordNewBtn}
            onPress={() => navigation.navigate('CollectorCreateLot')}
          >
            <AppIcon name="plus" size={18} color="#0F172A" />
            <Text style={styles.recordNewBtnText}>Record New Collection</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredCollections}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        />
      )}

      {/* ── DETAILS MODAL ──────────────────────────────────────────── */}
      {selectedCollection && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedCollection(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Collection Details</Text>
                <TouchableOpacity onPress={() => setSelectedCollection(null)} style={{ padding: 4 }}>
                  <AppIcon name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedCollection.photoUrl ? (
                  <AuthorizedImage uri={selectedCollection.photoUrl} style={styles.modalImage} resizeMode="cover" allowFullscreen={true} categoryLabel={selectedCollection.category} />
                ) : (
                  <View style={styles.modalImagePlaceholder}>
                    <AppIcon name="package" size={48} color="#64748B" />
                    <Text style={{ color: '#64748B', marginTop: 8 }}>No photo attached</Text>
                  </View>
                )}

                <View style={styles.modalBody}>
                  <View style={styles.modalCategoryRow}>
                    <Text style={styles.modalCategoryTitle}>{selectedCollection.category.replace('_', ' ')}</Text>
                    {selectedCollection.pendingSync ? (
                      <View style={[styles.statusPill, styles.statusPending]}>
                        <Text style={styles.statusPendingText}>PENDING SYNC</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusPill, styles.statusSynced]}>
                        <Text style={styles.statusSyncedText}>✓ SYNCED TO INVENTORY</Text>
                      </View>
                    )}
                  </View>

                  {selectedCollection.subcategory && (
                    <Text style={styles.modalSubcategory}>Subcategory: {selectedCollection.subcategory}</Text>
                  )}

                  {selectedCollection.description && (
                    <Text style={styles.modalDescription}>{selectedCollection.description}</Text>
                  )}

                  <View style={styles.modalDetailGrid}>
                    <View style={styles.modalDetailCell}>
                      <Text style={styles.cellLabel}>Condition</Text>
                      <Text style={styles.cellVal}>{selectedCollection.condition}</Text>
                    </View>

                    {selectedCollection.approximateTotalWeightKg !== undefined && (
                      <View style={styles.modalDetailCell}>
                        <Text style={styles.cellLabel}>Approx Weight</Text>
                        <Text style={styles.cellVal}>{selectedCollection.approximateTotalWeightKg} kg</Text>
                      </View>
                    )}

                    {selectedCollection.estimatedValue !== undefined && selectedCollection.estimatedValue > 0 && (
                      <View style={styles.modalDetailCell}>
                        <Text style={styles.cellLabel}>Acquisition Value</Text>
                        <Text style={styles.cellVal}>₹{selectedCollection.estimatedValue}</Text>
                      </View>
                    )}

                    <View style={styles.modalDetailCell}>
                      <Text style={styles.cellLabel}>Reference</Text>
                      <Text style={styles.cellVal}>{selectedCollection.referenceNumber}</Text>
                    </View>
                  </View>

                  <View style={styles.modalStatusBox}>
                    <Text style={styles.statusBoxTitle}>Sync & Inventory Status</Text>
                    <Text style={styles.statusBoxBody}>
                      {selectedCollection.pendingSync
                        ? 'Pending Synchronization — This collection record is saved on device storage. It will sync automatically when an internet connection is established.'
                        : `Synced & Verified — Authoritative Material Lot ID: ${selectedCollection.materialLotId || selectedCollection.referenceNumber}`}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedCollection(null)}>
                    <Text style={styles.modalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default CollectorDoorToDoorScreen;

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
  addBtn: {
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  filterPillActive: {
    backgroundColor: '#10B981',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  dotPending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  statusPendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statusSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusSyncedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardRef: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  metricChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metricChipLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  metricChipVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  timestampText: {
    fontSize: 11,
    color: '#64748B',
  },
  pendingNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  pendingNoticeText: {
    fontSize: 11,
    color: '#F59E0B',
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  recordNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  recordNewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#0F172A',
  },
  modalImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalCategoryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubcategory: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  modalDetailCell: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
  },
  cellLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  cellVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalStatusBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusBoxBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
