/**
 * AdminVerificationsScreen — Upgraded Verification Center
 * Authenticated ADMIN — Comprehensive identity & role review workflow.
 * Canonical Reference: Prompt Sections 21, 22, 23, 24, 25, 26, 27
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { useNetwork } from '../../hooks/useNetwork';
import { adminService } from '../../services/adminService';
import { AdminShell } from '../../components/admin/AdminShell';
import { ADMIN_COLOR, ADMIN_RADIUS } from '../../components/admin/AdminTheme';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';

const TABS = [
  { id: 'ALL', label: 'All', type: 'status' },
  { id: 'INFORMAL_COLLECTOR', label: 'Collectors', type: 'role' },
  { id: 'RECYCLER', label: 'Recyclers', type: 'role' },
  { id: 'PENDING', label: 'Pending', type: 'status' },
  { id: 'APPROVED', label: 'Approved', type: 'status' },
  { id: 'REJECTED', label: 'Rejected', type: 'status' },
  { id: 'CHANGES_REQUIRED', label: 'Changes Req.', type: 'status' },
];

const CHANGE_REQUEST_REASONS = [
  'Document unreadable / blurry',
  'Incorrect or expired document',
  'Missing required government ID / license',
  'Name mismatch with application',
  'Facility address requires physical proof',
  'Other',
];

export const AdminVerificationsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { isConnected } = useNetwork();

  const [verifications, setVerifications] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    changesRequired: 0,
    total: 0,
  });
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Filter Tab
  const [activeTab, setActiveTab] = useState<string>('PENDING');

  // Selected Verification Detail Modal
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Request Changes Modal
  const [changesModalVisible, setChangesModalVisible] = useState<boolean>(false);
  const [selectedChangeReasons, setSelectedChangeReasons] = useState<string[]>([]);
  const [customChangeNote, setCustomChangeNote] = useState<string>('');

  // Document Zoom Modal
  const [zoomDocVisible, setZoomDocVisible] = useState<boolean>(false);

  const isSubmittingRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);

  const loadVerifications = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setError(null);
      try {
        const isRoleTab = activeTab === 'INFORMAL_COLLECTOR' || activeTab === 'RECYCLER';
        const statusParam = isRoleTab ? 'ALL' : activeTab;
        const roleParam = isRoleTab ? activeTab : 'ALL';

        const result = await (adminService as any).getVerifications({
          status: statusParam,
          role: roleParam,
          page: targetPage,
          limit: 20,
        });

        setVerifications(result.verifications || []);
        setPagination(result.pagination || null);
        if (result.metrics) {
          setMetrics(result.metrics);
        }
        setPage(targetPage);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || 'Unable to load verification requests.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab]
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

  const handleOpenReview = (v: any) => {
    setSelectedVerification(v);
    setReviewNotes(v.reviewNotes || '');
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setSelectedVerification(null);
    setChangesModalVisible(false);
  };

  // ── Actions: Approve, Reject, Request Changes ───────────────────────────────

  const handleConfirmApprove = () => {
    if (!selectedVerification) return;
    if (!isConnected) {
      Alert.alert('Online Connection Required', 'Approvals require a live connection to ECOSETU.');
      return;
    }

    Alert.alert(
      'Approve Verification?',
      `Are you sure you want to approve ${selectedVerification.user?.name || 'this applicant'}? Their account will be activated immediately with full operational privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Approve',
          onPress: () => executeDecision('APPROVED', { reviewNotes }),
        },
      ]
    );
  };

  const handleConfirmReject = () => {
    if (!selectedVerification) return;
    if (!isConnected) {
      Alert.alert('Online Connection Required', 'Decisions require a live connection.');
      return;
    }

    Alert.alert(
      'Reject Verification?',
      'This will prevent the applicant from accessing verified functionality. The applicant will be notified and can resubmit with corrected documentation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Rejection',
          style: 'destructive',
          onPress: () =>
            executeDecision('REJECTED', {
              rejectionReason: reviewNotes || 'Document could not be validated',
              reviewNotes,
            }),
        },
      ]
    );
  };

  const handleOpenRequestChanges = () => {
    setSelectedChangeReasons([]);
    setCustomChangeNote('');
    setChangesModalVisible(true);
  };

  const toggleChangeReason = (reason: string) => {
    setSelectedChangeReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleExecuteRequestChanges = async () => {
    if (selectedChangeReasons.length === 0 && !customChangeNote.trim()) {
      Alert.alert('Reason Required', 'Please check at least one correction reason or write an explanation.');
      return;
    }

    const changeReason = [
      ...selectedChangeReasons,
      customChangeNote.trim() ? `Note: ${customChangeNote.trim()}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    setChangesModalVisible(false);
    await executeDecision('CHANGES_REQUIRED', {
      changeRequestReason: changeReason,
      changeRequestOptions: selectedChangeReasons,
      reviewNotes: customChangeNote.trim() || undefined,
    });
  };

  const executeDecision = async (status: string, payload: any) => {
    if (!selectedVerification || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const updated: any = await adminService.updateVerification(
        selectedVerification.id,
        status,
        payload
      );

      // Reconcile list state
      setVerifications((prev) =>
        prev.map((v) => (v.id === selectedVerification.id ? { ...v, ...updated } : v))
      );

      Alert.alert(
        'Decision Recorded',
        `Verification updated to ${status}. Notification dispatched to applicant.`,
        [{ text: 'OK', onPress: () => setSelectedVerification(null) }]
      );
      loadVerifications(page, true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update verification');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // ── Render Item in Queue ───────────────────────────────────────────────────

  const renderVerificationItem = ({ item }: { item: any }) => {
    const applicant = item.user || {};
    const effectiveRole = item.role || applicant.role;
    const isCollector = effectiveRole === 'INFORMAL_COLLECTOR';
    const isPending = item.status === 'PENDING' || item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW';

    return (
      <View style={[styles.queueCard, isPending && styles.queueCardPending]}>
        <View style={styles.cardHeader}>
          <View style={styles.applicantInfo}>
            <Text style={styles.applicantName}>{applicant.name || 'Unnamed Applicant'}</Text>
            <View style={styles.roleTagWrap}>
              <View
                style={[
                  styles.roleBadge,
                  isCollector ? styles.roleBadgeCollector : styles.roleBadgeRecycler,
                ]}
              >
                <Text style={styles.roleBadgeText}>
                  {isCollector ? '🚚 Collector' : '🏭 Recycler'}
                </Text>
              </View>
              <Text style={styles.emailText}>{applicant.email}</Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Document Status */}
        <View style={styles.docStatusRow}>
          <Text style={styles.docStatusText}>
            📄 {item.documentType || (isCollector ? 'Aadhaar / ID Proof' : 'PCB Authorization')}
            {item.documentNumberMasked ? ` (${item.documentNumberMasked})` : ''}
          </Text>
        </View>

        {/* Footer info & review button */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.submittedText}>
              Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('en-IN') : '—'}
            </Text>
            {item.reviewer ? (
              <Text style={styles.reviewerText}>Reviewed by: {item.reviewer.name}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => handleOpenReview(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.reviewBtnText}>REVIEW</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <AdminShell
      screenKey="AdminVerifications"
      breadcrumb={['Operations', 'Verification Center']}
      navigation={navigation}
    >
      <OfflineBanner />

      {/* VERIFICATION CENTER TITLE & HEADER */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>VERIFICATION CENTER</Text>
        <Text style={styles.mainSubtitle}>
          Admin-controlled multi-role identity & compliance verification queue.
        </Text>
      </View>

      {/* REAL DATABASE METRICS DASHBOARD (Prompt Section 21) */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.metricVal}>{metrics.pending}</Text>
          <Text style={styles.metricLabel}>Pending</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
          <Text style={styles.metricVal}>{metrics.underReview}</Text>
          <Text style={styles.metricLabel}>Under Review</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.metricVal}>{metrics.approved}</Text>
          <Text style={styles.metricLabel}>Approved</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.metricVal}>{metrics.rejected}</Text>
          <Text style={styles.metricLabel}>Rejected</Text>
        </View>
      </View>

      {/* FILTER TABS (Prompt Section 21) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {pagination?.total ?? verifications.length} verification requests in view
        </Text>
        <ReadAloudButton
          variant="compact"
          text={() =>
            `Verification Center. ${metrics.pending} pending, ${metrics.approved} approved, ${metrics.rejected} rejected.`
          }
        />
      </View>

      {/* Main Verification Queue List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={105} borderRadius={8} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={105} borderRadius={8} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={105} borderRadius={8} style={{ marginBottom: 10 }} />
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
              title="No Verifications in This Queue"
              message={`No records matching filter '${activeTab}'.`}
              actionLabel="Show Pending"
              onAction={() => setActiveTab('PENDING')}
            />
          }
        />
      )}

      {/* ── VERIFICATION DETAIL & DECISION MODAL (Prompt Section 23) ─────────── */}
      <Modal
        visible={!!selectedVerification}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>VERIFICATION INSPECTION</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedVerification && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* APPLICANT SECTION */}
                <View style={styles.inspectionSection}>
                  <Text style={styles.inspectionTitle}>APPLICANT INFORMATION</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Full Name:</Text>
                    <Text style={styles.detailValue}>{selectedVerification.user?.name || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role:</Text>
                    <Text style={[styles.detailValue, { fontWeight: '800' }]}>
                      {selectedVerification.role || selectedVerification.user?.role}
                    </Text>
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
                    <Text style={styles.detailLabel}>Registered:</Text>
                    <Text style={styles.detailValue}>
                      {selectedVerification.user?.createdAt
                        ? new Date(selectedVerification.user.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </Text>
                  </View>
                </View>

                {/* SUBMITTED ROLE INFORMATION */}
                <View style={styles.inspectionSection}>
                  <Text style={styles.inspectionTitle}>SUBMITTED PROFILE DETAILS</Text>
                  {selectedVerification.user?.collectorProfile ? (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Operating Area:</Text>
                        <Text style={styles.detailValue}>
                          {selectedVerification.user.collectorProfile.serviceArea || '—'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>City / Location:</Text>
                        <Text style={styles.detailValue}>
                          {selectedVerification.user.collectorProfile.city || 'Delhi'}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {selectedVerification.user?.recyclerProfile ? (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Facility Name:</Text>
                        <Text style={styles.detailValue}>
                          {selectedVerification.user.recyclerProfile.facilityName || '—'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address:</Text>
                        <Text style={styles.detailValue}>
                          {selectedVerification.user.recyclerProfile.facilityAddress || '—'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>License Number:</Text>
                        <Text style={styles.detailValue}>
                          {selectedVerification.user.recyclerProfile.licenseNumber || '—'}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {selectedVerification.documentNumberMasked ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Document Ref:</Text>
                      <Text style={[styles.detailValue, { color: '#FBBF24', fontWeight: '700' }]}>
                        {selectedVerification.documentNumberMasked}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* SECURE IDENTITY DOCUMENT PREVIEW */}
                <View style={styles.inspectionSection}>
                  <Text style={styles.inspectionTitle}>IDENTITY DOCUMENT</Text>
                  {selectedVerification.documentUrl ? (
                    <View style={styles.docPreviewCard}>
                      <Image
                        source={{ uri: selectedVerification.documentUrl }}
                        style={styles.docThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.docPreviewActions}>
                        <TouchableOpacity
                          style={styles.docActionBtn}
                          onPress={() => setZoomDocVisible(true)}
                        >
                          <Text style={styles.docActionBtnText}>🔍 ZOOM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.docActionBtn}
                          onPress={() =>
                            Alert.alert('Secure Document View', 'Authorized admin inspection mode active.')
                          }
                        >
                          <Text style={styles.docActionBtnText}>👁 VIEW</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.noDocText}>No document preview available.</Text>
                  )}
                </View>

                {/* REVIEW HISTORY (Prompt Section 26) */}
                <View style={styles.inspectionSection}>
                  <Text style={styles.inspectionTitle}>REVIEW HISTORY & AUDIT TRAIL</Text>
                  <View style={styles.auditRow}>
                    <Text style={styles.auditDot}>•</Text>
                    <Text style={styles.auditText}>
                      Submitted on{' '}
                      {new Date(selectedVerification.submittedAt).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {selectedVerification.reviewedAt ? (
                    <View style={styles.auditRow}>
                      <Text style={styles.auditDot}>•</Text>
                      <Text style={styles.auditText}>
                        Decision: {selectedVerification.status} by{' '}
                        {selectedVerification.reviewer?.name || 'Admin'} on{' '}
                        {new Date(selectedVerification.reviewedAt).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.auditRow}>
                      <Text style={styles.auditDot}>•</Text>
                      <Text style={styles.auditText}>Awaiting decision from admin</Text>
                    </View>
                  )}
                  {selectedVerification.rejectionReason ? (
                    <Text style={styles.reasonText}>
                      Reason: {selectedVerification.rejectionReason}
                    </Text>
                  ) : null}
                  {selectedVerification.changeRequestReason ? (
                    <Text style={styles.reasonText}>
                      Feedback: {selectedVerification.changeRequestReason}
                    </Text>
                  ) : null}
                </View>

                {/* Admin Review Notes Input */}
                <Text style={styles.inputLabel}>DECISION NOTES (OPTIONAL)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Internal review observations..."
                  placeholderTextColor={ADMIN_COLOR.textMuted}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                />

                {/* 3 ACTIONS: APPROVE / REQUEST CHANGES / REJECT */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={handleConfirmApprove}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.approveBtnText}>APPROVE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.changesBtn}
                    onPress={handleOpenRequestChanges}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.changesBtnText}>REQUEST CHANGES</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={handleConfirmReject}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.rejectBtnText}>REJECT</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── REQUEST CHANGES SUB-MODAL (Prompt Section 25) ──────────────────── */}
      <Modal
        visible={changesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.changesModalCard}>
            <Text style={styles.changesModalTitle}>WHAT NEEDS TO BE CORRECTED?</Text>
            <Text style={styles.changesModalSub}>
              Select applicable reasons to notify the applicant.
            </Text>

            <ScrollView style={{ maxHeight: 220 }}>
              {CHANGE_REQUEST_REASONS.map((reason) => {
                const checked = selectedChangeReasons.includes(reason);
                return (
                  <TouchableOpacity
                    key={reason}
                    style={styles.checkboxRow}
                    onPress={() => toggleChangeReason(reason)}
                  >
                    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
                      {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkboxLabel}>{reason}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>ADDITIONAL NOTE</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Please re-upload with high resolution and clear date of issue."
              placeholderTextColor={ADMIN_COLOR.textMuted}
              value={customChangeNote}
              onChangeText={setCustomChangeNote}
              multiline
            />

            <View style={styles.changesActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setChangesModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSendBtn}
                onPress={handleExecuteRequestChanges}
              >
                <Text style={styles.modalSendText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DOCUMENT ZOOM MODAL ────────────────────────────────────────────── */}
      <Modal
        visible={zoomDocVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setZoomDocVisible(false)}
      >
        <View style={styles.zoomContainer}>
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setZoomDocVisible(false)}
          >
            <Text style={styles.zoomCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {selectedVerification?.documentUrl ? (
            <Image
              source={{ uri: selectedVerification.documentUrl }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    paddingHorizontal: spacing.spaceMd,
    paddingTop: 12,
    paddingBottom: 8,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  mainSubtitle: {
    fontSize: 12,
    color: ADMIN_COLOR.textMid,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.spaceMd,
    gap: 8,
    marginVertical: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    color: ADMIN_COLOR.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  filterScroll: {
    maxHeight: 46,
    marginVertical: 6,
  },
  filterContainer: {
    paddingHorizontal: spacing.spaceMd,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: ADMIN_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterTabActive: {
    backgroundColor: ADMIN_COLOR.brand,
    borderColor: ADMIN_COLOR.brand,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: ADMIN_COLOR.textMid,
  },
  filterTabTextActive: {
    color: '#000000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd,
    marginVertical: 6,
  },
  summaryText: {
    fontSize: 12,
    color: ADMIN_COLOR.textMuted,
  },
  queueCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 14,
    marginBottom: 10,
  },
  queueCardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeCollector: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  roleBadgeRecycler: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emailText: {
    fontSize: 11,
    color: ADMIN_COLOR.textMuted,
  },
  docStatusRow: {
    marginTop: 8,
    paddingVertical: 4,
  },
  docStatusText: {
    fontSize: 12,
    color: ADMIN_COLOR.textMid,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  submittedText: {
    fontSize: 11,
    color: ADMIN_COLOR.textMuted,
  },
  reviewerText: {
    fontSize: 10,
    color: '#10B981',
  },
  reviewBtn: {
    backgroundColor: ADMIN_COLOR.brand,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  loadingContainer: {
    padding: spacing.spaceMd,
  },
  centerContainer: {
    padding: spacing.spaceMd,
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.spaceMd,
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F201A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: ADMIN_COLOR.textMuted,
  },
  modalScroll: {
    maxHeight: '85%',
  },
  inspectionSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  inspectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: ADMIN_COLOR.brand,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: ADMIN_COLOR.textMuted,
  },
  detailValue: {
    fontSize: 12,
    color: '#FFFFFF',
    maxWidth: '65%',
    textAlign: 'right',
  },
  docPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  docThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  docPreviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  docActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  docActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noDocText: {
    fontSize: 12,
    color: ADMIN_COLOR.textMuted,
  },
  auditRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 3,
  },
  auditDot: {
    color: ADMIN_COLOR.brand,
  },
  auditText: {
    fontSize: 11,
    color: ADMIN_COLOR.textMid,
  },
  reasonText: {
    fontSize: 11,
    color: '#FBBF24',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ADMIN_COLOR.textMuted,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  changesBtn: {
    flex: 1.4,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changesBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  changesModalCard: {
    backgroundColor: '#11221D',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  changesModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FBBF24',
    marginBottom: 4,
  },
  changesModalSub: {
    fontSize: 12,
    color: ADMIN_COLOR.textMid,
    marginBottom: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkMark: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  changesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    color: ADMIN_COLOR.textMuted,
    fontWeight: '600',
  },
  modalSendBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  modalSendText: {
    color: '#000000',
    fontWeight: '800',
  },
  zoomContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  zoomCloseText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  zoomImage: {
    width: '100%',
    height: '80%',
  },
});

export default AdminVerificationsScreen;
