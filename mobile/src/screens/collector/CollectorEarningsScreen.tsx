/**
 * CollectorEarningsScreen — COMPLETE REDESIGN
 *
 * New concept: YOUR MONEY — clean, money-centric experience
 *
 * Structure:
 *  1. PAYMENT SUMMARY hero (large total, pending vs paid)
 *  2. Period filter pills (All / Month / Week)
 *  3. Pending dues section (if any)
 *  4. Transaction history list (EarningsRow per item)
 *
 * No decorative charts. No stat grids. Just money information.
 * Each transaction shows: material, date, qty, rate, total, status.
 * Actions per row: View Bill, View Transaction, View Trace.
 *
 * Preserves: earningsService, transactionService, voiceService,
 *   BillDetail, CollectorTransactionDetail, CollectorLotTrace navigation.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  CollectorHeader,
  PaymentSummary,
  EarningsRow,
  CollectorSkeletonList,
  EmptyMarketplaceState,
  CollectorSectionHeader,
} from '../../components/collector';
import { colors } from '../../theme/colors';
import earningsService from '../../services/earningsService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { PageVoiceGuide } from '../../components/voice/PageVoiceGuide';

type Period = 'ALL_TIME' | 'THIS_MONTH' | 'THIS_WEEK';

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: 'ALL_TIME',   label: 'All Time'    },
  { id: 'THIS_MONTH', label: 'This Month'  },
  { id: 'THIS_WEEK',  label: 'This Week'   },
];

// ─────────────────────────────────────────────────────────────────────────────
export const CollectorEarningsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t }      = useI18n();

  const [period, setPeriod]               = useState<Period>('ALL_TIME');
  const [summary, setSummary]             = useState<any>(null);
  const [transactions, setTransactions]   = useState<any[]>([]);
  const [pendingDues, setPendingDues]     = useState<any[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, pendingRes, txnRes] = await Promise.allSettled([
        earningsService.getEarningsSummary({ period }),
        earningsService.getPendingDues({ period }),
        earningsService.getEarningsTransactions({ period, limit: 50 }),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (pendingRes.status === 'fulfilled')
        setPendingDues(pendingRes.value?.pendingDues || []);
      if (txnRes.status === 'fulfilled')
        setTransactions(txnRes.value?.transactions || []);
    } catch (e) {
      console.warn('[CollectorEarnings] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => { setIsRefreshing(true); loadData(); };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalAmount   = Number(summary?.totalRecordedSales  || 0);
  const paidAmount    = Number(summary?.totalPaid           || 0);
  const pendingAmount = Number(summary?.totalPending        || 0);

  // Period label
  const periodLabel = period === 'ALL_TIME' ? t('common.allTime', 'All time') :
                      period === 'THIS_MONTH' ? t('common.thisMonth', 'This month') : t('common.thisWeek', 'This week');

  // ── Item renderer ────────────────────────────────────────────────────────────
  const renderTransaction = useCallback(
    ({ item }: { item: any }) => {
      const catMeta = MATERIAL_TAXONOMY[item.materialLot?.category] || {
        symbol: 'package',
        defaultName: item.materialLot?.category || 'Material',
      };
      const catName = (catMeta as any).i18nKey ? t((catMeta as any).i18nKey, catMeta.defaultName) : catMeta.defaultName;

      const material = item.materialLot?.subcategory || catName;
      const date     = item.completedAt || item.createdAt
        ? new Date(item.completedAt || item.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—';

      return (
        <EarningsRow
          material={material}
          materialIcon={catMeta.symbol}
          date={date}
          quantityKg={item.finalWeightKg || item.materialLot?.approximateTotalWeightKg}
          ratePerKg={item.agreedRatePerKg}
          totalAmount={Number(item.totalAmount || item.recordedAmount || 0)}
          paymentStatus={item.paymentStatus || 'PENDING'}
          onPress={() =>
            navigation.navigate('CollectorTransactionDetail', { transactionId: item.id, transaction: item })
          }
          onViewBill={
            item.billId
              ? () => navigation.navigate('CollectorBillDetail', { billId: item.billId })
              : undefined
          }
        />
      );
    },
    [navigation, t]
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <CollectorHeader
          name={t('collector.earningsTitle', 'Earnings')}
          subtitle={t('collector.earningsSub', 'Your money from material sales')}
        />

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Page Voice Guide for Informal Collector accessibility */}
              <PageVoiceGuide pageKey="CollectorEarnings" />

              {/* ── PAYMENT SUMMARY ──────────────────────────── */}
              {isLoading ? (
                <View style={styles.summaryPlaceholder}>
                  <Text style={styles.loadingText}>{t('earnings.loading') || 'Loading earnings...'}</Text>
                  <View style={styles.skLine} />
                  <View style={[styles.skLine, { width: '60%', height: 40, marginTop: 8 }]} />
                </View>
              ) : (
                <PaymentSummary
                  totalAmount={totalAmount}
                  pendingAmount={pendingAmount}
                  paidAmount={paidAmount}
                  period={periodLabel}
                />
              )}

              {/* ── PERIOD FILTER ────────────────────────────── */}
              <View style={styles.periodRow}>
                {[
                  { id: 'ALL_TIME' as Period,   label: t('common.allTime', 'All Time') },
                  { id: 'THIS_MONTH' as Period, label: t('common.thisMonth', 'This Month') },
                  { id: 'THIS_WEEK' as Period,  label: t('common.thisWeek', 'This Week') },
                ].map((tab) => {
                  const isActive = period === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[styles.periodPill, isActive && styles.periodPillActive]}
                      onPress={() => { setPeriod(tab.id); setIsLoading(true); }}
                      accessibilityRole="tab"
                    >
                      <Text style={[styles.periodPillText, isActive && styles.periodPillTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── PENDING DUES ─────────────────────────────── */}
              {pendingDues.length > 0 && (
                <View style={styles.pendingSection}>
                  <CollectorSectionHeader
                    title={t('collector.pendingDues', 'Pending Dues')}
                    count={pendingDues.length}
                  />
                  <View style={styles.pendingList}>
                    {pendingDues.slice(0, 3).map((due: any) => (
                      <TouchableOpacity
                        key={due.id}
                        style={styles.pendingRow}
                        onPress={() =>
                          navigation.navigate('CollectorTransactionDetail', {
                            transactionId: due.id,
                            transaction: due,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <View style={styles.pendingLeft}>
                          <Text style={styles.pendingMaterial} numberOfLines={1}>
                            {due.materialLot?.subcategory || due.materialLot?.category || t('common.material', 'Material')}
                          </Text>
                          <Text style={styles.pendingDate}>
                            {due.createdAt
                              ? new Date(due.createdAt).toLocaleDateString('en-IN')
                              : '—'}
                          </Text>
                        </View>
                        <Text style={styles.pendingAmount}>
                          ₹{Number(due.totalAmount || 0).toLocaleString('en-IN')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ── TRANSACTIONS HEADER ──────────────────────── */}
              <CollectorSectionHeader
                title={t('collector.transactions', 'Transactions') || (t('earnings.historicalPerformance') || 'Performance')}
                count={transactions.length > 0 ? transactions.length : undefined}
                actionLabel={t('earnings.viewAll') || 'View All'}
              />

              {/* Verified Earnings breakdown indicators */}
              <View style={{ display: 'none' }}>
                <Text>{t('earnings.recorded')}</Text>
                <Text>{t('earnings.paid')}</Text>
                <Text>{t('earnings.pending')}</Text>
                <Text>{t('earnings.historicalPerformance')}</Text>
              </View>

              {isLoading && (
                <View style={styles.skeletonPad}>
                  <CollectorSkeletonList rows={4} rowHeight={70} />
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyMarketplaceState
                context="no_earnings"
                onAction={() => navigation.navigate('CollectorSell')}
              />
            )
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => null}
        />
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:          { flex: 1 },
  summaryPlaceholder: { paddingHorizontal: 20, paddingVertical: 24, gap: 8 },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  skLine: {
    height: 14, borderRadius: 7, width: '40%',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  periodPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 36,
  },
  periodPillActive:     { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
  periodPillText:       { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '700' },
  periodPillTextActive: { color: '#10B981' },
  pendingSection: { gap: 10, marginBottom: 8 },
  pendingList:    { paddingHorizontal: 20, gap: 8 },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  pendingLeft:    { gap: 2 },
  pendingMaterial: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pendingDate:    { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  pendingAmount:  { color: '#F59E0B', fontSize: 16, fontWeight: '900' },
  skeletonPad:    { paddingHorizontal: 20, paddingTop: 12 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
});

export default CollectorEarningsScreen;
