import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { requestService } from '../../services/requestService';
import { REQUEST_STATUS } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<CitizenStackParamList, 'RequestDetail'>;

// Check if request can be cancelled per docs/07 Section 1.3
// Citizen can cancel before PICKED_UP; cannot cancel once PICKED_UP, CANCELLED, or EXPIRED
const canCancelRequest = (status: string): boolean => {
  const norm = (status || '').toUpperCase();
  return (
    norm !== REQUEST_STATUS.PICKED_UP &&
    norm !== REQUEST_STATUS.CANCELLED &&
    norm !== REQUEST_STATUS.EXPIRED
  );
};

// Friendly status narrative per docs/07_BUSINESS_WORKFLOWS.md Section 1.2
const getStatusDescription = (status: string, request?: any): string => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case REQUEST_STATUS.DRAFT:
      return 'Your request is in draft status and has not yet been submitted for pickup.';
    case REQUEST_STATUS.SUBMITTED:
      return 'Your request has been broadcasted to nearby informal collectors (Kabadiwalas).';
    case REQUEST_STATUS.ACCEPTED:
      return 'A local informal collector has accepted your request. Pickup will be scheduled.';
    case REQUEST_STATUS.PICKUP_SCHEDULED:
      return request?.preferredDate
        ? `Doorstep pickup scheduled for ${new Date(request.preferredDate).toLocaleDateString()}.`
        : 'Doorstep pickup has been scheduled by your collector.';
    case REQUEST_STATUS.PICKED_UP:
      return 'Your e-waste items have been collected and verified at your doorstep.';
    case REQUEST_STATUS.CANCELLED:
      return 'This collection request was cancelled.';
    case REQUEST_STATUS.EXPIRED:
      return 'This collection request has expired. Please submit a new request.';
    default:
      return 'Collection request status updated.';
  }
};

interface StepItem {
  id: string;
  label: string;
  description: string;
}

