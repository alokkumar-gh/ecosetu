/**
 * AdminDashboardScreen — ECOSETU COMMAND CENTER
 * Premium Glassmorphism Edition
 *
 * Comprehensive Executive Platform Command Center:
 * - Real-time Platform Status & Last Updated timestamp
 * - Quick action toolstrip: Users, Verification, Notifications, Reports, Analytics, System Health
 * - Time range filtering: 7D, 30D, 90D, 1Y, ALL
 * - 16 Authoritative Executive KPIs strictly backed by database queries
 * - Full 7-stage Circular Economy Conversion Funnel with valid conversion percentages
 * - Operational Bottlenecks queue monitoring
 * - User Analytics & Verification Funnel
 * - E-Waste Analytics (all 11 canonical categories, condition distribution, verified non-estimated weights)
 * - Collector Analytics & Top Active Collectors
 * - Recycler Facilities Coverage & category capabilities
 * - Geographic Analytics preview & shortcut
 * - Recent Platform Activity timeline from AuditLog
 * - System Health status integration
 *
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 14, docs/22_ANALYTICS_AND_REPORTING.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassAvatar } from '../../components/glass/GlassAvatar';
import { GlassBadge } from '../../components/glass/GlassBadge';
import { GlassButton } from '../../components/glass/GlassButton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { adminService } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';

interface Props {
  navigation?: any;
}

type PeriodType = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('7D');
  const [error, setError] = useState<string | null>(null);

  // Collapsible section toggles
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    funnel: true,
    bottlenecks: true,
    users: false,
    ewaste: true,
    collectors: false,
    recyclers: false,
    timeline: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const loadData = useCallback(async (period: PeriodType = selectedPeriod, silent = false) => {
    try {
      const result = period
        ? await adminService.getAnalytics(period.toLowerCase())
        : await adminService.getAnalytics();
      setAnalytics(result.analytics || null);
      setFromCache(Boolean(result.fromCache));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to load platform analytics.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData(selectedPeriod, false);
  }, [selectedPeriod, loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(selectedPeriod, true);
  }, [selectedPeriod, loadData]);

  // Executive KPIs (Authoritative DB Source)
  const kpis = analytics?.executiveKpis || {};
  const periodMetrics = analytics?.periodMetrics || {};
  const userStats = analytics?.userAnalytics || {};
  const ewasteStats = analytics?.ewasteAnalytics || {};
  const collectionOps = analytics?.collectionOperations || {};
  const collectorStats = analytics?.collectorAnalytics || {};
  const recyclerStats = analytics?.recyclerAnalytics || {};
  const recyclingStats = analytics?.recyclingAnalytics || {};
  const bottlenecks = analytics?.bottlenecks || {};
  const recentLogs = analytics?.recentActivity || [];

  const timeRange = analytics?.timeRange || { selected: selectedPeriod };
  const lastUpdatedFormatted = analytics?.lastUpdated
    ? new Date(analytics.lastUpdated).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Live';

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ============================================================ */}
        {/* COMMAND CENTER TOP HEADER BAR                                */}
        {/* ============================================================ */}
        <View style={styles.headerBar}>
          <View style={styles.adminInfoRow}>
            <GlassAvatar name="Admin" icon="🛡️" size={44} online />
            <View style={styles.adminTextCol}>
              <View style={styles.titleWithStatusRow}>
                <Text style={styles.platformTitle}>ECOSETU COMMAND CENTER</Text>
              </View>
              <View style={styles.subTitleRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>OPERATIONAL</Text>
                <Text style={styles.bulletSeparator}>•</Text>
                <Text style={styles.lastUpdatedText}>Updated {lastUpdatedFormatted}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation?.navigate?.('AdminNotificationCenter')}
            accessibilityRole="button"
            accessibilityLabel="Notification Center"
          >
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <OfflineBanner />
        {fromCache && (
          <View style={styles.cachedNoticeBox}>
            <Text style={styles.cachedNoticeText}>⚠️ Viewing cached telemetry (offline)</Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* QUICK ACTIONS TOOLSTRIP                                      */}
        {/* ============================================================ */}
        <View style={styles.quickActionsStrip}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate?.('AdminUsers')}
          >
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionLabel}>Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate?.('AdminVerifications')}
          >
            <Text style={styles.quickActionIcon}>📑</Text>
            <Text style={styles.quickActionLabel}>Verify</Text>
            {(kpis.pendingVerifications ?? 0) > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{kpis.pendingVerifications}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate?.('AdminNotificationCenter')}
          >
            <Text style={styles.quickActionIcon}>📢</Text>
            <Text style={styles.quickActionLabel}>Broadcast</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate?.('AdminReports')}
          >
            <Text style={styles.quickActionIcon}>📄</Text>
            <Text style={styles.quickActionLabel}>Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate?.('AdminHistoricalAnalytics')}
          >
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionLabel}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate?.('AdminGeographicAnalytics')}
          >
            <Text style={styles.quickActionIcon}>🗺️</Text>
            <Text style={styles.quickActionLabel}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation?.navigate('AdminSystemHealth')}
          >
            <Text style={styles.quickActionIcon}>⚙️</Text>
            <Text style={styles.quickActionLabel}>Health</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {isLoading && !analytics ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Syncing platform telemetry...</Text>
            </View>
          ) : (
            <View>
              {/* ============================================================ */}
              {/* SECTION 1: TIME RANGE FILTER SELECTOR                        */}
              {/* ============================================================ */}
              <View style={styles.periodFilterRow}>
                <Text style={styles.periodHeading}>Time Period:</Text>
                <View style={styles.periodPillsContainer}>
                  {(['7D', '30D', '90D', '1Y', 'ALL'] as PeriodType[]).map((period) => {
                    const isSelected = selectedPeriod === period;
                    return (
                      <TouchableOpacity
                        key={period}
                        style={[styles.periodPill, isSelected && styles.periodPillActive]}
                        onPress={() => {
                          setSelectedPeriod(period);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.periodPillText, isSelected && styles.periodPillTextActive]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ============================================================ */}
              {/* SECTION 2: EXECUTIVE KPI SECTION (16 CARDS)                  */}
              {/* ============================================================ */}
              <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.sectionTitle}>Executive KPIs</Text>
                  <GlassBadge label={`Source: Neon DB (${selectedPeriod})`} tone="neutral" />
                </View>
                <ReadAloudButton
                  text={`Admin Command Center. Executive KPIs for ${selectedPeriod}. Total pickups: ${analytics?.totalPickups || 0}. Diverted weight: ${analytics?.totalWeightKg || 0} kilograms.`}
                  size="small"
                />
              </View>

              <View style={styles.kpiGrid}>
                {/* Users Row */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminUsers')}
                >
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>👥</Text>
                    <Text style={styles.kpiValue}>{kpis.totalUsers ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Total Users</Text>
                    <Text style={styles.kpiSub}>+{periodMetrics.newUsers ?? 0} in {selectedPeriod}</Text>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminUsers', { filterRole: 'CITIZEN' })}
                >
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>👤</Text>
                    <Text style={styles.kpiValue}>{kpis.citizens ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Citizens</Text>
                    <Text style={styles.kpiSub}>Doorstep Source</Text>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminUsers', { filterRole: 'INFORMAL_COLLECTOR' })}
                >
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>🛵</Text>
                    <Text style={styles.kpiValue}>{kpis.informalCollectors ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Informal Collectors</Text>
                    <Text style={styles.kpiSub}>{collectorStats.availableCollectors ?? 0} Available</Text>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminUsers', { filterRole: 'RECYCLER' })}
                >
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>🏭</Text>
                    <Text style={styles.kpiValue}>{kpis.formalRecyclers ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Formal Recyclers</Text>
                    <Text style={styles.kpiSub}>{recyclerStats.activeFacilities ?? 0} Facilities</Text>
                  </GlassCard>
                </TouchableOpacity>

                {/* Status Row */}
                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminVerifications')}
                >
                  <GlassCard style={[styles.kpiCardInner, (kpis.pendingVerifications ?? 0) > 0 && styles.kpiHighlightCard]}>
                    <Text style={styles.kpiIcon}>⏳</Text>
                    <Text style={[styles.kpiValue, (kpis.pendingVerifications ?? 0) > 0 && { color: colors.warning }]}>
                      {kpis.pendingVerifications ?? 0}
                    </Text>
                    <Text style={styles.kpiLabel}>Pending Verify</Text>
                    <Text style={styles.kpiSub}>Action Required →</Text>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminUsers', { filterStatus: 'ACTIVE' })}
                >
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>✅</Text>
                    <Text style={styles.kpiValue}>{kpis.activeUsers ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Active Users</Text>
                    <Text style={styles.kpiSub}>Operating Normal</Text>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kpiTile}
                  onPress={() => navigation?.navigate?.('AdminUsers', { filterStatus: 'SUSPENDED' })}
                >
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>⚠️</Text>
                    <Text style={[styles.kpiValue, (kpis.suspendedUsers ?? 0) > 0 && { color: colors.error }]}>
                      {kpis.suspendedUsers ?? 0}
                    </Text>
                    <Text style={styles.kpiLabel}>Suspended Users</Text>
                    <Text style={styles.kpiSub}>Restricted</Text>
                  </GlassCard>
                </TouchableOpacity>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>🔒</Text>
                    <Text style={styles.kpiValue}>{kpis.deactivatedUsers ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Deactivated</Text>
                    <Text style={styles.kpiSub}>No Broadcasts</Text>
                  </GlassCard>
                </View>

                {/* Circular Chain Row */}
                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>📱</Text>
                    <Text style={styles.kpiValue}>{kpis.totalEwasteItems ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Total E-Waste Items</Text>
                    <Text style={styles.kpiSub}>+{periodMetrics.itemsSubmitted ?? 0} in {selectedPeriod}</Text>
                  </GlassCard>
                </View>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>📦</Text>
                    <Text style={styles.kpiValue}>{kpis.totalCollectionRequests ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Collection Requests</Text>
                    <Text style={styles.kpiSub}>{kpis.activeRequests ?? 0} Active</Text>
                  </GlassCard>
                </View>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>🚚</Text>
                    <Text style={styles.kpiValue}>{kpis.completedPickups ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Completed Pickups</Text>
                    <Text style={styles.kpiSub}>{ewasteStats.weights?.totalVerifiedWeightKg ?? 0} kg Verified</Text>
                  </GlassCard>
                </View>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>📑</Text>
                    <Text style={styles.kpiValue}>{kpis.totalConsignments ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Consignments</Text>
                    <Text style={styles.kpiSub}>{kpis.deliveredConsignments ?? 0} Delivered</Text>
                  </GlassCard>
                </View>

                {/* Recycler Delivery & Final Processing Row */}
                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>❌</Text>
                    <Text style={styles.kpiValue}>{kpis.rejectedConsignments ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Rejected Consign.</Text>
                    <Text style={styles.kpiSub}>Discrepancies</Text>
                  </GlassCard>
                </View>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>⚙️</Text>
                    <Text style={styles.kpiValue}>{kpis.itemsUnderRecycling ?? 0}</Text>
                    <Text style={styles.kpiLabel}>Processing</Text>
                    <Text style={styles.kpiSub}>In Recycler Facility</Text>
                  </GlassCard>
                </View>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>♻️</Text>
                    <Text style={[styles.kpiValue, { color: colors.accent }]}>
                      {kpis.completedRecycling ?? 0}
                    </Text>
                    <Text style={styles.kpiLabel}>Recycled Records</Text>
                    <Text style={styles.kpiSub}>{ewasteStats.weights?.totalRecycledWeightKg ?? 0} kg Diverted</Text>
                  </GlassCard>
                </View>

                <View style={styles.kpiTile}>
                  <GlassCard style={styles.kpiCardInner}>
                    <Text style={styles.kpiIcon}>⏱️</Text>
                    <Text style={styles.kpiValue}>
                      {collectionOps?.averageTurnaroundHours != null ? `${collectionOps.averageTurnaroundHours}h` : 'N/A'}
                    </Text>
                    <Text style={styles.kpiLabel}>Avg Turnaround</Text>
                    <Text style={styles.kpiSub}>Submit → Complete</Text>
                  </GlassCard>
                </View>
              </View>

              {/* ============================================================ */}
              {/* SECTION 3: OPERATIONAL BOTTLENECKS MONITOR                   */}
              {/* ============================================================ */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => toggleSection('bottlenecks')}
              >
                <View style={styles.collapsibleTitleRow}>
                  <Text style={styles.sectionTitle}>Operational Bottlenecks</Text>
                  <GlassBadge label="Workflow Queues" tone="neutral" />
                </View>
                <Text style={styles.expandChevron}>{expandedSections.bottlenecks ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedSections.bottlenecks && (
                <GlassCard style={styles.bottleneckCard}>
                  <Text style={styles.bottleneckDesc}>
                    Factual item accumulations across lifecycle handoffs:
                  </Text>
                  <View style={styles.bottleneckItemRow}>
                    <Text style={styles.bottleneckLabel}>Requests Awaiting Collector Assignment:</Text>
                    <Text style={styles.bottleneckValue}>{bottlenecks.requestsAwaitingCollector ?? 0}</Text>
                  </View>
                  <View style={styles.bottleneckItemRow}>
                    <Text style={styles.bottleneckLabel}>Requests Accepted but Pickup Pending:</Text>
                    <Text style={styles.bottleneckValue}>{bottlenecks.requestsAcceptedPickupPending ?? 0}</Text>
                  </View>
                  <View style={styles.bottleneckItemRow}>
                    <Text style={styles.bottleneckLabel}>Doorstep Pickups Currently In Progress:</Text>
                    <Text style={styles.bottleneckValue}>{bottlenecks.pickupsInProgress ?? 0}</Text>
                  </View>
                  <View style={styles.bottleneckItemRow}>
                    <Text style={styles.bottleneckLabel}>Consignments In Transit to Recycler:</Text>
                    <Text style={styles.bottleneckValue}>{bottlenecks.consignmentsAwaitingDelivery ?? 0}</Text>
                  </View>
                  <View style={styles.bottleneckItemRow}>
                    <Text style={styles.bottleneckLabel}>Consignments Delivered Awaiting Acceptance:</Text>
                    <Text style={styles.bottleneckValue}>{bottlenecks.consignmentsDeliveredAwaitingAcceptance ?? 0}</Text>
                  </View>
                  <View style={styles.bottleneckItemRow}>
                    <Text style={styles.bottleneckLabel}>Recycling Records Currently Processing:</Text>
                    <Text style={styles.bottleneckValue}>{bottlenecks.recyclingRecordsProcessing ?? 0}</Text>
                  </View>
                </GlassCard>
              )}

              {/* ============================================================ */}
              {/* SECTION 4: CIRCULAR ECONOMY CONVERSION FUNNEL                */}
              {/* ============================================================ */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => toggleSection('funnel')}
              >
                <View style={styles.collapsibleTitleRow}>
                  <Text style={styles.sectionTitle}>Circular Economy Lifecycle Funnel</Text>
                  <GlassBadge label="End-to-End" tone="success" />
                </View>
                <Text style={styles.expandChevron}>{expandedSections.funnel ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedSections.funnel && (
                <GlassCard style={styles.funnelCard}>
                  {(() => {
                    const f = collectionOps.operationalFunnel || {};
                    const totalReq = f.submitted || 1;
                    const steps = [
                      { label: '1. Submitted by Citizen', count: f.submitted ?? 0, icon: '📱' },
                      { label: '2. Accepted by Collector', count: f.accepted ?? 0, icon: '🤝' },
                      { label: '3. Scheduled for Pickup', count: f.scheduled ?? 0, icon: '📅' },
                      { label: '4. Picked Up at Doorstep', count: f.pickedUp ?? 0, icon: '📦' },
                      { label: '5. Consigned to Recycler', count: f.consigned ?? 0, icon: '🚚' },
                      { label: '6. Accepted at Facility', count: f.acceptedByRecycler ?? 0, icon: '🏭' },
                      { label: '7. Formally Recycled', count: f.recycled ?? 0, icon: '♻️' },
                    ];

                    return steps.map((step, idx) => {
                      const pct = Math.min(100, Math.round(((step.count || 0) / totalReq) * 100));
                      return (
                        <View key={step.label} style={styles.funnelStepContainer}>
                          <View style={styles.funnelStepHeader}>
                            <Text style={styles.funnelStepTitle}>
                              {step.icon} {step.label}
                            </Text>
                            <Text style={styles.funnelStepCount}>
                              {step.count} ({totalReq > 0 ? pct : 0}%)
                            </Text>
                          </View>
                          <View style={styles.funnelTrack}>
                            <View style={[styles.funnelFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      );
                    });
                  })()}
                </GlassCard>
              )}

              {/* ============================================================ */}
              {/* SECTION 5: E-WASTE & VERIFIED WEIGHT ANALYTICS              */}
              {/* ============================================================ */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => toggleSection('ewaste')}
              >
                <View style={styles.collapsibleTitleRow}>
                  <Text style={styles.sectionTitle}>E-Waste & Authoritative Weights</Text>
                  <GlassBadge label="Category Breakdown" tone="neutral" />
                </View>
                <Text style={styles.expandChevron}>{expandedSections.ewaste ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedSections.ewaste && (
                <GlassCard style={styles.sectionCard}>
                  {/* Weights summary */}
                  <View style={styles.weightsRow}>
                    <View style={styles.weightItem}>
                      <Text style={styles.weightVal}>{ewasteStats.weights?.totalVerifiedWeightKg ?? 0} kg</Text>
                      <Text style={styles.weightLbl}>Verified Picked Up</Text>
                    </View>
                    <View style={styles.weightItem}>
                      <Text style={styles.weightVal}>{ewasteStats.weights?.averageItemWeightKg ?? 0} kg</Text>
                      <Text style={styles.weightLbl}>Avg Item Weight</Text>
                    </View>
                    <View style={styles.weightItem}>
                      <Text style={styles.weightVal}>{ewasteStats.weights?.totalRecycledWeightKg ?? 0} kg</Text>
                      <Text style={styles.weightLbl}>Verified Recycled</Text>
                    </View>
                  </View>
                  <Text style={styles.envNotice}>
                    Environmental Impact: {ewasteStats.weights?.environmentalImpact || 'Not currently calculated'}
                  </Text>

                  {/* Category counts and percentages */}
                  <Text style={[styles.subSectionTitle, { marginTop: spacing.spaceMd }]}>
                    All 11 Standard E-Waste Categories
                  </Text>
                  <View style={styles.categoriesTable}>
                    {(ewasteStats.categoryBreakdown || []).map((cat: any) => (
                      <View key={cat.category} style={styles.categoryRow}>
                        <Text style={styles.categoryName}>{cat.category.replace(/_/g, ' ')}</Text>
                        <View style={styles.categoryBarWrapper}>
                          <View style={[styles.categoryBarFill, { width: `${Math.min(100, cat.percentage || 0)}%` }]} />
                        </View>
                        <Text style={styles.categoryStats}>{cat.count} ({cat.percentage}%)</Text>
                      </View>
                    ))}
                  </View>

                  {/* Conditions */}
                  <Text style={[styles.subSectionTitle, { marginTop: spacing.spaceMd }]}>
                    Physical Condition Distribution
                  </Text>
                  <View style={styles.conditionsRow}>
                    {Object.entries(ewasteStats.byCondition || {}).map(([cond, count]) => (
                      <View key={cond} style={styles.conditionChip}>
                        <Text style={styles.conditionCount}>{count as number}</Text>
                        <Text style={styles.conditionLabel}>{cond.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </GlassCard>
              )}

              {/* ============================================================ */}
              {/* SECTION 6: COLLECTOR OPERATIONS ANALYTICS                   */}
              {/* ============================================================ */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => toggleSection('collectors')}
              >
                <View style={styles.collapsibleTitleRow}>
                  <Text style={styles.sectionTitle}>Collector Operations</Text>
                  <GlassBadge label="Informal First" tone="neutral" />
                </View>
                <Text style={styles.expandChevron}>{expandedSections.collectors ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedSections.collectors && (
                <GlassCard style={styles.sectionCard}>
                  <View style={styles.collectorMetricsRow}>
                    <View style={styles.metricTileMini}>
                      <Text style={styles.metricTileVal}>{collectorStats.verifiedCollectors ?? 0}</Text>
                      <Text style={styles.metricTileLbl}>Verified</Text>
                    </View>
                    <View style={styles.metricTileMini}>
                      <Text style={styles.metricTileVal}>{collectorStats.availableCollectors ?? 0}</Text>
                      <Text style={styles.metricTileLbl}>Online Now</Text>
                    </View>
                    <View style={styles.metricTileMini}>
                      <Text style={styles.metricTileVal}>{collectorStats.currentAssignedPickups ?? 0}</Text>
                      <Text style={styles.metricTileLbl}>In Flight</Text>
                    </View>
                    <View style={styles.metricTileMini}>
                      <Text style={styles.metricTileVal}>{collectorStats.pickupsFailed ?? 0}</Text>
                      <Text style={styles.metricTileLbl}>Failed</Text>
                    </View>
                  </View>

                  <Text style={[styles.subSectionTitle, { marginTop: spacing.spaceMd }]}>
                    Active Collectors (Factual Pickups)
                  </Text>
                  {(collectorStats.topActiveCollectors || []).map((col: any) => (
                    <View key={col.id} style={styles.collectorItemRow}>
                      <View>
                        <Text style={styles.collectorItemName}>{col.name}</Text>
                        <Text style={styles.collectorItemArea}>{col.city}, {col.state}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.collectorItemCount}>{col.completedPickups} Pickups</Text>
                        <GlassBadge label={col.isAvailable ? 'Available' : 'Busy'} tone={col.isAvailable ? 'success' : 'neutral'} />
                      </View>
                    </View>
                  ))}
                </GlassCard>
              )}

              {/* ============================================================ */}
              {/* SECTION 7: RECYCLER OPERATIONS & FACILITIES                 */}
              {/* ============================================================ */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => toggleSection('recyclers')}
              >
                <View style={styles.collapsibleTitleRow}>
                  <Text style={styles.sectionTitle}>Recycler Facilities & Coverage</Text>
                  <GlassBadge label="Downstream" tone="neutral" />
                </View>
                <Text style={styles.expandChevron}>{expandedSections.recyclers ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedSections.recyclers && (
                <GlassCard style={styles.sectionCard}>
                  <Text style={styles.subSectionTitle}>Verified Facilities</Text>
                  {(recyclerStats.facilityCoverage || []).map((fac: any) => (
                    <View key={fac.id} style={styles.facilityCard}>
                      <View style={styles.facilityHeaderRow}>
                        <Text style={styles.facilityName}>{fac.facilityName}</Text>
                        <GlassBadge label={fac.operationalStatus} tone="success" />
                      </View>
                      <Text style={styles.facilityLocation}>{fac.city}, {fac.state}</Text>
                      <Text style={styles.facilityCats}>
                        Categories: {(fac.acceptedCategories || []).join(', ') || 'All standard categories'}
                      </Text>
                      <Text style={styles.facilityConsignments}>
                        Total Processed Consignments: {fac.totalConsignments}
                      </Text>
                    </View>
                  ))}
                </GlassCard>
              )}

              {/* ============================================================ */}
              {/* SECTION 8: GEOGRAPHIC ANALYTICS SHORTCUT                    */}
              {/* ============================================================ */}
              <GlassCard style={styles.geoCard}>
                <View style={styles.geoHeader}>
                  <Text style={styles.geoTitle}>🗺️ Geographic Activity & Facilities</Text>
                  <GlassBadge label="Privacy-Safe" tone="info" />
                </View>
                <Text style={styles.geoDesc}>
                  Inspect state-wise collection heatmaps, informal collector operational radii, and verified formal recycling facilities. Citizen household GPS coordinates are strictly masked.
                </Text>
                <GlassButton
                  label="Open Interactive Map Analytics"
                  variant="primary"
                  onPress={() => navigation?.navigate?.('AdminGeographicAnalytics')}
                  style={{ marginTop: spacing.spaceSm }}
                />
              </GlassCard>

              {/* ============================================================ */}
              {/* SECTION 9: RECENT PLATFORM ACTIVITY TIMELINE (AUDIT LOG)   */}
              {/* ============================================================ */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => toggleSection('timeline')}
              >
                <View style={styles.collapsibleTitleRow}>
                  <Text style={styles.sectionTitle}>Recent Platform Activity</Text>
                  <GlassBadge label="Authoritative AuditLog" tone="neutral" />
                </View>
                <Text style={styles.expandChevron}>{expandedSections.timeline ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedSections.timeline && (
                <GlassCard style={styles.sectionCard}>
                  {recentLogs.length === 0 ? (
                    <Text style={styles.emptyLogText}>No audit activity recorded yet.</Text>
                  ) : (
                    recentLogs.slice(0, 10).map((log: any) => (
                      <View key={log.id} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineAction}>{log.action.replace(/_/g, ' ')}</Text>
                          <Text style={styles.timelineMeta}>
                            By {log.actorName} ({log.actorRole}) • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                  <TouchableOpacity
                    style={styles.viewAllAuditBtn}
                    onPress={() => navigation?.navigate?.('AdminAuditLogs')}
                  >
                    <Text style={styles.viewAllAuditText}>View Complete Audit Trail →</Text>
                  </TouchableOpacity>
                </GlassCard>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(7, 30, 34, 0.75)',
  },
  adminInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminTextCol: {
    marginLeft: spacing.spaceSm,
    flex: 1,
  },
  titleWithStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textPrimary,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  bulletSeparator: {
    fontSize: 10,
    color: colors.textTertiary,
    marginHorizontal: 4,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  notifIcon: {
    fontSize: 18,
  },
  cachedNoticeBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: spacing.spaceMd,
    alignItems: 'center',
  },
  cachedNoticeText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  quickActionsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    backgroundColor: 'rgba(7, 30, 34, 0.55)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: 12,
    backgroundColor: colors.warning,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  quickActionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: 80,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.spaceMd,
  },
  periodFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceMd,
  },
  periodHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  periodPillsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  periodPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: spacing.radiusPill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  periodPillActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.35)',
    borderColor: colors.accent,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodPillTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceXs,
    marginBottom: spacing.spaceLg,
  },
  kpiTile: {
    width: '23.8%',
    minWidth: 78,
    marginBottom: spacing.spaceXs,
  },
  kpiCardInner: {
    padding: 8,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
  },
  kpiHighlightCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  kpiIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
    fontWeight: '600',
  },
  kpiSub: {
    fontSize: 8,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: spacing.spaceXs,
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  expandChevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bottleneckCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  bottleneckDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
  },
  bottleneckItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottleneckLabel: {
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
  },
  bottleneckValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.warning,
    marginLeft: 8,
  },
  funnelCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  funnelStepContainer: {
    marginBottom: spacing.spaceSm,
  },
  funnelStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  funnelStepTitle: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  funnelStepCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  funnelTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  funnelFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  sectionCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  weightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  weightItem: {
    alignItems: 'center',
  },
  weightVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent,
  },
  weightLbl: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  envNotice: {
    fontSize: 10,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  categoriesTable: {
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  categoryName: {
    width: 110,
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryBarWrapper: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  categoryStats: {
    width: 65,
    fontSize: 10,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  conditionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  conditionChip: {
    flex: 1,
    padding: 8,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  conditionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  conditionLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  collectorMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: spacing.spaceSm,
  },
  metricTileMini: {
    flex: 1,
    padding: 8,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  metricTileVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricTileLbl: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collectorItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  collectorItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  collectorItemArea: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  collectorItemCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  facilityCard: {
    padding: 10,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: spacing.spaceSm,
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  facilityName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  facilityLocation: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  facilityCats: {
    fontSize: 10,
    color: colors.accent,
    marginBottom: 2,
  },
  facilityConsignments: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  geoCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  geoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  geoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  geoDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.spaceSm,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timelineMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  emptyLogText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
  viewAllAuditBtn: {
    marginTop: spacing.spaceSm,
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewAllAuditText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
});

export default AdminDashboardScreen;
