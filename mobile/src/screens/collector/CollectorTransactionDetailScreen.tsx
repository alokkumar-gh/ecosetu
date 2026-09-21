/**
 * CollectorTransactionDetailScreen.tsx
 * Collector Screen for Detailed Transaction & Provenance Inspection
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 7: Payment Recording + Transaction Dataset
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import transactionService, { TransactionRecord } from '../../services/transactionService';
import voiceService from '../../services/voiceService';

export const CollectorTransactionDetailScreen: React.FC = () => {
  const { language } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { transactionId, transaction: passedTx } = route.params || {};

  const [transaction, setTransaction] = useState<TransactionRecord | null>(passedTx || null);
  const [loading, setLoading] = useState(!passedTx);
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<'PAID' | 'PARTIALLY_PAID' | 'PENDING'>('PAID');
  const [newAmountPaid, setNewAmountPaid] = useState('');

  useEffect(() => {
    if (transactionId) {
      fetchTransaction(transactionId);
    }
  }, [transactionId]);

  const fetchTransaction = async (id: string) => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactionById(id);
      setTransaction(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!transaction) return;
    const text = transactionService.generateTransactionSpeechText(transaction, language);
    await voiceService.speak(text, { language });
  };

  const handleUpdatePayment = async () => {
    if (!transaction) return;
    try {
      setUpdating(true);
      const updated = await transactionService.updatePaymentStatus(transaction.id, {
        paymentStatus: newStatus,
        amountPaid: newStatus === 'PARTIALLY_PAID' ? parseFloat(newAmountPaid) || 0 : undefined,
      });
      setTransaction(updated);
      setModalVisible(false);
      Alert.alert('Updated', 'Payment status updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Unable to update payment status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Transaction not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quotedTotal = Number(transaction.quotedTotal) || 0;
  const finalSaleValue = Number(transaction.finalSaleValue) || 0;
  const difference = Number((finalSaleValue - quotedTotal).toFixed(2));
  const diffPercent =
    quotedTotal > 0 ? Number(((difference / quotedTotal) * 100).toFixed(1)) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Banner Card */}
      <View style={styles.bannerCard}>
        <View style={styles.refRow}>
          <Text style={styles.referenceNumber}>{transaction.referenceNumber}</Text>
          <View
            style={[
              styles.badge,
              transaction.paymentStatus === 'PAID'
                ? styles.badgePaid
                : transaction.paymentStatus === 'PARTIALLY_PAID'
                ? styles.badgePartial
                : styles.badgePending,
            ]}
          >
            <Text style={styles.badgeText}>{transaction.paymentStatus}</Text>
          </View>
        </View>
        <Text style={styles.bannerSubtitle}>
          Recorded on {new Date(transaction.transactionDate).toLocaleString()}
        </Text>

        {/* Action Buttons: TTS Voice & View Earnings */}
        <View style={styles.bannerActionsRow}>
          <TouchableOpacity style={styles.speechButton} onPress={handleSpeak}>
            <Text style={styles.speechButtonText}>🔊 Speak Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.earningsLedgerButton}
            onPress={() => navigation.navigate('CollectorEarnings')}
          >
            <Text style={styles.earningsLedgerButtonText}>📊 View Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Direct 3-Part Financial Breakdown */}
      <View style={styles.summaryOverviewCard}>
        <View style={styles.summaryOverviewCol}>
          <Text style={styles.summaryOverviewLabel}>Sale Value</Text>
          <Text style={styles.summaryOverviewValue}>₹{finalSaleValue.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryOverviewDivider} />
        <View style={styles.summaryOverviewCol}>
          <Text style={styles.summaryOverviewLabel}>Received</Text>
          <Text style={[styles.summaryOverviewValue, { color: '#15803d' }]}>
            ₹{Number(transaction.amountPaid).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryOverviewDivider} />
        <View style={styles.summaryOverviewCol}>
          <Text style={styles.summaryOverviewLabel}>Pending</Text>
          <Text
            style={[
              styles.summaryOverviewValue,
              { color: Number(transaction.amountDue) > 0 ? '#b91c1c' : '#64748b' },
            ]}
          >
            ₹{Number(transaction.amountDue).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Financial Comparison Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Financial Reconciliation</Text>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Agreed Quoted Rate:</Text>
          <Text style={styles.tableValue}>
            ₹{Number(transaction.quotedUnitPrice).toFixed(2)} / {transaction.unit}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Quoted Total:</Text>
          <Text style={styles.tableValue}>₹{quotedTotal.toFixed(2)}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Final Unit Rate:</Text>
          <Text style={styles.tableValue}>
            ₹{Number(transaction.finalUnitPrice).toFixed(2)} / {transaction.unit}
          </Text>
        </View>

        <View style={[styles.tableRow, styles.tableHighlightRow]}>
          <Text style={styles.tableHighlightLabel}>Final Sale Value:</Text>
          <Text style={styles.tableHighlightValue}>₹{finalSaleValue.toFixed(2)}</Text>
        </View>

        {/* Difference Row */}
        <View style={styles.differenceContainer}>
          <Text style={styles.differenceLabel}>Variance vs Quote:</Text>
          <Text
            style={[
              styles.differenceValue,
              difference === 0
                ? styles.diffNeutral
                : difference > 0
                ? styles.diffPositive
                : styles.diffNegative,
            ]}
          >
            {difference === 0
              ? 'Exact Match (₹0.00)'
              : difference > 0
              ? `+₹${difference.toFixed(2)} (+${diffPercent}%)`
              : `-₹${Math.abs(difference).toFixed(2)} (${diffPercent}%)`}
          </Text>
        </View>
      </View>

      {/* Payment Settlement Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Breakdown</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Payment Method:</Text>
          <Text style={styles.tableValue}>
            {transaction.paymentMethod === 'CASH'
              ? '💵 Cash'
              : transaction.paymentMethod === 'UPI_RECORDED'
              ? '📱 UPI Recorded'
              : transaction.paymentMethod === 'BANK_TRANSFER_RECORDED'
              ? '🏦 Bank Transfer'
              : '📋 Other'}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Amount Paid:</Text>
          <Text style={styles.tablePaidValue}>
            ₹{Number(transaction.amountPaid).toFixed(2)}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Amount Due:</Text>
          <Text
            style={[
              styles.tableDueValue,
              Number(transaction.amountDue) > 0 && styles.tableDueActive,
            ]}
          >
            ₹{Number(transaction.amountDue).toFixed(2)}
          </Text>
        </View>

        {/* Statutory Non-Movement Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ℹ️ {transaction.disclaimer || 'Recording only — ECOSETU does not transfer money.'}
          </Text>
        </View>

        {/* Update Payment Button if balance pending */}
        {transaction.paymentStatus !== 'PAID' && (
          <TouchableOpacity
            style={styles.updateStatusButton}
            onPress={() => {
              setNewStatus('PAID');
              setNewAmountPaid(String(finalSaleValue));
              setModalVisible(true);
            }}
          >
            <Text style={styles.updateStatusButtonText}>Update Payment Status</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Provenance & Lifecycle Chain Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lifecycle Provenance Chain</Text>
        <View style={styles.chainItem}>
          <Text style={styles.chainLabel}>1. Material Lot:</Text>
          <Text style={styles.chainValue}>
            {transaction.materialLot?.referenceNumber || 'Lot Reference'} (
            {transaction.category} • {transaction.quantity} kg)
          </Text>
        </View>
        <View style={styles.chainItem}>
          <Text style={styles.chainLabel}>2. Agreed Quote:</Text>
          <Text style={styles.chainValue}>
            {transaction.quote?.referenceNumber || 'Quote Record'} (₹
            {Number(transaction.quotedUnitPrice).toFixed(2)}/{transaction.unit})
          </Text>
        </View>
        <View style={styles.chainItem}>
          <Text style={styles.chainLabel}>3. Confirmed Handover:</Text>
          <Text style={styles.chainValue}>
            {transaction.handover?.referenceNumber || 'Handover Record'}
          </Text>
        </View>
        <View style={styles.chainItem}>
          <Text style={styles.chainLabel}>4. Economic Transaction:</Text>
          <Text style={styles.chainValueHighlight}>
            {transaction.referenceNumber} (RECORDED)
          </Text>
        </View>
      </View>

      {/* Location & Parties Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parties & Handover Location</Text>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Buyer (Recycler):</Text>
          <Text style={styles.tableValue}>
            {transaction.recycler?.facilityName || 'Authorized Recycler'}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Handover Location:</Text>
          <Text style={styles.tableValue}>
            {transaction.locationName || 'Confirmed Location'}
          </Text>
        </View>
        {transaction.latitude && transaction.longitude && (
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>GPS Coordinates:</Text>
            <Text style={styles.tableValue}>
              {Number(transaction.latitude).toFixed(5)}, {Number(transaction.longitude).toFixed(5)}
            </Text>
          </View>
        )}
      </View>

      {/* Update Payment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Payment Status</Text>

            <View style={styles.pillGroup}>
              {['PAID', 'PARTIALLY_PAID', 'PENDING'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.pillButton,
                    newStatus === s && styles.pillButtonActive,
                  ]}
                  onPress={() => setNewStatus(s as any)}
                >
                  <Text
                    style={[
                      styles.pillButtonText,
                      newStatus === s && styles.pillButtonTextActive,
                    ]}
                  >
                    {s === 'PAID' ? 'Paid in Full' : s === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {newStatus === 'PARTIALLY_PAID' && (
              <View style={styles.modalInputBox}>
                <Text style={styles.modalInputLabel}>Amount Paid (₹):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newAmountPaid}
                  onChangeText={setNewAmountPaid}
                  placeholder="0.00"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleUpdatePayment}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referenceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePaid: {
    backgroundColor: '#dcfce7',
  },
  badgePartial: {
    backgroundColor: '#fef3c7',
  },
  badgePending: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  bannerActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  speechButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  speechButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  earningsLedgerButton: {
    backgroundColor: '#dcfce7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  earningsLedgerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  summaryOverviewCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryOverviewCol: {
    alignItems: 'center',
    flex: 1,
  },
  summaryOverviewLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryOverviewValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryOverviewDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableHighlightRow: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 0,
    marginTop: 4,
  },
  tableLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  tableValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  tableHighlightLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
  },
  tableHighlightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803d',
  },
  tablePaidValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
  tableDueValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tableDueActive: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  differenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  differenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  differenceValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  diffNeutral: {
    color: '#16a34a',
  },
  diffPositive: {
    color: '#059669',
  },
  diffNegative: {
    color: '#b91c1c',
  },
  disclaimerBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  updateStatusButton: {
    marginTop: 12,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateStatusButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  chainItem: {
    paddingVertical: 6,
  },
  chainLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chainValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    marginTop: 2,
  },
  chainValueHighlight: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '700',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  pillButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillButtonTextActive: {
    color: '#ffffff',
  },
  modalInputBox: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  backButtonText: {
    color: '#334155',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
});

export default CollectorTransactionDetailScreen;
