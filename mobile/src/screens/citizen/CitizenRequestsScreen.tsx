import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CitizenTabParamList, CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { requestService } from '../../services/requestService';
import { offlineStore } from '../../services/offlineStore';
import { REQUEST_STATUS } from '../../utils/constants';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AppIcon } from '../../components/ui/AppIcon';
import { colors } from '../../theme/colors';

type CitizenRequestsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'CitizenRequests'>,
  NativeStackNavigationProp<CitizenStackParamList>
>;

interface Props {
  navigation: CitizenRequestsNavigationProp;
}

type FilterTab = 'ALL' | 'ACTIVE' | 'PICKED_UP' | 'CANCELLED';

// Helper to determine if a request can be cancelled per docs/07 Section 1.3
// Citizen can cancel before PICKED_UP; cannot cancel if already PICKED_UP, CANCELLED, or EXPIRED
const canCancelRequest = (status: string): boolean => {
  const norm = (status || '').toUpperCase();
  return (
    norm !== REQUEST_STATUS.PICKED_UP &&
    norm !== REQUEST_STATUS.CANCELLED &&
    norm !== REQUEST_STATUS.EXPIRED
  );
};

// Friendly status description conforming to docs/07_BUSINESS_WORKFLOWS.md Section 1.2
const getStatusDescription = (status: string, request: any): string => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case REQUEST_STATUS.DRAFT:
      return 'Your request is not yet submitted.';
    case REQUEST_STATUS.SUBMITTED:
      return 'Waiting for a local informal collector to accept your request.';
    case REQUEST_STATUS.ACCEPTED:
      return 'A local collector has accepted. Pickup will be scheduled.';
    case REQUEST_STATUS.PICKUP_SCHEDULED:
      if (request.preferredDate) {
        const d = new Date(request.preferredDate);
        const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString() : request.preferredDate;
        return `Pickup scheduled for ${dateStr}.`;
      }
      return 'Pickup scheduled by your collector.';
    case REQUEST_STATUS.PICKED_UP:
      return 'Your e-waste items have been collected.';
    case REQUEST_STATUS.CANCELLED:
      return request.cancellationReason
        ? `Request cancelled: ${request.cancellationReason}`
        : 'This collection request was cancelled.';
    case REQUEST_STATUS.EXPIRED:
      return 'This request has expired. Please create a new one.';
    default:
      return `Status: ${norm}`;
  }
};