const LIFECYCLE_STEPS: StepItem[] = [
  { id: 'DRAFT', label: 'Request Created', description: 'Item details entered' },
  { id: 'SUBMITTED', label: 'Submitted', description: 'Broadcasting to local collectors' },
  { id: 'ACCEPTED', label: 'Collector Accepted', description: 'Informal collector assigned' },
  { id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', description: 'Date & arrival slot confirmed' },
  { id: 'PICKED_UP', label: 'Items Picked Up', description: 'Doorstep collection completed' },
];

export const RequestDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { requestId } = route.params;
  const { isConnected } = useNetwork();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [request, setRequest] = useState<any | null>(null);

  // Cancellation Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadRequestDetails = useCallback(async () => {
    setErrorMessage(null);
    try {
      const data = await requestService.getRequestById(requestId);
      if (!data) {
        setErrorMessage('Collection request not found. It may have been deleted or is unavailable offline.');
      } else {
        setRequest(data);
      }
    } catch (err: any) {
      console.warn('[RequestDetail] Fetch error:', err?.message || err);
      if (err?.status === 403 || err?.code === 'FORBIDDEN') {
        setErrorMessage('Access denied. You can only view your own collection requests.');
      } else if (err?.status === 404 || err?.code === 'NOT_FOUND') {
        setErrorMessage('Collection request not found.');
      } else {
        setErrorMessage(err?.message || 'Unable to load request details. Please check your connection and retry.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadRequestDetails();
  }, [loadRequestDetails]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRequestDetails();
  }, [loadRequestDetails]);

  const handleOpenCancelModal = () => {
    if (!isConnected) {
      Alert.alert(
        'Offline',
        'Cancelling a collection request requires an active internet connection.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCancellationReason('');
    setCancelError(null);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    const reason = cancellationReason.trim();
    if (!reason) {
      setCancelError('Please provide a reason for cancelling this request.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      await requestService.cancelRequest(requestId, reason);
      setCancelModalVisible(false);
      setCancellationReason('');
      await loadRequestDetails();
      Alert.alert('Request Cancelled', 'Your collection request has been cancelled successfully.');
    } catch (err: any) {
      console.warn('[RequestDetail] Cancel error:', err?.message || err);
      setCancelError(err?.message || 'Failed to cancel request. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewItemTraceability = (itemId: string) => {
    navigation.navigate('ItemTraceability', { itemId });
  };

  const status = request?.status ? request.status.toUpperCase() : '';
  const refId = `#REQ-${(requestId || '').substring(0, 8).toUpperCase()}`;
  const cancellable = canCancelRequest(status);
  const items = Array.isArray(request?.ewasteItems) ? request.ewasteItems : [];

  // Determine stage indices for lifecycle stepper
  const getStepStatus = (index: number) => {
    if (status === REQUEST_STATUS.CANCELLED || status === REQUEST_STATUS.EXPIRED) {
      return 'INACTIVE';
    }
    const statusOrder: Record<string, number> = {
      [REQUEST_STATUS.DRAFT]: 0,
      [REQUEST_STATUS.SUBMITTED]: 1,
      [REQUEST_STATUS.ACCEPTED]: 2,
      [REQUEST_STATUS.PICKUP_SCHEDULED]: 3,
      [REQUEST_STATUS.PICKED_UP]: 4,
    };
    const currentLevel = statusOrder[status] ?? -1;
    if (index < currentLevel) return 'COMPLETED';
    if (index === currentLevel) return 'CURRENT';
    return 'PENDING';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Request Details"
        roleBadge="CITIZEN"
        onBack={() => navigation.goBack()}
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
        {/* Offline Notice */}
        {!isConnected && (
          <View style={styles.offlineNotice} accessibilityRole="alert">
            <Text style={styles.offlineNoticeText}>
              Offline mode: Showing locally cached request details.
            </Text>
          </View>
        )}

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={120} style={styles.skeletonCard} />
            <Skeleton width="100%" height={200} style={styles.skeletonCard} />
            <Skeleton width="100%" height={160} style={styles.skeletonCard} />
          </View>
        ) : errorMessage ? (
          /* Error State */
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorTitle}>Request Detail Error</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadRequestDetails}
              accessibilityRole="button"
              accessibilityLabel="Retry loading request details"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : request ? (
          /* Request Details Content */
          <>
            {/* Header Summary Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardRef}>{refId}</Text>
                  <Text style={styles.cardCreatedDate}>
                    Created on {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <StatusBadge status={status} />
              </View>

              <Text style={styles.statusDescription}>
                {getStatusDescription(status, request)}
              </Text>

              {/* Cancelled or Expired Highlight */}
              {status === REQUEST_STATUS.CANCELLED && (
                <View style={styles.cancellationBanner} accessibilityRole="alert">
                  <Text style={styles.cancellationBannerTitle}>⚠️ Request Cancelled</Text>
                  {Boolean(request.cancellationReason) && (
                    <Text style={styles.cancellationBannerReason}>
                      Reason: "{request.cancellationReason}"
                    </Text>
                  )}
                  {Boolean(request.cancelledAt) && (
                    <Text style={styles.cancellationBannerDate}>
                      Cancelled on: {new Date(request.cancelledAt).toLocaleString()}
                    </Text>
                  )}
                </View>
              )}

              {status === REQUEST_STATUS.EXPIRED && (
                <View style={styles.expiredBanner} accessibilityRole="alert">
                  <Text style={styles.expiredBannerTitle}>⌛ Request Expired</Text>
                  <Text style={styles.expiredBannerText}>
                    No local informal collector accepted within the 48-hour broadcast window.
                  </Text>
                </View>
              )}
            </View>

            {/* Visual Lifecycle Stepper */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Collection Lifecycle
              </Text>
              <Text style={styles.sectionSubtitle}>
                Progress from citizen submission to doorstep pickup by your local collector.
              </Text>

              <View style={styles.stepperContainer}>
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const stepState = getStepStatus(idx);
                  const isLast = idx === LIFECYCLE_STEPS.length - 1;

                  return (
                    <View key={step.id} style={styles.stepRow}>
                      <View style={styles.stepIndicatorColumn}>
                        <View
                          style={[
                            styles.stepCircle,
                            stepState === 'COMPLETED' && styles.stepCircleCompleted,
                            stepState === 'CURRENT' && styles.stepCircleCurrent,
                            stepState === 'PENDING' && styles.stepCirclePending,
                            stepState === 'INACTIVE' && styles.stepCircleInactive,
                          ]}
                          accessibilityLabel={`Step ${idx + 1}: ${step.label}, status ${stepState.toLowerCase()}`}
                        >
                          {stepState === 'COMPLETED' ? (
                            <Text style={styles.stepCircleCheck}>✓</Text>
                          ) : (
                            <Text
                              style={[
                                styles.stepCircleNumber,
                                stepState === 'CURRENT' && styles.stepCircleNumberCurrent,
                              ]}
                            >
                              {idx + 1}
                            </Text>
                          )}
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.stepLine,
                              stepState === 'COMPLETED' && styles.stepLineCompleted,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.stepContentColumn}>
                        <Text
                          style={[
                            styles.stepLabel,
                            stepState === 'CURRENT' && styles.stepLabelCurrent,
                            stepState === 'COMPLETED' && styles.stepLabelCompleted,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Pickup & Collector Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Pickup & Collector Information
              </Text>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📍 Doorstep Address</Text>
                <Text style={styles.detailValue}>
                  {request.pickupAddress || 'Address on file'}
                </Text>
              </View>

              {Boolean(request.preferredDate) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>📅 Preferred Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(request.preferredDate).toLocaleDateString()}
                    {Boolean(request.preferredTimeStart) && ` (${request.preferredTimeStart}`}
                    {Boolean(request.preferredTimeEnd) && ` - ${request.preferredTimeEnd})`}
                  </Text>
                </View>
              )}

              {Boolean(request.notes) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>📝 Citizen Pickup Notes</Text>
                  <Text style={styles.detailValue}>{request.notes}</Text>
                </View>
              )}

              {/* Informal Collector First Representation */}
              <View style={styles.collectorBox}>
                <Text style={styles.collectorBoxTitle}>
                  {request.collectorId
                    ? '🤝 Assigned: Local Informal Collector (Kabadiwala)'
                    : '🔍 Awaiting Local Informal Collector Assignment'}
                </Text>
                <Text style={styles.collectorBoxText}>
                  {request.collectorId
                    ? 'A verified local informal collector has claimed this request and will conduct physical doorstep collection and weighing.'
                    : 'Your request is visible to verified informal collectors operating within your neighbourhood.'}
                </Text>
              </View>
            </View>

            {/* Associated E-Waste Items Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Associated E-Waste Items ({items.length})
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Items included in this collection request and their individual traceability records.
              </Text>

              {items.length === 0 ? (
                <Text style={styles.emptyItemsText}>No items found in this request.</Text>
              ) : (
                items.map((item: any, i: number) => {
                  return (
                    <View key={item.id || i} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemCategory}>
                            {(item.category || 'OTHER').replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.itemCondition}>
                            Condition: {item.condition || 'UNKNOWN'}
                          </Text>
                        </View>
                        <StatusBadge status={item.status || 'SUBMITTED'} />
                      </View>

                      <View style={styles.itemMetaRow}>
                        <Text style={styles.itemMetaText}>
                          Qty: <Text style={styles.itemMetaBold}>{item.quantity || 1}</Text>
                        </Text>
                        {Boolean(item.estimatedWeightKg) && (
                          <Text style={styles.itemMetaText}>
                            Est. Weight:{' '}
                            <Text style={styles.itemMetaBold}>
                              {parseFloat(item.estimatedWeightKg).toFixed(2)} kg
                            </Text>
                          </Text>
                        )}
                        {Boolean(item.actualWeightKg) && (
                          <Text style={styles.itemMetaText}>
                            Actual Weight:{' '}
                            <Text style={styles.itemMetaBold}>
                              {parseFloat(item.actualWeightKg).toFixed(2)} kg
                            </Text>
                          </Text>
                        )}
                      </View>

                      {Boolean(item.description) && (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}

                      {/* Action to view item lifecycle traceability */}
                      <TouchableOpacity
                        style={styles.itemTraceabilityButton}
                        onPress={() => handleViewItemTraceability(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`View traceability for ${item.category}`}
                      >
                        <Text style={styles.itemTraceabilityButtonText}>
                          View Full Item Traceability →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            {/* Actions Section */}
            {cancellable && (
              <View style={styles.actionCard}>
                <Text style={styles.actionCardTitle}>Need to cancel this request?</Text>
                <Text style={styles.actionCardSubtitle}>
                  You can cancel anytime before physical doorstep pickup is performed.
                </Text>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleOpenCancelModal}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel this collection request"
                >
                  <Text style={styles.cancelButtonText}>Cancel Collection Request</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : null}
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
              Cancel Collection Request
            </Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel request{' '}
              <Text style={{ fontWeight: '700' }}>{refId}</Text>? If a local collector was assigned,
              they will be promptly notified.
            </Text>

            {Boolean(cancelError) && (
              <View style={styles.modalErrorBox} accessibilityRole="alert">
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Reason for cancellation *</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Rescheduled, item already disposed, address error"
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
                accessibilityLabel="Keep request and return"
              >
                <Text style={styles.modalButtonSecondaryText}>Keep Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDestructive]}
                onPress={handleConfirmCancel}
                disabled={isCancelling}
                accessibilityRole="button"
                accessibilityLabel="Confirm cancellation"
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonDestructiveText}>Confirm Cancel</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  offlineNotice: {
    backgroundColor: '#FFF9C4',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: '#FFF176',
  },
  offlineNoticeText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: '#795548',
    textAlign: 'center',
  },
  skeletonContainer: {
    gap: spacing.spaceMd,
  },
  skeletonCard: {
    borderRadius: 8,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceLg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    marginTop: spacing.spaceLg,
  },
  errorTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.spaceSm,
  },
  errorText: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 6,
    minHeight: 48,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
  },
  cardRef: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardCreatedDate: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusDescription: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 20,
    marginTop: spacing.spaceXs,
    fontStyle: 'italic',
  },
  cancellationBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: spacing.spaceSm,
    borderRadius: 4,
    marginTop: spacing.spaceMd,
  },
  cancellationBannerTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.error,
  },
  cancellationBannerReason: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 2,
  },
  cancellationBannerDate: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  expiredBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.spaceSm,
    borderRadius: 4,
    marginTop: spacing.spaceMd,
  },
  expiredBannerTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.warning,
  },
  expiredBannerText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  sectionSubtitle: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  stepperContainer: {
    marginTop: spacing.spaceXs,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicatorColumn: {
    alignItems: 'center',
    width: 32,
    marginRight: spacing.spaceSm,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCirclePending: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
  },
  stepCircleInactive: {
    backgroundColor: colors.background,
    borderColor: colors.divider,
  },
  stepCircleCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepCircleNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepCircleNumberCurrent: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.divider,
    marginVertical: 2,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  stepContentColumn: {
    flex: 1,
    paddingBottom: spacing.spaceMd,
  },
  stepLabel: {
    fontSize: typography.Body.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepLabelCompleted: {
    color: colors.textPrimary,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailItem: {
    marginBottom: spacing.spaceSm,
  },
  detailLabel: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  collectorBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  collectorBoxTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.spaceXs,
  },
  collectorBoxText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.primaryDark,
    lineHeight: 18,
  },
  emptyItemsText: {
    fontSize: typography.Body.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: spacing.spaceMd,
  },
  itemCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.spaceSm + 4,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceXs,
  },
  itemCategory: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemCondition: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
    marginVertical: spacing.spaceXs,
  },
  itemMetaText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  itemMetaBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemDescription: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemTraceabilityButton: {
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    minHeight: 48,
    justifyContent: 'center',
  },
  itemTraceabilityButtonText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.primary,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  actionCardTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  actionCardSubtitle: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 8,
    paddingVertical: spacing.spaceSm,
    paddingHorizontal: spacing.spaceLg,
    minHeight: 48,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
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

export default RequestDetailScreen;
