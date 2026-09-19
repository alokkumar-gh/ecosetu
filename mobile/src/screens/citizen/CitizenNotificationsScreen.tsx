/**
 * CitizenNotificationsScreen
 * Authenticated CITIZEN — In-app notification centre.
 *
 * ECOSETU Business Chain: CITIZEN → LOCAL INFORMAL COLLECTOR → FORMAL RECYCLER
 *
 * This screen:
 *   - Lists the authenticated citizen's own notifications
 *   - Distinguishes unread/read with both visual and accessible state indicators
 *   - Provides mark-one-read (on tap) and mark-all-read (App Bar action)
 *   - Deep-links to RequestDetail or ItemTraceability for supported reference types
 *   - Displays cached notifications when offline with a stale-data notice
 *   - Does NOT introduce any direct Citizen → Recycler path, mutation, or navigation
 *
 * API:
 *   GET    /api/v1/notifications          (docs/23_NOTIFICATION_SYSTEM.md §5)
 *   GET    /api/v1/notifications/count    (docs/23_NOTIFICATION_SYSTEM.md §5)
 *   PATCH  /api/v1/notifications/:id/read (docs/23_NOTIFICATION_SYSTEM.md §5)
 *   PATCH  /api/v1/notifications/read-all (docs/23_NOTIFICATION_SYSTEM.md §5)
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md, docs/06_ROLES_AND_PERMISSIONS.md,
 *   docs/07_BUSINESS_WORKFLOWS.md, docs/08_UI_UX_SPECIFICATION.md,
 *   docs/09_FRONTEND_ARCHITECTURE.md, docs/23_NOTIFICATION_SYSTEM.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { notificationService } from '../../services/notificationService';
import { useI18n } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<CitizenStackParamList>;

// ─── Notification Types (verified from backend/src/utils/constants.js) ────────

/**
 * Canonical notification types actively emitted by the backend.
 * Source: backend/src/utils/constants.js NOTIFICATION_TYPES
 *
 * Citizen-relevant active triggers:
 *   REQUEST_ACCEPTED   — collector accepts a collection request
 *   PICKUP_COMPLETED   — collector completes doorstep pickup
 *   RECYCLING_COMPLETED — recycler formally processes items (informational only)
 *   ACCOUNT_SUSPENDED  — admin suspends citizen account
 *   ACCOUNT_REACTIVATED — admin reactivates citizen account
 *
 * Not citizen-directed (for reference/defence only):
 *   REQUEST_CANCELLED  → sent to collector, not citizen
 *   CONSIGNMENT_INCOMING/ACCEPTED/REJECTED → sent to recycler/collector
 *   VERIFICATION_APPROVED/REJECTED → sent to collector/recycler, not citizen
 */
const NOTIFICATION_TYPES = Object.freeze({
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  CONSIGNMENT_INCOMING: 'CONSIGNMENT_INCOMING',
  CONSIGNMENT_ACCEPTED: 'CONSIGNMENT_ACCEPTED',
  CONSIGNMENT_REJECTED: 'CONSIGNMENT_REJECTED',
  RECYCLING_COMPLETED: 'RECYCLING_COMPLETED',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED',
});

// ─── Presentation Mapping ─────────────────────────────────────────────────────

interface NotificationMeta {
  icon: string;
  displayTitle: string;
  /** Collector-related: should use Kabadiwala/Informal Collector wording */
  isCollectorRelated?: boolean;
}

/**
 * Map canonical notification types to citizen-friendly presentation metadata.
 * Collector-related notifications use "local informal collector / Kabadiwala"
 * wording, NOT "recycler", preserving the Kabadiwala-first model.
 *
 * RECYCLING_COMPLETED is informational only — the citizen cannot initiate
 * any recycler action from this screen.
 */
