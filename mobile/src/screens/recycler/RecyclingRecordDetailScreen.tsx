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
      <GradientBackground>
        <TopAppBar title="Recycling Details" onBack={() => navigation?.goBack()} />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            Only authorized formal recycling facilities can inspect or manage recycling records.
          </Text>
        </View>
      </GradientBackground>
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
        Alert.alert('Error', err.message || 'Failed to start material processing.');
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
        'Completing recycling requires an active internet connection.'
      );
      return;
    }

    const weightNum = outputWeightKg.trim() ? parseFloat(outputWeightKg.trim()) : null;
    if (weightNum !== null && (isNaN(weightNum) || weightNum < 0)) {
      setCompleteFormError('Output weight must be a valid non-negative number (>= 0 kg).');
      return;
    }

    submittingRef.current = true;
    setIsProcessingAction(true);
    setCompleteFormError(null);

    const payload: any = {};
    if (processingNotes.trim()) payload.processingNotes = processingNotes.trim();
    if (outputDescription.trim()) payload.outputDescription = outputDescription.trim();
    if (weightNum !== null) payload.outputWeightKg = weightNum;

    try {
      const updated = await recyclingService.completeRecycling(record.id, payload);
      setRecord((prev: any) => ({ ...prev, ...updated }));
      setShowCompleteModal(false);
      setActionSuccessMessage(
        'Recycling completed! Formal certificate issued and citizen owners notified.'
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

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'Not recorded';
    try {
      return new Date(isoStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  const status = record?.status || 'RECEIVED';
  const items = record?.consignment?.consignmentItems || [];

  return (
    <GradientBackground>
      <TopAppBar
        title="Recycling Processing"
        subtitle={record?.id ? `#REC-${record.id.slice(0, 8).toUpperCase()}` : ''}
        showBack
        onBack={() => navigation?.goBack()}
      />

      {isOffline && <OfflineBanner />}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading processing record...</Text>
        </View>
      ) : error || !record ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error || 'Record not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRecord}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {actionSuccessMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✓ {actionSuccessMessage}</Text>
            </View>
          )}

          {/* Header Card */}
          <GlassCard style={styles.card}>
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
          </GlassCard>

          {/* Action Card based on state */}
          <GlassCard style={[styles.card, styles.actionCard]}>
            <Text style={styles.sectionTitle}>Operational Action</Text>

            {status === 'RECEIVED' && (
              <View style={styles.actionStateBox}>
                <Text style={styles.actionPromptText}>
                  Batch is logged at facility. Begin inspection and material dismantling.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isOffline && styles.btnDisabled]}
                  disabled={isOffline}
                  onPress={() => setShowStartModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>Start Processing ⚙️</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'PROCESSING' && (
              <View style={styles.actionStateBox}>
                <Text style={styles.actionPromptText}>
                  Materials are in active sorting and dismantling. Complete batch to issue certificate.
                </Text>
                <TouchableOpacity
                  style={[styles.completeActionBtn, isOffline && styles.btnDisabled]}
                  disabled={isOffline}
                  onPress={() => {
                    setCompleteFormError(null);
                    setShowCompleteModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>Complete Recycling ✅</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'COMPLETED' && (
              <View style={styles.completedNoticeBox}>
                <Text style={styles.completedIcon}>🏅</Text>
                <Text style={styles.completedTitle}>Recycling Formally Certified</Text>
                <Text style={styles.completedSub}>
                  Certificate ID: {record.certificateId || 'CERT-' + record.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.completedDate}>
                  Completed on {formatDate(record.completedAt)}
                </Text>
              </View>
            )}
          </GlassCard>

          {/* Lifecycle Timestamps Card */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Lifecycle Audit Timestamps</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Received At:</Text>
              <Text style={styles.infoValue}>{formatDate(record.receivedAt)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Processing Started:</Text>
              <Text style={styles.infoValue}>{formatDate(record.processingStartedAt || record.startedAt)}</Text>
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
          </GlassCard>

          {/* Linked Consignment E-Waste Items Breakdown */}
          <GlassCard style={styles.card}>
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
          </GlassCard>

          {/* Output Yield & Verification (if processed/completed) */}
          {(record.outputWeightKg || record.outputDescription || record.processingNotes) && (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Material Yield & Recovery</Text>

              {record.outputWeightKg !== null && record.outputWeightKg !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Output Weight Recovered:</Text>
                  <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '800' }]}>
                    {record.outputWeightKg} kg
                  </Text>
                </View>
              )}

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
            </GlassCard>
          )}

          <View style={{ height: spacing.spaceXl }} />
        </ScrollView>
      )}

      {/* Start Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessingAction && setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start Material Processing</Text>
            <Text style={styles.modalBodyText}>
              Transition this consignment record into PROCESSING status? Materials will be marked
              as under active dismantling and recovery.
            </Text>
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

      {/* Complete Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isProcessingAction && setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Formal Recycling</Text>
            <Text style={styles.modalSubtitle}>
              Record recovered materials and issue verified recycling certificate.
            </Text>

            {completeFormError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{completeFormError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Recovered Output Description:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Copper wiring 1.2kg, PCB gold/silver recovery"
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={outputDescription}
              onChangeText={setOutputDescription}
              maxLength={500}
            />

            <Text style={styles.inputLabel}>Recovered Output Weight (kg):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 3.4"
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={outputWeightKg}
              onChangeText={setOutputWeightKg}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Processing Notes (Optional):</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 65, textAlignVertical: 'top' }]}
              placeholder="e.g. Compliant pyrometallurgical sorting completed"
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={processingNotes}
              onChangeText={setProcessingNotes}
              multiline
              numberOfLines={3}
              maxLength={1000}
            />

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
                  <Text style={styles.modalActionText}>Issue Certificate</Text>
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
  actionCard: {
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordIdText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
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
    borderTopColor: colors.glassBorder,
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
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
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
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  actionStateBox: {
    gap: spacing.spaceSm,
    marginTop: spacing.spaceXs,
  },
  actionPromptText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  completeActionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedNoticeBox: {
    alignItems: 'center',
    padding: spacing.spaceSm,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  completedIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  completedSub: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
  completedDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
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
    borderBottomColor: colors.glassBorder,
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
    borderTopColor: colors.glassBorder,
  },
  totalWeightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalWeightValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  notesBlock: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.spaceSm,
  },
  successBannerText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalContent: {
    backgroundColor: 'rgba(10, 36, 44, 0.95)',
    borderRadius: 18,
    padding: spacing.spaceLg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: spacing.spaceSm,
  },
  modalBodyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 18,
    marginVertical: spacing.spaceSm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceMd,
  },
  modalBtn: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'transparent',
  },
  modalCancelText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
    fontSize: 13,
  },
  modalStartBtn: {
    backgroundColor: colors.primary,
  },
  modalCompleteBtn: {
    backgroundColor: '#059669',
  },
  modalActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: spacing.spaceSm,
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 4,
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
});

export default RecyclingRecordDetailScreen;
