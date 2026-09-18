/**
 * AdminVerificationsScreen
 * Authenticated ADMIN — Review and approve/reject collector and recycler verifications.
 *
 * Operational Scope:
 *   - List verification requests via GET /api/v1/admin/verifications
 *   - Filter by status: PENDING, APPROVED, REJECTED, ALL
 *   - Inspect applicant identity, role, credentials, and uploaded documents
 *   - Approve or reject verification via PATCH /api/v1/admin/verifications/:id
 *   - Pre-flight confirmation, duplicate protection, online-only validation, 409 conflict handling
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 14
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/07_BUSINESS_WORKFLOWS.md Sections 2.1, 3.1, 4.1
 *   docs/08_UI_UX_SPECIFICATION.md Section 4
 *   docs/21_TRACEABILITY_AND_AUDIT.md
 *   docs/23_NOTIFICATION_SYSTEM.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { useNetwork } from '../../hooks/useNetwork';
import { adminService } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

export const AdminVerificationsScreen: React.FC = () => {
  const { isConnected } = useNetwork();

  const [verifications, setVerifications] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');

  // Selected Verification Modal & Decision
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isSubmittingRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);

  const loadVerifications = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setError(null);
      try {
        const result = await adminService.getVerifications({
          status: selectedStatus,
          page: targetPage,
          limit: 20,
        });
        setVerifications(result.verifications || []);
        setPagination(result.pagination || null);
        setPage(targetPage);
        setFromCache(result.fromCache);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || 'Unable to load verification requests.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedStatus],
  );

  useEffect(() => {
    setIsLoading(true);
    loadVerifications(1, false);
  }, [loadVerifications]);

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadVerifications(1, true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadVerifications]);

  const handleOpenModal = (v: any) => {
    setSelectedVerification(v);
    setReviewNotes(v.reviewNotes || '');
    setModalError(null);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setSelectedVerification(null);
    setModalError(null);
  };

  const handleDecision = (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedVerification) return;

    if (!isConnected) {
      Alert.alert(
        'Internet Connection Required',
        'Verification decisions require real-time connection to the ECOSETU network.',
      );
      return;
    }

    if (selectedVerification.status !== 'PENDING') {
      Alert.alert('Decision Completed', `This request has already been ${selectedVerification.status}.`);
      return;
    }

    const title = decision === 'APPROVED' ? 'Approve Verification' : 'Reject Verification';
    const message =
      decision === 'APPROVED'
        ? `Are you sure you want to approve ${selectedVerification.user?.name || 'this applicant'}? Their account will become ACTIVE immediately.`
        : `Are you sure you want to reject ${selectedVerification.user?.name || 'this applicant'}? They will be notified of the decision and can resubmit.`;

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: decision === 'APPROVED' ? 'Approve' : 'Reject',
        style: decision === 'REJECTED' ? 'destructive' : 'default',
        onPress: () => executeDecision(decision),
      },
    ]);
  };

  const executeDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedVerification || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const updated: any = await adminService.updateVerification(
        selectedVerification.id,
        decision,
        reviewNotes,
      );

      // Reconcile list
      setVerifications((prev) =>
        prev.map((v) => (v.id === selectedVerification.id ? { ...v, ...updated } : v)),
      );

      Alert.alert(
        'Decision Recorded',
        `Verification has been ${decision === 'APPROVED' ? 'approved' : 'rejected'}. Target account notified.`,
        [{ text: 'OK', onPress: () => setSelectedVerification(null) }],
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to record verification decision.';

      if (status === 409) {
        setModalError('Status conflict: this verification has already been reviewed. Refreshing.');
        loadVerifications(page, true);
      } else if (status === 403) {
        setModalError('Forbidden: administrative permissions required.');
      } else {
        setModalError(msg);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderVerificationItem = ({ item }: { item: any }) => {
    const applicant = item.user || {};
    const isPending = item.status === 'PENDING';

    return (
      <TouchableOpacity
        style={[styles.card, isPending && styles.cardPending]}
        onPress={() => handleOpenModal(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Verification: ${applicant.name || 'Unnamed'}, Role: ${applicant.role}, Status: ${item.status}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{applicant.name || 'Unnamed Applicant'}</Text>
            <Text style={styles.userEmail}>{applicant.email}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.roleTag}>{applicant.role}</Text>
          {applicant.phone ? <Text style={styles.metaText}>📞 {applicant.phone}</Text> : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.submittedDate}>
            Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('en-IN') : '—'}
          </Text>
          {item.documentUrl ? (
            <Text style={styles.docAttachedTag}>📎 Document Attached</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Verification Queue"
        subtitle="Identity & Facility Environmental Compliance"
        showBack={false}
      />

      <OfflineBanner />

      {/* Status Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, selectedStatus === s && styles.filterChipActive]}
            onPress={() => setSelectedStatus(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedStatus === s }}
          >
            <Text
              style={[styles.filterChipText, selectedStatus === s && styles.filterChipTextActive]}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={95} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
          <Skeleton width="100%" height={95} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
          <Skeleton width="100%" height={95} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
        </View>
      ) : error && verifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Unable to Load Verifications"
            message={error}
            actionLabel="Retry"
            onAction={() => loadVerifications(1, false)}
          />
        </View>
      ) : (
        <FlatList
          data={verifications}
          keyExtractor={(item) => item.id}
          renderItem={renderVerificationItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Verifications"
              message={`No verification requests in '${selectedStatus}' status.`}
              actionLabel="Show Pending"
              onAction={() => setSelectedStatus('PENDING')}
            />
          }
        />
      )}

      {/* Review & Decision Modal */}
      <Modal
        visible={!!selectedVerification}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verification Inspection</Text>

            {selectedVerification && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Applicant:</Text>
                  <Text style={styles.detailValue}>{selectedVerification.user?.name || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>{selectedVerification.user?.role}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedVerification.user?.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedVerification.user?.phone || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <StatusBadge status={selectedVerification.status} />
                </View>

                {/* Role-Specific Operational Details */}
                {selectedVerification.user?.collectorProfile && (
                  <View style={styles.profileBox}>
                    <Text style={styles.boxTitle}>Collector Profile Details</Text>
                    <Text style={styles.boxText}>
                      Service Radius: {selectedVerification.user.collectorProfile.serviceRadiusKm || 5} km
                    </Text>
                    {selectedVerification.user.collectorProfile.bio ? (
                      <Text style={styles.boxText}>
                        Bio: {selectedVerification.user.collectorProfile.bio}
                      </Text>
                    ) : null}
                  </View>
                )}

                {selectedVerification.user?.recyclerProfile && (
                  <View style={styles.profileBox}>
                    <Text style={styles.boxTitle}>Recycler Facility Details</Text>
                    <Text style={styles.boxText}>
                      Facility: {selectedVerification.user.recyclerProfile.facilityName || '—'}
                    </Text>
                    <Text style={styles.boxText}>
                      Address: {selectedVerification.user.recyclerProfile.facilityAddress || '—'}
                    </Text>
                    {selectedVerification.user.recyclerProfile.licenseNumber ? (
                      <Text style={styles.boxText}>
                        License No: {selectedVerification.user.recyclerProfile.licenseNumber}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Uploaded Document Info */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Credential Document:</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>
                    {selectedVerification.documentUrl || 'Uploaded in Profile'}
                  </Text>
                </View>

                {/* Existing Review Info if Already Reviewed */}
                {selectedVerification.status !== 'PENDING' && (
                  <View style={styles.reviewedBox}>
                    <Text style={styles.boxTitle}>Review History</Text>
                    <Text style={styles.boxText}>
                      Reviewed At: {selectedVerification.reviewedAt ? new Date(selectedVerification.reviewedAt).toLocaleString('en-IN') : '—'}
                    </Text>
                    {selectedVerification.reviewer?.name && (
                      <Text style={styles.boxText}>
                        Reviewer: {selectedVerification.reviewer.name}
                      </Text>
                    )}
                    {selectedVerification.reviewNotes && (
                      <Text style={styles.boxText}>
                        Notes: {selectedVerification.reviewNotes}
                      </Text>
                    )}
                  </View>
                )}

                {modalError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{modalError}</Text>
                  </View>
                )}

                {/* Decision Controls (Enabled only for PENDING) */}
                {selectedVerification.status === 'PENDING' ? (
                  <>
                    <Text style={styles.sectionHeading}>Administrative Review Notes</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Enter optional approval notes or rejection reason..."
                      placeholderTextColor={colors.textSecondary}
                      value={reviewNotes}
                      onChangeText={setReviewNotes}
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                      editable={!isSubmitting && isConnected}
                    />

                    {!isConnected && (
                      <Text style={styles.offlineNotice}>
                        ⚠️ Verification decisions are disabled while offline.
                      </Text>
                    )}

                    <View style={styles.decisionActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.rejectButton,
                          (!isConnected || isSubmitting) && styles.buttonDisabled,
                        ]}
                        onPress={() => handleDecision('REJECTED')}
                        disabled={isSubmitting || !isConnected}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.approveButton,
                          (!isConnected || isSubmitting) && styles.buttonDisabled,
                        ]}
                        onPress={() => handleDecision('APPROVED')}
                        disabled={isSubmitting || !isConnected}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.approveButtonText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={handleCloseModal}
                  disabled={isSubmitting}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  filterScroll: {
    maxHeight: 44,
    marginTop: spacing.spaceSm,
  },
  filterContainer: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 4,
    gap: spacing.spaceXs,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.spaceSm + 6,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: spacing.spaceMd,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  listContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
    gap: spacing.spaceSm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
  },
  cardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceXs,
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  userName: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceXs,
  },
  roleTag: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceXs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  submittedDate: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  docAttachedTag: {
    fontSize: typography.Caption.fontSize,
    color: '#0277BD',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.spaceMd,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceMd,
    textAlign: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailLabel: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  profileBox: {
    backgroundColor: '#F8F9FA',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginVertical: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  reviewedBox: {
    backgroundColor: '#FFF8E1',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginVertical: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  boxTitle: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  boxText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceXs,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 6,
    padding: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    minHeight: 65,
    textAlignVertical: 'top',
    marginBottom: spacing.spaceSm,
  },
  offlineNotice: {
    fontSize: typography.Caption.fontSize,
    color: '#E65100',
    marginBottom: spacing.spaceSm,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginVertical: spacing.spaceSm,
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: typography.Caption.fontSize,
  },
  decisionActionsRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    paddingVertical: spacing.spaceSm + 2,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  rejectButtonText: {
    color: '#C62828',
    fontWeight: '700',
    fontSize: typography.Button.fontSize,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: spacing.spaceSm + 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.Button.fontSize,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  closeModalButton: {
    alignSelf: 'center',
    paddingVertical: spacing.spaceSm,
    paddingHorizontal: spacing.spaceLg,
    marginTop: spacing.spaceSm,
  },
  closeModalButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: typography.Body.fontSize,
  },
});

export default AdminVerificationsScreen;
