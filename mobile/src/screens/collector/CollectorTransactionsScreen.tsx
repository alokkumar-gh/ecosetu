/**
 * CollectorTransactionsScreen.tsx
 * Collector Transaction History & Payment Ledger Screen
 * Redesigned with EcoSetu Premium Dark Glass Theme
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 7: Payment Recording + Transaction Dataset
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { TopAppBar } from '../../components/layout/TopAppBar';
import transactionService, { TransactionRecord } from '../../services/transactionService';
import { colors } from '../../theme/colors';

type FilterTab = 'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'PENDING';

export const CollectorTransactionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useI18n();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = async () => {
    try {
      const result = await transactionService.getTransactions();
      setTransactions(result.transactions || []);
      setIsOffline(!!result.isOffline);
    } catch (err: any) {
      console.warn('[CollectorTransactionsScreen] Failed to load transactions:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Aggregated totals
  const totals = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalPending = 0;

    transactions.forEach((tx) => {
      const saleVal = Number(tx.finalSaleValue) || 0;
      const paidVal = Number(tx.amountPaid) || 0;
      const dueVal = Number(tx.amountDue) || Math.max(0, saleVal - paidVal);

      totalSales += saleVal;
      totalPaid += paidVal;
      totalPending += dueVal;
    });

    return { totalSales, totalPaid, totalPending };
  }, [transactions]);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeTab !== 'ALL' && tx.paymentStatus !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = (tx.referenceNumber || '').toLowerCase();
        const buyer = (tx.recycler?.facilityName || '').toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        return ref.includes(q) || buyer.includes(q) || cat.includes(q);
      }
      return true;
    });
  }, [transactions, activeTab, searchQuery]);

  const renderStatusBadge = (status: string) => {
    let bg = 'rgba(100, 116, 139, 0.2)';
    let border = 'rgba(100, 116, 139, 0.4)';
    let textColor = '#CBD5E1';
    let label = status;

    if (status === 'PAID') {
      bg = 'rgba(16, 185, 129, 0.18)';
      border = '#10B981';
      textColor = '#34D399';
      label = t('payments.paid', 'Paid');
    } else if (status === 'PARTIALLY_PAID') {
      bg = 'rgba(245, 158, 11, 0.18)';
      border = '#F59E0B';
      textColor = '#FBBF24';
      label = t('payments.partiallyPaid', 'Partially Paid');
    } else if (status === 'PENDING') {
      bg = 'rgba(239, 68, 68, 0.18)';
      border = '#EF4444';
      textColor = '#F87171';
      label = t('payments.pending', 'Pending');
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: TransactionRecord }) => {
    const dateStr = item.transactionDate
      ? new Date(item.transactionDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    const methodIcon =
      item.paymentMethod === 'CASH'
        ? '💵 Cash'
        : item.paymentMethod === 'UPI_RECORDED'
        ? '📱 UPI'
        : item.paymentMethod === 'BANK_TRANSFER_RECORDED'
        ? '🏦 Bank'
        : '📋 Payment';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('CollectorTransactionDetail', {
            transactionId: item.id,
            transaction: item,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.refBox}>
            <Text style={styles.cardIcon}>📜</Text>
            <View>
              <Text style={styles.referenceNumber}>{item.referenceNumber}</Text>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          </View>
          {renderStatusBadge(item.paymentStatus)}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>
                {item.category.replace(/_/g, ' ')} • {item.quantity} kg
              </Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>{t('payments.total', 'Total')}</Text>
              <Text style={styles.amountValue}>
                ₹{Number(item.finalSaleValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.buyerBox}>
              <Text style={styles.buyerLabel}>{t('payments.buyer', 'Buyer')}</Text>
              <Text style={styles.buyerName} numberOfLines={1}>
                {item.recycler?.facilityName || 'Authorized Recycler'}
              </Text>
            </View>
            <View style={styles.methodPill}>
              <Text style={styles.methodText}>{methodIcon}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailText}>{t('common.viewDetails', 'View Transaction & Trace')} →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TopAppBar
          title={t('collector.transactionHistory', 'Transaction History')}
          subtitle={t('collector.transactionHistorySub', 'All completed sales & payments')}
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              ⚠️ {t('common.offlineMode', 'Offline Mode — Displaying cached transactions.')}
            </Text>
          </View>
        )}

        {/* ── Summary & Earnings Link ── */}
        <View style={styles.summaryContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('payments.totalSales', 'Total Sales')}</Text>
              <Text style={styles.statValue}>
                ₹{Math.round(totals.totalSales).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('payments.received', 'Received')}</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>
                ₹{Math.round(totals.totalPaid).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('payments.pendingDues', 'Pending Dues')}</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: totals.totalPending > 0 ? '#F87171' : '#94A3B8' },
                ]}
              >
                ₹{Math.round(totals.totalPending).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.earningsBanner}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CollectorEarnings')}
          >
            <View style={styles.earningsLeft}>
              <Text style={styles.earningsIcon}>📊</Text>
              <View>
                <Text style={styles.earningsTitle}>
                  {t('collector.earningsLedger', 'Earnings Ledger & Dues')}
                </Text>
                <Text style={styles.earningsSubtitle}>
                  {t('collector.earningsSub', 'View breakdown, payment terms & bills')}
                </Text>
              </View>
            </View>
            <Text style={styles.earningsArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filter Tabs & Search ── */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('common.searchPlaceholder', 'Search by reference or buyer...')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabsRow}>
            {(
              [
                { key: 'ALL', label: t('common.all', 'All') },
                { key: 'PAID', label: t('payments.paid', 'Paid') },
                { key: 'PENDING', label: t('payments.pending', 'Pending') },
                { key: 'PARTIALLY_PAID', label: t('payments.partial', 'Partial') },
              ] as { key: FilterTab; label: string }[]
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── List Content ── */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading transactions...')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#10B981']}
                tintColor="#10B981"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>
                  {searchQuery || activeTab !== 'ALL'
                    ? t('common.noMatchingRecords', 'No matching transactions')
                    : t('payments.noTransactions', 'No Transactions Yet')}
                </Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery || activeTab !== 'ALL'
                    ? t('common.tryClearingFilters', 'Try adjusting your search query or filter.')
                    : t(
                        'payments.noTransactionsDesc',
                        'When you complete a digital handover with an authorized recycler, recorded sales and receipts will appear here.'
                      )}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderBottomWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  statsCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningsBanner: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earningsIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  earningsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  earningsSubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 1,
  },
  earningsArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34D399',
    marginLeft: 8,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  searchBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  clearSearch: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  tabPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  referenceNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardBody: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#34D399',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyerBox: {
    flex: 1,
    marginRight: 8,
  },
  buyerLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  buyerName: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 1,
  },
  methodPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodText: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'flex-end',
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2DD4BF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
  },
});
