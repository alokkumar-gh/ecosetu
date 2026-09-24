/**
 * RecyclerPickupManagementScreen
 * Marketplace Phase 5: Recycler Logistics View ("Pickup Management")
 *
 * Operational dashboard for formal recyclers to organize and manage consolidated
 * multi-lot collection journeys across informal collectors.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import pickupBatchService, { PickupBatch, BatchStatus } from '../../services/pickupBatchService';

interface Props {
  navigation: any;
}

type StatusFilter = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export const RecyclerPickupManagementScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [batches, setBatches] = useState<PickupBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setError(null);
      const result = await pickupBatchService.getBatches();
      setBatches(result.batches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load logistics batches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const filteredBatches = batches.filter((b) => {
    if (filter === 'SCHEDULED') return b.status === 'PLANNED' || b.status === 'SCHEDULED';
    if (filter === 'IN_PROGRESS') return b.status === 'IN_PROGRESS' || b.status === 'ARRIVED' || b.status === 'COLLECTING';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    return true;
  });

  const renderBatchCard = ({ item }: { item: PickupBatch }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('RecyclerBatchDetail', { batchId: item.id, batch: item })}
        accessibilityRole="button"
        accessibilityLabel={`Pickup Batch ${item.referenceNumber}`}
        style={styles.cardWrapper}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.refContainer}>
              <Text style={styles.refNumber}>{item.referenceNumber}</Text>
              <Text style={styles.collectorName}>
                {item.collector?.user?.name ? `Collector: ${item.collector.user.name}` : 'Multi-Lot Collection'}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('logistics.lotsCount')}</Text>
              <Text style={styles.statValue}>{item.lotsCount || item.lots?.length || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{t('logistics.totalWeight')}</Text>
              <Text style={styles.statValue}>{item.totalEstimatedWeightKg} kg</Text>
            </View>
            {item.status === 'COMPLETED' && item.consolidatedSummary?.totalVerifiedWeightKg ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>{t('logistics.verifiedWeight')}</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {item.consolidatedSummary.totalVerifiedWeightKg} kg
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {item.scheduledDate ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>
                {new Date(item.scheduledDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {item.scheduledTimeWindow ? ` • ${item.scheduledTimeWindow}` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>🕒</Text>
              <Text style={styles.metaText}>{t('logistics.notScheduled')}</Text>
            </View>
          )}

          {item.pickupAddress ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {item.pickupAddress}
              </Text>
            </View>
          ) : null}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('logistics.pickupManagement')}
          showBack
          onBack={() => navigation.goBack()}
        />

        {/* Action Button: Create New Batch */}
        <View style={styles.actionHeader}>
          <TouchableOpacity
            style={styles.createBatchBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('RecyclerCreateBatch')}
          >
            <Text style={styles.createBatchBtnText}>+ {t('logistics.createBatch')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersBar}>
          {(['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] as StatusFilter[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterPillText, filter === tab && styles.filterPillTextActive]}>
                {t(`logistics.filter_${tab.toLowerCase()}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchBatches}>
              <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBatches}
            keyExtractor={(item) => item.id}
            renderItem={renderBatchCard}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="🚛"
                title={t('logistics.noBatches')}
                message={t('logistics.noBatchesDesc')}
              />
            }
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionHeader: {
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.xs,
  },
  createBatchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createBatchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#071E22',
  },
  filtersBar: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    marginVertical: space.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 168, 150, 0.25)',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: space.md,
    paddingBottom: space.xl,
  },
  cardWrapper: {
    marginBottom: space.md,
  },
  card: {
    padding: space.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.sm,
  },
  refContainer: {
    flex: 1,
    marginRight: space.sm,
  },
  refNumber: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  collectorName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    paddingVertical: space.xs,
    marginVertical: space.xs,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: space.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#071E22',
  },
});
