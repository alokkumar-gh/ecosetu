/**
 * EcoSetu Collector Disputes Screen
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 *
 * Displays active and past commercial disputes for the collector with status filters,
 * factual references, and zero synthetic metrics.
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
import { useI18n } from '../../i18n';
import disputeService, { MarketplaceDispute, DisputeStatus } from '../../services/disputeService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const STATUS_FILTERS: { key: DisputeStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'RETURN_PENDING', label: 'Return Pending' },
  { key: 'RETURNED', label: 'Returned' },
];

export const CollectorDisputesScreen: React.FC = () => {
  const { t } = useI18n();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<DisputeStatus | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    try {
      setError(null);
      const params = selectedFilter === 'ALL' ? undefined : { status: selectedFilter };
      const res = await disputeService.getDisputes(params);
      setDisputes(res.disputes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const getStatusBadgeStyle = (status: DisputeStatus) => {
    switch (status) {
      case 'OPEN':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'UNDER_REVIEW':
        return { bg: '#E0E7FF', text: '#4338CA' };
      case 'RESOLVED':
        return { bg: '#D1FAE5', text: '#059669' };
      case 'RETURN_PENDING':
        return { bg: '#FED7AA', text: '#C2410C' };
      case 'RETURNED':
        return { bg: '#E2E8F0', text: '#475569' };
      case 'CANCELLED':
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const formatDisputeType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disputes & Issues</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => {
            const isSelected = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, isSelected && styles.filterTabSelected]}
                onPress={() => setSelectedFilter(f.key)}
              >
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextSelected]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {disputes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Disputes Reported</Text>
              <Text style={styles.emptyDesc}>
                {selectedFilter === 'ALL'
                  ? 'You currently have no active or historical dispute records.'
                  : `No disputes found under status "${selectedFilter}".`}
              </Text>
            </View>
          ) : (
            disputes.map((d) => {
              const badge = getStatusBadgeStyle(d.status);
              return (
                <TouchableOpacity
                  key={d.id}
                  style={styles.disputeCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('CollectorDisputeDetail', { disputeId: d.id })}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.disputeRef}>{d.disputeReference}</Text>
                      <Text style={styles.disputeDate}>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.text }]}>{d.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.typeRow}>
                      <Text style={styles.typeIcon}>⚠️</Text>
                      <Text style={styles.typeLabel}>{formatDisputeType(d.disputeType)}</Text>
                    </View>

                    {d.materialLot && (
                      <Text style={styles.lotInfo}>
                        Lot: {d.materialLot.referenceNumber} • {d.materialLot.category}
                      </Text>
                    )}

                    <Text style={styles.descSnippet} numberOfLines={2}>
                      "{d.description}"
                    </Text>

                    {d.resolvedWeightKg !== undefined && d.resolvedWeightKg !== null && (
                      <View style={styles.resolvedInfoBox}>
                        <Text style={styles.resolvedText}>
                          Resolved Weight: <Text style={styles.bold}>{d.resolvedWeightKg} kg</Text>
                          {d.resolvedAmount ? ` • Resolved Amount: ₹${Number(d.resolvedAmount).toFixed(2)}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailText}>View Details & Timeline →</Text>
                  </View>
                </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterContainer: {
    backgroundColor: '#06151B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterScroll: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextSelected: {
    color: '#FFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  contentPadding: {
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
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  disputeCard: {
    backgroundColor: '#0F2328',
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.xs,
  },
  disputeRef: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  disputeDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    marginVertical: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lotInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  descSnippet: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  resolvedInfoBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  resolvedText: {
    fontSize: 12,
    color: '#34D399',
  },
  bold: {
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 8,
    marginTop: 4,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },
});
