import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuth } from '../../hooks/useAuth';
import { networkService } from '../../services/networkService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { recyclingService } from '../../services/recyclingService';
import { useI18n } from '../../i18n';

// ── Canonical Consignment Lifecycle Statuses ──────────────────────────────
export const CONSIGNMENT_STATUS = {
  CREATED: 'CREATED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

// ── Detail Screen Skeleton ────────────────────────────────────────────────
const DetailSkeleton: React.FC = () => (
  <View style={skeletonStyles.container}>
    <Skeleton height={140} borderRadius={12} style={{ marginBottom: spacing.spaceMd }} />
    <Skeleton height={120} borderRadius={12} style={{ marginBottom: spacing.spaceMd }} />
    <Skeleton height={180} borderRadius={12} style={{ marginBottom: spacing.spaceMd }} />
  </View>
);

const skeletonStyles = StyleSheet.create({
  container: {
    padding: spacing.spaceMd,
  },
});

interface Props {
  navigation?: any;
  route?: {
    params?: {
      consignmentId?: string;
      consignment?: any;
    };
  };
}

export const CollectorConsignmentStatusScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isConnected, setIsConnected] = useState<boolean>(networkService.isConnected());

  useEffect(() => {
    const unsub = networkService.addListener((state: any) => {
      const connected = typeof state === 'boolean' ? state : Boolean(state?.isConnected);
      setIsConnected(connected);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const consignmentId = route?.params?.consignmentId || route?.params?.consignment?.id;
  const initialConsignment = route?.params?.consignment || null;

  // ── Data States ───────────────────────────────────────────────────────────
  const [consignment, setConsignment] = useState<any>(initialConsignment);
  const [isLoading, setIsLoading] = useState<boolean>(!initialConsignment);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshingRef = useRef<boolean>(false);

  // ── Role Authorization Guard ──────────────────────────────────────────────
  const isCollectorOrAdmin =
    user?.role === 'INFORMAL_COLLECTOR' || user?.role === 'ADMIN';

  // ── Load Consignment Data ─────────────────────────────────────────────────
  const loadConsignment = useCallback(
    async (isPullRefresh = false) => {
      if (!consignmentId) {
        setError('No consignment reference provided.');
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        if (isPullRefresh) {
          setIsRefreshing(true);
        } else if (!consignment) {
          setIsLoading(true);
        }

        // Fetch collector's consignments to find this specific record authoritatively
        const res = await recyclingService.getCollectorConsignments();
        const found = (res.consignments || []).find((c: any) => c.id === consignmentId);

        if (found) {
          setConsignment(found);
          setFromCache(Boolean(res.fromCache));
        } else if (consignment) {
          // Keep current if not found in list (e.g., filtered)
          setFromCache(Boolean(res.fromCache));
        } else {
          setError('Consignment not found or you are not authorized to view it.');
        }
      } catch (err: any) {
        if (err?.isOfflineError) {
          if (!consignment) {
            setError('Offline. Unable to load consignment details without a connection.');
          }
        } else {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Failed to load consignment details. Please try again.';
          setError(msg);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        refreshingRef.current = false;
      }
    },
    [consignmentId, consignment]
  );

  useEffect(() => {
    loadConsignment(false);
  }, [consignmentId]);

  // ── Delivery Handoff States ───────────────────────────────────────────────
  const [isDeliverModalVisible, setIsDeliverModalVisible] = useState<boolean>(false);
  const [isDelivering, setIsDelivering] = useState<boolean>(false);
  const deliveringRef = useRef<boolean>(false);

  // ── Pull to refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    if (!isConnected) {
      Alert.alert(
        'Offline',
        'Cannot refresh consignment details while offline. Showing cached record.',
        [{ text: 'OK' }]
      );
      return;
    }
    refreshingRef.current = true;
    loadConsignment(true);
  }, [isConnected, loadConsignment]);

  // ── Open Delivery Confirmation Modal ──────────────────────────────────────
  const handleOpenDeliverModal = useCallback(() => {
    if (!isConnected) {
      Alert.alert(
        'Offline',
        'Marking a consignment as delivered requires an active internet connection.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsDeliverModalVisible(true);
  }, [isConnected]);

  // ── Confirm Delivery Handoff (Server-Authoritative) ────────────────────────
  const handleConfirmDelivery = useCallback(async () => {
    if (deliveringRef.current) return;
    const targetId = consignment?.id || consignmentId;
    if (!targetId) return;

    if (!isConnected) {
      setIsDeliverModalVisible(false);
      Alert.alert(
        'Offline',
        'Cannot record delivery while offline. Please connect to the internet and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    deliveringRef.current = true;
    setIsDelivering(true);

    try {
      const updated = await recyclingService.deliverConsignment(targetId);
      setIsDeliverModalVisible(false);
      setConsignment(updated);
      Alert.alert(
        'Delivery Recorded',
        'Consignment marked as delivered at facility. The formal recycler has been notified to inspect and accept the batch.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      setIsDeliverModalVisible(false);
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to mark consignment as delivered.';

      if (status === 409 || msg.includes('Cannot mark consignment as delivered in status')) {
        Alert.alert(
          'Status Conflict',
          'Consignment status has changed on the server. Updating latest status...',
          [{ text: 'OK', onPress: () => loadConsignment(false) }]
        );
      } else if (err?.isOfflineError) {
        Alert.alert('Offline', 'Internet connection required to record delivery.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Delivery Failed', msg, [{ text: 'OK' }]);
      }
    } finally {
      deliveringRef.current = false;
      setIsDelivering(false);
    }
  }, [consignment?.id, consignmentId, isConnected, loadConsignment]);

  // ── Unauthorized Role Guard ───────────────────────────────────────────────
  if (!isCollectorOrAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title="Consignment Status" onBack={() => navigation?.goBack?.()} />
        <View style={styles.contentPadding}>
          <EmptyState
            icon="🔒"
            title="Access Restricted"
            message="Only authenticated informal collectors can track consignment statuses."
            actionLabel="Go Back"
            onAction={() => navigation?.goBack?.()}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error && !consignment) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title="Consignment Status" onBack={() => navigation?.goBack?.()} />
        <View style={styles.contentPadding}>
          <EmptyState
            icon="⚠"
            title="Consignment Unavailable"
            message={error}
            actionLabel={isConnected ? 'Retry' : undefined}
            onAction={isConnected ? () => loadConsignment(false) : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Authoritative Data Extract ────────────────────────────────────────────
  const csg = consignment || {};
  const status = csg.status || CONSIGNMENT_STATUS.CREATED;
  const shortId = (csg.id || consignmentId || '').slice(0, 8).toUpperCase();
  const recycler = csg.recycler || {};
  const facilityName = recycler.facilityName || 'Authorized Formal Recycler';
  const facilityAddress = recycler.facilityAddress || 'Address on file';
  const acceptedCategories: string[] = Array.isArray(recycler.acceptedCategories)
    ? recycler.acceptedCategories
    : [];

  const items: any[] = Array.isArray(csg.items) ? csg.items : [];
  const totalItemsCount = csg.totalItems ?? items.length;
  const totalWeight = csg.totalWeightKg ?? 0;

  // Lifecycle Timestamps
  const createdAt = csg.createdAt ? new Date(csg.createdAt).toLocaleString() : null;
  const deliveredAt = csg.deliveredAt ? new Date(csg.deliveredAt).toLocaleString() : null;
  const acceptedAt = csg.acceptedAt ? new Date(csg.acceptedAt).toLocaleString() : null;
  const rejectedAt = csg.rejectedAt ? new Date(csg.rejectedAt).toLocaleString() : null;

  // Server Authoritative Rejection Reason (only shown if exposed by API)
  const rejectionReason = csg.rejectionReason || null;

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('collector.delivery.title') || "Consignment Status"}
        subtitle={`Ref #${shortId}`}
        onBack={() => navigation?.goBack?.()}
      />

      {isLoading && !consignment ? (
        <DetailSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Offline & Cache Banners */}
          <OfflineBanner />
          {isConnected && fromCache && (
            <View style={styles.cacheNotice} accessibilityRole="alert">
              <Text style={styles.cacheNoticeText}>
                {t('offline.cachedNotice') || 'ℹ Showing cached consignment record. Pull down to refresh live status.'}
              </Text>
            </View>
          )}

          {/* Lifecycle Status Banner */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.refText}>CONSIGNMENT #{shortId}</Text>
                <Text style={styles.idSubtext}>ID: {csg.id || consignmentId}</Text>
              </View>
              <StatusBadge status={status} />
            </View>

            <View style={styles.divider} />

            {/* Status-specific Lifecycle Callout */}
            {status === CONSIGNMENT_STATUS.CREATED && (
              <View style={styles.calloutCreated}>
                <Text style={styles.calloutTitle}>Batch Created & Ready for Transit</Text>
                <Text style={styles.calloutBody}>
                  The formal recycler has been notified. Deliver this batch to their authorized facility to complete handover.
                </Text>
              </View>
            )}

            {status === CONSIGNMENT_STATUS.IN_TRANSIT && (
              <View style={styles.calloutTransit}>
                <Text style={styles.calloutTitle}>Batch In Transit</Text>
                <Text style={styles.calloutBody}>
                  The consignment is currently on its way to the designated formal recycling facility.
                </Text>
              </View>
            )}

            {status === CONSIGNMENT_STATUS.DELIVERED && (
              <View style={styles.calloutDelivered}>
                <Text style={styles.calloutTitle}>Delivered — Pending Recycler Verification</Text>
                <Text style={styles.calloutBody}>
                  Batch has arrived at the facility. Formal recycler staff will verify the weight and items before acceptance.
                </Text>
              </View>
            )}

            {status === CONSIGNMENT_STATUS.ACCEPTED && (
              <View style={styles.calloutAccepted}>
                <Text style={styles.calloutTitleAccepted}>Consignment Accepted & Verified</Text>
                <Text style={styles.calloutBodyAccepted}>
                  The formal recycler has verified and accepted this consignment. Materials are logged into the formal chain of custody for certified recycling.
                </Text>
              </View>
            )}

            {status === CONSIGNMENT_STATUS.REJECTED && (
              <View style={styles.calloutRejected}>
                <Text style={styles.calloutTitleRejected}>Consignment Rejected by Facility</Text>
                {rejectionReason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Official Reason Provided by Recycler:</Text>
                    <Text style={styles.reasonText}>{rejectionReason}</Text>
                  </View>
                ) : (
                  <Text style={styles.calloutBodyRejected}>
                    The formal recycler rejected this consignment upon facility inspection.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Facility Delivery Handoff Action Section */}
          {(status === CONSIGNMENT_STATUS.CREATED || status === CONSIGNMENT_STATUS.IN_TRANSIT) && (
            <View style={styles.deliveryCard}>
              <View style={styles.deliveryHeaderRow}>
                <Text style={styles.deliveryIcon}>🚚</Text>
                <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
                  <Text style={styles.deliveryCardTitle}>Facility Delivery Handoff</Text>
                  <Text style={styles.deliveryCardSubtitle}>
                    Deliver this batch to {facilityName} to transfer custody to the formal recycler.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.deliverButton,
                  (!isConnected || isDelivering) && styles.deliverButtonDisabled,
                ]}
                onPress={handleOpenDeliverModal}
                disabled={!isConnected || isDelivering}
                accessibilityRole="button"
                accessibilityLabel="Mark consignment as delivered at facility"
                accessibilityHint="Records physical arrival and notifies the formal recycler to inspect and accept the batch"
                activeOpacity={0.8}
              >
                {isDelivering ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.deliverButtonText}>
                    {isConnected ? '📍 Mark as Delivered at Facility' : '⚠ Connect to Record Delivery'}
                  </Text>
                )}
              </TouchableOpacity>

              {!isConnected && (
                <Text style={styles.deliveryOfflineNotice}>
                  Recording delivery requires an active internet connection for server confirmation.
                </Text>
              )}
            </View>
          )}

          {/* Chain of Custody & Lifecycle Timestamps */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Lifecycle History
            </Text>
            <View style={styles.timestampRow}>
              <Text style={styles.timelineDot}>●</Text>
              <View style={styles.timestampContent}>
                <Text style={styles.timestampLabel}>Created:</Text>
                <Text style={styles.timestampValue}>{createdAt || 'Pending'}</Text>
              </View>
            </View>

            {Boolean(deliveredAt) && (
              <View style={styles.timestampRow}>
                <Text style={styles.timelineDot}>●</Text>
                <View style={styles.timestampContent}>
                  <Text style={styles.timestampLabel}>Delivered at Facility:</Text>
                  <Text style={styles.timestampValue}>{deliveredAt}</Text>
                </View>
              </View>
            )}

            {Boolean(acceptedAt) && (
              <View style={styles.timestampRow}>
                <Text style={[styles.timelineDot, { color: colors.success }]}>●</Text>
                <View style={styles.timestampContent}>
                  <Text style={[styles.timestampLabel, { color: colors.success }]}>Accepted:</Text>
                  <Text style={styles.timestampValue}>{acceptedAt}</Text>
                </View>
              </View>
            )}

            {Boolean(rejectedAt) && (
              <View style={styles.timestampRow}>
                <Text style={[styles.timelineDot, { color: colors.error }]}>●</Text>
                <View style={styles.timestampContent}>
                  <Text style={[styles.timestampLabel, { color: colors.error }]}>Rejected:</Text>
                  <Text style={styles.timestampValue}>{rejectedAt}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Receiving Formal Recycler Information */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Receiving Facility
            </Text>
            <View style={styles.recyclerHeader}>
              <Text style={styles.recyclerIcon}>🏭</Text>
              <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
                <Text style={styles.facilityName}>{facilityName}</Text>
                <Text style={styles.facilityAddress}>{facilityAddress}</Text>
              </View>
              <StatusBadge status="ACTIVE" />
            </View>

            {acceptedCategories.length > 0 && (
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryLabel}>Accepted Materials:</Text>
                <View style={styles.categoryChipsWrap}>
                  {acceptedCategories.map((cat, idx) => (
                    <View key={`${cat}-${idx}`} style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Consigned E-Waste Items Breakdown */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Consigned E-Waste
              </Text>
              <Text style={styles.summaryBadge}>
                {totalItemsCount} items • {totalWeight.toFixed(1)} kg
              </Text>
            </View>

            {items.length > 0 ? (
              items.map((item: any, idx: number) => {
                const ewaste = item.ewasteItem || item;
                const category = ewaste.category || 'E-WASTE';
                const description = ewaste.description || `Item #${idx + 1}`;
                const weight = ewaste.weightKg ? `${ewaste.weightKg} kg` : null;

                return (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <View style={styles.itemBullet}>
                      <Text style={styles.itemBulletText}>⚡</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
                      <Text style={styles.itemCategory}>{category}</Text>
                      <Text style={styles.itemDescription}>{description}</Text>
                    </View>
                    {weight && <Text style={styles.itemWeight}>{weight}</Text>}
                  </View>
                );
              })
            ) : (
              <Text style={styles.noItemsText}>
                {totalItemsCount} e-waste items bundled in this consignment.
              </Text>
            )}

            {Boolean(csg.deliveryNotes) && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Collector Delivery Notes:</Text>
                <Text style={styles.notesText}>{csg.deliveryNotes}</Text>
              </View>
            )}
          </View>

          {/* Read-Only Notice */}
          <View style={styles.readOnlyNotice} accessibilityRole="alert">
            <Text style={styles.readOnlyNoticeText}>
              🛡 Official Server Record: Consignment lifecycle statuses are determined authoritatively by the receiving formal recycling facility. Collectors cannot alter verification decisions.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Delivery Confirmation Modal */}
      <Modal
        visible={isDeliverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDelivering) setIsDeliverModalVisible(false);
        }}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle} accessibilityRole="header">
              {t('collector.delivery.confirmDelivery') || 'Confirm Facility Delivery'}
            </Text>
            <Text style={modalStyles.modalSubtitle}>
              Please confirm physical handover of this consignment to the recycling partner:
            </Text>

            <View style={modalStyles.summaryCard}>
              <View style={modalStyles.summaryRow}>
                <Text style={modalStyles.summaryLabel}>Consignment Ref:</Text>
                <Text style={modalStyles.summaryValue}>#{shortId}</Text>
              </View>
              <View style={modalStyles.summaryRow}>
                <Text style={modalStyles.summaryLabel}>Receiving Facility:</Text>
                <Text style={modalStyles.summaryValue}>{facilityName}</Text>
              </View>
              <View style={modalStyles.summaryRow}>
                <Text style={modalStyles.summaryLabel}>Batch Contents:</Text>
                <Text style={modalStyles.summaryValue}>
                  {totalItemsCount} items • {totalWeight.toFixed(1)} kg
                </Text>
              </View>
              <View style={modalStyles.summaryRow}>
                <Text style={modalStyles.summaryLabel}>New Status:</Text>
                <Text style={[modalStyles.summaryValue, { color: colors.primary }]}>DELIVERED</Text>
              </View>
            </View>

            <View style={modalStyles.handoffNotice}>
              <Text style={modalStyles.handoffNoticeText}>
                ℹ This action records physical arrival at the formal recycling facility. Once marked as delivered, the recycler can inspect and accept the batch into certified recycling. Server confirmation is the final authority.
              </Text>
            </View>

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => setIsDeliverModalVisible(false)}
                disabled={isDelivering}
                accessibilityRole="button"
                accessibilityLabel="Cancel delivery confirmation"
              >
                <Text style={modalStyles.cancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.confirmButton,
                  (isDelivering || !isConnected) && modalStyles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmDelivery}
                disabled={isDelivering || !isConnected}
                accessibilityRole="button"
                accessibilityLabel="Confirm delivery to facility"
              >
                {isDelivering ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={modalStyles.confirmButtonText}>{t('collector.delivery.confirmDelivery') || 'Confirm Delivery'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentPadding: {
    padding: spacing.spaceMd,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  cacheNotice: {
    backgroundColor: '#E8F5E9',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  cacheNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 2,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  idSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceSm,
  },
  calloutCreated: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  calloutTransit: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  calloutDelivered: {
    backgroundColor: '#EDE7F6',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#D1C4E9',
  },
  calloutAccepted: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  calloutRejected: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  calloutBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  calloutTitleAccepted: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  calloutBodyAccepted: {
    fontSize: 12,
    color: '#1B5E20',
    lineHeight: 18,
  },
  calloutTitleRejected: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 4,
  },
  calloutBodyRejected: {
    fontSize: 12,
    color: '#B71C1C',
    lineHeight: 18,
  },
  reasonBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: spacing.spaceSm,
    marginTop: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.spaceSm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  summaryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timelineDot: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
    marginTop: 2,
  },
  timestampContent: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  timestampLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  recyclerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recyclerIcon: {
    fontSize: 28,
  },
  facilityName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  facilityAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryContainer: {
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBulletText: {
    fontSize: 14,
  },
  itemCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemWeight: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  noItemsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  notesBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  readOnlyNotice: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  readOnlyNoticeText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
  },
  deliveryCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  deliveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  deliveryIcon: {
    fontSize: 24,
  },
  deliveryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A148C',
    marginBottom: 2,
  },
  deliveryCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  deliverButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 6,
  },
  deliverButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  deliverButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deliveryOfflineNotice: {
    fontSize: 11,
    color: colors.error,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.spaceLg,
    width: '100%',
    maxWidth: 420,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceMd,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  handoffNotice: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: spacing.spaceMd,
  },
  handoffNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 17,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CollectorConsignmentStatusScreen;
