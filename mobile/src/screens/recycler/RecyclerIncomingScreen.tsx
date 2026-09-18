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
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { recyclingService } from '../../services/recyclingService';
import { networkService } from '../../services/networkService';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="Incoming Consignments" />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            This screen is reserved for verified formal recycling facilities. Citizens and informal
            collectors cannot access recycler consignment management.
          </Text>
        </View>
      </SafeAreaView>
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
        style={[styles.card, isDelivered && styles.cardDeliveredHighlight]}
        onPress={() =>
          navigation?.navigate('ConsignmentDetail', {
            consignmentId: item.id,
            consignment: item,
          })
        }
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Consignment ${item.id ? item.id.slice(0, 8) : ''}, status ${item.status}`}
      >
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
          <Text style={styles.chainBadge}>EcoSetu Chain of Custody Verified</Text>
          <Text style={styles.inspectLink}>Inspect Details →</Text>
        </View>
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <TopAppBar
        title="Incoming Consignments"
        subtitle="Deliveries from verified collectors"
        roleBadge="FORMAL_RECYCLER"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterSection: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingVertical: spacing.spaceXs,
  },
  filterContainer: {
    paddingHorizontal: spacing.spaceMd,
    gap: spacing.spaceXs,
  },
  filterChip: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.spaceMd,
    gap: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDeliveredHighlight: {
    borderColor: '#80CBC4',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceXs,
  },
  codeContainer: {
    flex: 1,
  },
  consignmentCode: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deliveredAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: spacing.spaceXs,
  },
  deliveredAlertIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  deliveredAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00695C',
    flex: 1,
  },
  collectorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginVertical: spacing.spaceXs,
  },
  collectorIcon: {
    fontSize: 20,
    marginRight: spacing.spaceSm,
  },
  collectorDetails: {
    flex: 1,
  },
  collectorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  collectorSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingVertical: spacing.spaceSm,
    marginVertical: spacing.spaceXs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.divider,
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesPreviewContainer: {
    backgroundColor: '#FAFAFA',
    padding: spacing.spaceXs,
    borderRadius: 6,
    marginTop: spacing.spaceXs,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  notesPreviewText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceXs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  chainBadge: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  inspectLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
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
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: spacing.spaceSm,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: 8,
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
    color: '#8D6E63',
  },
  warningBannerText: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
    lineHeight: 16,
  },
  cacheNotice: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: spacing.spaceMd,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  cacheNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    margin: spacing.spaceMd,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  skeletonContainer: {
    padding: spacing.spaceMd,
    gap: spacing.spaceMd,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    height: 160,
    borderWidth: 1,
    borderColor: colors.divider,
    justifyContent: 'space-around',
  },
  skeletonHeader: {
    height: 20,
    width: '60%',
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
  },
  skeletonLine: {
    height: 40,
    width: '100%',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
  },
  skeletonMetrics: {
    height: 35,
    width: '100%',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
  },
});

export default RecyclerIncomingScreen;
