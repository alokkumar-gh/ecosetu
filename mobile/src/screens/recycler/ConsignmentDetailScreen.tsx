/**
 * EcoSetu Recycler Consignment Detail Screen
 * Provides comprehensive inspection, delivery marking, acceptance, and processing workflow.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 9, docs/07_BUSINESS_WORKFLOWS.md Section 2.3
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { AuthorizedImage } from '../../components/common/AuthorizedImage';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { AppIcon } from '../../components/ui/AppIcon';

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
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);

  // Inputs
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [outputDescription, setOutputDescription] = useState<string>('');
  const [outputWeightKg, setOutputWeightKg] = useState<string>('');
  const [processingNotes, setProcessingNotes] = useState<string>('');
  const [completionError, setCompletionError] = useState<string | null>(null);

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
    fetchConsignment();
  }, [fetchConsignment]);

  // Role Access Guard
  if (user && user.role !== 'RECYCLER' && user.role !== 'ADMIN') {
    return (
      <GradientBackground>
        <TopAppBar title="Consignment Details" onBack={() => navigation?.goBack()} />
        <View style={styles.accessRestrictedContainer}>
          <View style={styles.accessRestrictedIconWrapper}>
            <AppIcon name="lock" size={40} color={colors.warning} />
          </View>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            Only authorized formal recycling facilities can inspect or manage consignments.
          </Text>
        </View>
      </GradientBackground>
    );
  }

  // Handle Mark Delivered Action (CREATED / IN_TRANSIT -> DELIVERED)
  const handleMarkDelivered = () => {
    if (submittingRef.current || isProcessing) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Marking a consignment as delivered requires an active internet connection.'
      );
      return;
    }

    Alert.alert(
      'Confirm Delivery Receipt',
      'Confirm that this consignment batch has physically arrived at your recycling facility?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivery',
          onPress: async () => {
            submittingRef.current = true;
            setIsProcessing(true);
            setError(null);

            try {
              const updated: any = await recyclingService.deliverConsignment(consignment.id);
              setConsignment((prev: any) => ({
                ...prev,
                ...updated,
                status: 'DELIVERED',
                deliveredAt: updated.deliveredAt || new Date().toISOString(),
              }));
              setActionSuccessMessage(
                'Consignment marked as DELIVERED! Batch is ready for physical inspection and acceptance.'
              );
            } catch (err: any) {
              if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
                Alert.alert(
                  'Status Conflict',
                  err.message || 'This consignment status was updated. Refreshing data...',
                  [{ text: 'OK', onPress: () => fetchConsignment() }]
                );
              } else {
                Alert.alert('Error', err.message || 'Failed to mark consignment as delivered.');
              }
            } finally {
              setIsProcessing(false);
              submittingRef.current = false;
            }
          },
        },
      ]
    );
  };

  // Handle Accept Action (DELIVERED -> ACCEPTED)
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
      const updated: any = await recyclingService.acceptConsignment(consignment.id);
      setConsignment((prev: any) => ({
        ...prev,
        ...updated,
        status: 'ACCEPTED',
        acceptedAt: updated.acceptedAt || new Date().toISOString(),
        recyclingRecord: updated.recyclingRecord || {
          id: updated.recyclingRecordId,
          status: 'RECEIVED',
          receivedAt: new Date().toISOString(),
        },
      }));
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

  // Handle Reject Action (DELIVERED -> REJECTED)
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
      const updated: any = await recyclingService.rejectConsignment(consignment.id, trimmedReason);
      setConsignment((prev: any) => ({
        ...prev,
        ...updated,
        status: 'REJECTED',
        rejectedAt: updated.rejectedAt || new Date().toISOString(),
        rejectionReason: trimmedReason,
      }));
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

  // Handle Start Inspection / Processing (ACCEPTED / RECEIVED -> PROCESSING)
  const handleStartInspection = () => {
    const recordId = consignment?.recyclingRecord?.id;
    if (!recordId) {
      // If recyclingRecord id is not attached, re-fetch records to find it
      fetchConsignment();
      Alert.alert('Loading', 'Updating record details from server...');
      return;
    }

    if (submittingRef.current || isProcessing) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Starting material inspection requires an active internet connection.'
      );
      return;
    }

    Alert.alert(
      'Start Inspection & Processing',
      'Begin physical material dismantling and processing for this batch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Inspection',
          onPress: async () => {
            submittingRef.current = true;
            setIsProcessing(true);

            try {
              const updatedRecord: any = await recyclingService.startProcessing(recordId);
              setConsignment((prev: any) => ({
                ...prev,
                recyclingRecord: {
                  ...(prev?.recyclingRecord || {}),
                  ...updatedRecord,
                  status: 'PROCESSING',
                  startedAt: updatedRecord.startedAt || new Date().toISOString(),
                },
              }));
              setActionSuccessMessage(
                'Material processing started! Status transitioned to PROCESSING.'
              );
            } catch (err: any) {
              if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
                Alert.alert(
                  'Status Conflict',
                  err.message || 'Processing record status changed. Refreshing...',
                  [{ text: 'OK', onPress: () => fetchConsignment() }]
                );
              } else {
                Alert.alert('Error', err.message || 'Failed to start inspection/processing.');
              }
            } finally {
              setIsProcessing(false);
              submittingRef.current = false;
            }
          },
        },
      ]
    );
  };

  // Handle Complete Recycling (PROCESSING -> COMPLETED)
  const handleConfirmComplete = async () => {
    const recordId = consignment?.recyclingRecord?.id;
    if (!recordId) {
      Alert.alert('Error', 'Recycling record ID is missing.');
      return;
    }

    if (submittingRef.current || isProcessing) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Completing recycling requires an active internet connection.'
      );
      return;
    }

    const weightNum = outputWeightKg.trim() ? parseFloat(outputWeightKg.trim()) : null;
    if (weightNum !== null && (isNaN(weightNum) || weightNum < 0)) {
      setCompletionError('Output weight must be a valid non-negative number (>= 0 kg).');
      return;
    }

    submittingRef.current = true;
    setIsProcessing(true);
    setCompletionError(null);

    const payload: any = {};
    if (processingNotes.trim()) payload.processingNotes = processingNotes.trim();
    if (outputDescription.trim()) payload.outputDescription = outputDescription.trim();
    if (weightNum !== null) payload.outputWeightKg = weightNum;

    try {
      const updatedRecord: any = await recyclingService.completeRecycling(recordId, payload);
      setConsignment((prev: any) => ({
        ...prev,
        recyclingRecord: {
          ...(prev?.recyclingRecord || {}),
          ...updatedRecord,
          status: 'COMPLETED',
          completedAt: updatedRecord.completedAt || new Date().toISOString(),
          certificateId: updatedRecord.certificateId,
        },
      }));
      setShowCompleteModal(false);
      setOutputDescription('');
      setOutputWeightKg('');
      setProcessingNotes('');
      setActionSuccessMessage(
        'Recycling completed! Certified recycling certificate generated. Linked items marked RECYCLED.'
      );
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Conflict',
          err.message || 'Recycling record status changed. Refreshing...',
          [{ text: 'OK', onPress: () => fetchConsignment() }]
        );
      } else {
        setCompletionError(err.message || 'Failed to complete recycling.');
      }
    } finally {
      setIsProcessing(false);
      submittingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <TopAppBar title="Consignment Details" onBack={() => navigation?.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading consignment details...</Text>
        </View>
      </GradientBackground>
    );
  }

  if (error || !consignment) {
    return (
      <GradientBackground>
        <TopAppBar title="Consignment Details" onBack={() => navigation?.goBack()} />
        <View style={styles.errorContainer}>
          <AppIcon name="alertTriangle" size={40} color={colors.error} style={{ marginBottom: 12 }} />
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
      </GradientBackground>
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

  const recyclingRec = consignment.recyclingRecord;
  const isRecyclingReceived = isAccepted && (!recyclingRec || recyclingRec.status === 'RECEIVED');
  const isRecyclingProcessing = isAccepted && recyclingRec?.status === 'PROCESSING';
  const isRecyclingCompleted = isAccepted && recyclingRec?.status === 'COMPLETED';

  const collectorName = consignment.collector?.user?.name || 'Verified Collector';
  const collectorPhone = consignment.collector?.user?.phone || 'Contact via platform';

  return (
    <GradientBackground>
      <TopAppBar
        title="Consignment Details"
        subtitle={`#CSG-${consignment.id.slice(0, 8).toUpperCase()}`}
        showBack
        onBack={() => navigation?.goBack()}
      />

      {isOffline && <OfflineBanner />}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Action Notification */}
        {actionSuccessMessage && (
          <View style={styles.successBanner}>
            <AppIcon name="check" size={14} color="#059669" strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.successText}>{actionSuccessMessage}</Text>
          </View>
        )}

        {/* Status Card */}
        <GlassCard style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.sectionCaption}>Current Consignment Status</Text>
              <Text style={styles.consignmentRef}>
                #CSG-{consignment.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.spaceSm }}>
              <StatusBadge status={consignment.status} />
              <ReadAloudButton
                text={`Consignment ${consignment.id.slice(0, 8)}. Status is ${consignment.status.replace(/_/g, ' ')}. Total items: ${itemCount}, total weight: ${totalWeight}.`}
                size="small"
              />
            </View>
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

          {/* Certified Recycling Record Status Box */}
          {isAccepted && (
            <View style={styles.acceptedNoticeBox}>
              <View style={styles.recyclingStatusRow}>
                <Text style={styles.acceptedNoticeTitle}>Certified Recycling Lifecycle</Text>
                <StatusBadge status={recyclingRec?.status || 'RECEIVED'} />
              </View>
              <Text style={styles.acceptedNoticeText}>
                {recyclingRec?.status === 'COMPLETED'
                  ? `Processing Complete • Certificate: ${recyclingRec.certificateId || 'CERT-' + consignment.id.slice(0, 8).toUpperCase()}`
                  : recyclingRec?.status === 'PROCESSING'
                  ? 'Material dismantling and sorting currently in progress at facility.'
                  : 'Consignment received and logged into formal custody chain.'}
              </Text>

              {recyclingRec?.id && (
                <TouchableOpacity
                  style={styles.viewRecordBtn}
                  onPress={() =>
                    navigation?.navigate?.('RecyclingRecordDetail', {
                      recordId: recyclingRec.id,
                      record: recyclingRec,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.rowCentered}>
                    <AppIcon name="fileText" size={13} color={colors.primaryDark} />
                    <Text style={styles.viewRecordBtnText}>View Full Processing Record →</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </GlassCard>

        {/* Operational Workflow CTAs */}
        <GlassCard style={styles.ctaCard}>
          <Text style={styles.cardTitle}>Operational Action</Text>

          {/* State 1: CREATED or IN_TRANSIT -> Mark Delivered */}
          {isPendingDelivery && (
            <View style={styles.actionStateBox}>
              <View style={styles.pendingDeliveryBanner}>
                <AppIcon name="truck" size={18} color="#34D399" style={{ marginRight: spacing.spaceSm }} />
                <Text style={styles.pendingDeliveryText}>
                  Consignment is currently {consignment.status}. Once the collector delivers the batch to your facility, confirm delivery below.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (isOffline || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={handleMarkDelivered}
                disabled={isOffline || isProcessing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Mark Delivered"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <AppIcon name="package" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Mark Delivered / Arrived at Facility</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* State 2: DELIVERED -> Accept or Reject */}
          {isDelivered && (
            <View style={styles.actionStateBox}>
              <View style={styles.actionPromptBanner}>
                <AppIcon name="clipboard" size={18} color="#34D399" style={{ marginRight: spacing.spaceSm }} />
                <Text style={styles.actionPromptText}>
                  Batch delivered to your facility. Inspect physical items before accepting custody.
                </Text>
              </View>
              <View style={styles.buttonRow}>
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

                <TouchableOpacity
                  style={[
                    styles.acceptButton,
                    (isOffline || isProcessing) && styles.buttonDisabled,
                  ]}
                  onPress={() => setShowAcceptModal(true)}
                  disabled={isOffline || isProcessing}
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
            </View>
          )}

          {/* State 3: ACCEPTED & Recycling RECEIVED -> Start Inspection */}
          {isRecyclingReceived && (
            <View style={styles.actionStateBox}>
              <View style={styles.processingBanner}>
                <AppIcon name="search" size={18} color="#60A5FA" style={{ marginRight: spacing.spaceSm }} />
                <Text style={styles.processingBannerText}>
                  Batch accepted into facility custody. Start material dismantling and inspection.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (isOffline || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={handleStartInspection}
                disabled={isOffline || isProcessing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Start Inspection"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <AppIcon name="settings" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Start Inspection / Processing</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* State 4: Recycling PROCESSING -> Complete Recycling */}
          {isRecyclingProcessing && (
            <View style={styles.actionStateBox}>
              <View style={styles.processingBanner}>
                <AppIcon name="recycle" size={18} color="#34D399" style={{ marginRight: spacing.spaceSm }} />
                <Text style={styles.processingBannerText}>
                  Materials are in active processing. Record output yields to complete formal recycling.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.completeActionButton,
                  (isOffline || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={() => {
                  setCompletionError(null);
                  setShowCompleteModal(true);
                }}
                disabled={isOffline || isProcessing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Complete Recycling"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <AppIcon name="check" size={16} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.primaryActionText}>Complete Recycling & Generate Certificate</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* State 5: Recycling COMPLETED */}
          {isRecyclingCompleted && (
            <View style={styles.completedNoticeBox}>
              <AppIcon name="award" size={36} color="#FBBF24" style={{ marginBottom: 6 }} />
              <Text style={styles.completedBadgeTitle}>Certified Formal Recycling Complete</Text>
              <Text style={styles.completedBadgeSub}>
                Materials successfully recycled under CPCB compliance guidelines. All custody records are immutably sealed.
              </Text>
            </View>
          )}

          {/* State 6: REJECTED */}
          {isRejected && (
            <View style={styles.rejectedNoticeBox}>
              <Text style={styles.rejectionNoticeTitle}>Consignment Rejected</Text>
              <Text style={styles.rejectionNoticeText}>
                This batch was rejected. No further facility processing is permitted.
              </Text>
            </View>
          )}

          {isOffline && (
            <View style={styles.offlineNoticeRow}>
              <AppIcon name="alertTriangle" size={14} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={styles.offlineActionNotice}>
                Actions are disabled while offline. Internet connection required.
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Delivering Collector Info */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Delivering Collector</Text>
          <View style={styles.collectorBox}>
            <AppIcon name="truck" size={24} color={colors.primary} style={{ marginRight: spacing.spaceSm }} />
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
        </GlassCard>

        {/* E-Waste Material Summary */}
        <GlassCard style={styles.card}>
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
                  {item.imageUrl ? (
                    <AuthorizedImage
                      uri={item.imageUrl}
                      style={{ width: 44, height: 44, borderRadius: 6, marginRight: spacing.spaceSm }}
                      allowFullscreen
                    />
                  ) : null}
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
        </GlassCard>

        {/* Delivery Notes */}
        {consignment.deliveryNotes ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Collector Delivery Notes</Text>
            <Text style={styles.notesText}>{consignment.deliveryNotes}</Text>
          </GlassCard>
        ) : null}

        <View style={{ height: spacing.spaceXl }} />
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

      {/* Complete Recycling Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Complete Formal Recycling</Text>
            <Text style={styles.modalBody}>
              Confirm completion of dismantling, recovery, and compliant material sorting.
            </Text>

            <Text style={styles.inputLabel}>Recovered Output Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Shredded copper, PCB precious metals, plastic granules"
              placeholderTextColor={colors.textSecondary}
              value={outputDescription}
              onChangeText={setOutputDescription}
              maxLength={500}
            />

            <Text style={styles.inputLabel}>Output Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 4.5"
              placeholderTextColor={colors.textSecondary}
              value={outputWeightKg}
              onChangeText={setOutputWeightKg}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Processing Notes (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="Compliance observations or facility notes..."
              placeholderTextColor={colors.textSecondary}
              value={processingNotes}
              onChangeText={setProcessingNotes}
              multiline
              numberOfLines={3}
              maxLength={1000}
            />

            {completionError && (
              <Text style={styles.completionErrorText}>{completionError}</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCompleteModal(false)}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCompleteButton, isProcessing && styles.buttonDisabled]}
                onPress={handleConfirmComplete}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Issue Certificate</Text>
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
  scrollContent: {
    padding: spacing.spaceMd,
    gap: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 30,
  },
  card: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  ctaCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
    letterSpacing: -0.2,
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
    fontWeight: '600',
  },
  consignmentRef: {
    fontSize: 18,
    fontWeight: '800',
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
    borderTopColor: colors.glassBorder,
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
    fontWeight: '700',
    marginTop: 2,
  },
  rejectionNoticeBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
    color: colors.error,
    marginTop: 2,
  },
  acceptedNoticeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginTop: spacing.spaceSm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  recyclingStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  acceptedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  acceptedNoticeText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
    lineHeight: 16,
  },
  viewRecordBtn: {
    marginTop: spacing.spaceSm,
    paddingVertical: 4,
  },
  viewRecordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  actionStateBox: {
    gap: spacing.spaceSm,
  },
  pendingDeliveryBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  pendingDeliveryIcon: {
    fontSize: 18,
    marginRight: spacing.spaceXs,
  },
  pendingDeliveryText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  actionPromptBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  actionPromptIcon: {
    fontSize: 18,
    marginRight: spacing.spaceXs,
  },
  actionPromptText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  processingBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  processingBannerIcon: {
    fontSize: 18,
    marginRight: spacing.spaceXs,
  },
  processingBannerText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  completedNoticeBox: {
    alignItems: 'center',
    padding: spacing.spaceMd,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedBadgeIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  completedBadgeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  completedBadgeSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  rejectedNoticeBox: {
    padding: spacing.spaceSm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 12,
    borderRadius: 10,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    elevation: 2,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    elevation: 2,
  },
  completeActionButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    elevation: 2,
  },
  primaryActionText: {
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
    marginTop: 4,
  },
  collectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    padding: spacing.spaceSm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
    backgroundColor: colors.glassBorder,
    alignSelf: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spaceXs,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
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
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  successBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  successIcon: {
    fontSize: 16,
    color: colors.primary,
    marginRight: spacing.spaceXs,
    fontWeight: '700',
  },
  successText: {
    fontSize: 13,
    color: colors.primaryDark,
    flex: 1,
    fontWeight: '600',
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
    backgroundColor: 'rgba(15, 41, 66, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalBox: {
    backgroundColor: colors.glassSurface,
    borderRadius: 18,
    padding: spacing.spaceLg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
    letterSpacing: -0.2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.spaceMd,
    gap: 4,
  },
  modalBullet: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.spaceXs,
    marginBottom: 2,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.spaceSm,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  reasonInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
  completionErrorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.spaceXs,
  },
  charCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceSm,
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
  modalCompleteButton: {
    backgroundColor: '#059669',
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
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  accessRestrictedIconWrapper: {
    marginBottom: spacing.spaceMd,
  },
});

export default ConsignmentDetailScreen;
