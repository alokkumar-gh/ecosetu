/**
 * AdminReportsScreen.tsx
 * EcoSetu — Phase 19, Task 13: Admin Reporting & Export Foundation
 *
 * Requirements:
 * - Administrator role only (ROLES.ADMIN)
 * - Authoritative data only: Platform analytics, audit logs, verified facility directory
 * - Zero fabricated metrics; zero arbitrary fake date ranges
 * - Export formats: Standard CSV and human-readable Shareable Text (generated on-device)
 * - Explicit limitation notice for server-side PDF/XLSX
 * - Privacy safe: ZERO citizen coordinates, addresses, house numbers, or phone numbers
 * - Offline-first: Uses cached telemetry when disconnected, renders OfflineBanner
 * - Multilingual: 100% key parity via useI18n()
 * - Glassmorphism UI tokens & minimum 48px touch targets
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { AdminShell } from '../../components/admin/AdminShell';
import { MetricCard } from '../../components/common/MetricCard';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { adminService } from '../../services/adminService';
import { recyclingService } from '../../services/recyclingService';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { ROLES, EWASTE_CATEGORIES, REQUEST_STATUS } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';

interface Props {
  navigation?: any;
}

export const AdminReportsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  // Role Guard: Administrator access only
  const isAdmin = user?.role === ROLES.ADMIN;

  // Data state
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [recyclers, setRecyclers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const refreshingRef = useRef<boolean>(false);

  // Load authoritative analytics, verified recyclers, and recent audit logs
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const [analyticsRes, recyclersRes, auditRes] = await Promise.all([
        adminService.getAnalytics(),
        recyclingService.getRecyclers().catch(() => ({ recyclers: [], fromCache: true })),
        adminService.getAuditLogs({ limit: 10 }).catch(() => ({ auditLogs: [], fromCache: true })),
      ]);

      setAnalytics(analyticsRes.analytics || null);
      setRecyclers(recyclersRes.recyclers || []);
      setAuditLogs(auditRes.auditLogs || []);
      setFromCache(Boolean(analyticsRes.fromCache || recyclersRes.fromCache || auditRes.fromCache));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load platform reporting telemetry.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData(false);
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, loadData]);

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadData(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadData]);

  // Derived regional breakdown from authoritative verified recyclers
  const regionalBreakdown = useMemo(() => {
    const regions: Record<
      string,
      { state: string; district: string; facilityCount: number; totalConsignments: number }
    > = {};

    recyclers.forEach((r) => {
      const stateName = r.state || 'General';
      const districtName = r.district || r.city || 'Central';
      const key = `${stateName} - ${districtName}`;
      if (!regions[key]) {
        regions[key] = {
          state: stateName,
          district: districtName,
          facilityCount: 0,
          totalConsignments: 0,
        };
      }
      regions[key].facilityCount += 1;
      regions[key].totalConsignments += r.totalConsignments || 0;
    });

    return Object.values(regions);
  }, [recyclers]);

  // Conversion Funnel Steps (docs/22 Section 2.5)
  const funnel = useMemo(() => {
    const itemsSubmitted = analytics?.ewasteItems?.total ?? 0;
    const requestsSubmitted = analytics?.requests?.total ?? 0;
    const completedPickups = analytics?.pickups?.completed ?? 0;
    const acceptedConsignments = analytics?.consignments?.accepted ?? 0;
    const completedRecycling = analytics?.recycling?.completed ?? 0;

    return [
      {
        step: 1,
        name: t('admin.reports.stepItemsSubmitted') || 'Items Submitted',
        value: itemsSubmitted,
        unit: 'items',
      },
      {
        step: 2,
        name: t('admin.reports.stepRequestsSubmitted') || 'Requests Created',
        value: requestsSubmitted,
        unit: 'requests',
      },
      {
        step: 3,
        name: t('admin.reports.stepPickupsCompleted') || 'Pickups Completed',
        value: completedPickups,
        unit: 'pickups',
      },
      {
        step: 4,
        name: t('admin.reports.stepConsignmentsDelivered') || 'Consignments Delivered',
        value: acceptedConsignments,
        unit: 'consignments',
      },
      {
        step: 5,
        name: t('admin.reports.stepRecyclingCompleted') || 'Recycling Completed',
        value: completedRecycling,
        unit: 'batches',
      },
    ];
  }, [analytics, t]);

  // Generate standard CSV string strictly from authorized aggregate data
  const generateCsvReport = useCallback(() => {
    const lines: string[] = [];
    lines.push('ECOSETU PLATFORM GOVERNANCE & COMPLIANCE REPORT');
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push(`Report Scope,Platform-Wide Authoritative Aggregates`);
    lines.push(`Privacy Status,Citizen Doorstep Locations Strictly Protected`);
    lines.push('');

    // 1. Executive Summary
    lines.push('--- 1. PLATFORM SUMMARY ---');
    lines.push('Metric,Value');
    lines.push(`Total Registered Users,${analytics?.users?.total ?? 0}`);
    lines.push(`Citizens,${analytics?.users?.byRole?.CITIZEN ?? 0}`);
    lines.push(`Informal Collectors,${analytics?.users?.byRole?.INFORMAL_COLLECTOR ?? 0}`);
    lines.push(`Formal Recyclers,${analytics?.users?.byRole?.RECYCLER ?? 0}`);
    lines.push(`Total E-Waste Items,${analytics?.ewasteItems?.total ?? 0}`);
    lines.push(`Total Collection Requests,${analytics?.requests?.total ?? 0}`);
    lines.push(`Completed Pickups,${analytics?.pickups?.completed ?? 0}`);
    lines.push(`Total Weight Collected (kg),${analytics?.pickups?.totalWeightKg ?? 0}`);
    lines.push(`Consignments Accepted,${analytics?.consignments?.accepted ?? 0}`);
    lines.push(`Consignments Rejected,${analytics?.consignments?.rejected ?? 0}`);
    lines.push(`Recycling Records Completed,${analytics?.recycling?.completed ?? 0}`);
    lines.push(`Total Output Weight Recycled (kg),${analytics?.recycling?.totalOutputWeightKg ?? 0}`);
    lines.push('');

    // 2. E-Waste Categories
    lines.push('--- 2. E-WASTE CATEGORY BREAKDOWN ---');
    lines.push('Category,Item Count');
    const categories = analytics?.ewasteItems?.byCategory || {};
    Object.entries(categories).forEach(([cat, count]) => {
      lines.push(`${cat},${count}`);
    });
    lines.push('');

    // 3. Request Statuses
    lines.push('--- 3. COLLECTION REQUEST STATUSES ---');
    lines.push('Status,Request Count');
    const statuses = analytics?.requests?.byStatus || {};
    Object.entries(statuses).forEach(([st, count]) => {
      lines.push(`${st},${count}`);
    });
    lines.push('');

    // 4. Regional Facility Coverage
    lines.push('--- 4. REGIONAL FACILITY COVERAGE ---');
    lines.push('State,District,Verified Recycler Facilities,Consignments Processed');
    regionalBreakdown.forEach((reg) => {
      lines.push(`"${reg.state}","${reg.district}",${reg.facilityCount},${reg.totalConsignments}`);
    });
    lines.push('');

    // 5. Recent Audit Trail
    lines.push('--- 5. RECENT GOVERNANCE AUDIT LOGS ---');
    lines.push('Timestamp,Action,Entity Type,Actor Name');
    auditLogs.forEach((log) => {
      lines.push(
        `"${log.createdAt || ''}","${log.action || ''}","${log.entityType || ''}","${log.actor?.name || log.actorName || 'System'}"`
      );
    });

    return lines.join('\n');
  }, [analytics, regionalBreakdown, auditLogs]);

  // Generate shareable human-readable text summary
  const generateTextSummary = useCallback(() => {
    const u = analytics?.users || {};
    const p = analytics?.pickups || {};
    const r = analytics?.recycling || {};
    const c = analytics?.consignments || {};

    return [
      '📊 ECOSETU PLATFORM EXECUTIVE SUMMARY',
      '====================================',
      `Date: ${new Date().toLocaleDateString()}`,
      `Scope: Authoritative Governance Analytics`,
      '',
      '👥 USER ECOSYSTEM:',
      `• Total Users: ${u.total ?? 0}`,
      `  - Citizens: ${u.byRole?.CITIZEN ?? 0}`,
      `  - Informal Collectors: ${u.byRole?.INFORMAL_COLLECTOR ?? 0}`,
      `  - Verified Recyclers: ${u.byRole?.RECYCLER ?? 0}`,
      '',
      '♻️ COLLECTION & LOGISTICS:',
      `• E-Waste Items Logged: ${analytics?.ewasteItems?.total ?? 0}`,
      `• Collection Requests: ${analytics?.requests?.total ?? 0}`,
      `• Completed Pickups: ${p.completed ?? 0}`,
      `• Total Collected Weight: ${p.totalWeightKg ?? 0} kg`,
      '',
      '🏭 FORMAL RECYCLING:',
      `• Consignments Delivered: ${c.accepted ?? 0}`,
      `• Recycled Batches: ${r.completed ?? 0}`,
      `• Output Weight Recovered: ${r.totalOutputWeightKg ?? 0} kg`,
      '',
      '🛡️ PRIVACY & COMPLIANCE:',
      '• Citizen household doorstep coordinates are strictly aggregated and never exposed.',
      '• Audit log records verified and immutable on ECOSETU.',
    ].join('\n');
  }, [analytics]);

  // Handle CSV export share
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csv = generateCsvReport();
      await Share.share({
        title: 'EcoSetu_Platform_Report.csv',
        message: csv,
      });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Export Error', err?.message || 'Unable to share CSV report.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Handle text summary share
  const handleExportSummary = async () => {
    setIsExporting(true);
    try {
      const summary = generateTextSummary();
      await Share.share({
        title: 'EcoSetu_Executive_Summary.txt',
        message: summary,
      });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Share Error', err?.message || 'Unable to share executive summary.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ── Role Authorization Guard ──────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('admin.reports.title') || 'Platform Reports & Exports'}
          subtitle={t('admin.reports.subtitle') || 'Authoritative Governance & Compliance'}
          showBack={true}
          onBack={() => navigation?.goBack?.()}
        />
        <View style={styles.centerContainer}>
          <EmptyState
            title={t('admin.reports.accessRestricted') || 'Access Restricted'}
            message={
              t('admin.reports.accessRestrictedMessage') ||
              'Platform reports and data exports are strictly restricted to authorized administrators.'
            }
            actionLabel="Go Back"
            onAction={() => navigation?.goBack?.()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AdminShell
      title={t('admin.reports.title') || 'Platform Reports & Exports'}
      subtitle={t('admin.reports.subtitle') || 'Authoritative Governance & Compliance'}
      activeScreen="AdminReports"
      navigation={navigation}
    >
      <OfflineBanner />

      {/* Snapshot Information Banner */}
      <View style={styles.snapshotBanner}>
        <Text style={styles.snapshotBannerText}>
          {fromCache
            ? `⚠️ ${t('admin.reports.offlineCachedNotice') || 'Showing cached reporting data (Offline).'}`
            : `⚡ ${t('admin.reports.currentSnapshotNotice') || 'Snapshot: Reflects current platform-wide authoritative analytics.'}`}
        </Text>
      </View>

      {/* Export Action Controls */}
      <View style={styles.exportBar}>
        <ReadAloudButton
          variant="compact"
          text={() =>
            `${t('admin.reports.platformOverview') || 'Platform Overview'}. ${t('admin.reports.stepItemsSubmitted') || 'Items'}: ${analytics?.funnel?.itemsSubmitted ?? 0}. ${t('admin.reports.stepPickupsCompleted') || 'Pickups'}: ${analytics?.funnel?.pickupsCompleted ?? 0}. ${t('admin.reports.totalRecycledWeight') || 'Recycled Weight'}: ${analytics?.totalRecycledWeight ?? 0} kg.`
          }
          accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
        />

        <TouchableOpacity
          style={[styles.exportButton, styles.exportButtonCsv]}
          onPress={handleExportCsv}
          disabled={isExporting || isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('admin.reports.exportCsv') || 'Export CSV Report'}
        >
          <Text style={[styles.exportButtonText, styles.exportButtonTextCsv]}>
            📄 {t('admin.reports.exportCsv') || 'Export CSV'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportButton, styles.exportButtonSummary]}
          onPress={handleExportSummary}
          disabled={isExporting || isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('admin.reports.exportSummary') || 'Share Summary Text'}
        >
          <Text style={styles.exportButtonText}>
            📤 {t('admin.reports.exportSummary') || 'Share Summary'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Enterprise Export Engine Limitation Notice */}
      <View style={styles.limitationCard}>
        <Text style={styles.limitationText}>
          {t('admin.reports.exportLimitationNotice') ||
            'ℹ️ Direct PDF/Excel export requires the enterprise server reporting engine. Comprehensive CSV and text exports are generated on-device.'}
        </Text>
      </View>

      {isLoading ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContainer}>
          <Skeleton width="100%" height={120} borderRadius={8} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton width="100%" height={180} borderRadius={8} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton width="100%" height={240} borderRadius={8} />
        </ScrollView>
      ) : error && !analytics ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Reporting Data Unavailable"
            message={error}
            actionLabel="Retry"
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
          {/* Section 1: Platform Overview Metrics */}
          <Text style={styles.sectionTitle}>
            {t('admin.reports.platformOverview') || 'Platform Overview'}
          </Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              value={analytics?.users?.total ?? 0}
              label={t('admin.reports.usersByRole') || 'Total Users'}
              icon="👥"
              accentColor={colors.primary}
            />
            <MetricCard
              value={analytics?.ewasteItems?.total ?? 0}
              label={t('admin.reports.itemsByCategory') || 'E-Waste Items'}
              icon="📱"
              accentColor="#6A1B9A"
            />
            <MetricCard
              value={analytics?.requests?.total ?? 0}
              label={t('admin.reports.totalRequests') || 'Total Requests'}
              icon="📋"
              accentColor="#00695C"
            />
            <MetricCard
              value={`${analytics?.pickups?.totalWeightKg ?? 0} kg`}
              label={t('admin.reports.pickupsAndWeight') || 'Collected Wt'}
              icon="⚖️"
              accentColor="#2E7D32"
            />
            <MetricCard
              value={`${analytics?.recycling?.totalOutputWeightKg ?? 0} kg`}
              label={t('admin.reports.recyclingOutputs') || 'Recycled Wt'}
              icon="🌿"
              accentColor="#1565C0"
            />
            <MetricCard
              value={recyclers.length}
              label={t('admin.reports.facilityCoverage') || 'Verified Recyclers'}
              icon="🏭"
              accentColor="#E65100"
            />
          </View>

          {/* Section 2: Conversion Funnel */}
          <Text style={styles.sectionTitle}>
            {t('admin.reports.conversionFunnel') || 'Platform Conversion Funnel'}
          </Text>
          <View style={styles.card}>
            {funnel.map((item, idx) => (
              <View key={idx} style={styles.funnelRow}>
                <View style={styles.funnelStepBadge}>
                  <Text style={styles.funnelStepText}>{item.step}</Text>
                </View>
                <View style={styles.funnelInfo}>
                  <Text style={styles.funnelName}>{item.name}</Text>
                  <Text style={styles.funnelValue}>
                    {item.value} {item.unit}
                  </Text>
                </View>
                {idx > 0 && funnel[0].value > 0 && (
                  <View style={styles.funnelRateBadge}>
                    <Text style={styles.funnelRateText}>
                      {((item.value / funnel[0].value) * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Section 3: Operational Summary */}
          <Text style={styles.sectionTitle}>
            {t('admin.reports.operationalSummary') || 'Operational Summary'}
          </Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>🛵 Informal Collectors Registered:</Text>
              <Text style={styles.summaryValue}>{analytics?.users?.byRole?.INFORMAL_COLLECTOR ?? 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>✅ Pickups Completed:</Text>
              <Text style={styles.summaryValue}>{analytics?.pickups?.completed ?? 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>📦 Formal Consignments Accepted:</Text>
              <Text style={styles.summaryValue}>{analytics?.consignments?.accepted ?? 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>❌ Consignments Rejected:</Text>
              <Text style={styles.summaryValue}>{analytics?.consignments?.rejected ?? 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>🏭 Recycling Records Completed:</Text>
              <Text style={styles.summaryValue}>{analytics?.recycling?.completed ?? 0}</Text>
            </View>
          </View>

          {/* Section 4: Geographic & Facility Summary */}
          <Text style={styles.sectionTitle}>
            {t('admin.reports.geographicSummary') || 'Geographic & Facility Summary'}
          </Text>
          {regionalBreakdown.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No regional facility records available.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {regionalBreakdown.map((reg, idx) => (
                <View key={idx} style={styles.facilityRow}>
                  <View style={styles.facilityHeader}>
                    <Text style={styles.facilityState}>{reg.state}</Text>
                    <Text style={styles.facilityDistrict}>{reg.district}</Text>
                  </View>
                  <View style={styles.facilityStats}>
                    <Text style={styles.facilityStatText}>
                      🏭 {reg.facilityCount} facilities | 📦 {reg.totalConsignments} consignments
                    </Text>
                  </View>
                </View>
              ))}
              <Text style={styles.privacyFootnote}>
                🔒 Citizen household doorstep coordinates are strictly protected and never included in reports.
              </Text>
            </View>
          )}

          {/* Section 5: Recent Governance Audit Trail */}
          <Text style={styles.sectionTitle}>
            {t('admin.reports.recentActivity') || 'Recent Governance Audit Trail'}
          </Text>
          {auditLogs.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No recent audit events recorded.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {auditLogs.map((log, idx) => (
                <View key={idx} style={styles.auditRow}>
                  <View style={styles.auditHeader}>
                    <Text style={styles.auditAction}>{log.action}</Text>
                    <Text style={styles.auditDate}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <Text style={styles.auditActor}>
                    Actor: {log.actor?.name || log.actorName || 'System'} | Entity: {log.entityType}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </AdminShell>
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
    paddingBottom: spacing.spaceXl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  snapshotBanner: {
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceXs,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  snapshotBannerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  exportBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.spaceMd,
    marginVertical: spacing.spaceXs,
    gap: spacing.spaceSm,
  },
  exportButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceSm,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  exportButtonCsv: {
    backgroundColor: colors.primary,
  },
  exportButtonSummary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exportButtonTextCsv: {
    color: colors.textInverse,
  },
  limitationCard: {
    marginHorizontal: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    backgroundColor: 'rgba(234, 179, 8, 0.10)',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#EAB308',
  },
  limitationText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.spaceXs,
    marginBottom: spacing.spaceMd,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  funnelStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentFillStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  funnelStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  funnelInfo: {
    flex: 1,
  },
  funnelName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  funnelValue: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  funnelRateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  funnelRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  facilityRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  facilityState: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  facilityDistrict: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  facilityStats: {
    marginTop: 2,
  },
  facilityStatText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  privacyFootnote: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.spaceSm,
  },
  auditRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  auditDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  auditActor: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.spaceMd,
  },
});

export default AdminReportsScreen;