const getNotificationMeta = (type: string): NotificationMeta => {
  switch (type) {
    case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
      return {
        icon: '✅',
        displayTitle: 'Collector Accepted',
        isCollectorRelated: true,
      };
    case NOTIFICATION_TYPES.PICKUP_SCHEDULED:
      return {
        icon: '📅',
        displayTitle: 'Pickup Scheduled',
        isCollectorRelated: true,
      };
    case NOTIFICATION_TYPES.PICKUP_COMPLETED:
      return {
        icon: '📦',
        displayTitle: 'Pickup Completed',
        isCollectorRelated: true,
      };
    case NOTIFICATION_TYPES.REQUEST_CANCELLED:
      return { icon: '❌', displayTitle: 'Request Cancelled' };
    case NOTIFICATION_TYPES.RECYCLING_COMPLETED:
      // Informational only — no recycler action surface is exposed
      return { icon: '♻️', displayTitle: 'Recycling Complete' };
    case NOTIFICATION_TYPES.ACCOUNT_SUSPENDED:
      return { icon: '⚠️', displayTitle: 'Account Suspended' };
    case NOTIFICATION_TYPES.ACCOUNT_REACTIVATED:
      return { icon: '🟢', displayTitle: 'Account Reactivated' };
    case NOTIFICATION_TYPES.VERIFICATION_APPROVED:
      return { icon: '🏅', displayTitle: 'Account Verified' };
    case NOTIFICATION_TYPES.VERIFICATION_REJECTED:
      return { icon: '📋', displayTitle: 'Verification Update' };
    default:
      return { icon: '🔔', displayTitle: 'Notification' };
  }
};

// ─── Navigation helper ────────────────────────────────────────────────────────

/**
 * Determine the navigation action for a notification based on its referenceType
 * and referenceId.
 *
 * Documented referenceType values (from backend/src/services):
 *   'collection_request' → navigate to RequestDetail (with requestId)
 *   'pickup'             → navigate to CitizenRequests (pickup belongs to a request;
 *                          no direct pickup detail route for citizens exists)
 *   'recycling_record'   → navigate to CitizenRequests (informational, read-only chain)
 *   'user'               → no navigation action (account events, no deep-link)
 *   null/undefined       → no navigation action
 *
 * IMPORTANT: There is no direct Citizen → Recycler navigation route.
 * 'recycling_record' referenceType routes to CitizenRequests, not any recycler screen.
 */
