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
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { requestService } from '../../services/requestService';
import { REQUEST_STATUS } from '../../utils/constants';
import { useI18n } from '../../i18n';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

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

  const loadRequests = useCallback(async () => {
    setErrorMessage(null);
    try {
      const data = await requestService.getRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[CitizenRequests] Failed to load requests:', err?.message || err);
      setErrorMessage(
        err?.message || 'Unable to load your collection requests. Please pull down to retry.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRequests();
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
    <GradientBackground>
      <TopAppBar
        title={t('citizen.requests.title') || 'Collection Requests'}
        roleBadge="CITIZEN"
        onNotificationsPress={handleOpenNotifications}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title} accessibilityRole="header">
              {t('citizen.requests.myRequests') || 'My Requests'}
            </Text>
            <Text style={styles.subtitle}>
              {t('citizen.requests.subtitle') ||
                'Track doorstep collection by your local informal collector.'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ReadAloudButton
              text={`My e-waste requests. You have ${requests.length} requests in total.`}
              size="small"
            />
            <TouchableOpacity
              style={styles.newRequestButton}
              onPress={handleOpenSubmit}
              accessibilityRole="button"
              accessibilityLabel={
                t('citizen.requests.submitItem') ||
                'Submit e-waste item to create collection request'
              }
            >
              <Text style={styles.newRequestButtonText}>
                {t('citizen.requests.submitItem') || '+ Submit Item'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline notice if disconnected */}
        {!isConnected && (
          <View style={styles.offlineNotice} accessibilityRole="alert">
            <Text style={styles.offlineNoticeText}>
              {t('citizen.requests.offlineNotice') ||
                'Offline mode: Showing locally cached requests.'}
            </Text>
          </View>
        )}

        {/* Error Banner */}
        {Boolean(errorMessage) && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadRequests}
              accessibilityRole="button"
              accessibilityLabel={t('citizen.requests.retry') || 'Retry loading requests'}
            >
              <Text style={styles.retryButtonText}>
                {t('citizen.requests.retry') || 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.filterRow} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ALL')}
            accessibilityRole="tab"
            accessibilityLabel={t('citizen.requests.all') || 'All requests'}
            accessibilityState={{ selected: activeFilter === 'ALL' }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              {t('citizen.requests.all') || 'All'} ({requests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ACTIVE' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ACTIVE')}
            accessibilityRole="tab"
            accessibilityLabel={t('citizen.requests.active') || 'Active requests'}
            accessibilityState={{ selected: activeFilter === 'ACTIVE' }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'ACTIVE' && styles.filterChipTextActive,
              ]}
            >
              {t('citizen.requests.active') || 'Active'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'PICKED_UP' && styles.filterChipActive]}
            onPress={() => setActiveFilter('PICKED_UP')}
            accessibilityRole="tab"
            accessibilityLabel={t('citizen.requests.collected') || 'Collected requests'}
            accessibilityState={{ selected: activeFilter === 'PICKED_UP' }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'PICKED_UP' && styles.filterChipTextActive,
              ]}
            >
              {t('citizen.requests.collected') || 'Collected'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'CANCELLED' && styles.filterChipActive]}
            onPress={() => setActiveFilter('CANCELLED')}
            accessibilityRole="tab"
            accessibilityLabel={t('citizen.requests.cancelled') || 'Cancelled requests'}
            accessibilityState={{ selected: activeFilter === 'CANCELLED' }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'CANCELLED' && styles.filterChipTextActive,
              ]}
            >
              {t('citizen.requests.cancelled') || 'Cancelled'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Skeletons */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton height={140} style={styles.skeletonCard} />
            <Skeleton height={140} style={styles.skeletonCard} />
            <Skeleton height={140} style={styles.skeletonCard} />
          </View>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon="📦"
            title={t('citizen.requests.noRequests') || 'No Collection Requests'}
            message={
              activeFilter === 'ALL'
                ? (t('citizen.requests.noRequestsDesc') ||
                  'No collection requests yet. Submit your first e-waste item to get started!')
                : (t('citizen.requests.noFilteredRequests', {
                    filter: activeFilter.toLowerCase(),
                  }) || `No ${activeFilter.toLowerCase()} requests found.`)
            }
            actionLabel={
              activeFilter === 'ALL'
                ? (t('citizen.submit.submit') || 'Submit E-Waste Item')
                : (t('citizen.requests.viewAll') || 'View All Requests')
            }
            onAction={activeFilter === 'ALL' ? handleOpenSubmit : () => setActiveFilter('ALL')}
          />
        ) : (
          <View style={styles.listContainer}>
            {filteredRequests.map((item) => {
              const refId = `#REQ-${(item.id || '').substring(0, 8).toUpperCase()}`;
              const itemCount = Array.isArray(item.ewasteItems) ? item.ewasteItems.length : 0;
              const cancellable = canCancelRequest(item.status);
              const statusCopy = getStatusDescription(item.status, item);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.requestCard}
                  onPress={() => handleOpenDetail(item.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Collection request ${refId}, status ${item.status}, ${itemCount} items`}
                >
                  {/* Card Header: Reference & Status */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardRef}>{refId}</Text>
                    <StatusBadge status={item.status} />
                  </View>

                  {/* Friendly Status Narrative */}
                  <Text style={styles.statusDescription}>{statusCopy}</Text>

                  {/* Pickup Details */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText} numberOfLines={2}>
                      {item.pickupAddress || 'Address on file'}
                    </Text>
                  </View>

                  {/* Items & Schedule Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>
                        {t('citizen.requests.itemsCount') || 'Items:'}
                      </Text>
                      <Text style={styles.metaValue}>
                        {itemCount}{' '}
                        {itemCount === 1
                          ? t('citizen.requests.itemsCount') || 'item'
                          : t('citizen.requests.itemsCountPlural') || 'items'}
                      </Text>
                    </View>

                    {Boolean(item.preferredDate) && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Date:</Text>
                        <Text style={styles.metaValue}>
                          {new Date(item.preferredDate).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Assigned Collector Notice (Informal Collector workflow) */}
                  {Boolean(item.collectorId) && (
                    <View style={styles.collectorNotice}>
                      <Text style={styles.collectorNoticeText}>
                        {t('citizen.requests.assignedCollector') ||
                          '🤝 Assigned: Local Informal Collector (Kabadiwala)'}
                      </Text>
                    </View>
                  )}

                  {/* Card Footer: Detail Link & Cancel Action */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailText}>
                      {t('citizen.requests.viewDetails') || 'View Details →'}
                    </Text>

                    {cancellable && (
                      <TouchableOpacity
                        style={styles.cancelActionButton}
                        onPress={() => handleInitiateCancel(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Cancel request ${refId}`}
                      >
                        <Text style={styles.cancelActionText}>
                          {t('citizen.requests.cancelRequest') || 'Cancel Request'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Cancellation Confirmation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isCancelling && setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {t('citizen.requests.cancelModalTitle') || 'Cancel Collection Request'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('citizen.requests.cancelModalSubtitle', {
                ref: `#${selectedRequest?.id?.substring(0, 8).toUpperCase()}`,
              }) ||
                `Are you sure you want to cancel request #${selectedRequest?.id?.substring(0, 8).toUpperCase()}? Once cancelled, any assigned local collector will be notified.`}
            </Text>

            {Boolean(cancelError) && (
              <View style={styles.modalErrorBox} accessibilityRole="alert">
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>
              {t('citizen.requests.cancelReasonLabel') || 'Reason for cancellation *'}
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={
                t('citizen.requests.cancelReasonPlaceholder') ||
                'e.g. Schedule conflict, items already handed over'
              }
              placeholderTextColor={colors.textSecondary}
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
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setCancelModalVisible(false)}
                disabled={isCancelling}
                accessibilityRole="button"
                accessibilityLabel="Keep request and dismiss"
              >
                <Text style={styles.modalButtonSecondaryText}>
                  {t('citizen.requests.keepRequest') || 'Keep Request'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDestructive]}
                onPress={handleConfirmCancel}
                disabled={isCancelling}
                accessibilityRole="button"
                accessibilityLabel="Confirm request cancellation"
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonDestructiveText}>
                    {t('citizen.requests.confirmCancel') || 'Confirm Cancel'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  container: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceMd,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.spaceMd,
  },
  title: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  newRequestButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: spacing.radiusMd,
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  newRequestButtonText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.textInverse,
  },
  offlineNotice: {
    backgroundColor: colors.warningFill,
    padding: spacing.spaceSm,
    borderRadius: spacing.radiusSm,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  offlineNoticeText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.warning,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.errorFill,
    padding: spacing.spaceMd,
    borderRadius: spacing.radiusSm,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.error + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.error,
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.spaceMd,
    gap: spacing.spaceSm,
  },
  filterChip: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: spacing.radiusPill,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accentFill,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  skeletonContainer: {
    gap: spacing.spaceMd,
  },
  skeletonCard: {
    borderRadius: 8,
  },
  listContainer: {
    gap: spacing.spaceMd,
  },
  requestCard: {
    backgroundColor: colors.glassFill,
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  cardRef: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusDescription: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
    fontStyle: 'italic',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 2,
  },
  detailText: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginVertical: spacing.spaceSm,
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginRight: 4,
  },
  metaValue: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  collectorNotice: {
    backgroundColor: '#E8F5E9',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginVertical: spacing.spaceSm,
  },
  collectorNoticeText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  viewDetailText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.primary,
  },
  cancelActionButton: {
    paddingVertical: spacing.spaceSm,
    paddingHorizontal: spacing.spaceSm,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.error,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceLg,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  modalSubtitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  modalErrorBox: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginBottom: spacing.spaceSm,
  },
  modalErrorText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.error,
  },
  inputLabel: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: spacing.spaceMd,
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: spacing.spaceLg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
  },
  modalButton: {
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
    minHeight: 48,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalButtonSecondaryText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalButtonDestructive: {
    backgroundColor: colors.error,
  },
  modalButtonDestructiveText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CitizenRequestsScreen;
