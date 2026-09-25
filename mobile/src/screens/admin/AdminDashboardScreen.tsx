/**
 * AdminDashboardScreen — ECOSETU Admin Command Center
 *
 * The operational brain of ECOSETU.
 *
 * Hierarchy:
 *   Welcome + period selector
 *     ↓ Core KPI hero row (6 metrics)
 *     ↓ Needs Your Attention (action center)
 *     ↓ Recent Activity (audit feed) + Collection Funnel
 *     ↓ E-Waste & Collector snapshot
 *     ↓ Recycler coverage
 *
 * All data from adminService.getAnalytics() — real backend, no fake numbers.
 * Period filter: 7D / 30D / 90D / 1Y
 *
 * Layout: AdminShell (sidebar + topbar) wrapping ScrollView content.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { adminService } from '../../services/adminService';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminKPICard } from '../../components/admin/AdminKPICard';
import { AdminActionCenter, ActionItem } from '../../components/admin/AdminActionCenter';
import { AdminActivityFeed, ActivityEntry } from '../../components/admin/AdminActivityFeed';
import { AdminFunnel, FunnelStage } from '../../components/admin/AdminFunnel';
import {
  AdminSectionHeader,
  AdminStatusBadge,
  AdminEmptyState,
  AdminErrorState,
  AdminKPISkeleton,
  AdminSkeleton,
} from '../../components/admin/AdminUI';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_SHADOW,
  ADMIN_LAYOUT,
} from '../../components/admin/AdminTheme';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  navigation?: any;
}

type Period = '7D' | '30D' | '90D' | '1Y';
const PERIODS: Period[] = ['7D', '30D', '90D', '1Y'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [period, setPeriod] = useState<Period>('30D');

  const loadData = useCallback(
    async (p: Period = period, silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const res = await adminService.getAnalytics(p.toLowerCase());
        setAnalytics(res.analytics || null);
        setFromCache(Boolean(res.fromCache));
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Unable to load platform analytics.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [period]
  );

  useEffect(() => {
    loadData(period);
  }, [period]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(period, true);
  }, [period, loadData]);

  // ── Data extraction ─────────────────────────────────────────────────────────
  const kpis = analytics?.executiveKpis || {};
  const bottlenecks = analytics?.bottlenecks || {};
  const recentLogs: ActivityEntry[] = (analytics?.recentActivity || []).map(
    (log: any) => ({
      id: log.id || log._id || String(Math.random()),
      action: log.action || '',
      entityType: log.entityType,
      entityId: log.entityId,
      actorName: log.actor?.name || log.actorName,
      actorRole: log.actor?.role || log.actorRole,
      createdAt: log.createdAt || log.timestamp || new Date().toISOString(),
      metadata: log.metadata,
    })
  );

  // ── Funnel stages from collectionOperations ─────────────────────────────────
  const ops = analytics?.collectionOperations || {};
  const funnelStages: FunnelStage[] = [
    { label: 'Requests', count: ops.totalRequests || 0 },
    { label: 'Accepted', count: ops.acceptedRequests || 0 },
    { label: 'Assigned', count: ops.assignedPickups || 0 },
    { label: 'Picked Up', count: ops.completedPickups || ops.pickedUp || 0 },
    { label: 'Verified', count: ops.verifiedItems || 0 },
    { label: 'Recycled', count: ops.recycledItems || analytics?.recyclingAnalytics?.totalRecycled || 0 },
  ].filter((s) => s.count >= 0);

  // ── Action center items ─────────────────────────────────────────────────────
  const actionItems: ActionItem[] = ([
    {
      id: 'pending-verifications',
      count: bottlenecks.pendingVerifications || kpis.pendingVerifications || 0,
      label: 'Collector/Recycler verifications pending',
      severity: 'warning' as const,
      screen: 'AdminVerifications',
      icon: '◎',
    },
    {
      id: 'pending-disputes',
      count: bottlenecks.openDisputes || kpis.openDisputes || 0,
      label: 'Disputed collections awaiting review',
      severity: 'critical' as const,
      screen: 'AdminDisputes',
      icon: '⚠',
    },
    {
      id: 'overdue-pickups',
      count: bottlenecks.overduePickups || 0,
      label: 'Pickup requests overdue',
      severity: 'warning' as const,
      screen: 'AdminHome',
      icon: '⏱',
    },
    {
      id: 'system-alerts',
      count: bottlenecks.systemAlerts || 0,
      label: 'System health alerts',
      severity: 'critical' as const,
      screen: 'AdminSystemHealth',
      icon: '◐',
    },
  ] as ActionItem[]).filter((i) => i.count > 0);

  // ── E-waste breakdown ───────────────────────────────────────────────────────
  const ewasteStats = analytics?.ewasteAnalytics || {};
  const collectorStats = analytics?.collectorAnalytics || {};
  const recyclerStats = analytics?.recyclerAnalytics || {};

  const adminName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <AdminShell
      screenKey="AdminHome"
      breadcrumb={['Dashboard']}
      navigation={navigation}
      notificationCount={actionItems.length}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ADMIN_COLOR.brand}
            colors={[ADMIN_COLOR.brand]}
          />
        }
      >
        {/* ── Welcome Header ──────────────────────────────────────────────── */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {adminName}
            </Text>
            <Text style={styles.greetingSubtitle}>
              Here's what's happening across ECOSETU{' '}
              {period === '7D'
                ? 'this week'
                : period === '30D'
                ? 'this month'
                : period === '90D'
                ? 'this quarter'
                : 'this year'}
              .
            </Text>
          </View>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodBtn,
                  p === period && styles.periodBtnActive,
                ]}
                onPress={() => setPeriod(p)}
                accessibilityRole="button"
                accessibilityState={{ selected: p === period }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.periodBtnText,
                    p === period && styles.periodBtnTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Offline / cache notice */}
        {fromCache && (
          <View style={styles.cacheNotice}>
            <Text style={styles.cacheNoticeText}>
              ⚠ Viewing cached data (offline)
            </Text>
          </View>
        )}

        {/* ── KPI Hero Row ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          {isLoading ? (
            <AdminKPISkeleton />
          ) : error ? (
            <AdminErrorState
              message={error}
              onRetry={() => loadData(period)}
            />
          ) : (
            <View style={styles.kpiRow}>
              <AdminKPICard
                label="Total Users"
                value={kpis.totalUsers || kpis.users || '—'}
                trend={kpis.usersTrend}
                trendLabel={`vs prev ${period}`}
                icon="◈"
                accentColor={ADMIN_COLOR.brand}
                onPress={() => navigation?.navigate?.('AdminUsers')}
                sparkData={kpis.usersSparkline}
              />
              <AdminKPICard
                label="Active Collectors"
                value={kpis.activeCollectors || '—'}
                trend={kpis.collectorsTrend}
                trendLabel={`vs prev ${period}`}
                icon="♻"
                accentColor={ADMIN_COLOR.teal}
                onPress={() => navigation?.navigate?.('AdminUsers')}
                sparkData={kpis.collectorsSparkline}
              />
              <AdminKPICard
                label="E-Waste Collected"
                value={
                  kpis.totalWeightKg != null
                    ? (kpis.totalWeightKg / 1000).toFixed(2)
                    : kpis.ewasteCollected || '—'
                }
                unit="t"
                trend={kpis.ewasteWeightTrend}
                trendLabel={`vs prev ${period}`}
                icon="⊹"
                accentColor={ADMIN_COLOR.cyan}
                sparkData={kpis.ewasteSparkline}
              />
              <AdminKPICard
                label="Pending Pickups"
                value={kpis.pendingPickups || bottlenecks.pendingPickups || '—'}
                trend={kpis.pendingPickupsTrend}
                trendLabel={`vs prev ${period}`}
                icon="◇"
                accentColor={ADMIN_COLOR.warning}
                invertTrend
                onPress={() => navigation?.navigate?.('AdminHome')}
              />
              <AdminKPICard
                label="Verifications Pending"
                value={kpis.pendingVerifications || bottlenecks.pendingVerifications || '—'}
                trend={undefined}
                context="Collectors & Recyclers"
                icon="◎"
                accentColor="#818CF8"
                invertTrend
                onPress={() => navigation?.navigate?.('AdminVerifications')}
              />
              <AdminKPICard
                label="Active Recyclers"
                value={kpis.activeRecyclers || recyclerStats.totalRecyclers || '—'}
                trend={kpis.recyclersTrend}
                trendLabel={`vs prev ${period}`}
                icon="◉"
                accentColor="#A78BFA"
              />
            </View>
          )}
        </View>

        {/* ── Needs Attention ──────────────────────────────────────────────── */}
        {!isLoading && !error && (
          <View style={styles.section}>
            <AdminSectionHeader
              title="Needs Your Attention"
              subtitle="Operational exceptions requiring action"
              icon="◻"
            />
            <AdminActionCenter
              items={actionItems.length > 0 ? actionItems : []}
              onNavigate={(screen) => navigation?.navigate?.(screen)}
              isLoading={false}
            />
          </View>
        )}

        {/* ── Activity Feed + Funnel ──────────────────────────────────────── */}
        {!isLoading && !error && (
          <View style={styles.twoColRow}>
            {/* Activity Feed */}
            <View style={styles.twoColLeft}>
              <AdminSectionHeader
                title="Recent Activity"
                subtitle="Platform operation log"
                action={{
                  label: 'View all →',
                  onPress: () => navigation?.navigate?.('AdminAuditLogs'),
                }}
              />
              <AdminActivityFeed
                entries={recentLogs}
                isLoading={isLoading}
                onViewAll={() => navigation?.navigate?.('AdminAuditLogs')}
                maxItems={8}
              />
            </View>

            {/* Funnel */}
            <View style={styles.twoColRight}>
              <AdminSectionHeader
                title="Collection Funnel"
                subtitle="Requests → Completion"
              />
              <AdminFunnel
                stages={funnelStages}
                isLoading={isLoading}
              />
            </View>
          </View>
        )}

        {/* ── E-Waste Snapshot ─────────────────────────────────────────────── */}
        {!isLoading && !error && ewasteStats && (
          <View style={styles.section}>
            <AdminSectionHeader
              title="E-Waste Overview"
              subtitle={period + ' snapshot'}
              icon="♻"
              action={{
                label: 'Analytics →',
                onPress: () => navigation?.navigate?.('AdminHistoricalAnalytics'),
              }}
            />
            <View style={styles.statRowCards}>
              <StatCard
                label="Total Items"
                value={ewasteStats.totalItems || '—'}
                icon="⊹"
                color={ADMIN_COLOR.brand}
              />
              <StatCard
                label="Verified Weight"
                value={
                  ewasteStats.totalVerifiedWeightKg != null
                    ? `${(ewasteStats.totalVerifiedWeightKg / 1000).toFixed(2)} t`
                    : '—'
                }
                icon="◐"
                color={ADMIN_COLOR.teal}
              />
              <StatCard
                label="Top Category"
                value={ewasteStats.topCategory || ewasteStats.mostCommonCategory || '—'}
                icon="◈"
                color={ADMIN_COLOR.cyan}
              />
              <StatCard
                label="Avg Weight/Item"
                value={
                  ewasteStats.avgWeightKg != null
                    ? `${Number(ewasteStats.avgWeightKg).toFixed(1)} kg`
                    : '—'
                }
                icon="◻"
                color="#818CF8"
              />
            </View>
          </View>
        )}

        {/* ── Collector & Recycler Snapshot ────────────────────────────────── */}
        {!isLoading && !error && (
          <View style={styles.twoColRow}>
            {/* Collector stats */}
            <View style={styles.twoColLeft}>
              <AdminSectionHeader
                title="Collector Operations"
                subtitle={period + ' summary'}
                action={{
                  label: 'Users →',
                  onPress: () => navigation?.navigate?.('AdminUsers'),
                }}
              />
              <View style={styles.statsCard}>
                {[
                  {
                    label: 'Total Collectors',
                    value: collectorStats.totalCollectors || '—',
                  },
                  {
                    label: 'Verified Collectors',
                    value: collectorStats.verifiedCollectors || '—',
                  },
                  {
                    label: 'Pending Verification',
                    value: collectorStats.pendingVerification || '—',
                    highlight: true,
                  },
                  {
                    label: 'Avg Pickups / Collector',
                    value: collectorStats.avgPickupsPerCollector != null
                      ? Number(collectorStats.avgPickupsPerCollector).toFixed(1)
                      : '—',
                  },
                ].map((row, i, arr) => (
                  <View
                    key={row.label}
                    style={[
                      styles.statRow,
                      i < arr.length - 1 && styles.statRowBorder,
                    ]}
                  >
                    <Text style={styles.statRowLabel}>{row.label}</Text>
                    <Text
                      style={[
                        styles.statRowValue,
                        row.highlight && styles.statRowValueHighlight,
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recycler stats */}
            <View style={styles.twoColRight}>
              <AdminSectionHeader
                title="Recycler Facilities"
                subtitle="Authorization & coverage"
                action={{
                  label: 'Governance →',
                  onPress: () => navigation?.navigate?.('AdminGovernance'),
                }}
              />
              <View style={styles.statsCard}>
                {[
                  {
                    label: 'Total Recyclers',
                    value: recyclerStats.totalRecyclers || '—',
                  },
                  {
                    label: 'Authorized',
                    value: recyclerStats.authorizedRecyclers || '—',
                  },
                  {
                    label: 'Pending Authorization',
                    value: recyclerStats.pendingAuthorization || '—',
                    highlight: true,
                  },
                  {
                    label: 'Material Categories',
                    value: recyclerStats.categoryCount || '—',
                  },
                ].map((row, i, arr) => (
                  <View
                    key={row.label}
                    style={[
                      styles.statRow,
                      i < arr.length - 1 && styles.statRowBorder,
                    ]}
                  >
                    <Text style={styles.statRowLabel}>{row.label}</Text>
                    <Text
                      style={[
                        styles.statRowValue,
                        row.highlight && styles.statRowValueHighlight,
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Quick Nav Row ──────────────────────────────────────────────────── */}
        {!isLoading && (
          <View style={styles.section}>
            <AdminSectionHeader
              title="Quick Actions"
              subtitle="Common admin operations"
            />
            <View style={styles.quickNavGrid}>
              {[
                { label: 'Verifications', icon: '◎', screen: 'AdminVerifications', color: '#818CF8' },
                { label: 'Users', icon: '◈', screen: 'AdminUsers', color: ADMIN_COLOR.brand },
                { label: 'Recyclers', icon: '◉', screen: 'AdminGovernance', color: ADMIN_COLOR.teal },
                { label: 'Notifications', icon: '◻', screen: 'AdminNotificationCenter', color: ADMIN_COLOR.cyan },
                { label: 'Analytics', icon: '⊹', screen: 'AdminHistoricalAnalytics', color: '#A78BFA' },
                { label: 'Geographic', icon: '◑', screen: 'AdminGeographicAnalytics', color: ADMIN_COLOR.info },
                { label: 'Audit Log', icon: '▤', screen: 'AdminAuditLogs', color: ADMIN_COLOR.textLow },
                { label: 'Reports', icon: '⊞', screen: 'AdminReports', color: ADMIN_COLOR.warning },
              ].map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  style={styles.quickNavItem}
                  onPress={() => navigation?.navigate?.(item.screen)}
                  accessibilityRole="button"
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.quickNavIcon,
                      { backgroundColor: `${item.color}18` },
                    ]}
                  >
                    <Text style={[styles.quickNavIconText, { color: item.color }]}>
                      {item.icon}
                    </Text>
                  </View>
                  <Text style={styles.quickNavLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Bottom padding ──────────────────────────────────────────────── */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </AdminShell>
  );
};

// ── Inline StatCard sub-component ───────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <View style={[statCardStyles.card, { borderTopColor: color }]}>
    <View style={[statCardStyles.iconRow, { backgroundColor: `${color}15` }]}>
      <Text style={[statCardStyles.icon, { color }]}>{icon}</Text>
    </View>
    <Text style={statCardStyles.value}>{value}</Text>
    <Text style={statCardStyles.label} numberOfLines={2}>{label}</Text>
  </View>
);

const statCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    borderTopWidth: 2,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 100,
    ...ADMIN_SHADOW.card,
  },
  iconRow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  icon: {
    fontSize: 14,
  },
  value: {
    ...ADMIN_TYPE.metricSm,
    color: ADMIN_COLOR.textHigh,
  },
  label: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
    lineHeight: 16,
  },
});

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: ADMIN_LAYOUT.contentPaddingH,
    gap: ADMIN_LAYOUT.sectionGap,
  },

  // Welcome
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  greeting: {
    ...ADMIN_TYPE.h2,
    color: ADMIN_COLOR.textHigh,
    marginBottom: 4,
  },
  greetingSubtitle: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textLow,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 4,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ADMIN_RADIUS.sm,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    backgroundColor: ADMIN_COLOR.card,
  },
  periodBtnActive: {
    backgroundColor: ADMIN_COLOR.brandDim,
    borderColor: ADMIN_COLOR.brandBorder,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textMuted,
  },
  periodBtnTextActive: {
    color: ADMIN_COLOR.brand,
  },

  // Cache notice
  cacheNotice: {
    backgroundColor: ADMIN_COLOR.warningDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.warningBorder,
    borderRadius: ADMIN_RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: -12,
  },
  cacheNoticeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textAmber,
  },

  // Sections
  section: {
    gap: ADMIN_LAYOUT.cardGap,
  },

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ADMIN_LAYOUT.cardGap,
  },

  // Two column layout
  twoColRow: {
    flexDirection: 'row',
    gap: ADMIN_LAYOUT.cardGap,
    flexWrap: 'wrap',
  },
  twoColLeft: {
    flex: 1.4,
    minWidth: 220,
    gap: ADMIN_LAYOUT.cardGap,
  },
  twoColRight: {
    flex: 1,
    minWidth: 180,
    gap: ADMIN_LAYOUT.cardGap,
  },

  // Stat row cards (E-waste snapshot)
  statRowCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ADMIN_LAYOUT.cardGap,
  },

  // Stats card (key-value list)
  statsCard: {
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    overflow: 'hidden',
    ...ADMIN_SHADOW.card,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLOR.divider,
  },
  statRowLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textLow,
    flex: 1,
  },
  statRowValue: {
    ...ADMIN_TYPE.bodySmall,
    fontWeight: '700' as const,
    color: ADMIN_COLOR.textMid,
  },
  statRowValueHighlight: {
    color: ADMIN_COLOR.warning,
  },

  // Quick Nav
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickNavItem: {
    width: 88,
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    ...ADMIN_SHADOW.card,
  },
  quickNavIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickNavIconText: {
    fontSize: 18,
  },
  quickNavLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textMid,
    textAlign: 'center',
  },

  bottomPad: {
    height: 24,
  },
});

export default AdminDashboardScreen;
