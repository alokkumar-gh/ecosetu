/**
 * RecyclerMoneyScreen — MONEY = PROCUREMENT SPEND + PAYMENTS
 *
 * COMPLETELY NEW. NOT a copy of CollectorEarningsScreen.
 *
 * Recycler needs: TOTAL PURCHASES, PENDING PAYMENTS, COMPLETED PAYMENTS
 *
 * Sections:
 *  1. RecyclerMoneySummary hero — total spend, pending, completed
 *  2. Period filter — All Time / This Month / This Week
 *  3. Pending payment rows (amber highlight)
 *  4. Transaction list — RecyclerSpendRow per item
 *  5. Quick actions: View Bills, View Transactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  RecyclerHeader,
  RecyclerMoneySummary,
  RecyclerSpendRow,
  RecyclerEmptyState,
  RecyclerSkeletonList,
  RecyclerSectionHeader,
} from '../../components/recycler';
import transactionService from '../../services/transactionService';
import { recyclingService } from '../../services/recyclingService';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';

const MATERIAL_ICON: Record<string, string> = {
  MOBILE: '📱', LAPTOP: '💻', PCB: '🔧', CABLE: '🔌',
  BATTERY: '🔋', APPLIANCE: '🏠', OTHER: '📦',
};

export const RecyclerMoneyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user }   = useAuth();
  const { t }      = useI18n();

  const PERIOD_FILTERS = [
    { key: 'ALL',        label: t('common.allTime', 'All Time') },
    { key: 'THIS_MONTH', label: t('common.thisMonth', 'This Month') },
    { key: 'THIS_WEEK',  label: t('common.thisWeek', 'This Week') },
  ];

  const [profile, setProfile]             = useState<any>(null);
  const [transactions, setTransactions]   = useState<any[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [period, setPeriod]               = useState('THIS_MONTH');
  const [summary, setSummary]             = useState({ total: 0, pending: 0, completed: 0 });

  const loadMoney = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [profRes, txRes] = await Promise.allSettled([
        recyclingService.getProfile(),
        transactionService.getTransactions({ limit: 60 }),
      ]);

      if (profRes.status === 'fulfilled') {
        setProfile((profRes.value as any)?.profile || profRes.value);
      }

      if (txRes.status === 'fulfilled') {
        const txVal = txRes.value as any;
        const txList = txVal?.transactions || txVal?.data || (Array.isArray(txVal) ? txVal : []);

        // Filter by period
        const now = new Date();
        const filtered = txList.filter((tx: any) => {
          if (period === 'ALL') return true;
          const txDate = new Date(tx.createdAt || tx.date || 0);
          if (period === 'THIS_MONTH') {
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
          }
          if (period === 'THIS_WEEK') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return txDate >= weekAgo;
          }
          return true;
        });

        setTransactions(filtered);

        const total     = filtered.reduce((s: number, tx: any) => s + (Number(tx.totalAmount ?? tx.amount ?? 0)), 0);
        const pending   = filtered
          .filter((tx: any) => tx.paymentStatus === 'PENDING' || tx.paymentStatus === 'PARTIALLY_PAID')
          .reduce((s: number, tx: any) => s + (Number(tx.totalAmount ?? tx.amount ?? 0)), 0);
        const completed = filtered
          .filter((tx: any) => tx.paymentStatus === 'PAID' || tx.paymentStatus === 'COMPLETED')
          .reduce((s: number, tx: any) => s + (Number(tx.totalAmount ?? tx.amount ?? 0)), 0);

        setSummary({ total, pending, completed });
      }
    } catch (e) {
      console.warn('[RecyclerMoney] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => { loadMoney(); }, [loadMoney]);
  const onRefresh = () => { setIsRefreshing(true); loadMoney(true); };

  const facilityName = (profile as any)?.facilityName || user?.name || 'Recycler';
  const isAuthorized = (profile as any)?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';

  const pendingTx    = transactions.filter((tx) => tx.paymentStatus === 'PENDING' || tx.paymentStatus === 'PARTIALLY_PAID');
  const completedTx  = transactions.filter((tx) => tx.paymentStatus === 'PAID' || tx.paymentStatus === 'COMPLETED');
  const allTx        = transactions;

  // Data for FlatList
  interface Section { type: 'HERO' | 'PERIOD' | 'SECTION' | 'ROW' | 'QUICKACTIONS'; data?: any; label?: string; count?: number }
  const listData: Section[] = [
    { type: 'HERO' },
    { type: 'PERIOD' },
    { type: 'QUICKACTIONS' },
    ...(pendingTx.length > 0 ? [
      { type: 'SECTION' as const, label: t('recycler.pendingPayment', 'PENDING PAYMENT'), count: pendingTx.length },
      ...pendingTx.map((tx) => ({ type: 'ROW' as const, data: tx })),
    ] : []),
    ...(completedTx.length > 0 ? [
      { type: 'SECTION' as const, label: t('recycler.paid', 'PAID'), count: completedTx.length },
      ...completedTx.map((tx) => ({ type: 'ROW' as const, data: tx })),
    ] : []),
  ];

  const renderItem = ({ item }: { item: Section }) => {
    if (item.type === 'HERO') {
      return (
        <View style={styles.heroWrapper}>
          <RecyclerMoneySummary
            totalSpend={summary.total}
            pending={summary.pending}
            completed={summary.completed}
          />
        </View>
      );
    }
    if (item.type === 'PERIOD') {
      return (
        <View style={styles.periodRow}>
          {PERIOD_FILTERS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (item.type === 'QUICKACTIONS') {
      return (
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('RecyclerBills')}
            accessibilityRole="button"
          >
            <Text style={styles.quickActionIcon}>🧾</Text>
            <Text style={styles.quickActionLabel}>{t('recycler.bills', 'Bills')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('RecyclerTransactions')}
            accessibilityRole="button"
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionLabel}>{t('recycler.transactions', 'Transactions')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('RecyclerDisputes')}
            accessibilityRole="button"
          >
            <Text style={styles.quickActionIcon}>⚠️</Text>
            <Text style={styles.quickActionLabel}>{t('recycler.disputes', 'Disputes')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (item.type === 'SECTION') {
      return (
        <RecyclerSectionHeader label={item.label!} count={item.count} />
      );
    }
    if (item.type === 'ROW' && item.data) {
      const tx = item.data;
      const category = tx.materialCategory || tx.category || 'OTHER';
      return (
        <RecyclerSpendRow
          material={tx.materialCategory || tx.category || t('recycler.transaction', 'Transaction')}
          materialIcon={MATERIAL_ICON[category] || '📦'}
          source={tx.sellerName || tx.seller?.name || tx.collectorName}
          date={tx.createdAt
            ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
            : '—'
          }
          weightKg={tx.actualWeightKg ?? tx.weightKg}
          agreedRate={tx.agreedPricePerKg ?? tx.pricePerKg}
          totalValue={Number(tx.totalAmount ?? tx.amount ?? 0)}
          paymentStatus={tx.paymentStatus || 'PENDING'}
          onPress={() => navigation.navigate('RecyclerTransactionDetail', { transactionId: tx.id, transaction: tx })}
        />
      );
    }
    return null;
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <RecyclerHeader
          facilityName={facilityName}
          isAuthorized={isAuthorized}
          subtitle={t('recycler.money', 'Money')}
        />

        {isLoading ? (
          <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
            <RecyclerSkeletonList count={4} />
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              item.type === 'ROW' ? (item.data?.id ?? String(index)) : `${item.type}-${index}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <RecyclerEmptyState type="no_transactions" />
            }
            ListFooterComponent={<View style={{ height: 80 }} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={['#22D3EE']}
                tintColor="#22D3EE"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea:     { flex: 1 },
  listContent:  { paddingBottom: 80, paddingTop: 16 },
  heroWrapper:  { paddingBottom: 16 },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  periodBtnActive:   { backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.35)' },
  periodLabel:       { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  periodLabelActive: { color: '#22D3EE', fontWeight: '800' },
  quickActionsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  quickActionIcon:  { fontSize: 22 },
  quickActionLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700' },
});

export default RecyclerMoneyScreen;
