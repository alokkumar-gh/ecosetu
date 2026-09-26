/**
 * RecyclerSourcingScreen.tsx
 * Marketplace Phase 6: Recycler Sourcing Request Management ("Source Material")
 *
 * Provides full lifecycle oversight of buyer-initiated sourcing requests,
 * response monitoring, status toggles, and quote conversion.
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
import sourcingService, { SourcingRequest } from '../../services/sourcingService';

interface Props {
  navigation: any;
}

type TabType = 'OPEN' | 'PAUSED' | 'FULFILLED' | 'ALL';

export const RecyclerSourcingScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('OPEN');
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      const result = await sourcingService.getRequests(params);
      setRequests(result.requests || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load sourcing requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const renderRequestCard = ({ item }: { item: SourcingRequest }) => {
    const isUnpriced = !item.hasOfferedPrice || !item.offeredRatePerKg;
    const dateFormatted = item.requestedByDate
      ? new Date(item.requestedByDate).toLocaleDateString()
      : null;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('RecyclerSourcingDetail', { requestId: item.id, request: item })
        }
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.materialCategory}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <Text style={styles.refText}>{item.referenceNumber}</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t('sourcing.minQuantity')}</Text>
              <Text style={styles.detailValue}>{item.minimumWeightKg} kg</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t('sourcing.offeredRate')}</Text>
              <Text style={[styles.detailValue, isUnpriced && styles.unpricedText]}>
                {isUnpriced
                  ? t('sourcing.unpriced')
                  : `₹${Number(item.offeredRatePerKg).toFixed(2)}/kg`}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t('sourcing.responses')}</Text>
              <Text style={styles.responseCountHighlight}>
                {item.responsesCount || 0}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerDate}>
              {dateFormatted ? `Expires: ${dateFormatted}` : `Created: ${new Date(item.createdAt).toLocaleDateString()}`}
            </Text>
            <Text style={styles.viewLink}>
              {t('sourcing.viewResponses')}
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('sourcing.sourceMaterial')}
          subtitle={t('sourcing.mySourcingRequests')}
          onBack={() => navigation.goBack()}
        />

        {/* Status Tabs */}
        <View style={styles.tabBar}>
          {(['OPEN', 'PAUSED', 'FULFILLED', 'ALL'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === 'OPEN'
                  ? t('sourcing.open')
                  : tab === 'PAUSED'
                  ? t('sourcing.paused')
                  : tab === 'FULFILLED'
                  ? t('sourcing.fulfilled')
                  : t('common.all')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Requests List */}
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {t('sourcing.loadingRequests')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRequests}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="fileText"
                title={t('sourcing.noRequestsInTab')}
                message={t('sourcing.noRequestsDesc')}
              />
            }
          />
        )}

        {/* Floating Create Request Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('RecyclerCreateSourcingRequest')}
        >
          <Text style={styles.fabText}>+ {t('sourcing.newRequest')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: 90,
  },
  card: {
    marginBottom: spacing.spaceMd,
    padding: spacing.spaceMd,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  refText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unpricedText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  responseCountHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerDate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  viewLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceXl,
  },
  loadingText: {
    marginTop: spacing.spaceSm,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
