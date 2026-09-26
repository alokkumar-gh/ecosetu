/**
 * CashPaymentConfirmationScreen.tsx — EcoSetu Cash Dual Confirmation
 * Shared across: CITIZEN, COLLECTOR, RECYCLER
 *
 * Fully redesigned for premium clarity.
 * Backend preserved: paymentService, transactionService — untouched.
 * Canonical Reference: SIH Problem Statement 26229 - Sections 3, 4, 5, 6, 15, 35
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
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import paymentService, { type CashPaymentConfirmation } from '../../services/paymentService';
import transactionService, { type TransactionRecord } from '../../services/transactionService';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { AppIcon } from '../../components/ui/AppIcon';

// ─── Party Status Bubble ──────────────────────────────────────────────────────

const PartyBubble = ({
  role,
  name,
  action,
  confirmed,
  isUser,
  t,
}: {
  role: string;
  name: string;
  action: string;
  confirmed: boolean;
  isUser: boolean;
  t: (key: string, def?: string) => string;
}) => (
  <View style={[styles.partyBubble, isUser && styles.partyBubbleUser]}>
    <View style={styles.partyLeft}>
      <View style={[styles.partyIconBox, isUser && styles.partyIconBoxUser]}>
        <AppIcon name={isUser ? 'user' : 'users'} size={18} color={isUser ? '#10B981' : '#3B82F6'} />
      </View>
      <View style={styles.partyTextGroup}>
        <Text style={styles.partyRole}>{role}</Text>
        <Text style={styles.partyName}>{name}</Text>
        <Text style={styles.partyAction}>{action}</Text>
      </View>
    </View>
    <View style={[styles.confirmBadge, confirmed ? styles.confirmBadgeDone : styles.confirmBadgePending]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {confirmed && <AppIcon name="check" size={11} color="#10B981" />}
        <Text style={[styles.confirmBadgeText, confirmed ? styles.confirmBadgeTextDone : styles.confirmBadgeTextPending]}>
          {confirmed ? t('payment.confirmed', 'Confirmed') : t('payment.waiting', 'Waiting…')}
        </Text>
      </View>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CashPaymentConfirmationScreen: React.FC = () => {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { transactionId, transaction: passedTx } = route.params || {};

  const [transaction, setTransaction] = useState<TransactionRecord | null>(passedTx || null);
  const [confirmation, setConfirmation] = useState<CashPaymentConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showDiscrepancy, setShowDiscrepancy] = useState(false);
  const [reportedAmount, setReportedAmount] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  useEffect(() => { loadData(); }, [transactionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!transaction && transactionId) {
        const tx = await transactionService.getTransactionById(transactionId);
        setTransaction(tx);
      }
      if (transactionId) {
        let conf = await paymentService.getCashConfirmation(transactionId);
        if (!conf) conf = await paymentService.initiateCashConfirmation(transactionId);
        setConfirmation(conf);
        if (conf?.confirmedAmount) setReportedAmount(String(conf.confirmedAmount));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load confirmation data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleConfirmFullAmount = async () => {
    if (!confirmation || !transaction) return;
    const expected = Number(confirmation.expectedAmount);
    Alert.alert(
      'Confirm Cash Exchange',
      `Confirm physical exchange of ₹${expected.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await paymentService.confirmCashPayment(
                transaction.id, expected, 'Full cash confirmed by user'
              );
              setConfirmation(result.confirmation);
              if (result.confirmation.status === 'CONFIRMED') {
                navigation.navigate(getBillRoute(), {
                  transactionId: transaction.id,
                  status: 'SUCCESS',
                  paymentMethod: 'CASH',
                  amount: expected,
                  billId: result.bill?.id,
                });
              } else {
                Alert.alert('Recorded', 'Your confirmation is recorded. Awaiting the other party.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Confirmation failed.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmitDiscrepancy = async () => {
    if (!confirmation || !transaction) return;
    const entered = parseFloat(reportedAmount);
    if (isNaN(entered) || entered < 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    try {
      setSubmitting(true);
      const result = await paymentService.confirmCashPayment(
        transaction.id, entered, discrepancyNotes || 'Amount discrepancy reported.'
      );
      setConfirmation(result.confirmation);
      setShowDiscrepancy(false);
      if (result.confirmation.status === 'DISPUTED') {
        Alert.alert(
          'Discrepancy Recorded',
          `Expected: ₹${Number(confirmation.expectedAmount).toFixed(2)} | Reported: ₹${entered.toFixed(2)}.\nRouted for dispute resolution.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Discrepancy submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBillRoute = () => {
    if (currentUser?.role === 'CITIZEN') return 'PaymentResult';
    if (currentUser?.role === 'RECYCLER') return 'PaymentResult';
    return 'PaymentResult';
  };

  const getBillDetailRoute = () => {
    if (currentUser?.role === 'CITIZEN') return 'CitizenBillDetail';
    if (currentUser?.role === 'RECYCLER') return 'RecyclerBillDetail';
    if (currentUser?.role === 'ADMIN') return 'AdminBillDetail';
    return 'CollectorBillDetail';
  };

  // ── Loading ──

  if (loading || !confirmation) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('payment.cashConfirmation', 'Cash Confirmation')}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading confirmation…')}</Text>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const expected = Number(confirmation.expectedAmount || 0);
  const isPayer = currentUser?.id === confirmation.payerUserId;
  const isReceiver = currentUser?.id === confirmation.receiverUserId;
  const payerConfirmed = Boolean(confirmation.payerConfirmedAt);
  const receiverConfirmed = Boolean(confirmation.receiverConfirmedAt);
  const userHasConfirmed = (isPayer && payerConfirmed) || (isReceiver && receiverConfirmed);
  const isFullyConfirmed = confirmation.status === 'CONFIRMED';
  const isDisputed = confirmation.status === 'DISPUTED';

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}
            accessibilityRole="button" accessibilityLabel={t('common.back', 'Go back')}>
            <AppIcon name="arrowLeft" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('payment.cashConfirmation', 'Cash Confirmation')}</Text>
            <Text style={styles.headerSub}>{t('payment.twoPartyVerification', 'Two-party verification')}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >

          {/* ── Amount Card ── */}
          <View style={styles.amountCard}>
            <AppIcon name="wallet" size={38} color={C.green} />
            <Text style={styles.amountLabel}>{t('payment.expectedCashAmount', 'Expected Cash Amount')}</Text>
            <Text style={styles.amountValue}>₹{expected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.amountNote}>{t('payment.authoritativeSettlement', 'Authoritative settlement amount')}</Text>
          </View>

          {/* ── Verification Status ── */}
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>{t('payment.counterpartyStatus', 'Counterparty Status')}</Text>
            <PartyBubble
              role={confirmation.payerRole || 'PAYER'}
              name={confirmation.payerUser?.name || 'Payer'}
              action={t('payment.iPaidCash', { amount: expected.toFixed(2) }, `"I paid ₹${expected.toFixed(2)} in cash"`)}
              confirmed={payerConfirmed}
              isUser={isPayer}
              t={t}
            />
            <View style={styles.statusCardDivider} />
            <PartyBubble
              role={confirmation.receiverRole || 'RECEIVER'}
              name={confirmation.receiverUser?.name || 'Receiver'}
              action={t('payment.iReceivedCash', { amount: expected.toFixed(2) }, `"I received ₹${expected.toFixed(2)} in cash"`)}
              confirmed={receiverConfirmed}
              isUser={isReceiver}
              t={t}
            />
          </View>

          {/* ── State-conditional UI ── */}
          {isFullyConfirmed ? (
            <View style={styles.successCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AppIcon name="checkCircle" size={20} color="#10B981" />
                <Text style={styles.successTitle}>{t('payment.paymentConfirmed', 'Payment Confirmed!')}</Text>
              </View>
              <Text style={styles.successMessage}>
                {t('payment.bothPartiesConfirmed', { amount: expected.toFixed(2) }, `Both parties confirmed ₹${expected.toFixed(2)}. Your official bill is ready.`)}
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate(getBillDetailRoute(), { transactionId: confirmation.transactionId })}
                activeOpacity={0.82}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AppIcon name="fileText" size={16} color="#071E22" />
                  <Text style={styles.primaryBtnText}>{t('payment.viewOfficialBill', 'View Official Bill')}</Text>
                </View>
              </TouchableOpacity>
            </View>

          ) : isDisputed ? (
            <View style={styles.disputeCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AppIcon name="alert" size={20} color="#F87171" />
                <Text style={styles.disputeTitle}>{t('payment.amountDispute', 'Amount Dispute')}</Text>
              </View>
              <Text style={styles.disputeMessage}>
                {t('payment.discrepancyDetected', { amount: Number(confirmation.discrepancyAmount || 0).toFixed(2) }, `Discrepancy of ₹${Number(confirmation.discrepancyAmount || 0).toFixed(2)} detected. Payment is paused pending EcoSetu admin resolution.`)}
              </Text>
            </View>

          ) : userHasConfirmed ? (
            <View style={styles.waitingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AppIcon name="clock" size={20} color="#FBBF24" />
                <Text style={styles.waitingTitle}>{t('payment.waitingOtherParty', 'Waiting for Other Party')}</Text>
              </View>
              <Text style={styles.waitingMessage}>
                {t('payment.confirmationRecordedWait', 'Your confirmation is recorded. The settlement will finalize once the other party confirms.')}
              </Text>
            </View>

          ) : (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleConfirmFullAmount}
                disabled={submitting}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                {submitting
                  ? <ActivityIndicator color="#071E22" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <AppIcon name="wallet" size={16} color="#071E22" />
                      <Text style={styles.primaryBtnText}>
                        {isPayer ? t('payment.iHandedCash', 'I Handed Over Cash') : t('payment.iReceivedCashBtn', 'I Received Cash')}
                      </Text>
                    </View>
                  )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discrepancyToggle}
                onPress={() => setShowDiscrepancy(!showDiscrepancy)}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <AppIcon name="alert" size={14} color="#F87171" />
                  <Text style={styles.discrepancyToggleText}>{t('payment.amountDiffersDispute', 'Amount differs — Report discrepancy')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Discrepancy Drawer ── */}
          {showDiscrepancy && !userHasConfirmed && (
            <View style={styles.discrepancyDrawer}>
              <Text style={styles.drawerTitle}>{t('payment.reportDifferentAmount', 'Report Different Amount')}</Text>
              <Text style={styles.drawerSub}>
                {t('payment.discrepancyInstruction', { amount: expected.toFixed(2) }, `If the physical cash differs from ₹${expected.toFixed(2)}, enter the exact amount you received or paid:`)}
              </Text>

              <Text style={styles.fieldLabel}>{t('payment.physicalAmount', 'Physical Amount (₹)')}</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="numeric"
                placeholder={`e.g. ${(expected - 100).toFixed(0)}`}
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={reportedAmount}
                onChangeText={setReportedAmount}
              />

              {Boolean(reportedAmount) && (
                <View style={styles.diffCalc}>
                  <Text style={styles.diffCalcText}>
                    {t('bills.expected', 'Expected')}: ₹{expected.toFixed(2)} | {t('bills.reported', 'Reported')}: ₹{parseFloat(reportedAmount) || 0} | {t('bills.difference', 'Diff')}: ₹{Math.abs(expected - (parseFloat(reportedAmount) || 0)).toFixed(2)}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>{t('payment.notesReason', 'Notes / Reason')}</Text>
              <TextInput
                style={[styles.fieldInput, { height: 60, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder={t('payment.discrepancyPlaceholder', 'e.g. Short change, deduction for transport…')}
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
                value={discrepancyNotes}
                onChangeText={setDiscrepancyNotes}
              />

              <TouchableOpacity
                style={styles.destructiveBtn}
                onPress={handleSubmitDiscrepancy}
                disabled={submitting}
                activeOpacity={0.82}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.destructiveBtnText}>{t('payment.submitDispute', 'Submit Dispute & Route for Review')}</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  surface: 'rgba(16,44,48,0.85)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.55)',
  green: '#10B981',
  bg: '#071E22',
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: C.text, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  headerSpacer: { width: 44 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13, color: C.textSub, marginTop: 10 },

  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  // Amount card
  amountCard: {
    alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.30)', padding: 28, marginBottom: 14,
  },
  amountEmoji: { fontSize: 40, marginBottom: 8 },
  amountLabel: { fontSize: 12, fontWeight: '700', color: C.green, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  amountValue: { fontSize: 38, fontWeight: '900', color: C.green, letterSpacing: -1, marginBottom: 6 },
  amountNote: { fontSize: 11, color: C.textSub },

  // Status card
  statusCard: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, padding: 16, marginBottom: 14,
  },
  statusCardTitle: { fontSize: 11, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  statusCardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 10 },

  // Party bubble
  partyBubble: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partyBubbleUser: {},
  partyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  partyIconBox: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.30)', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  partyIconBoxUser: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.30)' },
  partyIcon: { fontSize: 18 },
  partyTextGroup: { flex: 1 },
  partyRole: { fontSize: 10, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.3 },
  partyName: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 2 },
  partyAction: { fontSize: 11, color: C.textSub, marginTop: 2, fontStyle: 'italic' },

  confirmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  confirmBadgeDone: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10B981' },
  confirmBadgePending: { backgroundColor: 'rgba(234,179,8,0.15)', borderColor: '#FBBF24' },
  confirmBadgeText: { fontSize: 11, fontWeight: '700' },
  confirmBadgeTextDone: { color: '#10B981' },
  confirmBadgeTextPending: { color: '#FBBF24' },

  // Success / dispute / waiting cards
  successCard: {
    backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.35)', padding: 20, alignItems: 'center', marginBottom: 14,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#10B981', marginBottom: 8 },
  successMessage: { fontSize: 13, color: 'rgba(255,255,255,0.70)', textAlign: 'center', lineHeight: 19, marginBottom: 16 },

  disputeCard: {
    backgroundColor: 'rgba(239,68,68,0.10)', borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(248,113,113,0.30)', padding: 20, alignItems: 'center', marginBottom: 14,
  },
  disputeTitle: { fontSize: 16, fontWeight: '800', color: '#F87171', marginBottom: 8 },
  disputeMessage: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 18 },

  waitingCard: {
    backgroundColor: 'rgba(234,179,8,0.10)', borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(251,191,36,0.30)', padding: 20, alignItems: 'center', marginBottom: 14,
  },
  waitingTitle: { fontSize: 16, fontWeight: '800', color: '#FBBF24', marginBottom: 8 },
  waitingMessage: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 18 },

  // Actions
  actionSection: { marginBottom: 14 },
  primaryBtn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: C.bg },
  discrepancyToggle: { paddingVertical: 10, alignItems: 'center' },
  discrepancyToggleText: { fontSize: 13, fontWeight: '600', color: '#FBBF24' },

  // Discrepancy drawer
  discrepancyDrawer: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.25)', padding: 16, marginBottom: 14,
  },
  drawerTitle: { fontSize: 15, fontWeight: '800', color: '#F87171', marginBottom: 6 },
  drawerSub: { fontSize: 12, color: C.textSub, lineHeight: 16, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 10 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text,
  },
  diffCalc: {
    backgroundColor: 'rgba(234,179,8,0.14)', borderRadius: 8, padding: 8, borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.25)', marginVertical: 8,
  },
  diffCalcText: { fontSize: 11, fontWeight: '600', color: '#FBBF24' },
  destructiveBtn: { backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  destructiveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

export default CashPaymentConfirmationScreen;
