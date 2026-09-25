/**
 * CollectorTransactionDetailScreen.tsx
 * Collector Screen for Detailed Transaction & Provenance Inspection
 * Redesigned with EcoSetu Premium Dark Glass Theme
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { TopAppBar } from '../../components/layout/TopAppBar';
import transactionService, { TransactionRecord } from '../../services/transactionService';
import voiceService from '../../services/voiceService';
import { ReportProblemModal } from '../../components/dispute/ReportProblemModal';
import { colors } from '../../theme/colors';

export const CollectorTransactionDetailScreen: React.FC = () => {
  const { language, t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { transactionId, transaction: passedTx } = route.params || {};

  const [transaction, setTransaction] = useState<TransactionRecord | null>(passedTx || null);
  const [loading, setLoading] = useState(!passedTx);
  const [modalVisible, setModalVisible] = useState(false);
  const [problemModalVisible, setProblemModalVisible] = useState(false);
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
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to load transaction');
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
      Alert.alert(t('common.success', 'Updated'), 'Payment status updated successfully.');
    } catch (err: any) {
      Alert.alert(t('common.error', 'Update Failed'), err.message || 'Unable to update payment status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <TopAppBar
            title={t('payments.transactionDetail', 'Transaction Details')}
            showBack={true}
            onBack={() => navigation.goBack()}
          />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading transaction...')}</Text>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  if (!transaction) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <TopAppBar
            title={t('payments.transactionDetail', 'Transaction Details')}
            showBack={true}
            onBack={() => navigation.goBack()}
          />
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Transaction not found.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>← {t('common.goBack', 'Go Back')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const quotedTotal = Number(transaction.quotedTotal) || 0;
  const finalSaleValue = Number(transaction.finalSaleValue) || 0;
  const difference = Number((finalSaleValue - quotedTotal).toFixed(2));
  const diffPercent =
    quotedTotal > 0 ? Number(((difference / quotedTotal) * 100).toFixed(1)) : 0;

  const isPaid = transaction.paymentStatus === 'PAID';
  const isPartial = transaction.paymentStatus === 'PARTIALLY_PAID';

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TopAppBar
          title={transaction.referenceNumber || t('payments.transaction', 'Transaction')}
          subtitle={new Date(transaction.transactionDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Top Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.refRow}>
              <View style={styles.refLeft}>
                <Text style={styles.bannerIcon}>📜</Text>
                <View>
                  <Text style={styles.referenceNumber}>{transaction.referenceNumber}</Text>
                  <Text style={styles.bannerSubtitle}>
                    {new Date(transaction.transactionDate).toLocaleString()}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.badge,
                  isPaid ? styles.badgePaid : isPartial ? styles.badgePartial : styles.badgePending,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isPaid
                      ? { color: '#34D399' }
                      : isPartial
                      ? { color: '#FBBF24' }
                      : { color: '#F87171' },
                  ]}
                >
                  {transaction.paymentStatus}
                </Text>
              </View>
            </View>

            {/* Action Buttons: TTS Voice & View Earnings */}
            <View style={styles.bannerActionsRow}>
              <TouchableOpacity style={styles.speechButton} onPress={handleSpeak} activeOpacity={0.75}>
                <Text style={styles.speechButtonText}>🔊 {t('common.speakSummary', 'Speak Summary')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.earningsLedgerButton}
                onPress={() => navigation.navigate('CollectorEarnings')}
                activeOpacity={0.75}
              >
                <Text style={styles.earningsLedgerButtonText}>📊 {t('collector.viewEarnings', 'Earnings Ledger')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Direct 3-Part Financial Breakdown */}
          <View style={styles.summaryOverviewCard}>
            <View style={styles.summaryOverviewCol}>
              <Text style={styles.summaryOverviewLabel}>{t('payments.saleValue', 'Sale Value')}</Text>
              <Text style={styles.summaryOverviewValue}>₹{finalSaleValue.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryOverviewDivider} />
            <View style={styles.summaryOverviewCol}>
              <Text style={styles.summaryOverviewLabel}>{t('payments.received', 'Received')}</Text>
              <Text style={[styles.summaryOverviewValue, { color: '#34D399' }]}>
                ₹{Number(transaction.amountPaid || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryOverviewDivider} />
            <View style={styles.summaryOverviewCol}>
              <Text style={styles.summaryOverviewLabel}>{t('payments.pendingDues', 'Pending')}</Text>
              <Text
                style={[
                  styles.summaryOverviewValue,
                  { color: Number(transaction.amountDue || 0) > 0 ? '#F87171' : '#94A3B8' },
                ]}
              >
                ₹{Number(transaction.amountDue || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Financial Comparison Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 {t('payments.financialReconciliation', 'Financial Reconciliation')}</Text>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.quotedRate', 'Agreed Quoted Rate')}:</Text>
              <Text style={styles.tableValue}>
                ₹{Number(transaction.quotedUnitPrice || 0).toFixed(2)} / {transaction.unit}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.quotedTotal', 'Quoted Total')}:</Text>
              <Text style={styles.tableValue}>₹{quotedTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.finalRate', 'Final Unit Rate')}:</Text>
              <Text style={styles.tableValue}>
                ₹{Number(transaction.finalUnitPrice || 0).toFixed(2)} / {transaction.unit}
              </Text>
            </View>

            <View style={[styles.tableRow, styles.tableHighlightRow]}>
              <Text style={styles.tableHighlightLabel}>{t('payments.finalSaleValue', 'Final Sale Value')}:</Text>
              <Text style={styles.tableHighlightValue}>₹{finalSaleValue.toFixed(2)}</Text>
            </View>

            {/* Difference Row */}
            <View style={styles.differenceContainer}>
              <Text style={styles.differenceLabel}>{t('payments.varianceQuote', 'Variance vs Quote')}:</Text>
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

          {/* Realized Economic Margin Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 {t('payments.realizedEconomics', 'Realized Transaction Economics')}</Text>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.saleValue', 'Sale Value')}:</Text>
              <Text style={styles.tableValue}>₹{finalSaleValue.toFixed(2)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.acquisitionCost', 'Acquisition Cost')}:</Text>
              <Text style={styles.tableValue}>
                {(transaction as any).acquisitionCost !== undefined && (transaction as any).acquisitionCost !== null
                  ? `₹${Number((transaction as any).acquisitionCost).toFixed(2)}`
                  : 'Not recorded'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.transportCost', 'Transport Cost')}:</Text>
              <Text style={styles.tableValue}>
                {(transaction as any).transportCost !== undefined && (transaction as any).transportCost !== null
                  ? `₹${Number((transaction as any).transportCost).toFixed(2)}`
                  : 'Not recorded'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.otherCosts', 'Other Costs')}:</Text>
              <Text style={styles.tableValue}>
                {(transaction as any).otherCosts !== undefined && (transaction as any).otherCosts !== null
                  ? `₹${Number((transaction as any).otherCosts).toFixed(2)}`
                  : 'Not recorded'}
              </Text>
            </View>

            {/* Margin Display */}
            <View style={styles.marginContainer}>
              {(transaction as any).acquisitionCost !== undefined && (transaction as any).acquisitionCost !== null ? (
                <View style={styles.marginRow}>
                  <Text style={styles.marginLabel}>{t('payments.realizedMargin', 'Realized Margin')}:</Text>
                  <Text style={styles.marginValue}>
                    ₹{(
                      finalSaleValue -
                      Number((transaction as any).acquisitionCost || 0) -
                      Number((transaction as any).transportCost || 0) -
                      Number((transaction as any).otherCosts || 0)
                    ).toFixed(2)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.marginUnavailableText}>
                  ℹ️ Margin calculation unavailable — baseline cost data not recorded.
                </Text>
              )}
            </View>
          </View>

          {/* Payment Settlement Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💳 {t('payments.paymentBreakdown', 'Payment Breakdown')}</Text>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.paymentMethod', 'Payment Method')}:</Text>
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
              <Text style={styles.tableLabel}>{t('payments.amountPaid', 'Amount Paid')}:</Text>
              <Text style={styles.tablePaidValue}>
                ₹{Number(transaction.amountPaid || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('payments.amountDue', 'Amount Due')}:</Text>
              <Text
                style={[
                  styles.tableDueValue,
                  Number(transaction.amountDue || 0) > 0 && styles.tableDueActive,
                ]}
              >
                ₹{Number(transaction.amountDue || 0).toFixed(2)}
              </Text>
            </View>

            {/* Statutory Non-Movement Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ℹ️ {transaction.disclaimer || 'Recording only — ECOSETU does not transfer money.'}
              </Text>
            </View>

            {/* Payment Actions based on state */}
            {transaction.paymentStatus !== 'PAID' ? (
              <TouchableOpacity
                style={styles.updateStatusButton}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('PaymentMethod', {
                    transactionId: transaction.id,
                    transaction,
                  });
                }}
              >
                <Text style={styles.updateStatusButtonText}>💳 {t('payments.completePayment', 'Complete Payment / Confirm')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.updateStatusButton, { backgroundColor: 'rgba(16, 185, 129, 0.25)', borderColor: '#10B981' }]}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('CollectorBillDetail', {
                    transactionId: transaction.id,
                  });
                }}
              >
                <Text style={styles.updateStatusButtonText}>📄 {t('bills.viewBill', 'View Official Bill / Receipt')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.disputeButton}
              activeOpacity={0.8}
              onPress={() => setProblemModalVisible(true)}
            >
              <Text style={styles.disputeButtonText}>🚨 {t('disputes.reportIssue', 'Dispute Payment / Report Issue')}</Text>
            </TouchableOpacity>
          </View>

          {/* Provenance & Lifecycle Chain Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔗 {t('payments.provenanceChain', 'Lifecycle Provenance Chain')}</Text>
            <View style={styles.chainItem}>
              <Text style={styles.chainLabel}>1. Material Lot:</Text>
              <Text style={styles.chainValue}>
                {transaction.materialLot?.referenceNumber || 'Lot Record'} (
                {transaction.category} • {transaction.quantity} kg)
              </Text>
            </View>
            <View style={styles.chainItem}>
              <Text style={styles.chainLabel}>2. Agreed Quote:</Text>
              <Text style={styles.chainValue}>
                {transaction.quote?.referenceNumber || 'Quote Record'} (₹
                {Number(transaction.quotedUnitPrice || 0).toFixed(2)}/{transaction.unit})
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
            <View style={styles.chainItem}>
              <Text style={styles.chainLabel}>5. Official Bill / Receipt:</Text>
              {transaction.paymentStatus === 'PAID' ? (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('CollectorBillDetail', {
                      transactionId: transaction.id,
                    })
                  }
                >
                  <Text style={styles.chainLinkText}>
                    {t('bills.viewCanonicalBill', 'View Canonical Bill')} ➔
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.chainValue}>{t('payments.pendingConfirmation', 'Pending Payment Confirmation')}</Text>
              )}
            </View>
          </View>

          {/* Location & Parties Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 {t('payments.partiesLocation', 'Parties & Handover Location')}</Text>
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
        </ScrollView>

        {/* Update Payment Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Payment Status</Text>

              <View style={styles.pillGroup}>
                {['PAID', 'PARTIALLY_PAID', 'PENDING'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pillButton, newStatus === s && styles.pillButtonActive]}
                    onPress={() => setNewStatus(s as any)}
                  >
                    <Text style={[styles.pillButtonText, newStatus === s && styles.pillButtonTextActive]}>
                      {s.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newStatus === 'PARTIALLY_PAID' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Amount Paid (₹):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Enter amount paid"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={newAmountPaid}
                    onChangeText={setNewAmountPaid}
                  />
                </View>
              )}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleUpdatePayment}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>{t('common.save', 'Save Changes')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Report Problem / Dispute Modal */}
        <ReportProblemModal
          visible={problemModalVisible}
          onClose={() => setProblemModalVisible(false)}
          onDisputeCreated={() => {
            fetchTransaction(transaction.id);
          }}
          materialLotId={transaction.materialLotId || ''}
          transactionId={transaction.id}
          handoverId={transaction.handoverId}
          amount={Number(transaction.finalSaleValue) || undefined}
        />
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  errorText: {
    fontSize: 15,
    color: '#F87171',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    marginBottom: 12,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  refLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bannerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  referenceNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  badgePartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  badgePending: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  speechButton: {
    flex: 1,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  speechButtonText: {
    color: '#2DD4BF',
    fontWeight: '700',
    fontSize: 12,
  },
  earningsLedgerButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  earningsLedgerButtonText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 12,
  },
  summaryOverviewCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  summaryOverviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryOverviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryOverviewValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryOverviewDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  card: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableHighlightRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  tableLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  tableValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tablePaidValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34D399',
  },
  tableDueValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tableDueActive: {
    color: '#F87171',
  },
  tableHighlightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  tableHighlightValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
  },
  differenceContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  differenceLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  differenceValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  diffNeutral: {
    color: '#94A3B8',
  },
  diffPositive: {
    color: '#34D399',
  },
  diffNegative: {
    color: '#F87171',
  },
  marginContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  marginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marginLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  marginValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
  },
  marginUnavailableText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  updateStatusButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#14B8A6',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  updateStatusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disputeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disputeButtonText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  chainItem: {
    marginBottom: 10,
  },
  chainLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  chainValue: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 2,
  },
  chainValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  chainLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F2328',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pillButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  pillButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
