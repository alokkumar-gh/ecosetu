/**
 * CollectorTransactionsScreen.tsx
 * Collector Transaction History Screen
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 7: Payment Recording + Transaction Dataset
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import transactionService, { TransactionRecord } from '../../services/transactionService';

export const CollectorTransactionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const fetchTransactions = async () => {
    try {
      const result = await transactionService.getTransactions();
      setTransactions(result.transactions);
      setIsOffline(!!result.isOffline);
    } catch (err: any) {
      console.warn('Failed to load transactions:', err.message);
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

  const renderStatusBadge = (status: string) => {
    let bg = '#e2e8f0';
    let color = '#475569';
    let label = status;

    if (status === 'PAID') {
      bg = '#dcfce7';
      color = '#15803d';
      label = 'Paid';
    } else if (status === 'PARTIALLY_PAID') {
      bg = '#fef3c7';
      color = '#b45309';
      label = 'Partially Paid';
    } else if (status === 'PENDING') {
      bg = '#fee2e2';
      color = '#b91c1c';
      label = 'Pending';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: TransactionRecord }) => {
    const dateStr = item.transactionDate
      ? new Date(item.transactionDate).toLocaleDateString()
      : '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('CollectorTransactionDetail', {
            transactionId: item.id,
            transaction: item,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.referenceNumber}>{item.referenceNumber}</Text>
          {renderStatusBadge(item.paymentStatus)}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.categoryText}>
              {item.category} • {item.quantity} kg
            </Text>
            <Text style={styles.amountText}>
              ₹{Number(item.finalSaleValue).toFixed(2)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.recyclerText}>
              Buyer: {item.recycler?.facilityName || 'Recycler'}
            </Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.handoverRefText}>
              Handover: {item.handover?.referenceNumber || 'Confirmed'}
            </Text>
            <Text style={styles.methodTag}>
              {item.paymentMethod === 'CASH'
                ? '💵 Cash'
                : item.paymentMethod === 'UPI_RECORDED'
                ? '📱 UPI'
                : item.paymentMethod === 'BANK_TRANSFER_RECORDED'
                ? '🏦 Bank'
                : '📋 Other'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️ Offline Mode — Displaying cached transactions.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.earningsBanner}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CollectorEarnings')}
            >
              <View style={styles.earningsBannerLeft}>
                <Text style={styles.earningsBannerIcon}>📊</Text>
                <View>
                  <Text style={styles.earningsBannerTitle}>Earnings Ledger & Dues</Text>
                  <Text style={styles.earningsBannerSub}>
                    View sales recorded, money received & pending dues
                  </Text>
                </View>
              </View>
              <Text style={styles.earningsBannerArrow}>→</Text>
            </TouchableOpacity>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyDesc}>
                Once you complete and confirm a digital handover, you can record the sale and payment terms here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
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
    borderColor: '#f59e0b',
    borderBottomWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '600',
  },
  earningsBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earningsBannerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  earningsBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  earningsBannerSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  earningsBannerArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  referenceNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recyclerText: {
    fontSize: 13,
    color: '#64748b',
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  handoverRefText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  methodTag: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CollectorTransactionsScreen;
