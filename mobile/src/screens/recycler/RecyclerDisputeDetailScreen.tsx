/**
 * EcoSetu Recycler Dispute Detail Screen
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 *
 * Recycler review, counterparty communication, weight adjustment proposals,
 * partial acceptance recording, and return authorization.
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

export const RecyclerDisputeDetailScreen: React.FC = () => {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const disputeId = route.params?.disputeId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispute, setDispute] = useState<MarketplaceDispute | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Proposal / Respond Modal
  const [respondModalVisible, setRespondModalVisible] = useState(false);
  const [respondNote, setRespondNote] = useState('');
  const [proposedWeight, setProposedWeight] = useState('');
  const [acceptedQty, setAcceptedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Return Modal
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnQty, setReturnQty] = useState('');

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

  // 1. Submit Response / Proposal
  const handleRespond = async () => {
    if (!respondNote.trim() || respondNote.trim().length < 2) {
      Alert.alert('Note Required', 'Please enter an explanation note.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await disputeService.respondToDispute(disputeId, {
        note: respondNote.trim(),
        proposedWeightKg: proposedWeight ? parseFloat(proposedWeight) : undefined,
        acceptedQuantityKg: acceptedQty ? parseFloat(acceptedQty) : undefined,
        rejectedQuantityKg: rejectedQty ? parseFloat(rejectedQty) : undefined,
      });
      setDispute(updated);
      setRespondModalVisible(false);
      setRespondNote('');
      setProposedWeight('');
      setAcceptedQty('');
      setRejectedQty('');
      Alert.alert('Proposal Submitted', 'Your response has been logged and sent to the collector.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit proposal');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Accept & Resolve (Weight correction or Mutual Agreement)
  const handleResolve = async () => {
    if (!dispute) return;
    const targetWeight = dispute.disputedQuantityKg || dispute.resolvedWeightKg;
    Alert.alert(
      'Authorize Resolution',
      `Accept and resolve this dispute with authoritative weight: ${targetWeight ? `${targetWeight} kg` : 'as submitted'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authorize & Settle',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await disputeService.resolveDispute(disputeId, {
                resolutionType: 'WEIGHT_CORRECTION',
                resolutionNotes: 'Recycler authorized weight reconciliation and settlement update',
                resolvedWeightKg: targetWeight || undefined,
              });
              setDispute(updated);
              Alert.alert('Dispute Resolved', 'Commercial resolution applied to transaction.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to resolve dispute');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // 3. Initiate Physical Return
  const handleInitiateReturn = async () => {
    try {
      setActionLoading(true);
      const updated = await disputeService.initiateReturn(disputeId, {
        returnTrackingNotes: returnNotes.trim() || 'Recycler initiated return of rejected lot/portion',
        quantityKg: returnQty ? parseFloat(returnQty) : undefined,
      });
      setDispute(updated);
      setReturnModalVisible(false);
      setReturnNotes('');
      setReturnQty('');
      Alert.alert('Return Initiated', 'Material has been marked RETURN_PENDING awaiting physical handover.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to initiate return');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerArea}>
        <ActivityIndicator size="large" color="#2563EB" />
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

        {/* Collector Info */}
        {dispute.counterparty && (
          <View style={styles.infoCard}>
            <View style={styles.titleWithIcon}>
              <AppIcon name="user" size={14} color={colors.textPrimary} />
              <Text style={styles.cardSectionTitle}>Selling Collector</Text>
            </View>
            <Text style={styles.infoName}>{dispute.counterparty.name}</Text>
            {dispute.counterparty.phone ? (
              <Text style={styles.infoSub}>Contact: {dispute.counterparty.phone}</Text>
            ) : null}
          </View>
        )}

        {/* Commercial Weight & Price Reconciliation */}
        <View style={styles.infoCard}>
          <View style={styles.titleWithIcon}>
            <AppIcon name="scale" size={14} color={colors.textPrimary} />
            <Text style={styles.cardSectionTitle}>Weight Reconciliation</Text>
          </View>
          <View style={styles.factsGrid}>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Declared Lot Weight</Text>
              <Text style={styles.factValue}>
                {dispute.disputedEstimatedWeightKg ?? dispute.materialLot?.approximateTotalWeightKg ?? '—'} kg
              </Text>
            </View>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Verified Handover Weight</Text>
              <Text style={styles.factValue}>
                {dispute.disputedFinalWeightKg ?? dispute.handover?.handoverWeightKg ?? '—'} kg
              </Text>
            </View>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Claimed Weight</Text>
              <Text style={[styles.factValue, { color: '#DC2626' }]}>
                {dispute.disputedQuantityKg ? `${dispute.disputedQuantityKg} kg` : '—'}
              </Text>
            </View>
            <View style={styles.factItem}>
              <Text style={styles.factLabel}>Resolved Settlement Weight</Text>
              <Text style={[styles.factValue, { color: '#2563EB' }]}>
                {dispute.resolvedWeightKg ? `${dispute.resolvedWeightKg} kg` : 'Pending'}
              </Text>
            </View>
          </View>

          {dispute.quote && (
            <View style={styles.rateBox}>
              <Text style={styles.rateText}>
                Agreed Unit Rate: <Text style={styles.bold}>₹{dispute.quote.quotedUnitPrice} / kg</Text>
              </Text>
            </View>
          )}

          {dispute.transaction && (
            <View style={styles.financialBox}>
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Recorded Transaction:</Text>
                <Text style={styles.finVal}>₹{Number(dispute.transaction.finalSaleValue).toFixed(2)}</Text>
              </View>
              {dispute.resolvedAmount !== undefined && dispute.resolvedAmount !== null && (
                <View style={styles.finRow}>
                  <Text style={[styles.finLabel, { color: '#2563EB', fontWeight: '700' }]}>
                    Authoritative Resolved Payable:
                  </Text>
                  <Text style={[styles.finVal, { color: '#2563EB', fontWeight: '700' }]}>
                    ₹{Number(dispute.resolvedAmount).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Resolution Card if resolved */}
        {dispute.resolutionNotes && (
          <View style={[styles.infoCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={styles.titleWithIcon}>
              <AppIcon name="check" size={14} color="#1E40AF" strokeWidth={2.5} />
              <Text style={[styles.cardSectionTitle, { color: '#1E40AF' }]}>Resolution Details</Text>
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

        {/* Actions */}
        {!isClosed && (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Recycler Actions</Text>

            {!isReturnPending ? (
              <>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => setRespondModalVisible(true)}
                  disabled={actionLoading}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="messageSquare" size={14} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Propose Weight / Partial Qty</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnOutline, { marginTop: 8 }]}
                  onPress={handleResolve}
                  disabled={actionLoading}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="check" size={14} color="#2563EB" strokeWidth={2.5} />
                    <Text style={styles.btnOutlineText}>Authorize Settlement Update</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnWarning, { marginTop: 8 }]}
                  onPress={() => setReturnModalVisible(true)}
                  disabled={actionLoading}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="refresh" size={14} color="#C2410C" />
                    <Text style={styles.btnWarningText}>Initiate Physical Return</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.pendingReturnBox}>
                <View style={styles.titleWithIcon}>
                  <AppIcon name="package" size={16} color="#D97706" />
                  <Text style={styles.pendingReturnTitle}>Return Coordination in Progress</Text>
                </View>
                <Text style={styles.pendingReturnDesc}>
                  Material has been marked for physical return. Awaiting collector physical confirmation upon receipt.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Respond Modal */}
      <Modal visible={respondModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Propose Weight / Terms</Text>
            <Text style={styles.modalSub}>Enter verified physical weights or partial breakdown:</Text>

            <TextInput
              style={styles.input}
              placeholder="Proposed accepted weight (kg)"
              keyboardType="numeric"
              value={proposedWeight}
              onChangeText={setProposedWeight}
            />

            <View style={styles.twoCol}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Accepted kg"
                keyboardType="numeric"
                value={acceptedQty}
                onChangeText={setAcceptedQty}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Rejected kg"
                keyboardType="numeric"
                value={rejectedQty}
                onChangeText={setRejectedQty}
              />
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Factual justification / notes..."
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
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSubmitText}>Submit Proposal</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Return Modal */}
      <Modal visible={returnModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Initiate Physical Return</Text>
            <Text style={styles.modalSub}>Record material release or return coordination:</Text>

            <TextInput
              style={styles.input}
              placeholder="Return quantity in kg (optional)"
              keyboardType="numeric"
              value={returnQty}
              onChangeText={setReturnQty}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Return coordination notes..."
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
                style={[styles.btnSubmit, { backgroundColor: '#EA580C' }]}
                onPress={handleInitiateReturn}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSubmitText}>Initiate Return</Text>}
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
    backgroundColor: '#2563EB',
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
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
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
  rateBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  rateText: {
    fontSize: 13,
    color: colors.textPrimary,
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
    color: '#1E40AF',
  },
  resNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#1E40AF',
    marginTop: 2,
  },
  resTime: {
    fontSize: 11,
    color: '#1D4ED8',
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
    backgroundColor: '#2563EB',
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
    borderColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  btnWarning: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnWarningText: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingReturnBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pendingReturnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
    marginBottom: 4,
  },
  pendingReturnDesc: {
    fontSize: 12,
    color: '#9A3412',
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
  twoCol: {
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: '#2563EB',
  },
  btnSubmitText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bold: {
    fontWeight: '700',
  },
});
