/**
 * EcoSetu Recycler Consignment Detail Screen
 * Provides detailed inspection and accept/reject management of incoming consignments.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 9, docs/07_BUSINESS_WORKFLOWS.md Section 2.3
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { recyclingService } from '../../services/recyclingService';
import { networkService } from '../../services/networkService';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      consignmentId?: string;
      consignment?: any;
    };
  };
}

export const ConsignmentDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const initialConsignment = route?.params?.consignment;
  const consignmentId = route?.params?.consignmentId || initialConsignment?.id;

  const [consignment, setConsignment] = useState<any>(initialConsignment || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialConsignment);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!networkService.isConnected());

  // Action states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const submittingRef = useRef<boolean>(false);

  // Connectivity listener
  useEffect(() => {
    const unsub = networkService.addListener((connected: boolean) => {
      setIsOffline(!connected);
    });
    return () => unsub();
  }, []);

  // Fetch or refresh consignment details
  const fetchConsignment = useCallback(async () => {
    if (!consignmentId) {
      setError('Consignment ID missing');
      setIsLoading(false);
      return;
    }

    try {
      const res = await recyclingService.getConsignments();
      const found = (res.consignments || []).find((c: any) => c.id === consignmentId);
      if (found) {
        setConsignment(found);
      } else if (!consignment) {
        setError('Consignment not found');
      }
    } catch (err: any) {
      if (!consignment) {
        setError(err.message || 'Failed to load consignment details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [consignmentId, consignment]);

  useEffect(() => {
    if (!initialConsignment) {
      fetchConsignment();
    }
  }, [fetchConsignment, initialConsignment]);

  // Role Access Guard
  if (user && user.role !== 'RECYCLER' && user.role !== 'ADMIN') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="Consignment Details" onBack={() => navigation?.goBack()} />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            Only authorized formal recycling facilities can inspect or manage consignments.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle Accept Action
  const handleConfirmAccept = async () => {
    if (submittingRef.current || isProcessing) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Accepting a consignment requires an active internet connection to verify facility status and transition item ownership.'
      );
      return;
    }

    submittingRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      const updated = await recyclingService.acceptConsignment(consignment.id);
      setConsignment(updated);
      setShowAcceptModal(false);
      setActionSuccessMessage(
        'Consignment accepted successfully! A certified recycling record has been created with status RECEIVED.'
      );
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Mismatch',
          err.message || 'This consignment status has changed. Refreshing data...',
          [{ text: 'OK', onPress: () => fetchConsignment() }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to accept consignment');
      }
    } finally {
      setIsProcessing(false);
      submittingRef.current = false;
    }
  };

  // Handle Reject Action
  const handleConfirmReject = async () => {
    if (submittingRef.current || isProcessing) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Rejecting a consignment requires an active internet connection to notify the collector and update custody status.'
      );
      return;
    }

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setRejectionError('Rejection reason is required (1 to 500 characters)');
      return;
    }
    if (trimmedReason.length > 500) {
      setRejectionError('Rejection reason must not exceed 500 characters');
      return;
    }

    submittingRef.current = true;
    setIsProcessing(true);
    setRejectionError(null);

    try {
      const updated = await recyclingService.rejectConsignment(consignment.id, trimmedReason);
      setConsignment(updated);
      setShowRejectModal(false);
      setRejectionReason('');
      setActionSuccessMessage('Consignment has been rejected. The delivering collector has been notified.');
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Mismatch',
          err.message || 'This consignment status has changed. Refreshing data...',
          [{ text: 'OK', onPress: () => fetchConsignment() }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to reject consignment');
      }
    } finally {
      setIsProcessing(false);
      submittingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="Consignment Details" onBack={() => navigation?.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading consignment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !consignment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="Consignment Details" onBack={() => navigation?.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Consignment</Text>
          <Text style={styles.errorMessage}>{error || 'Consignment data not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchConsignment}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const items = consignment.consignmentItems?.map((ci: any) => ci.ewasteItem).filter(Boolean) || [];
  const itemCount = consignment.totalItems || items.length;
  const totalWeight = consignment.totalWeightKg
    ? `${parseFloat(consignment.totalWeightKg).toFixed(1)} kg`
    : 'Weight not calculated';

  const isDelivered = consignment.status === 'DELIVERED';
  const isAccepted = consignment.status === 'ACCEPTED';
  const isRejected = consignment.status === 'REJECTED';
  const isPendingDelivery = consignment.status === 'CREATED' || consignment.status === 'IN_TRANSIT';

  const collectorName = consignment.collector?.user?.name || 'Verified Collector';
  const collectorPhone = consignment.collector?.user?.phone || 'Contact via platform';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <TopAppBar
        title="Consignment Details"
        subtitle={`#CSG-${consignment.id.slice(0, 8).toUpperCase()}`}
        showBack
        onBack={() => navigation?.goBack()}
      />

      {isOffline && <OfflineBanner />}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Action Notification */}
        {actionSuccessMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>{actionSuccessMessage}</Text>
          </View>
        )}

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.sectionCaption}>Current Status</Text>
              <Text style={styles.consignmentRef}>
                #CSG-{consignment.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <StatusBadge status={consignment.status} />
          </View>

          {/* Timeline Dates */}
          <View style={styles.timelineRow}>
            {consignment.createdAt && (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Created</Text>
                <Text style={styles.timelineValue}>
                  {new Date(consignment.createdAt).toLocaleDateString()}
                </Text>
              </View>
            )}
            {consignment.deliveredAt && (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Delivered</Text>
                <Text style={styles.timelineValue}>
                  {new Date(consignment.deliveredAt).toLocaleDateString()}
                </Text>
              </View>
            )}
            {consignment.acceptedAt && (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Accepted</Text>
                <Text style={styles.timelineValue}>
                  {new Date(consignment.acceptedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
            {consignment.rejectedAt && (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Rejected</Text>
                <Text style={styles.timelineValue}>
                  {new Date(consignment.rejectedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Rejection Reason display if REJECTED */}
          {isRejected && consignment.rejectionReason && (
            <View style={styles.rejectionNoticeBox}>
              <Text style={styles.rejectionNoticeTitle}>Rejection Reason:</Text>
              <Text style={styles.rejectionNoticeText}>{consignment.rejectionReason}</Text>
            </View>
          )}

          {/* Acceptance confirmation info if ACCEPTED */}
          {isAccepted && consignment.recyclingRecord && (
            <View style={styles.acceptedNoticeBox}>
              <Text style={styles.acceptedNoticeTitle}>Certified Recycling Record Active</Text>
              <Text style={styles.acceptedNoticeText}>
                Status: {consignment.recyclingRecord.status || 'RECEIVED'} • Initialized for processing.
              </Text>
            </View>
          )}
        </View>

        {/* Delivering Collector Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivering Collector</Text>
          <View style={styles.collectorBox}>
            <Text style={styles.collectorAvatar}>🚚</Text>
            <View style={styles.collectorInfo}>
              <Text style={styles.collectorNameText}>{collectorName}</Text>
              <Text style={styles.collectorRoleText}>
                Local Informal Collector (Kabadiwala)
              </Text>
              <Text style={styles.collectorContactText}>Phone: {collectorPhone}</Text>
            </View>
          </View>
          <Text style={styles.chainNote}>
            Aggregated by local informal collector partner under the EcoSetu formalization framework.
          </Text>
        </View>

        {/* E-Waste Material Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consignment Material Summary</Text>
          <View style={styles.summaryStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{itemCount}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalWeight}</Text>
              <Text style={styles.statLabel}>Total Weight</Text>
            </View>
          </View>

          {/* Items breakdown */}
          <Text style={styles.subSectionTitle}>Included E-Waste Items ({items.length})</Text>
          {items.length > 0 ? (
            items.map((item: any, index: number) => {
              const itemWeight = item.actualWeightKg || item.estimatedWeightKg;
              return (
                <View key={item.id || index} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemCategory}>
                      {item.category?.replace(/_/g, ' ') || 'E-Waste Item'}
                    </Text>
                    <Text style={styles.itemCondition}>
                      Condition: {item.condition || 'USED'}
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemWeightText}>
                      {itemWeight ? `${parseFloat(itemWeight).toFixed(1)} kg` : 'Weight pending'}
                    </Text>
                    <StatusBadge status={item.status || 'COLLECTED'} />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyItemsText}>Item breakdown details not loaded.</Text>
          )}
        </View>

        {/* Delivery Notes */}
        {consignment.deliveryNotes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Collector Delivery Notes</Text>
            <Text style={styles.notesText}>{consignment.deliveryNotes}</Text>
          </View>
        ) : null}

        {/* Action Controls Section */}
        {!isAccepted && !isRejected && (
          <View style={styles.actionsContainer}>
            {isPendingDelivery && (
              <View style={styles.pendingDeliveryBanner}>
                <Text style={styles.pendingDeliveryIcon}>ℹ️</Text>
                <Text style={styles.pendingDeliveryText}>
                  This consignment is currently {consignment.status}. Acceptance becomes available once
                  the collector delivers the batch to your facility (status: DELIVERED).
                </Text>
              </View>
            )}

            {isDelivered && (
              <View style={styles.actionPromptBanner}>
                <Text style={styles.actionPromptIcon}>📋</Text>
                <Text style={styles.actionPromptText}>
                  Inspect physical items at facility handoff before accepting or rejecting.
                </Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              {/* Reject Button: Available for CREATED, IN_TRANSIT, DELIVERED */}
              <TouchableOpacity
                style={[
                  styles.rejectButton,
                  (isOffline || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={() => {
                  setRejectionReason('');
                  setRejectionError(null);
                  setShowRejectModal(true);
                }}
                disabled={isOffline || isProcessing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Reject Consignment"
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>

              {/* Accept Button: Available ONLY when DELIVERED */}
              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  (!isDelivered || isOffline || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={() => setShowAcceptModal(true)}
                disabled={!isDelivered || isOffline || isProcessing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Accept Consignment"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.acceptButtonText}>Accept Consignment</Text>
                )}
              </TouchableOpacity>
            </View>

            {isOffline && (
              <Text style={styles.offlineActionNotice}>
                ⚠️ Actions are disabled while offline. Internet connection required.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Accept Confirmation Modal */}
      <Modal
        visible={showAcceptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Consignment Acceptance</Text>
            <Text style={styles.modalBody}>
              By accepting this consignment, you confirm physical receipt of{' '}
              <Text style={styles.boldText}>{itemCount} e-waste items</Text> (approx.{' '}
              <Text style={styles.boldText}>{totalWeight}</Text>) from collector{' '}
              <Text style={styles.boldText}>{collectorName}</Text>.
            </Text>
            <View style={styles.modalBulletBox}>
              <Text style={styles.modalBullet}>
                • Consignment status updates to <Text style={styles.boldText}>ACCEPTED</Text>
              </Text>
              <Text style={styles.modalBullet}>
                • Linked items transition to <Text style={styles.boldText}>CONSIGNED</Text>
              </Text>
              <Text style={styles.modalBullet}>
                • A certified recycling record (<Text style={styles.boldText}>RECEIVED</Text>) is created
              </Text>
              <Text style={styles.modalBullet}>• Delivering collector will be notified</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAcceptModal(false)}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, isProcessing && styles.buttonDisabled]}
                onPress={handleConfirmAccept}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Acceptance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Consignment</Text>
            <Text style={styles.modalBody}>
              Please state the reason for rejecting this consignment. The delivering collector will
              be notified so they can address the issue or re-consign the materials.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Items show signs of hazardous chemical leakage or unauthorized battery damage..."
              placeholderTextColor={colors.textSecondary}
              value={rejectionReason}
              onChangeText={(text) => {
                setRejectionReason(text);
                if (rejectionError) setRejectionError(null);
              }}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <View style={styles.charCountRow}>
              {rejectionError ? (
                <Text style={styles.reasonErrorText}>{rejectionError}</Text>
              ) : (
                <View />
              )}
              <Text style={styles.charCountText}>{rejectionReason.length} / 500</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRejectModal(false)}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalRejectButton,
                  (isProcessing || !rejectionReason.trim()) && styles.buttonDisabled,
                ]}
                onPress={handleConfirmReject}
                disabled={isProcessing || !rejectionReason.trim()}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalRejectText}>Confirm Rejection</Text>
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
  scrollContent: {
    padding: spacing.spaceMd,
    gap: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
  },
  sectionCaption: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  consignmentRef: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  timelineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceMd,
    marginTop: spacing.spaceXs,
    paddingTop: spacing.spaceXs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  timelineItem: {
    minWidth: 80,
  },
  timelineLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timelineValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  rejectionNoticeBox: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginTop: spacing.spaceSm,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  rejectionNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  rejectionNoticeText: {
    fontSize: 13,
    color: '#B71C1C',
    marginTop: 2,
  },
  acceptedNoticeBox: {
    backgroundColor: '#E8F5E9',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginTop: spacing.spaceSm,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  acceptedNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  acceptedNoticeText: {
    fontSize: 13,
    color: '#1B5E20',
    marginTop: 2,
  },
  collectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: spacing.spaceSm,
    borderRadius: 8,
  },
  collectorAvatar: {
    fontSize: 28,
    marginRight: spacing.spaceSm,
  },
  collectorInfo: {
    flex: 1,
  },
  collectorNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  collectorRoleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  collectorContactText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chainNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.spaceXs,
    fontStyle: 'italic',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.divider,
    alignSelf: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spaceXs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemLeft: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  itemCondition: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemWeightText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyItemsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.spaceXs,
  },
  notesText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    backgroundColor: '#F5F5F5',
    padding: spacing.spaceSm,
    borderRadius: 8,
  },
  actionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.spaceSm,
  },
  pendingDeliveryBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: spacing.spaceSm,
    borderRadius: 8,
    alignItems: 'center',
  },
  pendingDeliveryIcon: {
    fontSize: 16,
    marginRight: spacing.spaceXs,
  },
  pendingDeliveryText: {
    fontSize: 12,
    color: '#0D47A1',
    flex: 1,
    lineHeight: 16,
  },
  actionPromptBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: spacing.spaceSm,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionPromptIcon: {
    fontSize: 16,
    marginRight: spacing.spaceXs,
  },
  actionPromptText: {
    fontSize: 12,
    color: '#E65100',
    flex: 1,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  offlineActionNotice: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 16,
    color: '#2E7D32',
    marginRight: spacing.spaceXs,
    fontWeight: '700',
  },
  successText: {
    fontSize: 13,
    color: '#1B5E20',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceXl,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.spaceSm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.spaceMd,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  accessRestrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceXl,
  },
  accessRestrictedIcon: {
    fontSize: 48,
    marginBottom: spacing.spaceMd,
  },
  accessRestrictedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  accessRestrictedMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.spaceLg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  modalBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.spaceSm,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBulletBox: {
    backgroundColor: '#F5F5F5',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceMd,
    gap: 4,
  },
  modalBullet: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  reasonInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.spaceSm,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: spacing.spaceXs,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: spacing.spaceMd,
  },
  reasonErrorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '500',
  },
  charCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalRejectButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  modalRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ConsignmentDetailScreen;
