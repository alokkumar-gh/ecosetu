/**
 * CollectorPickupBatchesScreen
 * Marketplace Phase 5: Collector Logistics View ("My Pickups")
 *
 * Displays factual operational pickup batches consolidated with formal recyclers.
 * Zero fake GPS, zero fake ETA, strictly factual scheduled windows and lot counts.
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
import { AppIcon } from '../../components/ui/AppIcon';
import pickupBatchService, { PickupBatch, BatchStatus } from '../../services/pickupBatchService';

interface Props {
  navigation: any;
}

type TabType = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';

export const CollectorPickupBatchesScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
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
      setError(err.message || 'Failed to load pickup batches');
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
    if (activeTab === 'UPCOMING') {
      return b.status === 'PLANNED' || b.status === 'SCHEDULED';
    }
    if (activeTab === 'IN_PROGRESS') {
      return b.status === 'IN_PROGRESS' || b.status === 'ARRIVED' || b.status === 'COLLECTING';
    }
    if (activeTab === 'COMPLETED') {
      return b.status === 'COMPLETED' || b.status === 'CANCELLED';
    }
    return true;
  });

  const renderBatchItem = ({ item }: { item: PickupBatch }) => {
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
            <View>
              <Text style={styles.refNumber}>{item.referenceNumber}</Text>
              <Text style={styles.facilityName}>
                {item.recycler?.facilityName || t('logistics.buyer')}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t('logistics.lotsCount')}</Text>
              <Text style={styles.statValue}>{item.lotsCount || item.lots?.length || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t('logistics.totalWeight')}</Text>
              <Text style={styles.statValue}>{item.totalEstimatedWeightKg} kg</Text>
            </View>
          </View>

          {item.scheduledDate ? (
            <View style={styles.scheduleRow}>
              <AppIcon name="calendar" size={14} color="#94A3B8" />
              <Text style={styles.scheduleText}>
                {new Date(item.scheduledDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {item.scheduledTimeWindow ? ` (${item.scheduledTimeWindow})` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.scheduleRow}>
              <AppIcon name="clock" size={14} color="#94A3B8" />
              <Text style={styles.scheduleText}>{t('logistics.unassignedSchedule')}</Text>
            </View>
          )}

          {item.pickupAddress ? (
            <View style={styles.addressRow}>
              <AppIcon name="map-pin" size={14} color="#94A3B8" />
              <Text style={styles.addressText} numberOfLines={1}>
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
          title={t('logistics.myPickups')}
          showBack
          onBack={() => navigation.goBack()}
        />

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'UPCOMING' && styles.tabButtonActive]}
            onPress={() => setActiveTab('UPCOMING')}
          >
            <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.tabTextActive]}>
              {t('logistics.upcoming')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'IN_PROGRESS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('IN_PROGRESS')}
          >
            <Text style={[styles.tabText, activeTab === 'IN_PROGRESS' && styles.tabTextActive]}>
              {t('logistics.inProgress')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'COMPLETED' && styles.tabButtonActive]}
            onPress={() => setActiveTab('COMPLETED')}
          >
            <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
              {t('logistics.completed')}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchBatches}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBatches}
            keyExtractor={(item) => item.id}
            renderItem={renderBatchItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="package"
                title={t('logistics.noPickups')}
                message={t('logistics.noPickupsDesc')}
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: space.md,
    marginVertical: space.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#071E22',
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
  refNumber: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  facilityName: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    paddingVertical: space.xs,
    marginVertical: space.xs,
  },
  statBox: {
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
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  scheduleText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addressText: {
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
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#071E22',
  },
});
