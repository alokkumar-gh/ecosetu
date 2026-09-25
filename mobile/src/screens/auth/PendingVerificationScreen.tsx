/**
 * PendingVerificationScreen — Live Verification Status & Resubmission Center
 * Canonical Reference: Prompt Sections 14, 15, 25, 28
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { verificationService, VerificationStatusResponse } from '../../services/verificationService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AUTH_COLORS, AUTH_RADIUS, AUTH_SHADOW } from '../../components/auth/design/AuthTheme';

interface Props {
  role?: string;
}

export const PendingVerificationScreen: React.FC<Props> = ({ role = 'User' }) => {
  const { logout, refresh } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<VerificationStatusResponse | null>(null);

  // Resubmit Modal State
  const [resubmitModalVisible, setResubmitModalVisible] = useState<boolean>(false);
  const [resubmitDocUri, setResubmitDocUri] = useState<string | null>(null);
  const [resubmitNotes, setResubmitNotes] = useState<string>('');
  const [isSubmittingResubmit, setIsSubmittingResubmit] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await verificationService.getStatus();
      setStatusData(data);
      if (data.isVerified) {
        // User was approved! Refresh auth session to navigate to dashboard
        await refresh();
      }
    } catch (err) {
      console.warn('[PendingVerificationScreen] Failed to fetch verification status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const handlePickDocument = () => {
    Alert.alert('Choose Corrected Document', 'Upload a clear, legible document (JPG, PNG, PDF)', [
      {
        text: 'Attach Updated Document',
        onPress: () => {
          setResubmitDocUri('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleExecuteResubmit = async () => {
    if (!resubmitDocUri) {
      Alert.alert('Document Required', 'Please attach the updated document before resubmitting.');
      return;
    }

    setIsSubmittingResubmit(true);
    try {
      await verificationService.resubmitVerification({
        documentType: statusData?.latestVerification?.documentType || 'AADHAAR',
        documentUrl: resubmitDocUri,
        reviewNotes: resubmitNotes.trim() || undefined,
      });

      setResubmitModalVisible(false);
      setResubmitDocUri(null);
      setResubmitNotes('');
      Alert.alert('Submitted', 'Your updated document has been sent for administrative review.');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit document. Please try again.');
    } finally {
      setIsSubmittingResubmit(false);
    }
  };

  const latest = statusData?.latestVerification;
  const currentStatus = latest?.status || 'SUBMITTED';
  const roleLabel = role === 'INFORMAL_COLLECTOR' ? 'Collector' : role === 'RECYCLER' ? 'Recycler' : role;

  const isChangesRequired = currentStatus === 'CHANGES_REQUIRED';
  const isRejected = currentStatus === 'REJECTED';
  const isUnderReview = currentStatus === 'UNDER_REVIEW' || currentStatus === 'SUBMITTED' || currentStatus === 'PENDING';

  const submittedDateStr = latest?.submittedAt
    ? new Date(latest.submittedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Status Icon Circle */}
        <View
          style={[
            styles.iconCircle,
            isChangesRequired && styles.iconCircleAmber,
            isRejected && styles.iconCircleRed,
          ]}
        >
          <Text style={styles.iconText}>
            {isChangesRequired ? '⚠' : isRejected ? '✕' : '⏳'}
          </Text>
        </View>

        {/* Dynamic Headlines */}
        <Text style={styles.headline}>
          {isChangesRequired
            ? 'ACTION REQUIRED'
            : isRejected
            ? 'VERIFICATION NOT APPROVED'
            : 'YOUR ACCOUNT IS UNDER REVIEW'}
        </Text>

        <Text style={styles.roleNotice}>
          {roleLabel} Identity Verification • ECOSETU Trust System
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <GlassCard variant="elevated" style={styles.card}>
            {/* Dynamic Status Message */}
            <Text style={styles.message}>
              {isChangesRequired
                ? 'Your verification submission needs an update. Please review the feedback below and upload the requested document.'
                : isRejected
                ? 'Your verification request could not be completed with the submitted credentials. Review the reason below.'
                : 'We\'ve received your identity verification request. Your account credentials and documents are being reviewed by the administration.'}
            </Text>

            {/* Stepper Timeline (Prompt Section 15, 28) */}
            <View style={styles.stepsContainer}>
              {/* Step 1: Submitted */}
              <View style={styles.stepRow}>
                <View style={styles.stepCircleActive}>
                  <Text style={styles.stepCircleText}>✓</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitleActive}>Submitted</Text>
                  <Text style={styles.stepSubtitle}>Submitted on {submittedDateStr}</Text>
                </View>
              </View>

              {/* Step 2: Under Review */}
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepCircleActive,
                    isChangesRequired
                      ? { backgroundColor: '#F59E0B' }
                      : isRejected
                      ? { backgroundColor: '#EF4444' }
                      : { backgroundColor: '#F59E0B' },
                  ]}
                >
                  <Text style={styles.stepCircleText}>
                    {isChangesRequired ? '!' : isRejected ? '✕' : '●'}
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitleActive,
                      { color: isChangesRequired ? '#FBBF24' : isRejected ? '#F87171' : '#FBBF24' },
                    ]}
                  >
                    {isChangesRequired
                      ? 'Changes Requested'
                      : isRejected
                      ? 'Review Decision: Rejected'
                      : 'Under Review'}
                  </Text>
                  <Text style={styles.stepSubtitle}>
                    {isChangesRequired
                      ? 'Administrative review requested document correction'
                      : isRejected
                      ? 'Reason specified below'
                      : 'Estimated review: 24–48 business hours'}
                  </Text>
                </View>
              </View>

              {/* Step 3: Verified */}
              <View style={styles.stepRow}>
                <View style={styles.stepCirclePending}>
                  <Text style={styles.stepCirclePendingText}>○</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitlePending}>Verified</Text>
                  <Text style={styles.stepSubtitle}>Full ECOSETU Operational Access</Text>
                </View>
              </View>
            </View>

            {/* Admin Feedback Box (Prompt Section 25) */}
            {(isChangesRequired || isRejected) && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>ADMINISTRATIVE FEEDBACK</Text>
                {latest?.changeRequestOptions && latest.changeRequestOptions.length > 0 ? (
                  <View style={styles.optionsList}>
                    {latest.changeRequestOptions.map((opt, i) => (
                      <Text key={i} style={styles.optionBullet}>
                        • {opt}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.feedbackText}>
                  {latest?.changeRequestReason ||
                    latest?.rejectionReason ||
                    latest?.reviewNotes ||
                    'Please submit an updated and clearly legible document.'}
                </Text>
              </View>
            )}

            {/* Document metadata info */}
            {latest?.documentNumberMasked ? (
              <View style={styles.docInfoRow}>
                <Text style={styles.docInfoLabel}>Document On File:</Text>
                <Text style={styles.docInfoValue}>{latest.documentNumberMasked}</Text>
              </View>
            ) : null}

            {/* Resubmit CTA if changes requested or rejected */}
            {(isChangesRequired || isRejected) && (
              <TouchableOpacity
                style={styles.resubmitCta}
                onPress={() => setResubmitModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.resubmitCtaText}>
                  {isChangesRequired ? 'UPDATE & RESUBMIT DOCUMENT' : 'SUBMIT NEW VERIFICATION'}
                </Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={AUTH_COLORS.primaryLight} />
            ) : (
              <Text style={styles.refreshBtnText}>🔄 Check Verification Status</Text>
            )}
          </TouchableOpacity>

          <GlassButton
            label={t('auth.logout') || 'Log Out'}
            onPress={logout}
            variant="outline"
            style={styles.button}
          />
        </View>

        {/* Resubmit Modal */}
        <Modal
          visible={resubmitModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setResubmitModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Resubmit Identity Document</Text>
              <Text style={styles.modalSubtitle}>
                Attach an updated, clear photo or scan of your document.
              </Text>

              {!resubmitDocUri ? (
                <TouchableOpacity style={styles.uploadPrompt} onPress={handlePickDocument}>
                  <Text style={styles.uploadPromptIcon}>📄</Text>
                  <Text style={styles.uploadPromptText}>Choose Document File</Text>
                  <Text style={styles.uploadPromptSub}>JPG, PNG or PDF up to 10MB</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: resubmitDocUri }} style={styles.previewThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewTitle}>Document Ready</Text>
                    <TouchableOpacity onPress={handlePickDocument}>
                      <Text style={styles.replaceLink}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.modalInputLabel}>ADDITIONAL NOTE FOR ADMIN (OPTIONAL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Clarifications regarding this submission..."
                placeholderTextColor={AUTH_COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={resubmitNotes}
                onChangeText={setResubmitNotes}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setResubmitModalVisible(false)}
                  disabled={isSubmittingResubmit}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={handleExecuteResubmit}
                  disabled={isSubmittingResubmit}
                >
                  {isSubmittingResubmit ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.spaceLg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
  },
  iconCircleAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  iconCircleRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  iconText: {
    fontSize: 36,
  },
  headline: {
    fontSize: typography.Display.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.spaceXs,
  },
  roleNotice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.spaceLg,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    marginBottom: spacing.spaceLg,
  },
  message: {
    fontSize: typography.Body.fontSize,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  stepsContainer: {
    gap: 16,
    marginVertical: spacing.spaceMd,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircleActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
  },
  stepCirclePending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCirclePendingText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleActive: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepTitlePending: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  stepSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  feedbackCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  optionsList: {
    marginBottom: 6,
  },
  optionBullet: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDE68A',
  },
  feedbackText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  docInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 8,
  },
  docInfoLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  docInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  resubmitCta: {
    backgroundColor: '#F59E0B',
    borderRadius: AUTH_RADIUS.full,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  resubmitCtaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  refreshBtn: {
    minHeight: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
  },
  button: {
    minHeight: 48,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#12241F',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  uploadPrompt: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadPromptIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  uploadPromptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadPromptSub: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  previewThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  replaceLink: {
    fontSize: 12,
    color: AUTH_COLORS.primaryLight,
    fontWeight: '600',
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: colors.textTertiary,
    fontWeight: '600',
  },
  modalSubmit: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: AUTH_RADIUS.full,
  },
  modalSubmitText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
});

export default PendingVerificationScreen;
