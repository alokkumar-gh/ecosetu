/**
 * PaymentResultScreen.tsx — EcoSetu Payment Outcome
 * Shared across: CITIZEN, COLLECTOR, RECYCLER
 *
 * Fully redesigned for premium consumer clarity.
 * Backend preserved — no services called (result screen).
 * Canonical Reference: SIH Problem Statement 26229 - Section 16
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { AppIcon } from '../../components/ui/AppIcon';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PaymentResultScreen: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const {
    transactionId,
    status = 'PENDING',
    paymentMethod = 'CASH',
    amount = 0,
    billId,
    errorMessage,
  } = route.params || {};

  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED';
  const isPending = status === 'PENDING';

  const role = user?.role || 'CITIZEN';

  const billDetailRoute =
    role === 'CITIZEN' ? 'CitizenBillDetail'
    : role === 'RECYCLER' ? 'RecyclerBillDetail'
    : role === 'ADMIN' ? 'AdminBillDetail'
    : 'CollectorBillDetail';

  const dashboardRoute =
    role === 'CITIZEN' ? 'CitizenRequests'
    : role === 'RECYCLER' ? 'RecyclerIncoming'
    : 'CollectorTransactions';

  // Visual config
  const config = isSuccess
    ? {
        icon: 'checkCircle' as const,
        title: t('payment.paymentComplete', 'Payment Complete!'),
        color: '#10B981',
        bg: 'rgba(16,185,129,0.14)',
        border: 'rgba(52,211,153,0.30)',
        sub: t('payment.transactionVerifiedSettled', 'The transaction has been verified and officially settled.'),
      }
    : isFailed
    ? {
        icon: 'alert' as const,
        title: t('payment.paymentFailed', 'Payment Failed'),
        color: '#F87171',
        bg: 'rgba(239,68,68,0.14)',
        border: 'rgba(248,113,113,0.30)',
        sub: errorMessage || t('payment.paymentFailedSub', 'Payment could not be processed. Please try again.'),
      }
    : {
        icon: 'clock' as const,
        title: t('payment.awaitingConfirmation', 'Awaiting Confirmation'),
        color: '#FBBF24',
        bg: 'rgba(234,179,8,0.14)',
        border: 'rgba(251,191,36,0.30)',
        sub: t('payment.waitingBothPartiesSub', 'Waiting for both parties to confirm the cash exchange.'),
      };

  const paymentLabel =
    paymentMethod === 'CASH' ? t('bills.cash', 'Cash')
    : paymentMethod === 'RAZORPAY_UPI' ? t('bills.upiBank', 'UPI / Bank')
    : paymentMethod;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Status Card ── */}
          <View style={[styles.statusCard, { borderColor: config.border }]}>
            {/* Icon Ring */}
            <View style={[styles.iconRing, { backgroundColor: config.bg, borderColor: config.color }]}>
              <AppIcon name={config.icon} size={38} color={config.color} />
            </View>

            <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.statusSub}>{config.sub}</Text>

            <View style={styles.divider} />

            {/* Fact Sheet */}
            <View style={styles.factSheet}>
              {Boolean(transactionId) && (
                <View style={styles.factRow}>
                  <Text style={styles.factLabel}>{t('payment.transaction', 'Transaction')}</Text>
                  <Text style={styles.factValue} numberOfLines={1}>
                    {(transactionId || '').substring(0, 16)}…
                  </Text>
                </View>
              )}
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('payment.method', 'Method')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name={paymentMethod === 'CASH' ? 'wallet' : 'creditCard'} size={13} color={C.text} />
                  <Text style={styles.factValue}>{paymentLabel}</Text>
                </View>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('payment.amount', 'Amount')}</Text>
                <Text style={[styles.factValue, styles.factValueAmount]}>
                  ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('payment.timestamp', 'Timestamp')}</Text>
                <Text style={styles.factValue}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={styles.ctaSection}>
            {isSuccess && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate(billDetailRoute, { billId, transactionId })}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AppIcon name="fileText" size={18} color={C.bg} />
                  <Text style={styles.primaryBtnText}>{t('payment.viewOfficialReceipt', 'View Official Receipt')}</Text>
                </View>
              </TouchableOpacity>
            )}

            {isFailed && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => navigation.navigate('PaymentMethod', { transactionId })}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AppIcon name="refresh" size={18} color="#FFF" />
                  <Text style={[styles.primaryBtnText, { color: '#FFF' }]}>{t('payment.retryPayment', 'Retry Payment')}</Text>
                </View>
              </TouchableOpacity>
            )}

            {isPending && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#D97706' }]}
                onPress={() => navigation.navigate('CashPaymentConfirmation', { transactionId })}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AppIcon name="clock" size={18} color="#FFF" />
                  <Text style={[styles.primaryBtnText, { color: '#FFF' }]}>{t('payment.checkConfirmationStatus', 'Check Confirmation Status')}</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate(dashboardRoute)}
              activeOpacity={0.75}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>{t('payment.backToDashboard', 'Back to Dashboard')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── EcoSetu note ── */}
          {isSuccess && (
            <View style={styles.ecoNote}>
              <AppIcon name="recycle" size={18} color={C.green} />
              <Text style={styles.ecoNoteText}>
                {t('payment.recyclingDifferenceNote', 'Thank you for supporting responsible e-waste management. Every item recycled makes a difference.')}
              </Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  surface: 'rgba(16,44,48,0.90)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.55)',
  green: '#10B981',
  bg: '#071E22',
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24, justifyContent: 'center' },

  // Status card
  statusCard: {
    backgroundColor: C.surface, borderRadius: 28, borderWidth: 1.5,
    padding: 28, alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  iconRing: {
    width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, marginBottom: 18,
  },
  iconEmoji: { fontSize: 38 },
  statusTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8, letterSpacing: -0.3 },
  statusSub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 20 },

  // Fact sheet
  factSheet: { width: '100%' },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  factLabel: { fontSize: 13, color: C.textSub },
  factValue: { fontSize: 13, fontWeight: '600', color: C.text },
  factValueAmount: { fontSize: 16, fontWeight: '900', color: C.green },

  // CTAs
  ctaSection: { gap: 10 },
  primaryBtn: {
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: C.bg },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: C.textSub },

  // Eco note
  ecoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(16,185,129,0.07)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.20)', padding: 14, marginTop: 8,
  },
  ecoNoteEmoji: { fontSize: 18 },
  ecoNoteText: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 17 },
});

export default PaymentResultScreen;
