/**
 * CollectorEarningsScreen.tsx
 * Collector Easy Earnings Ledger + Outstanding Pending Dues
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 8: Collector Earnings Ledger + Pending Dues
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import earningsService, {
  EarningsSummary,
  PendingDueItem,
  MonthlyEarningsItem,
} from '../../services/earningsService';
import voiceService from '../../services/voiceService';
import { useTranslation } from '../../i18n';

type PeriodType = 'ALL_TIME' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_WEEK' | 'TODAY';

export const CollectorEarningsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Filter States
  const [period, setPeriod] = useState<PeriodType>('ALL_TIME');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Ledger Data States
  const [summary, setSummary] = useState<EarningsSummary>({
    totalRecordedSales: '0.00',
    totalPaid: '0.00',
    totalPending: '0.00',
    totalPartiallyPaid: '0.00',
    transactionCount: 0,
    paidTransactionCount: 0,
    pendingTransactionCount: 0,
    partialTransactionCount: 0,
    period: 'ALL_TIME',
    generatedAt: new Date().toISOString(),
  });

  const [pendingDues, setPendingDues] = useState<PendingDueItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyEarningsItem[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const loadLedgerData = async () => {
    try {
      const filters: any = { period };
      if (selectedCategory !== 'ALL') filters.category = selectedCategory;
      if (selectedStatus !== 'ALL') filters.paymentStatus = selectedStatus;

      const [summaryRes, pendingRes, monthlyRes, txnsRes] = await Promise.all([
        earningsService.getEarningsSummary(filters),
        earningsService.getPendingDues(filters),
        earningsService.getMonthlyEarnings(filters),
        earningsService.getEarningsTransactions(filters),
      ]);

      setSummary(summaryRes);
      setPendingDues(pendingRes.pendingDues || []);
      setMonthlyData(monthlyRes.monthly || []);
      setTransactions(txnsRes.transactions || []);
      setIsOffline(!!(summaryRes.isCached || pendingRes.isCached || txnsRes.isCached));
    } catch (err: any) {
      console.warn('Failed to load earnings ledger:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLedgerData();
    }, [period, selectedCategory, selectedStatus])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadLedgerData();
  };

  const handleSpeakSummary = async () => {
    const text = earningsService.generateEarningsSpeechText(summary, language);
    await voiceService.speak(text, { language, force: true });
  };

  const renderStatusBadge = (status: string) => {
    let bg = '#e2e8f0';
    let color = '#475569';
    let label = status;

    if (status === 'PAID') {
      bg = '#dcfce7';
      color = '#15803d';
      label = t('transaction.paid') || 'Paid';
    } else if (status === 'PARTIALLY_PAID') {
      bg = '#fef3c7';
      color = '#b45309';
      label = t('transaction.partiallyPaid') || 'Partially Paid';
    } else if (status === 'PENDING') {
      bg = '#fee2e2';
      color = '#b91c1c';
      label = t('transaction.pending') || 'Pending';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const categories = ['ALL', 'MOBILE_PHONE', 'LAPTOP', 'BATTERY', 'OTHER'];
  const statuses = ['ALL', 'PAID', 'PARTIALLY_PAID', 'PENDING'];

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️ {t('earnings.offlineNotice') || 'Offline — showing cached earnings'}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>{t('earnings.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
          }
        >
          {/* Header & Speech Action */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.screenTitle}>{t('earnings.title') || 'Earnings Ledger'}</Text>
              <Text style={styles.screenSubtitle}>
                {t('common.verifiedProvenance') || 'Authoritative Sales & Financial Balance'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.speechButton}
              activeOpacity={0.8}
              onPress={handleSpeakSummary}
            >
              <Text style={styles.speechButtonText}>🔊 {t('earnings.speakSummary') || 'Speak'}</Text>
            </TouchableOpacity>
          </View>

          {/* Period Filter Tabs */}
          <View style={styles.periodTabs}>
            {(
              [
                { id: 'ALL_TIME', label: t('earnings.periodAllTime') || 'All Time' },
                { id: 'THIS_MONTH', label: t('earnings.periodThisMonth') || 'This Month' },
                { id: 'LAST_MONTH', label: t('earnings.periodLastMonth') || 'Last Month' },
                { id: 'THIS_WEEK', label: t('earnings.periodThisWeek') || 'This Week' },
                { id: 'TODAY', label: t('earnings.periodToday') || 'Today' },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.periodTab, period === tab.id && styles.periodTabActive]}
                onPress={() => setPeriod(tab.id)}
              >
                <Text
                  style={[styles.periodTabText, period === tab.id && styles.periodTabTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category & Status Chips */}
          <View style={styles.chipRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                    {cat === 'ALL' ? (t('earnings.allCategories') || 'All Categories') : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* SUMMARY CARDS (Low-Literacy Friendly) */}
          <View style={styles.summaryGrid}>
            {/* Sales Recorded */}
            <View style={[styles.summaryCard, styles.cardSales]}>
              <Text style={styles.summaryCardIcon}>📦</Text>
              <Text style={styles.summaryCardLabel}>
                {t('earnings.salesRecorded') || 'Sales Recorded'}
              </Text>
              <Text style={styles.summaryCardValue}>₹{summary.totalRecordedSales}</Text>
              <Text style={styles.summaryCardSub}>
                {summary.transactionCount} {t('earnings.transactionsCount') || 'Transactions'}
              </Text>
            </View>

            {/* Money Received */}
            <View style={[styles.summaryCard, styles.cardReceived]}>
              <Text style={styles.summaryCardIcon}>✅</Text>
              <Text style={styles.summaryCardLabel}>
                {t('earnings.moneyReceived') || 'Money Received'}
              </Text>
              <Text style={[styles.summaryCardValue, { color: '#15803d' }]}>
                ₹{summary.totalPaid}
              </Text>
              <Text style={styles.summaryCardSub}>
                {summary.paidTransactionCount} {t('transaction.paid') || 'Settled'}
              </Text>
            </View>

            {/* Money Pending */}
            <View style={[styles.summaryCard, styles.cardPending]}>
              <Text style={styles.summaryCardIcon}>⏳</Text>
              <Text style={styles.summaryCardLabel}>
                {t('earnings.moneyPending') || 'Money Pending'}
              </Text>
              <Text style={[styles.summaryCardValue, { color: '#b91c1c' }]}>
                ₹{summary.totalPending}
              </Text>
              <Text style={styles.summaryCardSub}>
                {summary.pendingTransactionCount + summary.partialTransactionCount} {t('transaction.pending') || 'Outstanding'}
              </Text>
            </View>

            {/* Transactions Count */}
            <View style={[styles.summaryCard, styles.cardTxnCount]}>
              <Text style={styles.summaryCardIcon}>📊</Text>
              <Text style={styles.summaryCardLabel}>
                {t('earnings.transactionsCount') || 'Transactions'}
              </Text>
              <Text style={styles.summaryCardValue}>{summary.transactionCount}</Text>
              <Text style={styles.summaryCardSub}>
                {summary.partialTransactionCount} {t('transaction.partiallyPaid') || 'Partial'}
              </Text>
            </View>
          </View>

          {/* PENDING DUES SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {t('earnings.pendingDuesTitle') || 'Pending Dues'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('earnings.oldestFirstNotice') || 'Showing oldest dues first'}
              </Text>
            </View>
            <View style={styles.duesTotalPill}>
              <Text style={styles.duesTotalText}>
                ₹{summary.totalPending}
              </Text>
            </View>
          </View>

          {pendingDues.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardIcon}>🎉</Text>
              <Text style={styles.emptyCardTitle}>
                {t('earnings.noPendingDues') || 'No Pending Dues'}
              </Text>
              <Text style={styles.emptyCardText}>
                {t('earnings.noPendingDuesDesc') ||
                  'All your recorded transactions have been fully settled.'}
              </Text>
            </View>
          ) : (
            pendingDues.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.dueCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('CollectorTransactionDetail', {
                    transactionId: item.id,
                  })
                }
              >
                <View style={styles.dueCardHeader}>
                  <Text style={styles.dueCardRef}>{item.referenceNumber}</Text>
                  {renderStatusBadge(item.paymentStatus)}
                </View>

                <View style={styles.dueCardBody}>
                  <View style={styles.dueRow}>
                    <Text style={styles.dueCategory}>
                      {item.category} {item.subcategory ? `• ${item.subcategory}` : ''}
                    </Text>
                    <View style={styles.dueAmountBlock}>
                      <Text style={styles.dueLabel}>{t('earnings.dueAmount') || 'Due'}:</Text>
                      <Text style={styles.dueValue}>₹{item.amountDue}</Text>
                    </View>
                  </View>

                  <View style={styles.dueMetaRow}>
                    <Text style={styles.dueRecycler}>
                      {t('earnings.dueFrom') || 'Buyer'}: {item.recycler?.facilityName || item.recycler?.businessName}
                    </Text>
                    <Text style={styles.dueDate}>
                      {item.transactionDate ? new Date(item.transactionDate).toLocaleDateString() : ''}
                    </Text>
                  </View>

                  <View style={styles.dueFooter}>
                    <Text style={styles.dueHandover}>
                      {t('handover.handoverReference')}: {item.handoverReference || t('status.accepted')}
                    </Text>
                    <Text style={styles.duePaidSummary}>
                      {t('earnings.paidAmount') || 'Received'}: ₹{item.amountPaid} / ₹{item.finalSaleValue}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* MONTHLY BREAKDOWN SECTION */}
          {monthlyData.length > 0 && (
            <View style={styles.monthlySection}>
              <Text style={styles.sectionTitle}>
                {t('earnings.monthlyBreakdown') || 'Monthly Breakdown'}
              </Text>
              <Text style={styles.sectionSubtitle}>{t('earnings.historicalPerformance')}</Text>

              <View style={styles.monthlyGrid}>
                {monthlyData.map((m) => (
                  <View key={m.month} style={styles.monthCard}>
                    <View style={styles.monthHeader}>
                      <Text style={styles.monthName}>{m.month}</Text>
                      <Text style={styles.monthTxnCount}>
                        {m.transactionCount} {t('earnings.transactionsCount') || 'txns'}
                      </Text>
                    </View>
                    <View style={styles.monthStats}>
                      <View style={styles.monthStatCol}>
                        <Text style={styles.monthStatLabel}>{t('earnings.recorded')}</Text>
                        <Text style={styles.monthStatVal}>₹{m.recordedSales}</Text>
                      </View>
                      <View style={styles.monthStatCol}>
                        <Text style={styles.monthStatLabel}>{t('earnings.paid')}</Text>
                        <Text style={[styles.monthStatVal, { color: '#15803d' }]}>
                          ₹{m.amountPaid}
                        </Text>
                      </View>
                      <View style={styles.monthStatCol}>
                        <Text style={styles.monthStatLabel}>{t('earnings.pending')}</Text>
                        <Text style={[styles.monthStatVal, { color: '#b91c1c' }]}>
                          ₹{m.amountPending}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TRANSACTION HISTORY SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {t('earnings.allTransactions') || 'Transaction History'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {transactions.length} contributing records
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('CollectorTransactions')}
            >
              <Text style={styles.viewAllText}>{t('earnings.viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyTxnCard}>
              <Text style={styles.emptyIcon}>💵</Text>
              <Text style={styles.emptyTitle}>
                {t('lowLiteracy.emptyEarningsTitle') || 'No Sales Recorded Yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {t('lowLiteracy.emptyEarningsDesc') || 'Record completed handovers and cash/UPI receipts to view earnings.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate('CollectorLots')}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.emptyActionBtnText}>
                  📦 {t('lowLiteracy.viewBatches') || 'View Batches'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            transactions.slice(0, 5).map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.txnItemCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('CollectorTransactionDetail', {
                    transactionId: tx.id,
                    transaction: tx,
                  })
                }
              >
                <View style={styles.txnItemTop}>
                  <Text style={styles.txnItemRef}>{tx.referenceNumber}</Text>
                  {renderStatusBadge(tx.paymentStatus)}
                </View>
                <View style={styles.txnItemBottom}>
                  <Text style={styles.txnItemCategory}>{tx.category}</Text>
                  <Text style={styles.txnItemAmount}>₹{tx.finalSaleValue}</Text>
                </View>
                <View style={styles.txnItemMeta}>
                  <Text style={styles.txnItemRecycler}>
                    {tx.recycler?.facilityName || 'Recycler'}
                  </Text>
                  <Text style={styles.txnItemDate}>
                    {tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },
  offlineBanner: {
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    padding: 10,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  speechButton: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#86efac',
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechButtonText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 48,
  },
  periodTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  periodTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  chipRow: {
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSales: {
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
  },
  cardReceived: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  cardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  cardTxnCount: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  summaryCardIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  summaryCardSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  duesTotalPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  duesTotalText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  emptyCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyCardText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  dueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  dueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dueCardRef: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dueCardBody: {},
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dueCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dueAmountBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dueLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 4,
  },
  dueValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b91c1c',
  },
  dueMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dueRecycler: {
    fontSize: 12,
    color: '#475569',
  },
  dueDate: {
    fontSize: 12,
    color: '#64748b',
  },
  dueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  dueHandover: {
    fontSize: 11,
    color: '#94a3b8',
  },
  duePaidSummary: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  monthlySection: {
    marginVertical: 14,
  },
  monthlyGrid: {
    marginTop: 8,
  },
  monthCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  monthTxnCount: {
    fontSize: 12,
    color: '#64748b',
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthStatCol: {
    alignItems: 'center',
  },
  monthStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  monthStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  viewAllText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  txnItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txnItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txnItemRef: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  txnItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txnItemCategory: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  txnItemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  txnItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txnItemRecycler: {
    fontSize: 11,
    color: '#64748b',
  },
  txnItemDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyTxnCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
