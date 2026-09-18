import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CitizenTabParamList, CitizenStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
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
      // If offline or network error, services fall back to cache. If completely empty and failed:
      setErrorMessage(
        err?.message || 'Unable to load your e-waste activity. Please pull down to retry.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics (strictly computed from real data)
  const itemsSubmittedCount = items.length;
  const activeRequestsCount = requests.filter((r) =>
    ['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS'].includes((r.status || '').toUpperCase())
  ).length;
  const completedPickupsCount = requests.filter(
    (r) => (r.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  // Recent requests sorted descending (max 5)
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const handleOpenNotifications = () => {
    navigation.navigate('CitizenNotifications');
  };

  const handleOpenSubmit = () => {
    navigation.navigate('CitizenSubmit');
  };

  const handleOpenRequests = () => {
    navigation.navigate('CitizenRequests');
  };

  const handleOpenRequestDetail = (requestId: string) => {
    // Navigate to RequestDetail in parent stack
    (navigation as any).navigate('RequestDetail', { requestId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="EcoSetu"
        roleBadge="CITIZEN"
        onNotificationsPress={handleOpenNotifications}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle} accessibilityRole="header">
            Hello, {user?.name || 'Citizen'}
          </Text>
          <Text style={styles.greetingSubtitle}>
            Track your e-waste lifecycle and request doorstep pickups.
          </Text>
        </View>

        {/* Error State Banner */}
        {Boolean(errorMessage) && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDashboardData}
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State: Skeletons */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.metricsRow}>
              <Skeleton height={110} style={{ flex: 1, marginRight: 8 }} />
              <Skeleton height={110} style={{ flex: 1, marginRight: 8 }} />
              <Skeleton height={110} style={{ flex: 1 }} />
            </View>
            <Skeleton height={48} style={{ marginVertical: spacing.spaceMd, borderRadius: 8 }} />
            <Skeleton height={140} style={{ borderRadius: 8, marginBottom: 12 }} />
            <Skeleton height={140} style={{ borderRadius: 8 }} />
          </View>
        ) : (
          <>
            {/* Section: Summary Statistics */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Activity Overview
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <MetricCard
                value={itemsSubmittedCount}
                label="Items Submitted"
                icon="📦"
                accentColor={colors.primary}
                onPress={handleOpenSubmit}
              />
              <View style={styles.metricSpacer} />
              <MetricCard
                value={activeRequestsCount}
                label="Active Requests"
                icon="⏳"
                accentColor={colors.warning}
                onPress={handleOpenRequests}
              />
              <View style={styles.metricSpacer} />
              <MetricCard
                value={completedPickupsCount}
                label="Completed"
                icon="✅"
                accentColor={colors.success}
                onPress={handleOpenRequests}
              />
            </View>

            {/* Quick Action Button */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleOpenSubmit}
              accessibilityRole="button"
              accessibilityLabel="Submit e-waste item"
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionIcon}>+</Text>
              <Text style={styles.primaryActionText}>Submit New E-Waste Item</Text>
            </TouchableOpacity>

            {/* Section: Recent Requests List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Recent Requests
              </Text>
              {requests.length > 0 && (
                <TouchableOpacity
                  onPress={handleOpenRequests}
                  accessibilityRole="button"
                  accessibilityLabel="View all collection requests"
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllText}>View All ({requests.length})</Text>
                </TouchableOpacity>
              )}
            </View>

            {requests.length === 0 ? (
              /* Documented Empty State */
              <EmptyState
                icon="♻"
                title="No Activity Yet"
                message="No activity yet. Start by submitting your e-waste!"
                actionLabel="Submit Your First Item"
                onAction={handleOpenSubmit}
              />
            ) : (
              /* Populated Recent Requests */
              <View style={styles.requestsList}>
                {recentRequests.map((req) => {
                  const itemCount = req.ewasteItems?.length || req.itemIds?.length || 1;
                  const displayDate = req.preferredDate
                    ? new Date(req.preferredDate).toLocaleDateString()
                    : 'Flexible Date';

                  return (
                    <TouchableOpacity
                      key={req.id}
                      style={styles.requestCard}
                      onPress={() => handleOpenRequestDetail(req.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Request ${req.id.slice(0, 8)}, status ${req.status}, ${itemCount} items`}
                    >
                      <View style={styles.requestCardHeader}>
                        <Text style={styles.requestId}>
                          REQ-{req.id ? req.id.slice(0, 8).toUpperCase() : 'NEW'}
                        </Text>
                        <StatusBadge status={req.status || 'SUBMITTED'} />
                      </View>

                      <Text style={styles.requestAddress} numberOfLines={1}>
                        📍 {req.pickupAddress || 'Address not specified'}
                      </Text>

                      <View style={styles.requestFooter}>
                        <Text style={styles.requestItemCount}>
                          📦 {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </Text>
                        <Text style={styles.requestDate}>📅 {displayDate}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  greetingContainer: {
    marginBottom: spacing.spaceMd,
  },
  greetingTitle: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.spaceMd,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.Body.fontSize,
    marginBottom: spacing.spaceSm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.Caption.fontSize,
  },
  skeletonContainer: {
    marginTop: spacing.spaceSm,
  },
  sectionHeader: {
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceLg,
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: typography.Caption.fontSize,
    color: colors.primary,
    fontWeight: '700',
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
    borderRadius: 8,
    paddingVertical: spacing.spaceMd - 2,
    paddingHorizontal: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: spacing.cardElevation,
    minHeight: 48,
    marginVertical: spacing.spaceXs,
  },
  primaryActionIcon: {
    fontSize: 22,
    color: colors.surface,
    fontWeight: '700',
    marginRight: spacing.spaceSm,
    lineHeight: 24,
  },
  primaryActionText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
    color: colors.surface,
  },
  requestsList: {
    marginTop: spacing.spaceXs,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm + 2,
    elevation: spacing.cardElevation,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  requestId: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  requestAddress: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
