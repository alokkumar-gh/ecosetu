/**
 * EcoSetu Collector Dispute Detail Screen
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 *
 * Full dispute lifecycle inspection, negotiation timeline, factual weights & settlement adjustments,
 * and state-machine guarded actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import disputeService, { MarketplaceDispute, DisputeStatus } from '../../services/disputeService';
import { DisputeTimeline } from '../../components/dispute/DisputeTimeline';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { AppIcon } from '../../components/ui/AppIcon';

export const CollectorDisputeDetailScreen: React.FC = () => {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const disputeId = route.params?.disputeId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispute, setDispute] = useState<MarketplaceDispute | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Action Modals
  const [respondModalVisible, setRespondModalVisible] = useState(false);
  const [respondNote, setRespondNote] = useState('');
  const [proposedWeight, setProposedWeight] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');

  const loadDispute = useCallback(async () => {
    if (!disputeId) return;
    try {
      setError(null);
      const data = await disputeService.getDisputeById(disputeId);
      setDispute(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispute details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [disputeId]);

  useEffect(() => {
    loadDispute();
  }, [loadDispute]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDispute();
  };

  // 1. Submit Response
  const handleRespond = async () => {
    if (!respondNote.trim() || respondNote.trim().length < 2) {
      Alert.alert('Note Required', 'Please enter a response note.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await disputeService.respondToDispute(disputeId, {
        note: respondNote.trim(),
        proposedWeightKg: proposedWeight ? parseFloat(proposedWeight) : undefined,
      });
      setDispute(updated);
      setRespondModalVisible(false);
      setRespondNote('');
      setProposedWeight('');
      Alert.alert('Response Recorded', 'Your counterparty has been notified.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit response');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Accept Proposed Weight / Resolution
  const handleAcceptResolution = async () => {
    if (!dispute) return;
    Alert.alert(
      'Confirm Acceptance',
      'Are you sure you want to accept this resolution? The server will recalculate the final payable amount.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Settle',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await disputeService.resolveDispute(disputeId, {
                resolutionType: 'MUTUAL_AGREEMENT',
                resolutionNotes: 'Collector accepted proposed resolution terms',
                resolvedWeightKg: dispute.resolvedWeightKg || dispute.disputedQuantityKg || undefined,
              });
              setDispute(updated);
              Alert.alert('Dispute Resolved', 'The resolution has been applied to the transaction.');
            } catch (err: any) {
              Alert.alert('Resolution Error', err.message || 'Failed to resolve dispute');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // 3. Confirm Physical Return Received
  const handleCompleteReturn = async () => {
    Alert.alert(
      'Confirm Physical Return',
      'Have you received the returned material in person?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Confirm Receipt',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await disputeService.completeReturn(disputeId, {
                completionNotes: returnNotes.trim() || 'Collector confirmed physical receipt of returned material',
              });
              setDispute(updated);
              setReturnModalVisible(false);
              setReturnNotes('');
              Alert.alert('Return Completed', 'Return recorded as completed in the system.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to complete return');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // 4. Cancel Dispute
  const handleCancelDispute = async () => {
    Alert.alert(
      'Cancel Dispute',
      'Are you sure you want to withdraw and cancel this dispute?',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Withdraw Dispute',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await disputeService.cancelDispute(disputeId, {
                reason: 'Dispute withdrawn by collector',
              });
              setDispute(updated);
              Alert.alert('Dispute Withdrawn', 'Dispute has been marked cancelled.');
            } catch (err: any) {
              Alert.alert('Cancellation Error', err.message || 'Failed to cancel dispute');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerArea}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dispute record...</Text>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return (
      <SafeAreaView style={styles.centerArea}>
        <Text style={styles.errorText}>Dispute not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnBack}>
          <Text style={styles.btnBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isClosed = ['RESOLVED', 'CANCELLED', 'RETURNED'].includes(dispute.status);
  const isReturnPending = dispute.status === 'RETURN_PENDING';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dispute.disputeReference}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Header */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.disputeTypeLabel}>{dispute.disputeType.replace(/_/g, ' ')}</Text>
              <Text style={styles.timestampText}>
                Opened {new Date(dispute.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{dispute.status}</Text>
            </View>
          </View>
          <Text style={styles.descriptionText}>"{dispute.description}"</Text>
        </View>

        {/* Counterparty Card */}
        {dispute.counterparty && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <AppIcon name="factory" size={18} color={colors.textSecondary} />
              <Text style={styles.cardSectionTitle}>Involved Recycler</Text>
            </View>
            <Text style={styles.infoName}>{dispute.counterparty.name}</Text>
            {dispute.counterparty.phone ? (
              <Text style={styles.infoSub}>Contact: {dispute.counterparty.phone}</Text>
            ) : null}
          </View>
        )}

        {/* Weight Comparison Grid */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <AppIcon name="scale" size={18} color={colors.textSecondary} />
            <Text style={styles.cardSectionTitle}>Weight & Commercial Facts</Text>
          </View>
          <View style={styles.factsGrid}>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Estimated Weight</Text>
              <Text style={styles.factValue}>
                {dispute.disputedEstimatedWeightKg ?? dispute.materialLot?.approximateTotalWeightKg ?? '—'} kg
              </Text>
            </View>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Handover Weight</Text>
              <Text style={styles.factValue}>
                {dispute.disputedFinalWeightKg ?? dispute.handover?.handoverWeightKg ?? '—'} kg
              </Text>
            </View>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Disputed Claim</Text>
              <Text style={[styles.factValue, { color: '#DC2626' }]}>
                {dispute.disputedQuantityKg ? `${dispute.disputedQuantityKg} kg` : '—'}
              </Text>
            </View>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Authoritative Resolved</Text>
              <Text style={[styles.factValue, { color: colors.primary }]}>
                {dispute.resolvedWeightKg ? `${dispute.resolvedWeightKg} kg` : 'Pending'}
              </Text>
            </View>
          </View>

          {/* Financials if transacted */}
          {dispute.transaction && (
            <View style={styles.financialBox}>
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Original Transaction Value:</Text>
                <Text style={styles.finVal}>₹{Number(dispute.transaction.finalSaleValue).toFixed(2)}</Text>
              </View>
              {dispute.resolvedAmount !== undefined && dispute.resolvedAmount !== null && (
                <View style={styles.finRow}>
                  <Text style={[styles.finLabel, { color: colors.primary, fontWeight: '700' }]}>
                    Authoritative Resolved Value:
                  </Text>
                  <Text style={[styles.finVal, { color: colors.primary, fontWeight: '700' }]}>
                    ₹{Number(dispute.resolvedAmount).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Resolution Card if resolved */}
        {dispute.resolutionNotes && (
          <View style={[styles.infoCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
            <View style={styles.cardHeaderRow}>
              <AppIcon name="check-circle" size={18} color="#166534" />
              <Text style={[styles.cardSectionTitle, { color: '#166534' }]}>Resolution Details</Text>
            </View>
            <Text style={styles.resType}>Type: {dispute.resolutionType?.replace(/_/g, ' ')}</Text>
            <Text style={styles.resNotes}>"{dispute.resolutionNotes}"</Text>
            {dispute.resolvedAt && (
              <Text style={styles.resTime}>Resolved at: {new Date(dispute.resolvedAt).toLocaleString()}</Text>
            )}
          </View>
        )}

        {/* Dispute Timeline */}
        <DisputeTimeline events={dispute.events} />

        {/* Action Controls */}
        {!isClosed && (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Available Actions</Text>

            {!isReturnPending ? (
              <>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => setRespondModalVisible(true)}
                  disabled={actionLoading}
                >
                  <View style={styles.btnContentRow}>
                    <AppIcon name="message-square" size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Respond / Propose</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnOutline, { marginTop: 8 }]}
                  onPress={handleAcceptResolution}
                  disabled={actionLoading}
                >
                  <View style={styles.btnContentRow}>
                    <AppIcon name="check" size={16} color={colors.primary} />
                    <Text style={styles.btnOutlineText}>Accept Terms & Settle</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnDanger, { marginTop: 8 }]}
                  onPress={handleCancelDispute}
                  disabled={actionLoading}
                >
                  <Text style={styles.btnDangerText}>Withdraw Dispute</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => setReturnModalVisible(true)}
                disabled={actionLoading}
              >
                <View style={styles.btnContentRow}>
                  <AppIcon name="package" size={16} color="#FFFFFF" />
                  <Text style={styles.btnPrimaryText}>Confirm Return Received</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Respond Modal */}
      <Modal visible={respondModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Respond to Dispute</Text>
            <Text style={styles.modalSub}>Propose an acceptable weight or clarify details:</Text>

            <TextInput
              style={styles.input}
              placeholder="Proposed weight in kg (optional)"
              keyboardType="numeric"
              value={proposedWeight}
              onChangeText={setProposedWeight}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Your explanation / note..."
              multiline
              numberOfLines={3}
              value={respondNote}
              onChangeText={setRespondNote}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setRespondModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSubmit}
                onPress={handleRespond}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSubmitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Return Modal */}
      <Modal visible={returnModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Physical Return</Text>
            <Text style={styles.modalSub}>
              Confirm that you have physically received the returned material back into your custody:
            </Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Return receipt notes (optional)..."
              multiline
              numberOfLines={2}
              value={returnNotes}
              onChangeText={setReturnNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setReturnModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSubmit}
                onPress={handleCompleteReturn}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSubmitText}>Confirm Return</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030C12',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030C12',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 12,
  },
  btnBack: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  btnBackText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: '#06151B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    fontSize: 22,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  contentPadding: {
    padding: space.md,
  },
  statusCard: {
    backgroundColor: '#0F2328',
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  disputeTypeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  descriptionText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#0F2328',
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  infoName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  factItem: {
    width: '47%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  factLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  factValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  financialBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  finLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  finVal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  resNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#166534',
    marginTop: 2,
  },
  resTime: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: '#0F2328',
    borderRadius: 14,
    padding: space.md,
    marginTop: space.md,
    marginBottom: space.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDangerText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: space.lg,
  },
  modalCard: {
    backgroundColor: '#0F2328',
    borderRadius: 16,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: space.md,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  btnCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  btnSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  btnSubmitText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.sm,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
