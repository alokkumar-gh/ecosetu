/**
 * BillDetailScreen.tsx — EcoSetu Transaction Bill Detail
 * Shared across: CITIZEN, COLLECTOR, RECYCLER, ADMIN
 *
 * Completely redesigned for consumer clarity.
 * Backend preserved: billService.getBillById() / getBillByTransactionId()
 * Canonical Reference: SIH Problem Statement 26229 - Sections 17, 18, 19, 25, 27
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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import billService, { type TransactionBill } from '../../services/billService';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { AppIcon } from '../../components/ui/AppIcon';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return '—'; }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function getStatusMeta(status: string, t: any) {
  switch (status) {
    case 'PAID':
      return { label: t('status.paid', 'Paid'), color: '#10B981', bg: 'rgba(16,185,129,0.14)', icon: 'checkCircle' as const };
    case 'PENDING':
    case 'PROCESSING':
      return { label: t('status.pending', 'Pending Payment'), color: '#FBBF24', bg: 'rgba(251,191,36,0.14)', icon: 'clock' as const };
    case 'DISPUTED':
      return { label: t('status.disputed', 'Disputed'), color: '#F87171', bg: 'rgba(239,68,68,0.14)', icon: 'alert' as const };
    case 'ADJUSTED':
      return { label: t('status.adjusted', 'Adjusted'), color: '#818CF8', bg: 'rgba(99,102,241,0.14)', icon: 'refresh' as const };
    case 'REFUNDED':
      return { label: t('status.refunded', 'Refunded'), color: '#60A5FA', bg: 'rgba(59,130,246,0.14)', icon: 'arrowLeft' as const };
    default:
      return { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', icon: 'fileText' as const };
  }
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={rowStyles.row}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[rowStyles.value, highlight && rowStyles.valueHighlight]}>{value}</Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7 },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.50)', flex: 1 },
  value: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', maxWidth: '55%', textAlign: 'right' },
  valueHighlight: { color: '#10B981', fontWeight: '800', fontSize: 15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const BillDetailScreen: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { billId, transactionId, bill: passedBill } = route.params || {};

  const [bill, setBill] = useState<TransactionBill | null>(passedBill || null);
  const [loading, setLoading] = useState(!passedBill);

  useEffect(() => {
    if (!bill) loadBill();
  }, [billId, transactionId]);

  const loadBill = async () => {
    try {
      setLoading(true);
      let data: TransactionBill | null = null;
      if (billId) data = await billService.getBillById(billId);
      else if (transactionId) data = await billService.getBillByTransactionId(transactionId);
      setBill(data);
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to load bill record.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!bill) return;
    try {
      const msg =
        `ECOSETU PAYMENT RECORD\n` +
        `Bill: ${bill.billNumber}\n` +
        `Date: ${fmtDate(bill.transactionDate || bill.generatedAt)}\n` +
        `Item: ${bill.materialCategory}${bill.materialSubcategory ? ` · ${bill.materialSubcategory}` : ''}\n` +
        `Quantity: ${bill.quantity} ${bill.unit}\n` +
        `Amount: ₹${Number(bill.finalAmount).toFixed(2)}\n` +
        `Method: ${bill.paymentMethod} (${bill.paymentStatus})\n` +
        `Ref: ${bill.verificationHash?.substring(0, 16)}…`;
      await Share.share({ title: `EcoSetu Bill ${bill.billNumber}`, message: msg });
    } catch (err: any) {
      console.warn('Share error:', err);
    }
  };

  // ── Loading ──

  if (loading || !bill) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}
              accessibilityRole="button" accessibilityLabel={t('common.back', 'Go back')}>
              <AppIcon name="arrowLeft" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('billing.bills', 'Bill Details')}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading bill…')}</Text>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const subtotal = Number(bill.subtotal || 0);
  const adjustments = Number(bill.adjustments || 0);
  const finalAmount = Number(bill.finalAmount || 0);
  const hasAdjustments = adjustments !== 0;
  const meta = getStatusMeta(bill.paymentStatus, t);
  const isPending = bill.paymentStatus === 'PENDING' || bill.paymentStatus === 'PROCESSING';
  const isDisputed = bill.paymentStatus === 'DISPUTED';

  const dateStr = fmtDate(bill.transactionDate || bill.generatedAt);
  const timeStr = fmtTime(bill.transactionDate || bill.generatedAt);

  const paymentRoute =
    user?.role === 'CITIZEN' ? 'PaymentMethod'
    : user?.role === 'RECYCLER' ? 'PaymentMethod'
    : 'PaymentMethod';

  const traceRoute =
    user?.role === 'CITIZEN' ? 'ItemTraceability'
    : user?.role === 'COLLECTOR' ? 'CollectorLotTrace'
    : null;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}
            accessibilityRole="button" accessibilityLabel={t('common.back', 'Go back')}>
            <AppIcon name="arrowLeft" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('billing.bills', 'Payment Record')}</Text>
          <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare}
            accessibilityRole="button" accessibilityLabel={t('common.share', 'Share bill')}>
            <AppIcon name="share" size={18} color={C.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Status Hero ── */}
          <View style={[styles.statusHero, { borderColor: meta.color + '55' }]}>
            <View style={[styles.statusIconRing, { backgroundColor: meta.bg, borderColor: meta.color }]}>
              <AppIcon name={meta.icon as any} size={28} color={meta.color} />
            </View>
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
            <Text style={styles.billNumberText}>{bill.billNumber}</Text>
            <Text style={styles.billDateTime}>{dateStr} {timeStr ? `at ${timeStr}` : ''}</Text>
          </View>

          {/* ── Amount ── */}
          <View style={styles.amountSection}>
            <Text style={styles.amountSublabel}>{t('common.totalAmount', 'Total Amount')}</Text>
            <Text style={styles.amountValue}>₹{finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name={bill.paymentMethod === 'CASH' ? 'wallet' : 'creditCard'} size={14} color={C.textSub} />
              <Text style={styles.payMethodTag}>
                {bill.paymentMethod === 'CASH' ? t('common.cash', 'Cash') : bill.paymentMethod === 'RAZORPAY_UPI' ? t('common.upi', 'UPI / Bank') : bill.paymentMethod}
              </Text>
            </View>
          </View>

          {/* ── Item Details ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.itemDetails', 'Item Details')}</Text>
            <InfoRow label={t('common.category', 'Category')} value={`${bill.materialCategory}${bill.materialSubcategory ? ` · ${bill.materialSubcategory}` : ''}`} />
            <View style={styles.thinDivider} />
            <InfoRow label={t('common.qty', 'Quantity')} value={`${Number(bill.quantity).toFixed(1)} ${bill.unit || 'units'}`} />
            <View style={styles.thinDivider} />
            <InfoRow label={t('common.rate', 'Rate')} value={`₹${Number(bill.agreedRate || 0).toFixed(2)} / ${bill.unit || 'unit'}`} />
          </View>

          {/* ── Amount Breakdown ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.amountBreakdown', 'Amount Breakdown')}</Text>
            <InfoRow label={t('common.subtotal', 'Subtotal')} value={`₹${subtotal.toFixed(2)}`} />
            {hasAdjustments && (
              <>
                <View style={styles.thinDivider} />
                <InfoRow label={t('common.adjustment', 'Adjustment')} value={adjustments > 0 ? `+₹${adjustments.toFixed(2)}` : `-₹${Math.abs(adjustments).toFixed(2)}`} />
              </>
            )}
            <View style={styles.thickDivider} />
            <InfoRow label={t('common.totalSettled', 'Total Settled')} value={`₹${finalAmount.toFixed(2)}`} highlight />
          </View>

          {/* ── Parties ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.parties', 'Parties')}</Text>
            <View style={styles.partiesGrid}>
              <View style={styles.partyBox}>
                <Text style={styles.partyRoleTag}>{bill.sellerRole || t('common.seller', 'SELLER')}</Text>
                <Text style={styles.partyName} numberOfLines={1}>{bill.seller?.name || '—'}</Text>
                {bill.seller?.phone && <Text style={styles.partyPhone}>{bill.seller.phone}</Text>}
              </View>
              <View style={styles.partyArrow}>
                <AppIcon name="arrowRight" size={16} color={C.textDim} />
              </View>
              <View style={[styles.partyBox, { alignItems: 'flex-end' }]}>
                <Text style={styles.partyRoleTag}>{bill.buyerRole || t('common.buyer', 'BUYER')}</Text>
                <Text style={styles.partyName} numberOfLines={1}>{bill.buyer?.name || '—'}</Text>
                {bill.buyer?.phone && <Text style={styles.partyPhone}>{bill.buyer.phone}</Text>}
              </View>
            </View>
          </View>

          {/* ── References ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.references', 'References')}</Text>
            {bill.handover?.referenceNumber && (
              <>
                <InfoRow label={t('common.handoverRef', 'Handover Ref')} value={bill.handover.referenceNumber} />
                <View style={styles.thinDivider} />
              </>
            )}
            {bill.transaction?.referenceNumber && (
              <>
                <InfoRow label={t('common.transactionRef', 'Transaction Ref')} value={bill.transaction.referenceNumber} />
                <View style={styles.thinDivider} />
              </>
            )}
            {bill.providerReference && (
              <>
                <InfoRow label={t('common.gatewayRef', 'Gateway Ref')} value={bill.providerReference} />
                <View style={styles.thinDivider} />
              </>
            )}
            {bill.verificationHash && (
              <View style={styles.hashBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <AppIcon name="lock" size={12} color={C.green} />
                  <Text style={[styles.hashLabel, { marginBottom: 0 }]}>{t('common.verificationFingerprint', 'Verification Fingerprint')}</Text>
                </View>
                <Text style={styles.hashValue} numberOfLines={2} selectable>{bill.verificationHash}</Text>
              </View>
            )}
          </View>

          {/* ── Actions ── */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.82}
              accessibilityRole="button">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <AppIcon name="share" size={16} color={C.bg} />
                <Text style={styles.shareBtnText}>{t('common.shareReceipt', 'Share Receipt')}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              {isPending && bill.transactionId && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate(paymentRoute, { transactionId: bill.transactionId })}
                  activeOpacity={0.82}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <AppIcon name="creditCard" size={15} color={C.text} />
                    <Text style={styles.secondaryBtnText}>{t('common.payNow', 'Pay Now')}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {traceRoute && bill.materialLotId && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    if (user?.role === 'CITIZEN') {
                      navigation.navigate('ItemTraceability', { itemId: bill.materialLotId });
                    } else {
                      navigation.navigate('CollectorLotTrace', { lotId: bill.materialLotId });
                    }
                  }}
                  activeOpacity={0.82}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <AppIcon name="link" size={15} color={C.text} />
                    <Text style={styles.secondaryBtnText}>{t('common.traceItem', 'Trace Item')}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {isDisputed && (
              <View style={styles.disputeNotice}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AppIcon name="alert" size={16} color="#F87171" />
                  <Text style={[styles.disputeTitle, { marginBottom: 0 }]}>{t('common.disputeInProgress', 'Dispute in Progress')}</Text>
                </View>
                <Text style={styles.disputeMessage}>
                  {t('common.disputeMessage', 'This bill has an amount discrepancy. An EcoSetu administrator will review and resolve it. No action required from you at this time.')}
                </Text>
              </View>
            )}
          </View>

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
  textDim: 'rgba(255,255,255,0.35)',
  green: '#10B981',
  bg: '#071E22',
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: C.text, fontWeight: '700' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.text },
  headerSpacer: { width: 44 },
  shareIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, borderWidth: 1, borderColor: C.border },
  shareIconText: { fontSize: 18, color: C.text, fontWeight: '700' },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13, color: C.textSub, marginTop: 10 },

  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  // Status hero
  statusHero: {
    alignItems: 'center', paddingVertical: 28, marginBottom: 16,
    backgroundColor: C.surface, borderRadius: 24, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  statusIconRing: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 12,
  },
  statusIcon: { fontSize: 28 },
  statusLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8 },
  billNumberText: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: 0.5, marginBottom: 4 },
  billDateTime: { fontSize: 12, color: C.textSub },

  // Amount
  amountSection: {
    alignItems: 'center', backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.28)', padding: 20, marginBottom: 16,
  },
  amountSublabel: { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  amountValue: { fontSize: 36, fontWeight: '900', color: C.green, letterSpacing: -1, marginBottom: 8 },
  payMethodTag: { fontSize: 13, color: C.textSub, fontWeight: '600' },

  // Section
  section: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    padding: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  thinDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 1 },
  thickDivider: { height: 1.5, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 8 },

  // Parties
  partiesGrid: { flexDirection: 'row', alignItems: 'center' },
  partyBox: { flex: 1 },
  partyRoleTag: { fontSize: 10, fontWeight: '800', color: C.green, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  partyName: { fontSize: 14, fontWeight: '700', color: C.text },
  partyPhone: { fontSize: 11, color: C.textSub, marginTop: 2 },
  partyArrow: { paddingHorizontal: 10 },
  partyArrowText: { fontSize: 20, color: C.textDim },

  // Hash
  hashBox: {
    backgroundColor: 'rgba(16,185,129,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.20)', padding: 12, marginTop: 8,
  },
  hashLabel: { fontSize: 10, fontWeight: '700', color: C.green, textTransform: 'uppercase', marginBottom: 6 },
  hashValue: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.25)', padding: 6, borderRadius: 6 },

  // Actions
  actionsSection: { marginTop: 4 },
  shareBtn: {
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', marginBottom: 10,
  },
  shareBtnText: { fontSize: 15, fontWeight: '800', color: C.bg },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  secondaryBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: C.text },

  // Dispute
  disputeNotice: {
    backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)',
    borderRadius: 16, padding: 16,
  },
  disputeTitle: { fontSize: 14, fontWeight: '800', color: '#F87171', marginBottom: 8 },
  disputeMessage: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19 },
});

export default BillDetailScreen;
