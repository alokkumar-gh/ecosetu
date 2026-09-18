/**
 * AdminDashboardScreen
 * Authenticated ADMIN — Platform activity, circular metrics, and conversion funnel.
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 14
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md Section 4
 *   docs/22_ANALYTICS_AND_REPORTING.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { MetricCard } from '../../components/common/MetricCard';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { adminService } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  navigation?: any;
}

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshingRef = useRef<boolean>(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const result = await adminService.getAnalytics();
      setAnalytics(result.analytics || null);
      setFromCache(result.fromCache);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to load platform analytics.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadData(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadData]);

  // Extract structured backend data
  const users = analytics?.users || {};
  const userRoles = users?.byRole || {};
  const pickups = analytics?.pickups || {};
  const consignments = analytics?.consignments || {};
  const recycling = analytics?.recycling || {};
  const funnel = analytics?.conversionFunnel || {};
  const recentActivity = analytics?.recentActivity || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Admin Dashboard"
        subtitle="Platform Governance & Telemetry"
        showBack={false}
      />

      <OfflineBanner />

      {isLoading ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContainer}>
          <Skeleton width="100%" height={120} borderRadius={8} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton width="100%" height={160} borderRadius={8} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton width="100%" height={200} borderRadius={8} />
        </ScrollView>
      ) : error && !analytics ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Analytics Unavailable"
            message={error}
            actionLabel="Retry"
            onAction={() => loadData(false)}
          />
        </View>
      ) : !analytics ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="No Data Available"
            message="Platform metrics have not been recorded yet."
            actionLabel="Refresh"
            onAction={() => loadData(false)}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Section: Platform Users */}
          <Text style={styles.sectionTitle}>User Ecosystem</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              value={users.total ?? 0}
              label="Total Users"
              icon="👥"
              accentColor={colors.primary}
            />
            <MetricCard
              value={userRoles.CITIZEN ?? 0}
              label="Citizens"
              icon="🏡"
              accentColor="#2E7D32"
            />
            <MetricCard
              value={userRoles.INFORMAL_COLLECTOR ?? 0}
              label="Collectors"
              icon="🛵"
              accentColor="#E65100"
            />
            <MetricCard
              value={userRoles.RECYCLER ?? 0}
              label="Recyclers"
              icon="🏭"
              accentColor="#1565C0"
            />
          </View>

          {/* Section: Circular Operations */}
          <Text style={styles.sectionTitle}>Circular Logistics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              value={analytics?.ewasteItems?.total ?? 0}
              label="E-Waste Items"
              icon="💻"
              accentColor="#455A64"
            />
            <MetricCard
              value={analytics?.requests?.total ?? 0}
              label="Collection Reqs"
              icon="📋"
              accentColor="#6A1B9A"
            />
            <MetricCard
              value={pickups?.completed ?? 0}
              label="Pickups Done"
              icon="✅"
              accentColor="#00695C"
            />
            <MetricCard
              value={`${pickups?.totalWeightKg ?? 0} kg`}
              label="Collected Wt"
              icon="⚖️"
              accentColor="#C2185B"
            />
          </View>

          {/* Section: Formal Recycling */}
          <Text style={styles.sectionTitle}>Recycling & Recovery</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              value={consignments?.accepted ?? 0}
              label="Consignments"
              icon="📦"
              accentColor="#0277BD"
            />
            <MetricCard
              value={recycling?.completed ?? 0}
              label="Batches Recycled"
              icon="🔄"
              accentColor="#2E7D32"
            />
            <MetricCard
              value={`${recycling?.totalOutputWeightKg ?? 0} kg`}
              label="Recovered Wt"
              icon="🌿"
              accentColor="#33691E"
            />
          </View>

          {/* Section: Operational Conversion Funnel */}
          <Text style={styles.sectionTitle}>Operational Conversion Funnel</Text>
          <View style={styles.card}>
            <View style={styles.funnelRow}>
              <Text style={styles.funnelStep}>1. Items Submitted</Text>
              <Text style={styles.funnelValue}>{funnel.itemsSubmitted ?? 0}</Text>
            </View>
            <View style={styles.funnelRow}>
              <Text style={styles.funnelStep}>2. Requests Submitted</Text>
              <Text style={styles.funnelValue}>{funnel.requestsSubmitted ?? 0}</Text>
            </View>
            <View style={styles.funnelRow}>
              <Text style={styles.funnelStep}>3. Requests Accepted</Text>
              <Text style={styles.funnelValue}>{funnel.requestsAccepted ?? 0}</Text>
            </View>
            <View style={styles.funnelRow}>
              <Text style={styles.funnelStep}>4. Doorstep Pickups Completed</Text>
              <Text style={styles.funnelValue}>{funnel.pickupsCompleted ?? 0}</Text>
            </View>
            <View style={styles.funnelRow}>
              <Text style={styles.funnelStep}>5. Consignments Delivered & Accepted</Text>
              <Text style={styles.funnelValue}>{funnel.consignmentsDelivered ?? 0}</Text>
            </View>
            <View style={[styles.funnelRow, styles.funnelRowLast]}>
              <Text style={[styles.funnelStep, { color: colors.primary, fontWeight: '700' }]}>
                6. Formally Recycled
              </Text>
              <Text style={[styles.funnelValue, { color: colors.primary, fontWeight: '700' }]}>
                {funnel.recyclingCompleted ?? 0}
              </Text>
            </View>
          </View>

          {/* Section: Recent Platform Activity */}
          <Text style={styles.sectionTitle}>Recent Activity Trail</Text>
          <View style={styles.card}>
            {recentActivity.length === 0 ? (
              <Text style={styles.emptyText}>No recent activities recorded.</Text>
            ) : (
              recentActivity.map((act: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.activityItem,
                    idx === recentActivity.length - 1 && styles.activityItemLast,
                  ]}
                >
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityAction}>{act.action}</Text>
                    <Text style={styles.activityDate}>
                      {act.createdAt ? new Date(act.createdAt).toLocaleDateString('en-IN') : ''}
                    </Text>
                  </View>
                  <Text style={styles.activityMeta}>
                    By {act.actorName || 'System'} • Entity: {act.entityType || '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  sectionTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
    marginBottom: spacing.spaceMd,
  },
  funnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  funnelRowLast: {
    borderBottomWidth: 0,
    paddingTop: spacing.spaceSm + 4,
  },
  funnelStep: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  funnelValue: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityItem: {
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityAction: {
    fontSize: typography.Body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityDate: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  activityMeta: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.spaceMd,
  },
});

export default AdminDashboardScreen;
