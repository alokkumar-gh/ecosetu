/**
 * EcoSetu Admin Disputes Screen
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 *
 * Operational oversight and factual visibility across marketplace disputes.
 * Zero automated judging; provides neutral audit facts and dispute timelines.
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
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import disputeService, { MarketplaceDispute, DisputeStatus } from '../../services/disputeService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const AdminDisputesScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    try {
      setError(null);
      const params = filterStatus === 'ALL' ? undefined : { status: filterStatus as DisputeStatus };
      const res = await disputeService.getDisputes(params);
      setDisputes(res.disputes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const calculateAgeDays = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace Disputes (Operations)</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {['ALL', 'OPEN', 'UNDER_REVIEW', 'RETURN_PENDING', 'RESOLVED'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[styles.filterChipText, filterStatus === st && styles.filterChipTextActive]}>
              {st.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading operational dispute ledger...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {disputes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Operational Disputes</Text>
              <Text style={styles.emptySub}>All marketplace transactions are running cleanly.</Text>
            </View>
          ) : (
            disputes.map((d) => {
              const ageDays = calculateAgeDays(d.createdAt);
              return (
                <View key={d.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.refText}>{d.disputeReference}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{d.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.typeText}>{d.disputeType.replace(/_/g, ' ')}</Text>
                  <Text style={styles.descText} numberOfLines={2}>
                    "{d.description}"
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaItem}>
                      Opened by: <Text style={styles.bold}>{d.openedByRole}</Text>
                    </Text>
                    <Text style={styles.metaItem}>
                      Age: <Text style={styles.bold}>{ageDays}d ago</Text>
                    </Text>
                  </View>

                  {d.materialLot && (
                    <Text style={styles.lotText}>
                      Lot: {d.materialLot.referenceNumber} ({d.materialLot.category})
                    </Text>
                  )}

                  {d.resolvedWeightKg && (
                    <Text style={styles.resolvedText}>
                      Resolved: {d.resolvedWeightKg} kg • ₹{Number(d.resolvedAmount || 0).toFixed(2)}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030C12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: '#06151B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    fontSize: 22,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    backgroundColor: '#06151B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: space.md,
  },
  errorBox: {
    padding: space.md,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: space.md,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0F2328',
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 6,
  },
  descText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  metaItem: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lotText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  resolvedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
});
