/**
 * EcoSetu Recycler Recycling Records Screen
 * Lists recycling processing records belonging to the authenticated formal recycler.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 10, docs/07_BUSINESS_WORKFLOWS.md Section 3.2
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
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
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const FILTER_STATUSES = [
  { key: 'ALL', label: 'All' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPLETED', label: 'Completed' },
];

interface Props {
  navigation?: any;
  route?: any;
}

export const RecyclerRecordsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [records, setRecords] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!networkService.isConnected());
  const [fromCache, setFromCache] = useState<boolean>(false);

  // Quick Action States
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Completion Form Inputs
  const [processingNotes, setProcessingNotes] = useState<string>('');
  const [outputDescription, setOutputDescription] = useState<string>('');
  const [outputWeightKg, setOutputWeightKg] = useState<string>('');
  const [completionError, setCompletionError] = useState<string | null>(null);

  const refreshingRef = useRef<boolean>(false);
  const submittingRef = useRef<boolean>(false);

  // Connectivity listener
  useEffect(() => {
    const unsub = networkService.addListener((connected: boolean) => {
      setIsOffline(!connected);
    });
    return () => unsub();
  }, []);

  const loadRecords = useCallback(
    async (isRefresh = false) => {
      if (refreshingRef.current && isRefresh) return;
      if (isRefresh) {
        refreshingRef.current = true;
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: any = { limit: 50 };
        if (selectedStatus !== 'ALL') {
          params.status = selectedStatus;
        }

        const res = await recyclingService.getRecyclingRecords(params);
        setRecords(res.records || []);
        setFromCache(Boolean(res.fromCache));
      } catch (err: any) {
        setError(err.message || 'Failed to load recycling records');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        refreshingRef.current = false;
      }
    },
    [selectedStatus]
  );

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Focus listener for freshness when returning from Detail screen
  useEffect(() => {
    const unsubFocus = navigation?.addListener?.('focus', () => {
      loadRecords(false);
    });
    return () => unsubFocus && unsubFocus();
  }, [navigation, loadRecords]);

  // Quick Start Processing
  const handleConfirmStart = async () => {
    if (!selectedRecord || submittingRef.current || isSubmittingAction) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Starting material processing requires an active internet connection to update the server audit chain.'
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmittingAction(true);

    try {
      const updated: any = await recyclingService.startProcessing(selectedRecord.id);
      setShowStartModal(false);
      setSelectedRecord(null);
      // Update locally
      setRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      Alert.alert(
        'Processing Started',
        `Recycling batch #${updated.id.slice(0, 8).toUpperCase()} is now in PROCESSING status.`
      );
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Conflict',
          err.message || 'This record status has changed. Refreshing data...',
          [{ text: 'OK', onPress: () => loadRecords(true) }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to start processing');
      }
    } finally {
      setIsSubmittingAction(false);
      submittingRef.current = false;
    }
  };

  // Quick Complete Recycling
  const handleConfirmComplete = async () => {
    if (!selectedRecord || submittingRef.current || isSubmittingAction) return;
    if (isOffline) {
      Alert.alert(
        'Offline',
        'Completing recycling requires an active internet connection to transition item lifecycle and notify citizens.'
      );
      return;
    }

    // Validate inputs
    const weightNum = outputWeightKg.trim() ? parseFloat(outputWeightKg.trim()) : null;
    if (weightNum !== null && (isNaN(weightNum) || weightNum < 0)) {
      setCompletionError('Output weight must be a valid non-negative number (>= 0 kg).');
      return;
    }
    if (processingNotes.trim().length > 1000) {
      setCompletionError('Processing notes cannot exceed 1000 characters.');
      return;
    }
    if (outputDescription.trim().length > 500) {
      setCompletionError('Output description cannot exceed 500 characters.');
      return;
    }

    submittingRef.current = true;
    setIsSubmittingAction(true);
    setCompletionError(null);

    try {
      const payload: any = {};
      if (processingNotes.trim()) payload.processingNotes = processingNotes.trim();
      if (outputDescription.trim()) payload.outputDescription = outputDescription.trim();
      if (weightNum !== null) payload.outputWeightKg = weightNum;

      const updated: any = await recyclingService.completeRecycling(selectedRecord.id, payload);
      setShowCompleteModal(false);
      setSelectedRecord(null);
      setProcessingNotes('');
      setOutputDescription('');
      setOutputWeightKg('');

      // Update locally
      setRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      Alert.alert(
        'Recycling Completed',
        `Recycling record #${updated.id.slice(0, 8).toUpperCase()} is now COMPLETED. Linked e-waste items have transitioned to RECYCLED and citizen owners have been notified.`
      );
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.status === 400) {
        Alert.alert(
          'Status Conflict',
          err.message || 'This record status has changed. Refreshing data...',
          [{ text: 'OK', onPress: () => loadRecords(true) }]
        );
      } else {
        setCompletionError(err.message || 'Failed to complete recycling.');
      }
    } finally {
      setIsSubmittingAction(false);
      submittingRef.current = false;
    }
  };

  // Role Access Guard
  if (user && user.role !== 'RECYCLER' && user.role !== 'ADMIN') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="Recycling Records" />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            Only authorized formal recycling facilities can inspect or process recycling records.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Summary counts
  const totalCount = records.length;
  const receivedCount = records.filter((r) => r.status === 'RECEIVED').length;
  const processingCount = records.filter((r) => r.status === 'PROCESSING').length;
  const completedCount = records.filter((r) => r.status === 'COMPLETED').length;

  const renderRecordItem = ({ item }: { item: any }) => {
    const itemsCount = item.consignment?.consignmentItems?.length || 0;
    const categories = item.consignment?.consignmentItems
      ?.map((ci: any) => ci.ewasteItem?.category)
      .filter(Boolean) || [];
    const uniqueCats = [...new Set(categories)].join(', ');

    const receivedDate = item.receivedAt
      ? new Date(item.receivedAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    const completedDate = item.completedAt
      ? new Date(item.completedAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation?.navigate?.('RecyclingRecordDetail', {
            recordId: item.id,
            record: item,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.refContainer}>
            <Text style={styles.recordRef}>#REC-{item.id.slice(0, 8).toUpperCase()}</Text>
            {item.consignment?.id && (
              <Text style={styles.consignmentRef}>
                from #CSG-{item.consignment.id.slice(0, 8).toUpperCase()}
              </Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Received:</Text>
            <Text style={styles.detailValue}>{receivedDate || 'N/A'}</Text>
          </View>

          {item.completedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>{completedDate}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Batch Items:</Text>
            <Text style={styles.detailValue}>
              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
              {uniqueCats ? ` • ${uniqueCats}` : ''}
            </Text>
          </View>

          {item.consignment?.totalWeightKg !== undefined && item.consignment?.totalWeightKg !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Batch Weight:</Text>
              <Text style={styles.detailValue}>{item.consignment.totalWeightKg} kg</Text>
            </View>
          )}

          {item.outputWeightKg !== null && item.outputWeightKg !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Output Yield:</Text>
              <Text style={[styles.detailValue, styles.highlightValue]}>
                {item.outputWeightKg} kg
              </Text>
            </View>
          )}

          {item.outputDescription && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Yield Description:</Text>
              <Text style={styles.notesText} numberOfLines={2}>
                {item.outputDescription}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Lifecycle Action Buttons */}
        <View style={styles.cardFooter}>
          {item.status === 'RECEIVED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startBtn, isOffline && styles.btnDisabled]}
              disabled={isOffline}
              onPress={() => {
                setSelectedRecord(item);
                setShowStartModal(true);
              }}
            >
              <Text style={styles.actionBtnText}>Start Processing ⚙️</Text>
            </TouchableOpacity>
          )}

          {item.status === 'PROCESSING' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeBtn, isOffline && styles.btnDisabled]}
              disabled={isOffline}
              onPress={() => {
                setSelectedRecord(item);
                setShowCompleteModal(true);
                setCompletionError(null);
              }}
            >
              <Text style={styles.actionBtnText}>Complete Recycling ✅</Text>
            </TouchableOpacity>
          )}

          {item.status === 'COMPLETED' && (
            <View style={styles.completedTag}>
              <Text style={styles.completedTagText}>✓ Formally Recycled</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.detailLink}
            onPress={() =>
              navigation?.navigate?.('RecyclingRecordDetail', {
                recordId: item.id,
                record: item,
              })
            }
          >
            <Text style={styles.detailLinkText}>View Details →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <TopAppBar title="Recycling Records" />

      {isOffline && <OfflineBanner />}

      {/* Summary Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{totalCount}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#6A1B9A' }]}>{receivedCount}</Text>
          <Text style={styles.metricLabel}>Received</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#E65100' }]}>{processingCount}</Text>
          <Text style={styles.metricLabel}>In Process</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{completedCount}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTER_STATUSES.map((tab) => {
            const isSelected = selectedStatus === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedStatus(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading recycling records...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Records</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRecords(false)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadRecords(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title="No Recycling Records Found"
              message={
                selectedStatus === 'ALL'
                  ? 'Recycling records are created automatically when you accept incoming consignments from verified informal collectors.'
                  : `No recycling records currently in status '${selectedStatus}'.`
              }
              actionLabel="Refresh Records"
              onAction={() => loadRecords(true)}
            />
          }
        />
      )}

      {/* Quick Start Processing Confirmation Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmittingAction && setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start Material Processing</Text>
            <Text style={styles.modalSubtitle}>
              Batch #REC-{selectedRecord?.id?.slice(0, 8).toUpperCase()}
            </Text>

            <Text style={styles.modalBodyText}>
              Are you sure you want to begin dismantling and processing this consignment batch?
            </Text>
            <View style={styles.modalWarningBox}>
              <Text style={styles.modalWarningText}>
                ⚠️ This action transitions the server record to PROCESSING and records an authoritative audit entry.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelBtn]}
                disabled={isSubmittingAction}
                onPress={() => setShowStartModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmBtn,
                  isSubmittingAction && styles.btnDisabled,
                ]}
                disabled={isSubmittingAction}
                onPress={handleConfirmStart}
              >
                {isSubmittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm & Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Complete Recycling Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isSubmittingAction && setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Recycling Batch</Text>
            <Text style={styles.modalSubtitle}>
              Batch #REC-{selectedRecord?.id?.slice(0, 8).toUpperCase()}
            </Text>

            {completionError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{completionError}</Text>
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

            <Text style={styles.inputLabel}>Recovered Output Description (Optional):</Text>
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
              placeholder="e.g. Batteries dismantled, plastics pelletized"
              placeholderTextColor="#9E9E9E"
              multiline
              numberOfLines={3}
              maxLength={1000}
              value={processingNotes}
              onChangeText={setProcessingNotes}
            />

            <View style={styles.modalWarningBox}>
              <Text style={styles.modalWarningText}>
                ⚠️ Completing recycling will atomically mark all linked e-waste items as RECYCLED and send a formal completion notification to the citizen owners.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelBtn]}
                disabled={isSubmittingAction}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCompleteConfirmBtn,
                  isSubmittingAction && styles.btnDisabled,
                ]}
                disabled={isSubmittingAction}
                onPress={handleConfirmComplete}
              >
                {isSubmittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm & Complete</Text>
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
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    justifyContent: 'space-between',
  },
  metricCard: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  filterSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.spaceXs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterBar: {
    paddingHorizontal: spacing.spaceMd,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  refContainer: {
    flex: 1,
  },
  recordRef: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  consignmentRef: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardBody: {
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  highlightValue: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  notesContainer: {
    marginTop: 6,
    backgroundColor: '#FAFAFA',
    padding: 8,
    borderRadius: 6,
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startBtn: {
    backgroundColor: '#E65100',
  },
  completeBtn: {
    backgroundColor: '#2E7D32',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  completedTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  detailLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
  modalButton: {
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
  modalConfirmBtn: {
    backgroundColor: '#E65100',
  },
  modalCompleteConfirmBtn: {
    backgroundColor: '#2E7D32',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default RecyclerRecordsScreen;