export const CitizenRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [requests, setRequests] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Cancellation Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadRequests = useCallback(async (isInitial = false) => {
    setErrorMessage(null);
    let hadCached = false;
    if (isInitial) {
      try {
        const cached = await offlineStore.getCachedRequests();
        if (Array.isArray(cached) && cached.length > 0) {
          setRequests(cached);
          setIsLoading(false);
          hadCached = true;
        }
      } catch {}
    }
    try {
      const data = await requestService.getRequests();
      setRequests(Array.isArray(data) ? data : []);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('[CitizenRequests] Failed to load requests:', err?.message || err);
      // Only show error banner if we have no cached requests to show
      if (!hadCached && (!requests || requests.length === 0)) {
        setErrorMessage(
          t('citizen.requests.loadFailed') || 'Could not load requests.'
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [requests, t]);

  useEffect(() => {
    loadRequests(true);
  }, [loadRequests]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRequests(false);
  }, [loadRequests]);

  // Filter requests based on active tab
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const s = (r.status || '').toUpperCase();
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'ACTIVE') {
        return (
          s === REQUEST_STATUS.SUBMITTED ||
          s === REQUEST_STATUS.ACCEPTED ||
          s === REQUEST_STATUS.PICKUP_SCHEDULED ||
          s === REQUEST_STATUS.DRAFT
        );
      }
      if (activeFilter === 'PICKED_UP') {
        return s === REQUEST_STATUS.PICKED_UP;
      }
      if (activeFilter === 'CANCELLED') {
        return s === REQUEST_STATUS.CANCELLED || s === REQUEST_STATUS.EXPIRED;
      }
      return true;
    });
  }, [requests, activeFilter]);

  // Navigation handlers
  const handleOpenDetail = (requestId: string) => {
    (navigation as any).navigate('RequestDetail', { requestId });
  };

  const handleOpenSubmit = () => {
    navigation.navigate('CitizenSubmit');
  };

  const handleOpenNotifications = () => {
    navigation.navigate('CitizenNotifications');
  };

  // Open Cancel Modal
  const handleInitiateCancel = (request: any) => {
    if (!isConnected) {
      Alert.alert(
        t('citizen.requests.cancelOfflineError') || 'Offline',
        t('citizen.requests.cancelOfflineMessage') ||
          'Cancelling a collection request requires an active internet connection.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedRequest(request);
    setCancellationReason('');
    setCancelError(null);
    setCancelModalVisible(true);
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!selectedRequest) return;
    const reason = cancellationReason.trim();
    if (!reason) {
      setCancelError(
        t('citizen.requests.cancelReasonRequired') ||
          'Please provide a reason for cancelling this request.'
      );
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      await requestService.cancelRequest(selectedRequest.id, reason);
      setCancelModalVisible(false);
      setSelectedRequest(null);
      setCancellationReason('');

      // Refresh requests list
      await loadRequests();

      Alert.alert(
        t('citizen.requests.cancelSuccess') || 'Request Cancelled',
        t('citizen.requests.cancelSuccessMessage') ||
          'Your collection request has been cancelled successfully.'
      );
    } catch (err: any) {
      console.warn('[CitizenRequests] Cancel error:', err?.message || err);
      setCancelError(err?.message || 'Failed to cancel request. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <EcoSetuBackground>
      <TopAppBar
        title="My E-Waste Requests"
        subtitle="Doorstep collection tracker"
        showBack={false}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      >
        {/* Offline Banner */}
        {!isConnected && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <AppIcon name="alert" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.offlineBannerText}>Offline — showing cached requests</Text>
          </View>
        )}

        {/* Error Banner */}
        {Boolean(errorMessage) && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadRequests()}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header Action Row */}
        <View style={styles.actionRow}>
          <Text style={styles.totalLabel}>{requests.length} request{requests.length !== 1 ? 's' : ''} total</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={handleOpenSubmit}
            accessibilityRole="button"
            accessibilityLabel="Schedule new pickup"
          >
            <Text style={styles.newBtnText}>+ New Pickup</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow} accessibilityRole="tablist">
          {(['ALL', 'ACTIVE', 'PICKED_UP', 'CANCELLED'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeFilter === filter }}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter === 'ALL' ? `All (${requests.length})` :
                 filter === 'ACTIVE' ? 'Active' :
                 filter === 'PICKED_UP' ? 'Collected' : 'Cancelled'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton height={130} style={styles.skeletonCard} />
            <Skeleton height={130} style={styles.skeletonCard} />
            <Skeleton height={130} style={styles.skeletonCard} />
          </View>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon="box"
            title={activeFilter === 'ALL' ? 'No Collection Requests' : `No ${activeFilter.toLowerCase()} requests`}
            message={activeFilter === 'ALL'
              ? 'Submit your first e-waste item to get started with free doorstep pickup.'
              : `No ${activeFilter.toLowerCase()} requests found.`
            }
            actionLabel={activeFilter === 'ALL' ? 'Schedule Pickup' : 'View All'}
            onAction={activeFilter === 'ALL' ? handleOpenSubmit : () => setActiveFilter('ALL')}
          />
        ) : (
          <View style={styles.cardList}>
            {filteredRequests.map((item) => {
              const refId = `REQ-${(item.id || '').substring(0, 8).toUpperCase()}`;
              const itemCount = Array.isArray(item.ewasteItems) ? item.ewasteItems.length : 0;
              const cancellable = canCancelRequest(item.status);
              const statusCopy = getStatusDescription(item.status, item);
              const status = (item.status || '').toUpperCase();
              const isCompleted = ['COMPLETED', 'PICKED_UP'].includes(status);
              const isCancelled = ['CANCELLED', 'EXPIRED'].includes(status);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.requestCard}
                  onPress={() => handleOpenDetail(item.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Request ${refId}, ${item.status}, ${itemCount} items`}
                >
                  {/* Card Top */}
                  <View style={styles.cardTop}>
                    <View style={styles.cardIconBox}>
                      <AppIcon
                        name={isCompleted ? 'checkCircle' : isCancelled ? 'xCircle' : 'box'}
                        size={18}
                        color={isCompleted ? '#10B981' : isCancelled ? '#EF4444' : '#0284C7'}
                      />
                    </View>
                    <View style={styles.cardTopInfo}>
                      <Text style={styles.cardRef}>#{refId}</Text>
                      <Text style={styles.cardStatusDesc} numberOfLines={2}>{statusCopy}</Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>

                  {/* Card Details */}
                  <View style={styles.cardDetails}>
                    {Boolean(item.pickupAddress) && (
                      <View style={styles.detailRow}>
                        <AppIcon name="location" size={13} color="#64748B" style={{ marginRight: 5 }} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.pickupAddress}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <View style={styles.metaChip}>
                        <AppIcon name="box" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
                      </View>
                      {Boolean(item.preferredDate) && (
                        <View style={styles.metaChip}>
                          <AppIcon name="calendar" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.metaText}>{new Date(item.preferredDate).toLocaleDateString()}</Text>
                        </View>
                      )}
                      {Boolean(item.collectorId) && (
                        <View style={[styles.metaChip, styles.metaChipGreen]}>
                          <AppIcon name="handshake" size={12} color="#10B981" style={{ marginRight: 4 }} />
                          <Text style={[styles.metaText, styles.metaTextGreen]}>Collector Assigned</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailsLink}>View Details →</Text>
                    {cancellable && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleInitiateCancel(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Cancel request ${refId}`}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isCancelling && setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              Cancel Collection Request
            </Text>
            <Text style={styles.modalSubtitle}>
              {`Cancel request #${selectedRequest?.id?.substring(0, 8).toUpperCase()}? Any assigned collector will be notified.`}
            </Text>

            {Boolean(cancelError) && (
              <View style={styles.modalError} accessibilityRole="alert">
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Reason for cancellation *</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Schedule conflict, items already handed over"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={cancellationReason}
              onChangeText={setCancellationReason}
              maxLength={500}
              multiline
              numberOfLines={3}
              editable={!isCancelling}
              accessibilityLabel="Cancellation reason"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setCancelModalVisible(false)}
                disabled={isCancelling}
                accessibilityRole="button"
              >
                <Text style={styles.modalBtnSecondaryText}>Keep Request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDestructive}
                onPress={handleConfirmCancel}
                disabled={isCancelling}
                accessibilityRole="button"
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnDestructiveText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },

  offlineBanner: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 12, padding: 10, marginBottom: 12, alignItems: 'center',
  },
  offlineBannerText: { fontSize: 12, fontWeight: '600', color: '#FBBF24' },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.14)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
    borderRadius: 14, padding: 12, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  errorText: { fontSize: 13, color: '#FCA5A5', flex: 1, marginRight: 8 },
  retryBtn: {
    backgroundColor: 'rgba(239,68,68,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  newBtn: {
    backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  newBtnText: { fontSize: 13, fontWeight: '800', color: '#051417' },

  // Filter
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  filterPillActive: { backgroundColor: 'rgba(16,185,129,0.20)', borderColor: '#10B981' },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.60)' },
  filterTextActive: { color: '#10B981' },

  // Skeleton
  skeletonContainer: { gap: 14 },
  skeletonCard: { borderRadius: 18 },

  // Cards
  cardList: { gap: 14 },
  requestCard: {
    backgroundColor: 'rgba(16,44,48,0.70)', borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIcon: { fontSize: 20 },
  cardTopInfo: { flex: 1, marginRight: 8 },
  cardRef: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3, marginBottom: 2 },
  cardStatusDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 16, fontStyle: 'italic' },

  cardDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailIcon: { fontSize: 13, marginRight: 6 },
  detailText: { fontSize: 13, color: 'rgba(255,255,255,0.70)', flex: 1 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5,
  },
  metaChipGreen: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(52,211,153,0.30)' },
  metaText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  metaTextGreen: { color: '#34D399' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  viewDetailsLink: { fontSize: 13, fontWeight: '700', color: '#34D399' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#F87171' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#0B2D33', borderRadius: 22, padding: 24,
    width: '100%', maxWidth: 400,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.60)', marginBottom: 16, lineHeight: 18 },
  modalError: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  modalErrorText: { fontSize: 12, color: '#FCA5A5' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.70)', marginBottom: 6 },
  reasonInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, padding: 14, fontSize: 14, color: '#FFFFFF',
    textAlignVertical: 'top', minHeight: 80, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtnSecondary: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    minHeight: 44, justifyContent: 'center', alignItems: 'center',
  },
  modalBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  modalBtnDestructive: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#EF4444', minHeight: 44, justifyContent: 'center', alignItems: 'center',
  },
  modalBtnDestructiveText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});

export default CitizenRequestsScreen;
