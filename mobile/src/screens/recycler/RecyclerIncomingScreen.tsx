/**
 * EcoSetu Recycler Incoming Consignments Screen
 * Allows formal recyclers to review and manage batch consignments from verified informal collectors.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 9, docs/08_UI_UX_SPECIFICATION.md Section 4.2
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { recyclingService } from '../../services/recyclingService';
import { networkService } from '../../services/networkService';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const FILTER_STATUSES = [
  { key: 'ALL', label: 'All' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CREATED', label: 'Created' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
];

interface Props {
  navigation?: any;
  route?: any;
}

export const RecyclerIncomingScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [consignments, setConsignments] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!networkService.isConnected());
  const [fromCache, setFromCache] = useState<boolean>(false);

  const refreshingRef = useRef<boolean>(false);

  // Connectivity listener
  useEffect(() => {
    const unsub = networkService.addListener((connected: boolean) => {
      setIsOffline(!connected);
    });
    return () => unsub();
  }, []);

  const loadConsignments = useCallback(
    async (isRefresh = false) => {
      if (refreshingRef.current && isRefresh) return;
      if (isRefresh) {
        refreshingRef.current = true;
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: any = { limit: 50 };
        if (selectedStatus !== 'ALL') {
          params.status = selectedStatus;
        }

        const res = await recyclingService.getConsignments(params);
        setConsignments(res.consignments || []);
        setFromCache(Boolean(res.fromCache));
      } catch (err: any) {
        setError(err.message || 'Failed to load incoming consignments');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        refreshingRef.current = false;
      }
    },
    [selectedStatus]
  );

  useEffect(() => {
    loadConsignments();
  }, [loadConsignments]);

  // Focus listener for freshness when returning from Detail screen
  useEffect(() => {
    if (navigation?.addListener) {
      const unsub = navigation.addListener('focus', () => {
        loadConsignments();
      });
      return unsub;
    }
  }, [navigation, loadConsignments]);

  // Role Access Guard
  if (user && user.role !== 'RECYCLER' && user.role !== 'ADMIN') {
    return (
      <GradientBackground>
        <TopAppBar title="Incoming Consignments" />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            This screen is reserved for verified formal recycling facilities. Citizens and informal
            collectors cannot access recycler consignment management.
          </Text>
        </View>
      </GradientBackground>
    );
  }

  const renderFilterChips = () => (
    <View style={styles.filterSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTER_STATUSES.map((filter) => {
          const isSelected = selectedStatus === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => setSelectedStatus(filter.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${filter.label}`}
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderConsignmentItem = ({ item }: { item: any }) => {
    const isDelivered = item.status === 'DELIVERED';
    const itemCount = item.totalItems || (item.consignmentItems ? item.consignmentItems.length : 0);
    const weightDisplay = item.totalWeightKg
      ? `${parseFloat(item.totalWeightKg).toFixed(1)} kg`
      : 'Weight pending';
    const collectorName = item.collector?.user?.name || 'Verified Collector';
    const collectorPhone = item.collector?.user?.phone || 'Contact on file';

    return (
      <TouchableOpacity
        onPress={() =>
          navigation?.navigate('ConsignmentDetail', {
            consignmentId: item.id,
            consignment: item,
          })
        }
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Consignment ${item.id ? item.id.slice(0, 8) : ''}, status ${item.status}`}
      >
        <GlassCard style={[styles.card, isDelivered && styles.cardDeliveredHighlight]}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.codeContainer}>
              <Text style={styles.consignmentCode}>
                #CSG-{item.id ? item.id.slice(0, 8).toUpperCase() : 'BATCH'}
              </Text>
              {item.createdAt && (
                <Text style={styles.timestamp}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>
            <StatusBadge status={item.status} />
          </View>

          {/* Action Prompt Banner for DELIVERED consignments */}
          {isDelivered && (
            <View style={styles.deliveredAlertBanner}>
              <Text style={styles.deliveredAlertIcon}>⚡</Text>
              <Text style={styles.deliveredAlertText}>
                Delivered to facility — Ready for inspection & acceptance
              </Text>
            </View>
          )}

          {/* Collector Info */}
          <View style={styles.collectorInfoRow}>
            <Text style={styles.collectorIcon}>🚚</Text>
            <View style={styles.collectorDetails}>
              <Text style={styles.collectorName}>{collectorName}</Text>
              <Text style={styles.collectorSubtext}>
                Local Informal Collector (Kabadiwala) • {collectorPhone}
              </Text>
            </View>
          </View>

          {/* Consignment Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Items</Text>
              <Text style={styles.metricValue}>{itemCount} pcs</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Weight</Text>
              <Text style={styles.metricValue}>{weightDisplay}</Text>
            </View>
          </View>

          {/* Delivery Notes preview if available */}
          {item.deliveryNotes ? (
            <View style={styles.notesPreviewContainer}>
              <Text style={styles.notesPreviewLabel}>Notes:</Text>
              <Text style={styles.notesPreviewText} numberOfLines={2}>
                {item.deliveryNotes}
              </Text>
            </View>
          ) : null}

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.chainBadge}>EcoSetu Custody Verified</Text>
            <Text style={styles.inspectLink}>Inspect Details →</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonMetrics} />
        </View>
      ))}
    </View>
  );

  return (
    <GradientBackground>
      <TopAppBar
        title="Incoming Consignments"
        subtitle="Deliveries from verified collectors"
        roleBadge="RECYCLER"
      />

      {isOffline && <OfflineBanner />}

      {/* Recycler Verification Warning Banner */}
      {user?.status === 'PENDING_VERIFICATION' && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerIcon}>⚠️</Text>
          <View style={styles.warningBannerContent}>
            <Text style={styles.warningBannerTitle}>Facility Verification Pending</Text>
            <Text style={styles.warningBannerText}>
              Your recycling facility authorization is under administrative review. Consignment
              acceptance requires verified status.
            </Text>
          </View>
        </View>
      )}

      {fromCache && (
        <View style={styles.cacheNotice}>
          <Text style={styles.cacheNoticeText}>
            Showing cached incoming consignments. Connect online to fetch live updates.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadConsignments()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderFilterChips()}

      {isLoading && !isRefreshing ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={consignments}
          keyExtractor={(item) => item.id}
          renderItem={renderConsignmentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadConsignments(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={
                selectedStatus !== 'ALL'
                  ? `No ${selectedStatus.toLowerCase()} consignments`
                  : 'No Incoming Consignments'
              }
              message={
                selectedStatus !== 'ALL'
                  ? `There are currently no consignments with status "${selectedStatus}".`
                  : 'Verified informal collectors will deliver aggregated e-waste batches to your facility.'
              }
            />
          }
        />
      )}
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  filterSection: {
    paddingVertical: spacing.spaceXs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'transparent',
  },
  filterContainer: {
    paddingHorizontal: spacing.spaceMd,
    gap: spacing.spaceXs,
  },
  filterChip: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.70)',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.spaceMd,
    gap: spacing.spaceSm,
    paddingBottom: spacing.spaceXl + 30,
  },
  card: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  cardDeliveredHighlight: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
  },
  codeContainer: {
    flex: 1,
  },
  consignmentCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.60)',
    marginTop: 2,
    fontWeight: '500',
  },
  deliveredAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  deliveredAlertIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  deliveredAlertText: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '700',
    flex: 1,
  },
  collectorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
    backgroundColor: 'rgba(6, 21, 27, 0.65)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  collectorIcon: {
    fontSize: 22,
    marginRight: spacing.spaceSm,
  },
  collectorDetails: {
    flex: 1,
  },
  collectorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  collectorSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 1,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 21, 27, 0.70)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 8,
    marginBottom: spacing.spaceSm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.60)',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  notesPreviewContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 21, 27, 0.50)',
    padding: 6,
    borderRadius: 6,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notesPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    marginRight: 4,
  },
  notesPreviewText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.90)',
    flex: 1,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.spaceXs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
  chainBadge: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '600',
  },
  inspectLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  skeletonContainer: {
    padding: spacing.spaceMd,
    gap: spacing.spaceMd,
  },
  skeletonCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.70)',
    borderRadius: 14,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    marginBottom: 10,
    width: '50%',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    marginBottom: 10,
    width: '80%',
  },
  skeletonMetrics: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: spacing.spaceSm,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
  },
  warningBannerIcon: {
    fontSize: 20,
    marginRight: spacing.spaceSm,
  },
  warningBannerContent: {
    flex: 1,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
  },
  warningBannerText: {
    fontSize: 11,
    color: '#FCD34D',
    marginTop: 2,
    lineHeight: 15,
  },
  cacheNotice: {
    backgroundColor: 'rgba(6, 21, 27, 0.65)',
    padding: 6,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceXs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
  },
  cacheNoticeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: spacing.spaceSm,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: spacing.spaceSm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  accessRestrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceXl,
  },
  accessRestrictedIcon: {
    fontSize: 48,
    marginBottom: spacing.spaceMd,
  },
  accessRestrictedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  accessRestrictedMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default RecyclerIncomingScreen;
