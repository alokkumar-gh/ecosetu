/**
 * PaymentMethodScreen.tsx — EcoSetu Settlement Payment Selection
 * Shared across: COLLECTOR, RECYCLER (Citizen views bills, doesn't pay here)
 *
 * Fully redesigned for premium consumer feel.
 * Backend preserved: paymentService, transactionService — no changes.
 * Canonical Reference: SIH Problem Statement 26229 - Sections 8, 9, 13, 14
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import transactionService, { type TransactionRecord } from '../../services/transactionService';
import paymentService from '../../services/paymentService';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { AppIcon, IconName } from '../../components/ui/AppIcon';

// ─── Method Option Card ───────────────────────────────────────────────────────

const MethodCard = ({
  icon,
  title,
  description,
  badge,
  loading,
  onPress,
  accent,
}: {
  icon: IconName;
  title: string;
  description: string;
  badge?: string;
  loading?: boolean;
  onPress: () => void;
  accent?: string;
}) => (
  <TouchableOpacity style={[styles.methodCard, loading && { opacity: 0.7 }]}
    onPress={onPress} disabled={loading} activeOpacity={0.82}
    accessibilityRole="button" accessibilityLabel={title}>
    <View style={[styles.methodIconBox, accent ? { backgroundColor: accent + '26', borderColor: accent + '50' } : undefined]}>
      <AppIcon name={icon} size={22} color={accent || colors.primary} />
    </View>
    <View style={styles.methodInfo}>
      <View style={styles.methodTitleRow}>
        <Text style={styles.methodTitle}>{title}</Text>
        {badge && (
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.methodDesc}>{description}</Text>
    </View>
    <View style={styles.methodChevronBox}>
      {loading
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <AppIcon name="chevronRight" size={18} color={accent || C.green} />}
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PaymentMethodScreen: React.FC = () => {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { transactionId, transaction: passedTx } = route.params || {};

  const [transaction, setTransaction] = useState<TransactionRecord | null>(passedTx || null);
  const [loading, setLoading] = useState(!passedTx);
  const [processingMethod, setProcessingMethod] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction && transactionId) loadTransaction(transactionId);
  }, [transactionId]);

  const loadTransaction = async (id: string) => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactionById(id);
      setTransaction(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCash = async () => {
    if (!transaction) return;
    try {
      setProcessingMethod('CASH');
      await paymentService.initiateCashConfirmation(transaction.id);
      navigation.navigate('CashPaymentConfirmation', { transactionId: transaction.id, transaction });
    } catch (err: any) {
      if (err.message?.includes('already')) {
        navigation.navigate('CashPaymentConfirmation', { transactionId: transaction.id, transaction });
      } else {
        Alert.alert('Error', err.message || 'Failed to initiate cash confirmation.');
      }
    } finally {
      setProcessingMethod(null);
    }
  };

  const handleSelectUpi = async () => {
    if (!transaction) return;
    try {
      setProcessingMethod('RAZORPAY_UPI');
      const orderInfo = await paymentService.createRazorpayOrder(transaction.id);
      Alert.alert(
        'Razorpay Checkout',
        `Initiating payment of ₹${Number(transaction.finalSaleValue).toFixed(2)}\nOrder: ${orderInfo.orderId}\nMode: TEST SANDBOX`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setProcessingMethod(null) },
          {
            text: 'Simulate Success',
            onPress: () => {
              navigation.navigate('PaymentResult', {
                transactionId: transaction.id,
                status: 'PENDING',
                paymentMethod: 'RAZORPAY_UPI',
                amount: Number(transaction.finalSaleValue),
                errorMessage: 'Razorpay payment initiated. Completing verification…',
              });
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Gateway Error', err.message || 'Failed to initialize payment gateway.');
    } finally {
      setProcessingMethod(null);
    }
  };

  // ── Loading state ──

  if (loading || !transaction) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <AppIcon name="arrowLeft" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading transaction…</Text>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const finalAmount = Number(transaction.finalSaleValue || 0);
  const weight = Number(transaction.quantity || transaction.handover?.handoverWeightKg || 0);
  const rate = Number(transaction.finalUnitPrice || transaction.quotedUnitPrice || 0);

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
            <Text style={styles.headerTitle}>{t('common.selectPayment', 'Select Payment')}</Text>
            <Text style={styles.headerSub}>{transaction.referenceNumber}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Amount Hero ── */}
          <View style={styles.amountCard}>
            <Text style={styles.amountCardLabel}>{t('common.amountToPay', 'Amount to Pay')}</Text>
            <Text style={styles.amountCardValue}>₹{finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.amountCardNote}>{t('common.verifiedSettlementAmount', 'Verified settlement amount')}</Text>
          </View>

          {/* ── Transaction Summary ── */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('common.transactionSummary', 'Transaction Summary')}</Text>
            {[
              { label: t('common.material', 'Material'), value: `${transaction.category}${transaction.subcategory ? ` · ${transaction.subcategory}` : ''}` },
              { label: t('common.qty', 'Quantity'), value: `${weight.toFixed(2)} ${transaction.unit || 'kg'}` },
              { label: t('common.agreedRate', 'Agreed Rate'), value: `₹${rate.toFixed(2)} / ${transaction.unit || 'kg'}` },
              { label: t('common.buyer', 'Buyer'), value: transaction.recycler?.facilityName || transaction.recycler?.user?.name || t('roles.recycler', 'Recycler') },
              { label: t('common.seller', 'Seller'), value: transaction.collector?.user?.name || t('roles.collector', 'Collector') },
            ].map(({ label, value }) => (
              <View key={label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ── Security Banner ── */}
          <View style={styles.securityBanner}>
            <AppIcon name="lock" size={14} color="#FBBF24" />
            <Text style={styles.securityText}>{t('common.secureSettlementGateway', 'Secure Settlement Gateway')}</Text>
          </View>

          {/* ── Payment Methods ── */}
          <Text style={styles.methodsLabel}>{t('common.choosePaymentMethod', 'Choose Payment Method')}</Text>

          <MethodCard
            icon="wallet"
            title={t('common.cash', 'Cash')}
            description={t('common.cashMethodDesc', 'Physical cash exchange with two-party confirmation')}
            loading={processingMethod === 'CASH'}
            onPress={handleSelectCash}
            accent="#10B981"
          />

          <MethodCard
            icon="zap"
            title={t('common.upiNetBanking', 'UPI / Net Banking')}
            description={t('common.upiMethodDesc', 'Instant transfer via Razorpay — Cards, UPI & Bank')}
            badge="SANDBOX"
            loading={processingMethod === 'RAZORPAY_UPI'}
            onPress={handleSelectUpi}
            accent="#60A5FA"
          />

          {/* ── Disclaimer ── */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              {t('common.settlementDisclaimer', 'EcoSetu verifies all settlements before issuing cryptographic bills. Dual-party confirmation prevents tampering.')}
            </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: C.text, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  headerSpacer: { width: 44 },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13, color: C.textSub, marginTop: 10 },

  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  // Amount hero
  amountCard: {
    backgroundColor: C.surface, borderRadius: 24, borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.30)', padding: 28, alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  amountCardLabel: { fontSize: 12, fontWeight: '700', color: C.green, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  amountCardValue: { fontSize: 40, fontWeight: '900', color: C.green, letterSpacing: -1, marginBottom: 6 },
  amountCardNote: { fontSize: 11, color: C.textSub },

  // Summary
  summaryCard: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    padding: 16, marginBottom: 12,
  },
  summaryTitle: { fontSize: 11, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { fontSize: 13, color: C.textSub },
  summaryValue: { fontSize: 13, fontWeight: '600', color: C.text, maxWidth: '55%', textAlign: 'right' },

  // Security
  securityBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(234,179,8,0.10)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.25)',
    borderRadius: 12, padding: 10, marginBottom: 16,
  },
  securityIcon: { fontSize: 14 },
  securityText: { fontSize: 12, fontWeight: '800', color: '#FBBF24', letterSpacing: 0.5 },

  // Methods label
  methodsLabel: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Method card
  methodCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  methodIconBox: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  methodEmoji: { fontSize: 22 },
  methodInfo: { flex: 1 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  methodTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  methodBadge: {
    backgroundColor: 'rgba(234,179,8,0.18)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.35)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
  },
  methodBadgeText: { fontSize: 9, fontWeight: '800', color: '#FBBF24' },
  methodDesc: { fontSize: 12, color: C.textSub, lineHeight: 16 },
  methodChevronBox: { marginLeft: 10, width: 28, alignItems: 'center' },
  methodChevron: { fontSize: 24, color: C.green, fontWeight: '800' },

  // Disclaimer
  disclaimer: {
    padding: 14, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
  },
  disclaimerText: { fontSize: 11, color: C.textSub, lineHeight: 16, textAlign: 'center' },
});

export default PaymentMethodScreen;
