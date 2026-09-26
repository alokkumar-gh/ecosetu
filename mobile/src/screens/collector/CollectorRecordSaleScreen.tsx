/**
 * CollectorRecordSaleScreen.tsx
 * Collector Screen for Recording Sale Terms & Payment Method
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 7: Payment Recording + Transaction Dataset
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { AppIcon, AppIconName } from '../../components/ui';
import handoverService, { HandoverRecord } from '../../services/handoverService';
import transactionService, { TransactionRecord } from '../../services/transactionService';
import networkService from '../../services/networkService';

export const CollectorRecordSaleScreen: React.FC = () => {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { handoverId, handover: passedHandover } = route.params || {};

  const [handover, setHandover] = useState<HandoverRecord | null>(passedHandover || null);
  const [existingTransaction, setExistingTransaction] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [finalSaleValue, setFinalSaleValue] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI_RECORDED' | 'BANK_TRANSFER_RECORDED' | 'OTHER'>('CASH');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIALLY_PAID' | 'PENDING'>('PAID');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    checkNetwork();
    loadHandoverAndCheckTransaction();
  }, [handoverId]);

  const checkNetwork = async () => {
    const online = await networkService.isOnline();
    setIsOnline(online);
  };

  const loadHandoverAndCheckTransaction = async () => {
    if (!handoverId) return;
    try {
      setLoading(true);

      // Check if transaction already exists for this handover
      const existingTx = await transactionService.getTransactionByHandoverId(handoverId);
      if (existingTx) {
        setExistingTransaction(existingTx);
        setLoading(false);
        return;
      }

      // Fetch fresh handover if not passed
      const hdo = passedHandover || (await handoverService.getHandoverById(handoverId));
      setHandover(hdo);

      // Pre-fill finalSaleValue from quote total
      if (hdo?.quote?.quotedTotal) {
        setFinalSaleValue(String(Number(hdo.quote.quotedTotal).toFixed(2)));
        setAmountPaid(String(Number(hdo.quote.quotedTotal).toFixed(2)));
      } else if (hdo?.declaredWeightKg && hdo?.quote?.quotedUnitPrice) {
        const est = Number(hdo.declaredWeightKg) * Number(hdo.quote.quotedUnitPrice);
        setFinalSaleValue(String(est.toFixed(2)));
        setAmountPaid(String(est.toFixed(2)));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('transaction.handoverNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const quotedTotalNum = Number(handover?.quote?.quotedTotal) || 0;
  const finalValueNum = parseFloat(finalSaleValue) || 0;
  const differenceFromQuote = Number((finalValueNum - quotedTotalNum).toFixed(2));
  const diffPercent =
    quotedTotalNum > 0
      ? Number(((differenceFromQuote / quotedTotalNum) * 100).toFixed(1))
      : 0;

  const currentAmountPaidNum =
    paymentStatus === 'PAID'
      ? finalValueNum
      : paymentStatus === 'PENDING'
      ? 0
      : parseFloat(amountPaid) || 0;
  const calculatedAmountDue = Math.max(0, Number((finalValueNum - currentAmountPaidNum).toFixed(2)));

  const handleStatusChange = (status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING') => {
    setPaymentStatus(status);
    if (status === 'PAID') {
      setAmountPaid(finalSaleValue);
    } else if (status === 'PENDING') {
      setAmountPaid('0');
    } else {
      // Partially paid default to half
      setAmountPaid((finalValueNum / 2).toFixed(2));
    }
  };

  const handleSubmit = () => {
    if (!isOnline) {
      Alert.alert(
        t('common.offline'),
        t('transaction.offlineWarning')
      );
      return;
    }

    if (finalValueNum <= 0) {
      Alert.alert(t('transaction.invalidSaleAmountTitle'), t('transaction.invalidSaleAmountMsg'));
      return;
    }

    if (paymentStatus === 'PARTIALLY_PAID') {
      if (currentAmountPaidNum < 0) {
        Alert.alert(t('transaction.invalidSaleAmountTitle'), t('transaction.invalidPaidAmountMsg'));
        return;
      }
      if (currentAmountPaidNum > finalValueNum) {
        Alert.alert(
          t('transaction.invalidSaleAmountTitle'),
          t('transaction.invalidPaidAmountMsg')
        );
        return;
      }
    }

    setConfirmModalVisible(true);
  };

  const executeCreateTransaction = async () => {
    try {
      setSubmitting(true);
      const createdTx = await transactionService.createTransaction({
        handoverId: handover!.id,
        finalSaleValue: finalValueNum,
        paymentMethod,
        paymentStatus,
        amountPaid: currentAmountPaidNum,
        notes: notes.trim() || undefined,
      });

      setConfirmModalVisible(false);
      Alert.alert(
        t('transaction.saveTransaction'),
        `Transaction ${createdTx.referenceNumber} has been successfully recorded.`,
        [
          {
            text: t('transaction.viewTransactionDetails'),
            onPress: () =>
              navigation.replace('CollectorTransactionDetail', {
                transactionId: createdTx.id,
              }),
          },
        ]
      );
    } catch (err: any) {
      setConfirmModalVisible(false);
      Alert.alert(t('common.error'), err.message || t('transaction.handoverNotFound'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>{t('transaction.loadingHandover')}</Text>
      </View>
    );
  }

  if (existingTransaction) {
    return (
      <View style={styles.centerContainer}>
        <AppIcon name="check-circle" size={48} color="#16a34a" style={{ marginBottom: 12 }} />
        <Text style={styles.existingTitle}>{t('transaction.alreadyRecordedTitle')}</Text>
        <Text style={styles.existingRef}>Ref: {existingTransaction.referenceNumber}</Text>
        <Text style={styles.existingDesc}>
          {t('transaction.alreadyRecordedDesc')}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.replace('CollectorTransactionDetail', {
              transactionId: existingTransaction.id,
            })
          }
        >
          <Text style={styles.primaryButtonText}>{t('transaction.viewTransactionDetails')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!handover) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('transaction.handoverNotFound')}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Offline Warning Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <AppIcon name="wifi-off" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
          <Text style={styles.offlineBannerText}>
            {t('transaction.offlineWarning')}
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('transaction.recordSale')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('handover.handoverReference')}: {handover.referenceNumber}
        </Text>
      </View>

      {/* Handover & Commercial Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('transaction.commercialTerms')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('transaction.buyerRecycler')}:</Text>
          <Text style={styles.summaryValue}>
            {handover.recycler?.facilityName || 'Authorized Recycler'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('materialLots.category')}:</Text>
          <Text style={styles.summaryValue}>
            {handover.materialLot?.category || 'E-Waste'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('transaction.confirmedWeight')}:</Text>
          <Text style={styles.summaryValue}>
            {handover.handoverWeightKg || handover.declaredWeightKg || 0} kg
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('transaction.agreedQuotedTotal')}:</Text>
          <Text style={styles.summaryHighlight}>
            ₹{Number(quotedTotalNum).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Final Sale Value Input Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('transaction.finalSaleValueLabel')}</Text>
        <Text style={styles.fieldHint}>
          {t('transaction.finalSaleValueHint')}
        </Text>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          value={finalSaleValue}
          onChangeText={(val) => {
            setFinalSaleValue(val);
            if (paymentStatus === 'PAID') setAmountPaid(val);
          }}
          placeholder="0.00"
        />

        {/* Variance Feedback */}
        {quotedTotalNum > 0 && finalValueNum > 0 && (
          <View
            style={[
              styles.varianceContainer,
              differenceFromQuote === 0
                ? styles.varianceMatch
                : differenceFromQuote > 0
                ? styles.variancePositive
                : styles.varianceNegative,
            ]}
          >
            {differenceFromQuote === 0 ? (
              <AppIcon name="check" size={12} color="#15803d" style={{ marginRight: 4 }} />
            ) : null}
            <Text style={styles.varianceText}>
              {differenceFromQuote === 0
                ? t('transaction.varianceMatches')
                : differenceFromQuote > 0
                ? `+₹${differenceFromQuote} (+${diffPercent}%) vs quote`
                : `-₹${Math.abs(differenceFromQuote)} (${diffPercent}%) vs quote`}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Method Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('transaction.paymentMethodTitle')}</Text>
        <View style={styles.pillGroup}>
          {[
            { key: 'CASH', label: t('transaction.cash'), icon: 'dollar-sign' as AppIconName },
            { key: 'UPI_RECORDED', label: t('transaction.upi'), icon: 'smartphone' as AppIconName },
            { key: 'BANK_TRANSFER_RECORDED', label: t('transaction.bankTransfer'), icon: 'building' as AppIconName },
            { key: 'OTHER', label: t('ewaste.other'), icon: 'file-text' as AppIconName },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.pillButton,
                paymentMethod === item.key && styles.pillButtonActive,
              ]}
              onPress={() => setPaymentMethod(item.key as any)}
            >
              <AppIcon
                name={item.icon}
                size={14}
                color={paymentMethod === item.key ? '#15803d' : '#4b5563'}
              />
              <Text
                style={[
                  styles.pillButtonText,
                  paymentMethod === item.key && styles.pillButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disclaimer Banner */}
        <View style={styles.disclaimerBox}>
          <AppIcon name="info" size={14} color="#0369a1" style={{ marginRight: 6 }} />
          <Text style={styles.disclaimerText}>
            {paymentMethod === 'CASH'
              ? t('transaction.disclaimerCash')
              : t('transaction.disclaimerDigital')}
          </Text>
        </View>
      </View>

      {/* Payment Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('transaction.paymentStatusTitle')}</Text>
        <View style={styles.pillGroup}>
          {[
            { key: 'PAID', label: t('transaction.paid'), icon: 'check-circle' as AppIconName },
            { key: 'PARTIALLY_PAID', label: t('transaction.partiallyPaid'), icon: 'clock' as AppIconName },
            { key: 'PENDING', label: t('transaction.pending'), icon: 'clock' as AppIconName },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.pillButton,
                paymentStatus === item.key && styles.pillButtonActive,
              ]}
              onPress={() => handleStatusChange(item.key as any)}
            >
              <AppIcon
                name={item.icon}
                size={14}
                color={paymentStatus === item.key ? '#15803d' : '#4b5563'}
              />
              <Text
                style={[
                  styles.pillButtonText,
                  paymentStatus === item.key && styles.pillButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Partial Payment Breakdown */}
        {paymentStatus === 'PARTIALLY_PAID' && (
          <View style={styles.partialContainer}>
            <Text style={styles.fieldLabel}>{t('transaction.amountReceivedSoFar')}:</Text>
            <TextInput
              style={styles.amountInputSmall}
              keyboardType="numeric"
              value={amountPaid}
              onChangeText={setAmountPaid}
              placeholder="0.00"
            />
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>{t('transaction.remainingBalanceDue')}:</Text>
              <Text style={styles.dueValue}>₹{calculatedAmountDue.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Notes Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('transaction.notesOptional')}</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('transaction.notesPlaceholder')}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isOnline || submitting) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isOnline || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.btnInnerRow}>
            <AppIcon name="dollar-sign" size={16} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{t('transaction.recordTransactionBtn')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Sale Confirmation Modal - UX Rule 8 */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <AppIcon name="dollar-sign" size={20} color="#16a34a" />
              <Text style={styles.modalTitle}>{t('lowLiteracy.saleConfirmTitle') || 'Confirm Sale Record'}</Text>
            </View>
            <Text style={styles.modalMessage}>
              {t('lowLiteracy.saleConfirmMessage') || 'Review the sale amount and payment method.'}
            </Text>

            <View style={styles.modalSummaryBox}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.handoverRef')}:</Text>
                <Text style={styles.confirmValue}>{handover.referenceNumber}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.buyer')}:</Text>
                <Text style={styles.confirmValue}>{handover.recycler?.facilityName || 'Authorized Recycler'}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.category')}:</Text>
                <Text style={styles.confirmValue}>{handover.materialLot?.category || 'E-Waste'}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.totalAmount')}:</Text>
                <Text style={[styles.confirmValue, { fontSize: 16, color: '#16a34a', fontWeight: '800' }]}>
                  ₹{finalValueNum.toFixed(2)}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.paymentMethod')}:</Text>
                <Text style={[styles.confirmValue, { fontWeight: '700' }]}>
                  {paymentMethod === 'CASH'
                    ? t('transaction.cash')
                    : paymentMethod === 'UPI_RECORDED'
                    ? t('transaction.upi')
                    : paymentMethod === 'BANK_TRANSFER_RECORDED'
                    ? t('transaction.bankTransfer')
                    : t('ewaste.other')}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.paymentStatus')}:</Text>
                <Text style={styles.confirmValue}>
                  {paymentStatus === 'PAID'
                    ? t('transaction.paid')
                    : paymentStatus === 'PARTIALLY_PAID'
                    ? t('transaction.partiallyPaid')
                    : t('transaction.pending')}
                </Text>
              </View>
            </View>

            <View style={styles.modalDisclaimerBox}>
              <AppIcon name="alert-triangle" size={14} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={styles.modalDisclaimerText}>
                {t('lowLiteracy.paymentDisclaimerShort') || 'Recording only. ECOSETU does not move money or process bank/UPI payments.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelBtnText}>{t('lowLiteracy.cancelAction') || 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={executeCreateTransaction}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.btnInnerRow}>
                    <AppIcon name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.modalConfirmBtnText}>
                      {t('lowLiteracy.confirmSaleAction') || 'Record Sale'}
                    </Text>
                  </View>
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
  offlineBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16a34a',
  },
  fieldHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  amountInputSmall: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginTop: 4,
  },
  varianceContainer: {
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
  },
  varianceMatch: {
    backgroundColor: '#f0fdf4',
  },
  variancePositive: {
    backgroundColor: '#ecfdf5',
  },
  varianceNegative: {
    backgroundColor: '#fef2f2',
  },
  varianceText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#334155',
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pillButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pillButtonTextActive: {
    color: '#15803d',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  partialContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 4,
  },
  dueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
  },
  dueValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  existingIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  existingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  existingRef: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    marginBottom: 8,
  },
  existingDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  confirmLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flexShrink: 1,
  },
  modalDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginBottom: 16,
  },
  modalDisclaimerText: {
    fontSize: 11,
    color: '#854d0e',
    lineHeight: 16,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 130,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default CollectorRecordSaleScreen;
