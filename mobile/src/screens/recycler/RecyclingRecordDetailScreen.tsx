/**
 * EcoSetu Recycler Recycling Record Detail Screen
 * Comprehensive operational view for formal recyclers to inspect a consignment's recycling record,
 * start material processing, and complete formal recycling.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 10, docs/07_BUSINESS_WORKFLOWS.md Section 3.2
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
      recordId?: string;
      record?: any;
    };
  };
}

export const RecyclingRecordDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const initialRecord = route?.params?.record;
  const recordId = route?.params?.recordId || initialRecord?.id;

  const [record, setRecord] = useState<any>(initialRecord || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialRecord);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!networkService.isConnected());

  // Action states
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);

  // Complete Form Fields
  const [outputDescription, setOutputDescription] = useState<string>('');
  const [outputWeightKg, setOutputWeightKg] = useState<string>('');
  const [processingNotes, setProcessingNotes] = useState<string>('');
  const [completeFormError, setCompleteFormError] = useState<string | null>(null);

  const submittingRef = useRef<boolean>(false);

  // Connectivity listener
  useEffect(() => {
    const unsub = networkService.addListener((connected: boolean) => {
      setIsOffline(!connected);
    });
    return () => unsub();
  }, []);

  // Fetch or refresh record
  const fetchRecord = useCallback(async () => {
    if (!recordId) {
      setError('Recycling record ID is missing.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await recyclingService.getRecyclingRecords({ limit: 50 });
      const found = (res.records || []).find((r: any) => r.id === recordId);
      if (found) {
        setRecord(found);
      } else if (!record) {
        setError('Recycling record not found.');
      }
    } catch (err: any) {
      if (!record) {
        setError(err.message || 'Failed to load recycling record details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [recordId, record]);

  useEffect(() => {
    if (!initialRecord) {
      fetchRecord();
    }
  }, [fetchRecord, initialRecord]);

  // Role Access Guard
  if (user && user.role !== 'RECYCLER' && user.role !== 'ADMIN') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="Recycling Details" onBack={() => navigation?.goBack()} />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            Only authorized formal recycling facilities can inspect or manage recycling records.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle Start Processing
  const handleConfirmStart = async () => {
    if (submittingRef.current || isProcessingAction) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Starting material processing requires an active internet connection to update the server audit chain.'
      );
      return;
    }

    submittingRef.current = true;
    setIsProcessingAction(true);
    setError(null);

    try {
      const updated = await recyclingService.startProcessing(record.id);
      setRecord((prev: any) => ({ ...prev, ...updated }));
      setShowStartModal(false);
      setActionSuccessMessage(
        'Processing started! Status transitioned to PROCESSING. Materials are now being dismantled and sorted.'
      );
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Mismatch',
          err.message || 'This record status has changed. Refreshing data...',
          [{ text: 'OK', onPress: () => fetchRecord() }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to start processing');
      }
    } finally {
      setIsProcessingAction(false);
      submittingRef.current = false;
    }
  };

  // Handle Complete Recycling
  const handleConfirmComplete = async () => {
    if (submittingRef.current || isProcessingAction) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Completing recycling requires an active internet connection to transition item lifecycle and notify citizens.'
      );
      return;
    }

    const weightNum = outputWeightKg.trim() ? parseFloat(outputWeightKg.trim()) : null;
    if (weightNum !== null && (isNaN(weightNum) || weightNum < 0)) {
      setCompleteFormError('Output weight must be a valid non-negative number (>= 0 kg).');
      return;
    }
    if (processingNotes.trim().length > 1000) {
      setCompleteFormError('Processing notes cannot exceed 1000 characters.');
      return;
    }
    if (outputDescription.trim().length > 500) {
      setCompleteFormError('Output description cannot exceed 500 characters.');
      return;
    }

    submittingRef.current = true;
    setIsProcessingAction(true);
    setCompleteFormError(null);

    try {
      const payload: any = {};
      if (processingNotes.trim()) payload.processingNotes = processingNotes.trim();
      if (outputDescription.trim()) payload.outputDescription = outputDescription.trim();
      if (weightNum !== null) payload.outputWeightKg = weightNum;

      const updated = await recyclingService.completeRecycling(record.id, payload);
      setRecord((prev: any) => ({ ...prev, ...updated }));
      setShowCompleteModal(false);
      setActionSuccessMessage(
        'Recycling completed successfully! All linked e-waste items have transitioned to RECYCLED and citizen owners have been notified.'
      );
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Mismatch',
          err.message || 'This record status has changed. Refreshing data...',
          [{ text: 'OK', onPress: () => fetchRecord() }]
        );
      } else {
        setCompleteFormError(err.message || 'Failed to complete recycling.');
      }
    } finally {
      setIsProcessingAction(false);
      submittingRef.current = false;
    }
  };

  const formatDate = (d: any) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const items = record?.consignment?.consignmentItems || [];
  const status = record?.status || 'RECEIVED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <TopAppBar
        title="Recycling Processing"
        onBack={() => navigation?.goBack()}
      />

      {isOffline && <OfflineBanner />}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading recycling record...</Text>
        </View>
      ) : error && !record ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRecord}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {actionSuccessMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✓ {actionSuccessMessage}</Text>
            </View>
          )}

          {/* Header Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordIdText}>
                  #REC-{record.id.slice(0, 8).toUpperCase()}
                </Text>
                {record.consignment?.id && (
                  <Text style={styles.consignmentSubtext}>
                    Consignment: #CSG-{record.consignment.id.slice(0, 8).toUpperCase()}
                  </Text>
                )}
              </View>
              <StatusBadge status={status} />
            </View>

            {/* Lifecycle Progress Stepper */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    status === 'RECEIVED' || status === 'PROCESSING' || status === 'COMPLETED'
                      ? styles.stepActive
                      : styles.stepInactive,
                  ]}
                >
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={styles.stepLabel}>Received</Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  status === 'PROCESSING' || status === 'COMPLETED'
                    ? styles.lineActive
                    : styles.lineInactive,
                ]}
              />

              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    status === 'PROCESSING' || status === 'COMPLETED'
                      ? styles.stepActive
                      : styles.stepInactive,
                  ]}
                >
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <Text style={styles.stepLabel}>Processing</Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  status === 'COMPLETED' ? styles.lineActive : styles.lineInactive,
                ]}
              />

              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    status === 'COMPLETED' ? styles.stepActive : styles.stepInactive,
                  ]}
                >
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <Text style={styles.stepLabel}>Completed</Text>
              </View>
            </View>
          </View>

          {/* Lifecycle Timestamps Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lifecycle Audit Timestamps</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Received At:</Text>
              <Text style={styles.infoValue}>{formatDate(record.receivedAt)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Processing Started:</Text>
              <Text style={styles.infoValue}>{formatDate(record.processingStartedAt)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed At:</Text>
              <Text style={styles.infoValue}>{formatDate(record.completedAt)}</Text>
            </View>

            {record.consignment?.collector?.user?.name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivered By:</Text>
                <Text style={styles.infoValue}>
                  {record.consignment.collector.user.name} (Informal Collector)
                </Text>
              </View>
            )}
          </View>

          {/* Linked Consignment E-Waste Items Breakdown */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Consignment Items ({items.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Items transition from CONSIGNED to RECYCLED upon completion.
            </Text>

            {items.length === 0 ? (
              <Text style={styles.emptyItemsText}>No items listed for this batch.</Text>
            ) : (
              items.map((ci: any, index: number) => {
                const it = ci.ewasteItem;
                return (
                  <View key={ci.id || index} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCategory}>{it?.category || 'E-Waste Item'}</Text>
                      <Text style={styles.itemSubtext}>
                        Weight: {it?.actualWeightKg ?? it?.estimatedWeightKg ?? '—'} kg
                      </Text>
                    </View>
                    <StatusBadge status={it?.status || (status === 'COMPLETED' ? 'RECYCLED' : 'CONSIGNED')} />
                  </View>
                );
              })
            )}

            {record.consignment?.totalWeightKg !== undefined && (
              <View style={styles.totalWeightBox}>
                <Text style={styles.totalWeightLabel}>Total Batch Weight:</Text>
                <Text style={styles.totalWeightValue}>
                  {record.consignment.totalWeightKg} kg
                </Text>
              </View>
            )}
          </View>

          {/* Completed Output Yield Information (Read-only if completed) */}
          {status === 'COMPLETED' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Certified Recovery Output</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Output Weight Yield:</Text>
                <Text style={[styles.infoValue, { color: '#2E7D32', fontWeight: '700' }]}>
                  {record.outputWeightKg !== null ? `${record.outputWeightKg} kg` : 'N/A'}
                </Text>
              </View>

              {record.outputDescription && (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesBlockLabel}>Recovered Materials:</Text>
                  <Text style={styles.notesBlockText}>{record.outputDescription}</Text>
                </View>
              )}

              {record.processingNotes && (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesBlockLabel}>Facility Processing Notes:</Text>
                  <Text style={styles.notesBlockText}>{record.processingNotes}</Text>
                </View>
              )}

              <View style={styles.completedBadgeBox}>
                <Text style={styles.completedBadgeText}>
                  ✓ E-waste successfully converted into certified recovery streams.
                </Text>
              </View>
            </View>
          )}

          {/* Action Card for RECEIVED status */}
          {status === 'RECEIVED' && (
            <View style={[styles.card, styles.actionCard]}>
              <Text style={styles.actionCardTitle}>Ready to Begin Processing?</Text>
              <Text style={styles.actionCardSubtitle}>
                Move this batch into active material dismantling, separation, and recovery.
              </Text>
              <TouchableOpacity
                style={[styles.primaryActionBtn, isOffline && styles.btnDisabled]}
                disabled={isOffline || isProcessingAction}
                onPress={() => setShowStartModal(true)}
              >
                {isProcessingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Start Processing ⚙️</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Action Card for PROCESSING status */}
          {status === 'PROCESSING' && (
            <View style={[styles.card, styles.actionCard, { borderColor: '#2E7D32' }]}>
              <Text style={[styles.actionCardTitle, { color: '#2E7D32' }]}>
                Materials in Active Processing
              </Text>
              <Text style={styles.actionCardSubtitle}>
                Record material recovery output and mark recycling as completed to issue certified disposal credit.
              </Text>
              <TouchableOpacity
                style={[styles.completeActionBtn, isOffline && styles.btnDisabled]}
                disabled={isOffline || isProcessingAction}
                onPress={() => {
                  setShowCompleteModal(true);
                  setCompleteFormError(null);
                }}
              >
                {isProcessingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Complete Recycling ✅</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Start Processing Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessingAction && setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Processing Initiation</Text>
            <Text style={styles.modalSubtitle}>
              Batch #REC-{record?.id?.slice(0, 8).toUpperCase()}
            </Text>

            <Text style={styles.modalBodyText}>
              Are you sure you want to begin dismantling and processing this consignment?
            </Text>

            <View style={styles.modalWarningBox}>
              <Text style={styles.modalWarningText}>
                ⚠️ This action records an immutable audit log entry (RECYCLING_STARTED) and updates the server processing timestamp.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                disabled={isProcessingAction}
                onPress={() => setShowStartModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalStartBtn,
                  isProcessingAction && styles.btnDisabled,
                ]}
                disabled={isProcessingAction}
                onPress={handleConfirmStart}
              >
                {isProcessingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalActionText}>Start Processing</Text>
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
        animationType="slide"
        onRequestClose={() => !isProcessingAction && setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Recycling Batch</Text>
            <Text style={styles.modalSubtitle}>
              Batch #REC-{record?.id?.slice(0, 8).toUpperCase()}
            </Text>

            {completeFormError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{completeFormError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Output Weight (Kg) (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2.45"
              placeholderTextColor="#9E9E9E"
              keyboardType="decimal-pad"
              value={outputWeightKg}
              onChangeText={setOutputWeightKg}
            />

            <Text style={styles.inputLabel}>Recovered Materials Output (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Copper 0.8kg, shredded plastics 1.5kg"
              placeholderTextColor="#9E9E9E"
              maxLength={500}
              value={outputDescription}
              onChangeText={setOutputDescription}
            />

            <Text style={styles.inputLabel}>Processing Notes (Optional):</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="e.g. Batteries dismantled, PCBs shredded, plastics pelletized"
              placeholderTextColor="#9E9E9E"
              multiline
              numberOfLines={3}
              maxLength={1000}
              value={processingNotes}
              onChangeText={setProcessingNotes}
            />

            <View style={styles.modalWarningBox}>
              <Text style={styles.modalWarningText}>
                ⚠️ Completing recycling will atomically mark all {items.length} e-waste items as RECYCLED, log RECYCLING_COMPLETED in the audit chain, and notify the original citizen owners.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                disabled={isProcessingAction}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalCompleteBtn,
                  isProcessingAction && styles.btnDisabled,
                ]}
                disabled={isProcessingAction}
                onPress={handleConfirmComplete}
              >
                {isProcessingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalActionText}>Confirm & Complete</Text>
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
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: spacing.spaceMd,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordIdText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  consignmentSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.spaceMd,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  lineActive: {
    backgroundColor: colors.primary,
  },
  lineInactive: {
    backgroundColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyItemsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalWeightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalWeightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalWeightValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  notesBlock: {
    marginTop: 8,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 6,
  },
  notesBlockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  notesBlockText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  completedBadgeBox: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
  },
  actionCard: {
    borderWidth: 1.5,
    borderColor: '#E65100',
    backgroundColor: '#FFFDE7',
    padding: spacing.spaceMd,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  primaryActionBtn: {
    backgroundColor: '#E65100',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeActionBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    padding: 10,
    borderRadius: 4,
    marginBottom: spacing.spaceMd,
  },
  successBannerText: {
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceXl,
  },
  loadingText: {
    marginTop: spacing.spaceSm,
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
    fontSize: 32,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    padding: spacing.spaceLg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.spaceLg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
    marginTop: 2,
  },
  modalBodyText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.spaceMd,
  },
  modalWarningBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
    padding: 10,
    borderRadius: 4,
    marginBottom: spacing.spaceMd,
  },
  modalWarningText: {
    fontSize: 12,
    color: '#BF360C',
    lineHeight: 17,
  },
  modalErrorBox: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
    padding: 10,
    borderRadius: 4,
    marginBottom: spacing.spaceMd,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#C62828',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.spaceMd,
    gap: 8,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F0F0F0',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalStartBtn: {
    backgroundColor: '#E65100',
  },
  modalCompleteBtn: {
    backgroundColor: '#2E7D32',
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default RecyclingRecordDetailScreen;