const getNotificationNavAction = (
  notification: any,
  navigation: Nav,
) => {
  const { referenceType, referenceId } = notification;
  if (!referenceType || !referenceId) return null;

  switch (referenceType) {
    case 'collection_request':
      return () => navigation.navigate('RequestDetail', { requestId: referenceId });
    case 'pickup':
      // Citizen has no pickup detail route; navigate to Requests list for context
      return () =>
        navigation.navigate('CitizenTabs', { screen: 'CitizenRequests' } as any);
    case 'recycling_record':
      // Informational only — route to Requests list (chain visible in RequestDetail)
      return () =>
        navigation.navigate('CitizenTabs', { screen: 'CitizenRequests' } as any);
    case 'user':
      // Account events — no deep-link target
      return null;
    default:
      return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtRelative = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
};

// ─── Notification Card Component ──────────────────────────────────────────────

interface NotificationCardProps {
  item: any;
  onPress: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ item, onPress }) => {
  const { t } = useI18n();
  const rawMeta = getNotificationMeta(item.type || '');
  const displayTitle = (() => {
    switch (item.type) {
      case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
        return t('citizen.notifications.requestAccepted') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.PICKUP_SCHEDULED:
        return t('citizen.notifications.pickupScheduled') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.PICKUP_COMPLETED:
        return t('citizen.notifications.pickupCompleted') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.REQUEST_CANCELLED:
        return t('citizen.notifications.requestCancelled') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.RECYCLING_COMPLETED:
        return t('citizen.notifications.recyclingCompleted') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.ACCOUNT_SUSPENDED:
        return t('citizen.notifications.accountSuspended') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.ACCOUNT_REACTIVATED:
        return t('citizen.notifications.accountReactivated') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.VERIFICATION_APPROVED:
        return t('citizen.notifications.accountVerified') || rawMeta.displayTitle;
      case NOTIFICATION_TYPES.VERIFICATION_REJECTED:
        return t('citizen.notifications.verificationUpdate') || rawMeta.displayTitle;
      default:
        return t('citizen.notifications.notification') || rawMeta.displayTitle;
    }
  })();
  const meta = { ...rawMeta, displayTitle };
  const isUnread = !item.isRead;
  const timeLabel = fmtRelative(item.createdAt);

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.displayTitle}: ${item.message || item.title}. ${isUnread ? 'Unread.' : 'Read.'} ${timeLabel}`}
      accessibilityState={{ selected: isUnread }}
      activeOpacity={0.75}
    >
      {/* Unread indicator bar (non-color supplement) */}
      {isUnread && <View style={styles.unreadBar} accessibilityElementsHidden />}

      <View style={styles.cardContent}>
        {/* Icon */}
        <View
          style={[styles.iconCircle, { backgroundColor: isUnread ? '#E8F5E9' : '#F5F5F5' }]}
          accessibilityElementsHidden
        >
          <Text style={styles.iconText}>{meta.icon}</Text>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text
              style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {meta.displayTitle}
            </Text>

            <View style={styles.cardMeta}>
              {isUnread && (
                <View style={styles.unreadDot} accessibilityElementsHidden>
                  <Text style={styles.srOnly}>Unread</Text>
                </View>
              )}
              {timeLabel ? (
                <Text style={styles.timeLabel}>{timeLabel}</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.notifMessage} numberOfLines={3}>
            {item.message || item.title || '—'}
          </Text>

          {/* Collector-related label — reinforces Kabadiwala-first */}
          {meta.isCollectorRelated && (
            <Text style={styles.collectorTag}>
              {t('citizen.notifications.viaCollector') ||
                'Via local informal collector (Kabadiwala)'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const NotificationsSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Skeleton key={n} height={88} style={styles.skeletonCard} />
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CitizenNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  // Track in-flight mark-read IDs to prevent duplicate calls
  const pendingMarkRead = useRef<Set<string>>(new Set());

  // ── Data Fetch ────────────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setErrorMessage(null);
    try {
      const [notifResult, countResult] = await Promise.allSettled([
        notificationService.getNotifications({ page: 1, limit: 50 }),
        notificationService.getUnreadCount(),
      ]);

      if (notifResult.status === 'fulfilled') {
        const rawList = notifResult.value.notifications || [];
        const seen = new Set();
        const uniqueList = rawList.filter((n: any) => {
          if (!n || !n.id) return false;
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        setNotifications(uniqueList);
        setFromCache(notifResult.value.fromCache);
      } else {
        const err: any = notifResult.reason;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load notifications. Please try again.';
        setErrorMessage(msg);
      }

      if (countResult.status === 'fulfilled') {
        setUnreadCount(countResult.value);
      }
      // Count failure is silent — don't block the list
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true);
  }, [loadData]);

  // ── Mark One Read ─────────────────────────────────────────────────────────

  const handleNotificationPress = useCallback(
    async (item: any) => {
      const navAction = getNotificationNavAction(item, navigation);

      // Mark as read if unread (requires connectivity)
      if (!item.isRead && !pendingMarkRead.current.has(item.id)) {
        if (!isConnected) {
          // Navigate anyway; just can't mark read offline
          navAction?.();
          return;
        }
        pendingMarkRead.current.add(item.id);
        // Optimistic UI update
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => (prev !== null ? Math.max(0, prev - 1) : null));

        try {
          await notificationService.markAsRead(item.id);
        } catch {
          // Rollback optimistic update on failure (silently)
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: false } : n)),
          );
          setUnreadCount((prev) => (prev !== null ? prev + 1 : null));
        } finally {
          pendingMarkRead.current.delete(item.id);
        }
      }

      navAction?.();
    },
    [isConnected, navigation],
  );

  // ── Mark All Read ─────────────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingAll) return;
    if (!isConnected) {
      Alert.alert(
        t('citizen.notifications.markAllOfflineError') || 'Offline',
        t('citizen.notifications.markAllOfflineMessage') ||
          'Please connect to the internet to mark all notifications as read.',
        [{ text: 'OK' }],
      );
      return;
    }
    const hasUnread = notifications.some((n) => !n.isRead);
    if (!hasUnread) return;

    setIsMarkingAll(true);
    // Optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to mark all as read.';
      // Rollback
      loadData(true);
      Alert.alert('Error', msg, [{ text: 'OK' }]);
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, isConnected, notifications, loadData, t]);

  // ── Render Helpers ────────────────────────────────────────────────────────

  const hasUnread = notifications.some((n) => !n.isRead);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <NotificationCard
        item={item}
        onPress={() => handleNotificationPress(item)}
      />
    ),
    [handleNotificationPress],
  );

  const keyExtractor = useCallback((item: any) => item.id || String(Math.random()), []);

  const ListHeader = (
    <>
      {/* Offline banner */}
      {!isConnected && <OfflineBanner />}

      {/* Cached data notice */}
      {fromCache && (
        <View style={styles.cachedNotice}>
          <Text style={styles.cachedNoticeText}>
            {t('citizen.notifications.cachedNotice') ||
              '📴 Showing cached notifications (last synced while online)'}
          </Text>
        </View>
      )}

      {/* Mark all read — only when online and there are unread items */}
      {hasUnread && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllRead}
          disabled={isMarkingAll || !isConnected}
          accessibilityRole="button"
          accessibilityLabel={
            t('citizen.notifications.markAllAsRead') || 'Mark all notifications as read'
          }
          accessibilityState={{ disabled: isMarkingAll || !isConnected }}
        >
          {isMarkingAll ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.markAllText,
                (!isConnected || isMarkingAll) && styles.markAllTextDisabled,
              ]}
            >
              {t('citizen.notifications.markAllAsRead') || '✓ Mark all as read'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('citizen.notifications.title') || 'Notifications'}
          roleBadge="CITIZEN"
        />
        <NotificationsSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error (with no cached data) ───────────────────────────────────────────

  if (errorMessage && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('citizen.notifications.title') || 'Notifications'}
          roleBadge="CITIZEN"
        />
        {!isConnected && <OfflineBanner />}
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>
            {t('citizen.notifications.couldNotLoad') || 'Could Not Load Notifications'}
          </Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { setIsLoading(true); loadData(); }}
            accessibilityRole="button"
            accessibilityLabel={t('citizen.requests.retry') || 'Retry loading notifications'}
          >
            <Text style={styles.retryButtonText}>
              {t('citizen.requests.retry') || 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('citizen.notifications.title') || 'Notifications'}
        roleBadge="CITIZEN"
        unreadNotificationsCount={unreadCount ?? 0}
      />

      <FlatList
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listContentEmpty,
        ]}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title={t('citizen.notifications.empty') || 'No Notifications'}
            message={
              t('citizen.notifications.emptyDesc') ||
              "You have no notifications yet. When a local informal collector accepts your request or your e-waste is picked up, you'll be notified here."
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // ── Notification Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: spacing.spaceSm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 80,
  },
  cardUnread: {
    backgroundColor: '#F1F8E9',
    elevation: 2,
  },
  unreadBar: {
    width: 4,
    backgroundColor: colors.primary,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.spaceSm,
    alignItems: 'flex-start',
    gap: spacing.spaceSm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  iconText: {
    fontSize: 18,
  },
  cardBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.spaceXs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  srOnly: {
    // Screen-reader only text
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  notifMessage: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  collectorTag: {
    fontSize: 11,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // ── Mark All ──
  markAllButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs + 2,
    marginBottom: spacing.spaceXs,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  markAllTextDisabled: {
    color: colors.textSecondary,
  },

  // ── Cached Notice ──
  cachedNotice: {
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    padding: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  cachedNoticeText: {
    fontSize: 12,
    color: '#F57F17',
  },

  // ── Skeleton ──
  skeletonContainer: {
    padding: spacing.spaceMd,
  },
  skeletonCard: {
    borderRadius: 10,
    marginBottom: spacing.spaceSm,
  },

  // ── Error ──
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceLg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.spaceSm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.spaceXs,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.spaceMd,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CitizenNotificationsScreen;
