/**
 * BillsScreen.tsx — EcoSetu Payment Records
 * Shared across: CITIZEN, COLLECTOR, RECYCLER, ADMIN
 *
 * Completely redesigned for coherence with Citizen consumer product.
 * Backend preserved: billService.listBills(), role-aware navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import billService, { type TransactionBill } from '../../services/billService';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { AppIcon } from '../../components/ui/AppIcon';

type BillTab = 'ALL' | 'PAID' | 'PENDING' | 'DISPUTED';

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusMeta(status: string, t: any) {
  switch (status) {
    case 'PAID':
      return { label: t('status.paid', 'Paid'), color: '#10B981', bg: 'rgba(16,185,129,0.14)', icon: 'checkCircle' as const };
    case 'PENDING':
    case 'PROCESSING':
      return { label: status === 'PROCESSING' ? t('status.processing', 'Processing') : t('status.pending', 'Pending'), color: '#FBBF24', bg: 'rgba(251,191,36,0.14)', icon: 'clock' as const };
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

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

// ─── Bill Card ────────────────────────────────────────────────────────────────

const BillCard = React.memo(({ item, onPress }: { item: TransactionBill; onPress: () => void }) => {
  const { t } = useI18n();
  const meta = getStatusMeta(item.paymentStatus, t);
  const counterparty = item.buyer?.name || item.seller?.name || t('common.partner', 'Partner');
  const dateStr = fmtDate(item.transactionDate || item.generatedAt);
  const amount = `₹${Number(item.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <TouchableOpacity style={styles.billCard} onPress={onPress} activeOpacity={0.82}
      accessibilityRole="button" accessibilityLabel={`Bill ${item.billNumber}, ${item.paymentStatus}, ${amount}`}>

      {/* Top Row */}
      <View style={styles.billCardTop}>
        <View style={[styles.billIconBox, { backgroundColor: meta.bg }]}>
          <AppIcon name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View style={styles.billCardInfo}>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
          <Text style={styles.billDate}>{dateStr}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.billDivider} />

      {/* Details */}
      <View style={styles.billDetails}>
        <View style={styles.billDetailCol}>
          <Text style={styles.billDetailLabel}>{t('common.item', 'Item')}</Text>
          <Text style={styles.billDetailValue} numberOfLines={1}>
            {item.materialCategory}{item.materialSubcategory ? ` · ${item.materialSubcategory}` : ''}
          </Text>
        </View>
        <View style={styles.billDetailCol}>
          <Text style={styles.billDetailLabel}>{t('common.qty', 'Qty')}</Text>
          <Text style={styles.billDetailValue}>
            {Number(item.quantity).toFixed(1)} {item.unit || 'units'}
          </Text>
        </View>
        <View style={[styles.billDetailCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.billDetailLabel}>{t('common.amount', 'Amount')}</Text>
          <Text style={styles.billAmount}>{amount}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.billFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <AppIcon name={item.paymentMethod === 'CASH' ? 'wallet' : 'creditCard'} size={12} color={C.textSub} />
          <Text style={styles.billPayMethod}>
            {item.paymentMethod === 'CASH' ? t('common.cash', 'Cash') : item.paymentMethod === 'RAZORPAY_UPI' ? t('common.upi', 'UPI') : item.paymentMethod}
          </Text>
        </View>
        <Text style={styles.billParty} numberOfLines={1}>{t('common.party', 'Party')}: {counterparty}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const BillsScreen: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [bills, setBills] = useState<TransactionBill[]>([]);
  const [activeTab, setActiveTab] = useState<BillTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const query: any = { limit: 50 };
      if (activeTab !== 'ALL') query.paymentStatus = activeTab;
      const data = await billService.listBills(query);
      setBills(data?.bills || []);
    } catch (err: any) {
      console.warn('[BillsScreen] Failed to fetch bills:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const onRefresh = () => { setRefreshing(true); fetchBills(); };

  const getDetailRoute = () => {
    if (user?.role === 'CITIZEN') return 'CitizenBillDetail';
    if (user?.role === 'RECYCLER') return 'RecyclerBillDetail';
    if (user?.role === 'ADMIN') return 'AdminBillDetail';
    return 'CollectorBillDetail';
  };

  const TABS: { key: BillTab; label: string }[] = [
    { key: 'ALL', label: t('common.all', 'All') },
    { key: 'PAID', label: t('status.paid', 'Paid') },
    { key: 'PENDING', label: t('status.pending', 'Pending') },
    { key: 'DISPUTED', label: t('status.disputed', 'Disputed') },
  ];

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
            <Text style={styles.headerTitle}>{t('billing.bills', 'Payment Records')}</Text>
            <Text style={styles.headerSub}>{t('billing.billsSubtitle', 'Bills & receipts')}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key }}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ── */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading records…')}</Text>
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                tintColor={colors.primary} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <AppIcon name="fileText" size={44} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>{t('billing.noBills', 'No Payment Records')}</Text>
                <Text style={styles.emptyMessage}>
                  {t('billing.noBillsDescription', 'Bills and receipts are generated automatically when transactions are settled.')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <BillCard
                item={item}
                onPress={() => navigation.navigate(getDetailRoute(), { billId: item.id, bill: item })}
              />
            )}
          />
        )}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  headerSpacer: { width: 44 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 3, marginBottom: 12,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center' },
  tabBtnActive: { backgroundColor: 'rgba(16,185,129,0.22)' },
  tabText: { fontSize: 12, fontWeight: '600', color: C.textSub },
  tabTextActive: { color: '#34D399', fontWeight: '800' },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 13, color: C.textSub, marginTop: 10 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1, gap: 12 },

  // Bill card
  billCard: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  billCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  billIconBox: {
    width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  billIconText: { fontSize: 20 },
  billCardInfo: { flex: 1 },
  billNumber: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 0.3 },
  billDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  billDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },

  billDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billDetailCol: { flex: 1 },
  billDetailLabel: { fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  billDetailValue: { fontSize: 13, fontWeight: '600', color: C.text },
  billAmount: { fontSize: 18, fontWeight: '900', color: C.green },

  billFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  billPayMethod: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  billParty: { fontSize: 12, color: C.textSub, maxWidth: '55%', textAlign: 'right' },

  // Empty
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 64 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
});

export default BillsScreen;
