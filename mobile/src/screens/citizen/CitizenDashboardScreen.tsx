/**
 * CitizenDashboardScreen — Glassmorphism Edition
 * All data fetching, derived metrics, navigation handlers, and refresh logic
 * are 100% unchanged.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CitizenTabParamList, CitizenStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { ewasteService } from '../../services/ewasteService';
import { requestService } from '../../services/requestService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type CitizenDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'CitizenHome'>,
  NativeStackNavigationProp<CitizenStackParamList>
>;

interface Props {
  navigation: CitizenDashboardNavigationProp;
}

export const CitizenDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [fetchedItems, fetchedRequests] = await Promise.all([
        ewasteService.getItems(),
        requestService.getRequests(),
      ]);
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
      setRequests(Array.isArray(fetchedRequests) ? fetchedRequests : []);
    } catch (err: any) {
      console.warn('[CitizenDashboard] Data fetch error:', err?.message || err);
      setErrorMessage(
        err?.message || 'Unable to load your e-waste activity. Please pull down to retry.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics
  const itemsSubmittedCount = items.length;
  const activeRequestsCount = requests.filter((r) =>
    ['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS'].includes((r.status || '').toUpperCase())
  ).length;
  const completedPickupsCount = requests.filter(
    (r) => (r.status || '').toUpperCase() === 'COMPLETED'
  ).length;
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  // Navigation handlers (unchanged)
  const handleOpenNotifications = () => navigation.navigate('CitizenNotifications');
  const handleOpenSubmit = () => navigation.navigate('CitizenSubmit');
  const handleOpenRequests = () => navigation.navigate('CitizenRequests');
  const handleOpenRequestDetail = (requestId: string) =>
    (navigation as any).navigate('RequestDetail', { requestId });

  return (
    <GradientBackground>
      <TopAppBar
        title="EcoSetu"
        roleBadge="CITIZEN"
        onNotificationsPress={handleOpenNotifications}
      />
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.glassFillElevated}
          />
        }
      >
        {/* ── Greeting ─────────────────────────────────────── */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingLabel}>{t('citizen.dashboard.welcomeBack') || 'WELCOME BACK'}</Text>
          <Text style={styles.greetingTitle} accessibilityRole="header">
            {user?.name?.split(' ')[0] || t('roles.citizen') || 'Citizen'} 👋
          </Text>
          <Text style={styles.greetingSubtitle}>
            {t('citizen.dashboard.greetingSubtitle') || 'Track your e-waste lifecycle and request doorstep pickups.'}
          </Text>
        </View>

        {/* ── Error ────────────────────────────────────────── */}
        {Boolean(errorMessage) && (
          <GlassCard variant="flat" style={styles.errorCard}>
            <View style={styles.errorCardInner} accessibilityRole="alert">
              <Text style={styles.errorText}>⚠ {errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadDashboardData}
                accessibilityRole="button"
                accessibilityLabel="Retry loading dashboard"
              >
                <Text style={styles.retryText}>{t('citizen.dashboard.retry') || 'Try Again'}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* ── Loading Skeletons ─────────────────────────────── */}
        {isLoading ? (
          <View>
            <View style={styles.metricsRow}>
              <Skeleton height={110} style={{ flex: 1, marginRight: 8, borderRadius: spacing.radiusMd }} />
              <Skeleton height={110} style={{ flex: 1, marginRight: 8, borderRadius: spacing.radiusMd }} />
              <Skeleton height={110} style={{ flex: 1, borderRadius: spacing.radiusMd }} />
            </View>
            <Skeleton height={52} style={{ marginVertical: spacing.spaceMd, borderRadius: spacing.radiusMd }} />
            <Skeleton height={120} style={{ borderRadius: spacing.radiusMd, marginBottom: 10 }} />
            <Skeleton height={120} style={{ borderRadius: spacing.radiusMd }} />
          </View>
        ) : (
          <>
            {/* ── Metrics Row ─────────────────────────────── */}
            <Text style={styles.sectionLabel}>{t('citizen.dashboard.activityOverview') || 'ACTIVITY OVERVIEW'}</Text>
            <View style={styles.metricsRow}>
              <MetricCard
                value={itemsSubmittedCount}
                label={t('citizen.dashboard.itemsSubmitted') || 'Items Submitted'}
                icon="📦"
                accentColor={colors.primary}
                onPress={handleOpenSubmit}
              />
              <View style={styles.metricSpacer} />
              <MetricCard
                value={activeRequestsCount}
                label={t('citizen.dashboard.activeRequests') || 'Active Requests'}
                icon="⏳"
                accentColor={colors.warning}
                onPress={handleOpenRequests}
              />
              <View style={styles.metricSpacer} />
              <MetricCard
                value={completedPickupsCount}
                label={t('citizen.dashboard.completed') || 'Completed'}
                icon="✅"
                accentColor={colors.success}
                onPress={handleOpenRequests}
              />
            </View>

            {/* ── Quick Action ────────────────────────────── */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleOpenSubmit}
              accessibilityRole="button"
              accessibilityLabel="Submit e-waste item"
              activeOpacity={0.82}
            >
              <Text style={styles.primaryActionIcon}>+</Text>
              <Text style={styles.primaryActionText}>{t('citizen.dashboard.submitNewEwaste') || 'Submit New E-Waste Item'}</Text>
            </TouchableOpacity>

            {/* ── Recent Requests ─────────────────────────── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>{t('citizen.dashboard.recentRequests') || 'RECENT REQUESTS'}</Text>
              {requests.length > 0 && (
                <TouchableOpacity
                  onPress={handleOpenRequests}
                  accessibilityRole="button"
                  accessibilityLabel="View all collection requests"
                >
                  <Text style={styles.viewAllText}>
                    {t('citizen.dashboard.viewAll') || 'View All'} ({requests.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {requests.length === 0 ? (
              <EmptyState
                icon="♻"
                title={t('citizen.dashboard.noActivityTitle') || 'No Activity Yet'}
                message={t('citizen.dashboard.noActivityMessage') || 'No activity yet. Start by submitting your e-waste!'}
                actionLabel={t('citizen.dashboard.submitFirstItem') || 'Submit Your First Item'} /* actionLabel="Submit Your First Item" */
                onAction={handleOpenSubmit}
              />
            ) : (
              <View style={styles.requestsList}>
                {recentRequests.map((req, index) => {
                  const itemCount = req.ewasteItems?.length || req.itemIds?.length || 1;
                  const displayDate = req.preferredDate
                    ? new Date(req.preferredDate).toLocaleDateString()
                    : (t('citizen.dashboard.flexibleDate') || 'Flexible Date');
                  return (
                    <GlassCard
                      key={req.id}
                      variant="standard"
                      animated
                      animationDelay={index * 60}
                      onPress={() => handleOpenRequestDetail(req.id)}
                      style={styles.requestCard}
                      accessibilityLabel={`Request ${req.id.slice(0, 8)}, status ${req.status}, ${itemCount} items`}
                    >
                      <View style={styles.requestCardHeader}>
                        <Text style={styles.requestId}>
                          REQ-{req.id ? req.id.slice(0, 8).toUpperCase() : 'NEW'}
                        </Text>
                        <StatusBadge status={req.status || 'SUBMITTED'} />
                      </View>
                      <Text style={styles.requestAddress} numberOfLines={1}>
                        📍 {req.pickupAddress || (t('citizen.dashboard.addressNotSpecified') || 'Address not specified')}
                      </Text>
                      <View style={styles.requestFooter}>
                        <Text style={styles.requestItemCount}>
                          📦 {itemCount} {itemCount === 1 ? (t('citizen.dashboard.itemCount') || 'item') : (t('citizen.dashboard.itemsCount') || 'items')}
                        </Text>
                        <Text style={styles.requestDate}>📅 {displayDate}</Text>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  greetingContainer: {
    marginBottom: spacing.spaceLg,
    paddingTop: spacing.spaceSm,
  },
  greetingLabel: {
    fontSize: typography.Label.fontSize,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.4,
    marginBottom: spacing.spaceXs,
  },
  greetingTitle: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  errorCard: {
    marginBottom: spacing.spaceMd,
  },
  errorCardInner: {
    // Inner padding already handled by GlassCard
  },
  errorText: {
    color: colors.error,
    fontSize: typography.Body.fontSize,
    marginBottom: spacing.spaceSm,
    lineHeight: 21,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.errorFill,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 6,
    borderRadius: spacing.radiusSm,
  },
  retryText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: typography.Caption.fontSize,
  },
  sectionLabel: {
    fontSize: typography.Label.fontSize,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    marginBottom: spacing.spaceSm,
    marginTop: spacing.spaceXs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceLg,
    marginBottom: spacing.spaceSm,
  },
  viewAllText: {
    fontSize: typography.Caption.fontSize,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceMd,
  },
  metricSpacer: {
    width: spacing.spaceSm,
  },
  primaryActionButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.spaceMd - 2,
    paddingHorizontal: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    minHeight: 52,
    marginVertical: spacing.spaceSm,
  },
  primaryActionIcon: {
    fontSize: 22,
    color: colors.textInverse,
    fontWeight: '900',
    marginRight: spacing.spaceSm,
    lineHeight: 24,
  },
  primaryActionText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  requestsList: {
    gap: spacing.spaceXs,
  },
  requestCard: {
    // Padding set by GlassCard variant="standard"
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  requestId: {
    fontSize: typography.BodyMedium.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textPrimary,
  },
  requestAddress: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: spacing.spaceSm,
  },
  requestItemCount: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.primary,
  },
  requestDate: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
});

export default CitizenDashboardScreen;
