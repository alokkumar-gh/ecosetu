/**
 * EcoSetu Collector Consignments Screen
 * Allows verified informal collectors to track their created consignments and authoritative statuses.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 9, docs/07_BUSINESS_WORKFLOWS.md Section 2.3
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
  { key: 'CREATED', label: 'Created' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
];

interface Props {
  navigation?: any;
  route?: any;
}

export const CollectorConsignmentsScreen: React.FC<Props> = ({ navigation }) => {
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

        const res = await recyclingService.getCollectorConsignments(params);
        setConsignments(res.consignments || []);
        setFromCache(Boolean(res.fromCache));
      } catch (err: any) {
        setError(err.message || 'Failed to load your consignments');
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

  // Focus listener for freshness when returning from detail
  useEffect(() => {
    if (navigation?.addListener) {
      const unsub = navigation.addListener('focus', () => {
        loadConsignments();
      });
      return unsub;
    }
  }, [navigation, loadConsignments]);

  // Role Access Guard
  if (user && user.role !== 'INFORMAL_COLLECTOR' && user.role !== 'ADMIN') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <TopAppBar title="My Consignments" onBack={() => navigation?.goBack()} />
        <View style={styles.accessRestrictedContainer}>
          <Text style={styles.accessRestrictedIcon}>🔒</Text>
          <Text style={styles.accessRestrictedTitle}>Access Restricted</Text>
          <Text style={styles.accessRestrictedMessage}>
            Only verified informal collectors can access collector consignment tracking.
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
    const isAccepted = item.status === 'ACCEPTED';
    const isRejected = item.status === 'REJECTED';
    const isDelivered = item.status === 'DELIVERED';
    const itemCount = item.totalItems || (item.consignmentItems ? item.consignmentItems.length : 0);
    const weightDisplay = item.totalWeightKg
      ? `${parseFloat(item.totalWeightKg).toFixed(1)} kg`
      : 'Weight pending';
    const facilityName = item.recycler?.facilityName || 'Authorized Formal Recycler';
    const facilityAddress = item.recycler?.facilityAddress || 'Address on file';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation?.navigate('CollectorConsignmentStatus', {
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

        {/* Recycler Facility Info */}
        <View style={styles.facilityInfoRow}>
          <Text style={styles.facilityIcon}>🏭</Text>
          <View style={styles.facilityDetails}>
            <Text style={styles.facilityName}>{facilityName}</Text>
            <Text style={styles.facilityAddress} numberOfLines={1}>
              {facilityAddress}
            </Text>
          </View>
        </View>

        {/* Metrics Summary */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Items Consigned</Text>
            <Text style={styles.metricValue}>{itemCount} pcs</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Weight</Text>
            <Text style={styles.metricValue}>{weightDisplay}</Text>
          </View>
        </View>

        {/* Status Callout Banners */}
        {isRejected && item.rejectionReason && (
          <View style={styles.rejectionAlertBanner}>
            <Text style={styles.rejectionAlertIcon}>⚠️</Text>
            <View style={styles.rejectionAlertContent}>
              <Text style={styles.rejectionAlertTitle}>Consignment Rejected by Facility</Text>
              <Text style={styles.rejectionAlertText} numberOfLines={2}>
                Reason: {item.rejectionReason}
              </Text>
            </View>
          </View>
        )}

        {isAccepted && (
          <View style={styles.acceptedAlertBanner}>
            <Text style={styles.acceptedAlertIcon}>✓</Text>
            <Text style={styles.acceptedAlertText}>
              Accepted for Certified Recycling • Items in CONSIGNED status
            </Text>
          </View>
        )}

        {isDelivered && (
          <View style={styles.deliveredAlertBanner}>
            <Text style={styles.deliveredAlertIcon}>📍</Text>
            <Text style={styles.deliveredAlertText}>
              Delivered to facility • Awaiting recycler inspection & acceptance
            </Text>
          </View>
        )}

        {/* Delivery notes preview */}
        {item.deliveryNotes ? (
          <View style={styles.notesPreviewContainer}>
            <Text style={styles.notesPreviewLabel}>Delivery Notes:</Text>
            <Text style={styles.notesPreviewText} numberOfLines={2}>
              {item.deliveryNotes}
            </Text>
          </View>
        ) : null}

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.chainBadge}>EcoSetu Formal Recycler Handoff</Text>
          <Text style={styles.inspectLink}>
            {item.status === 'CREATED' || item.status === 'IN_TRANSIT'
              ? 'Handoff Pending →'
              : item.status === 'DELIVERED'
              ? 'Delivered →'
              : 'View Status →'}
          </Text>
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
        title="My Consignments"
        subtitle="Track formal recycling batch handoffs"
        showBack
        onBack={() => navigation?.goBack()}
        roleBadge="INFORMAL_COLLECTOR"
      />

      {isOffline && <OfflineBanner />}

      {fromCache && (
        <View style={styles.cacheNotice}>
          <Text style={styles.cacheNoticeText}>
            Showing cached consignment records. Connect online for live updates.
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
                  : 'No Consignments Yet'
              }
              message={
                selectedStatus !== 'ALL'
                  ? `You have no consignments with status "${selectedStatus}".`
                  : 'Batch your collected e-waste and deliver to authorized recyclers from the Recycler Directory.'
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
  facilityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginVertical: spacing.spaceXs,
  },
  facilityIcon: {
    fontSize: 20,
    marginRight: spacing.spaceSm,
  },
  facilityDetails: {
    flex: 1,
  },
  facilityName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  facilityAddress: {
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
  rejectionAlertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    marginVertical: spacing.spaceXs,
    alignItems: 'flex-start',
  },
  rejectionAlertIcon: {
    fontSize: 16,
    marginRight: spacing.spaceXs,
    marginTop: 1,
  },
  rejectionAlertContent: {
    flex: 1,
  },
  rejectionAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  rejectionAlertText: {
    fontSize: 12,
    color: '#B71C1C',
    marginTop: 2,
  },
  acceptedAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    marginVertical: spacing.spaceXs,
  },
  acceptedAlertIcon: {
    fontSize: 16,
    color: '#2E7D32',
    marginRight: spacing.spaceXs,
    fontWeight: '700',
  },
  acceptedAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E20',
    flex: 1,
  },
  deliveredAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00695C',
    marginVertical: spacing.spaceXs,
  },
  deliveredAlertIcon: {
    fontSize: 14,
    marginRight: spacing.spaceXs,
  },
  deliveredAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004D40',
    flex: 1,
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

export default CollectorConsignmentsScreen;
