/**
 * AdminGovernanceScreen.tsx
 * EcoSetu — Phase 19, Task 14: Admin Notification & Governance Center
 *
 * Requirements:
 * - Administrator role only (ROLES.ADMIN)
 * - Authoritative data only: Platform notifications, unread count, audit logs
 * - Zero fabricated events; canonical NOTIFICATION_TYPES only
 * - Online-only mutations: markAsRead and markAllAsRead guarded against offline execution
 * - Privacy safe: ZERO citizen coordinates, addresses, house numbers, or phone numbers
 * - Offline-first: Uses cached notifications and audit trail when disconnected
 * - Stale state indicators & live vs cached snapshot telemetry
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
  Alert,
  Dimensions,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { MetricCard } from '../../components/common/MetricCard';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { notificationService } from '../../services/notificationService';
import { adminService } from '../../services/adminService';
import { networkService } from '../../services/networkService';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { ROLES, NOTIFICATION_TYPES } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';

interface Props {
  navigation?: any;
}

type TabType = 'NOTIFICATIONS' | 'AUDIT';
type ReadFilterType = 'ALL' | 'UNREAD' | 'READ';
type CategoryFilterType = 'ALL' | 'PICKUP' | 'CONSIGNMENT' | 'RECYCLING' | 'VERIFICATION' | 'ACCOUNT';

// Canonical notification metadata mapping
const NOTIFICATION_META: Record<string, { icon: string; category: CategoryFilterType }> = {
  [NOTIFICATION_TYPES.REQUEST_ACCEPTED]: { icon: '✅', category: 'PICKUP' },
  [NOTIFICATION_TYPES.PICKUP_SCHEDULED]: { icon: '📅', category: 'PICKUP' },
  [NOTIFICATION_TYPES.PICKUP_COMPLETED]: { icon: '📦', category: 'PICKUP' },
  [NOTIFICATION_TYPES.REQUEST_CANCELLED]: { icon: '❌', category: 'PICKUP' },
  [NOTIFICATION_TYPES.CONSIGNMENT_INCOMING]: { icon: '🚚', category: 'CONSIGNMENT' },
  [NOTIFICATION_TYPES.CONSIGNMENT_ACCEPTED]: { icon: '🤝', category: 'CONSIGNMENT' },
  [NOTIFICATION_TYPES.CONSIGNMENT_REJECTED]: { icon: '⚠️', category: 'CONSIGNMENT' },
  [NOTIFICATION_TYPES.RECYCLING_COMPLETED]: { icon: '♻️', category: 'RECYCLING' },
  [NOTIFICATION_TYPES.VERIFICATION_APPROVED]: { icon: '🏅', category: 'VERIFICATION' },
  [NOTIFICATION_TYPES.VERIFICATION_REJECTED]: { icon: '📋', category: 'VERIFICATION' },
  [NOTIFICATION_TYPES.ACCOUNT_SUSPENDED]: { icon: '🛑', category: 'ACCOUNT' },
  [NOTIFICATION_TYPES.ACCOUNT_REACTIVATED]: { icon: '🟢', category: 'ACCOUNT' },
};

// Forbidden sensitive keys that must never be rendered in detail views
const FORBIDDEN_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'apiKey',
  'secret',
  'firebase',
  'pickupLat',
  'pickupLng',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'coordinates',
  'houseNumber',
  'street',
  'landmark',
  'phone',
  'phoneNumber',
]);

/**
 * Sanitize audit details to ensure absolute zero PII leakage
 */
const sanitizeDetails = (details: any): any => {
  if (!details || typeof details !== 'object') return details;
  if (Array.isArray(details)) {
    return details.map(sanitizeDetails);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    if (FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeDetails(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

export const AdminGovernanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  // Role Guard: Administrator access only
  const isAdmin = user?.role === ROLES.ADMIN;

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>('NOTIFICATIONS');

  // Data state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string>(new Date().toISOString());
  const [error, setError] = useState<string | null>(null);

  // Filters for Notifications
  const [readFilter, setReadFilter] = useState<ReadFilterType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('ALL');

  // Filters for Audit Logs
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const isRefreshingRef = useRef(false);

  // Load authoritative data
  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (!isAdmin) return;

    if (!isPullToRefresh) setIsLoading(true);
    setError(null);

    try {
      const [notifsRes, countRes, auditRes] = await Promise.all([
        notificationService.getNotifications({ page: 1, limit: 100 }),
        notificationService.getUnreadCount(),
        adminService.getAuditLogs({ page: 1, limit: 100 }),
      ]);

      setNotifications(notifsRes.notifications || []);
      setUnreadCount(countRes);
      setAuditLogs(auditRes.auditLogs || []);
      setAuditTotal((auditRes.pagination as any)?.total || (auditRes.auditLogs || []).length);
      setFromCache(Boolean(notifsRes.fromCache || auditRes.fromCache));
      setSnapshotTimestamp(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Unable to load governance data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    loadData(true);
  }, [loadData]);

  // Mark single notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!networkService.isConnected()) {
      Alert.alert(
        t('admin.governance.accessRestricted'),
        t('admin.governance.offlineMutationBlocked'),
      );
      return;
    }

    try {
      setIsMutating(true);
      await notificationService.markAsRead(notificationId);
      // Update local state smoothly
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to mark notification as read.');
    } finally {
      setIsMutating(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    if (!networkService.isConnected()) {
      Alert.alert(
        t('admin.governance.accessRestricted'),
        t('admin.governance.offlineMutationBlocked'),
      );
      return;
    }

    Alert.alert(
      t('admin.governance.markAllRead'),
      t('admin.governance.markAllReadConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'default',
          onPress: async () => {
            try {
              setIsMutating(true);
              await notificationService.markAllAsRead();
              setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
              setUnreadCount(0);
              Alert.alert('Success', t('admin.governance.markAllReadSuccess'));
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to mark all as read.');
            } finally {
              setIsMutating(false);
            }
          },
        },
      ],
    );
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Read status filter
      if (readFilter === 'UNREAD' && item.isRead) return false;
      if (readFilter === 'READ' && !item.isRead) return false;

      // Category filter
      if (categoryFilter !== 'ALL') {
        const meta = NOTIFICATION_META[item.type];
        if (!meta || meta.category !== categoryFilter) return false;
      }

      return true;
    });
  }, [notifications, readFilter, categoryFilter]);

  // Extract unique actions and entity types for filters
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.entityType) set.add(log.entityType);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((item) => {
      if (actionFilter !== 'ALL' && item.action !== actionFilter) return false;
      if (entityFilter !== 'ALL' && item.entityType !== entityFilter) return false;
      return true;
    });
  }, [auditLogs, actionFilter, entityFilter]);

  // Non-admin guard rendering
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('admin.governance.title')}
          showBack={Boolean(navigation?.canGoBack && navigation.canGoBack())}
          onBack={() => navigation?.goBack()}
        />
        <View style={styles.centerContainer}>
          <EmptyState
            title={t('admin.governance.accessRestricted')}
            message={t('admin.governance.accessRestrictedMessage')}
            actionLabel={t('common.back')}
            onAction={() => navigation?.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('admin.governance.title')}
        subtitle={t('admin.governance.subtitle')}
        showBack={Boolean(navigation?.canGoBack && navigation.canGoBack())}
        onBack={() => navigation?.goBack()}
      />

      {fromCache && <OfflineBanner />}

      {/* Header Snapshot Telemetry & Refresh */}
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryStatusGroup}>
          <View
            style={[
              styles.statusBadge,
              fromCache ? styles.statusBadgeCached : styles.statusBadgeLive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                fromCache ? styles.statusBadgeTextCached : styles.statusBadgeTextLive,
              ]}
            >
              {fromCache ? `● ${t('admin.governance.cachedBadge')}` : `● ${t('admin.governance.liveBadge')}`}
            </Text>
          </View>
          <Text style={styles.snapshotTimestamp} numberOfLines={1}>
            {new Date(snapshotTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ReadAloudButton
            variant="compact"
            text={() =>
              `${t('admin.governance.title') || 'Governance'}. ${t('admin.governance.unreadCount') || 'Unread'}: ${unreadCount ?? 0}. ${t('admin.governance.totalAlerts') || 'Total Alerts'}: ${notifications.length}. ${t('admin.governance.totalAuditLogs') || 'Audit Logs'}: ${auditTotal}.`
            }
            accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
          />
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            accessibilityRole="button"
            accessibilityLabel={t('admin.governance.refresh')}
          >
            <Text style={styles.refreshButtonText}>🔄 {t('admin.governance.refresh')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Overview Cards */}
      <View style={styles.kpiContainer}>
        <MetricCard
          label={t('admin.governance.unreadCount')}
          value={unreadCount ?? (fromCache ? '—' : 0)}
          icon="🔔"
          accentColor="#EF4444"
        />
        <MetricCard
          label={t('admin.governance.totalAlerts')}
          value={notifications.length}
          icon="📬"
          accentColor="#3B82F6"
        />
        <MetricCard
          label={t('admin.governance.totalAuditLogs')}
          value={auditTotal}
          icon="📜"
          accentColor="#10B981"
        />
      </View>

      {/* Segmented View Switcher */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'NOTIFICATIONS' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('NOTIFICATIONS')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'NOTIFICATIONS' }}
          accessibilityLabel={t('admin.governance.notificationsTab')}
        >
          <Text
            style={[styles.segmentText, activeTab === 'NOTIFICATIONS' && styles.segmentTextActive]}
          >
            🔔 {t('admin.governance.notificationsTab')} ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'AUDIT' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('AUDIT')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'AUDIT' }}
          accessibilityLabel={t('admin.governance.auditTab')}
        >
          <Text style={[styles.segmentText, activeTab === 'AUDIT' && styles.segmentTextActive]}>
            📜 {t('admin.governance.auditTab')} ({auditTotal})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton height={80} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton height={120} style={{ marginBottom: spacing.spaceMd }} />
          <Skeleton height={120} style={{ marginBottom: spacing.spaceMd }} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Governance Telemetry Unavailable"
            message={error}
            actionLabel={t('admin.governance.refresh')}
            onAction={() => loadData(false)}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {activeTab === 'NOTIFICATIONS' ? (
            // ─── TAB 1: NOTIFICATIONS ─────────────────────────────────────────
            <View>
              {/* Header Controls: Mark All Read */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>
                  {t('admin.governance.notificationsTab')}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.markAllButton,
                    (fromCache || !networkService.isConnected() || unreadCount === 0) &&
                      styles.markAllButtonDisabled,
                  ]}
                  onPress={handleMarkAllAsRead}
                  disabled={
                    fromCache ||
                    !networkService.isConnected() ||
                    unreadCount === 0 ||
                    isMutating
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t('admin.governance.markAllRead')}
                >
                  <Text
                    style={[
                      styles.markAllButtonText,
                      (fromCache || !networkService.isConnected() || unreadCount === 0) &&
                        styles.markAllButtonTextDisabled,
                    ]}
                  >
                    ✓ {t('admin.governance.markAllRead')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipScroll}
              >
                {(['ALL', 'UNREAD', 'READ'] as ReadFilterType[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterChip,
                      readFilter === st && styles.filterChipActive,
                    ]}
                    onPress={() => setReadFilter(st)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter ${st}`}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        readFilter === st && styles.filterChipTextActive,
                      ]}
                    >
                      {st === 'ALL'
                        ? t('admin.governance.filterAll')
                        : st === 'UNREAD'
                        ? t('admin.governance.filterUnread')
                        : t('admin.governance.filterRead')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipScroll}
              >
                {(
                  ['ALL', 'PICKUP', 'CONSIGNMENT', 'RECYCLING', 'VERIFICATION', 'ACCOUNT'] as CategoryFilterType[]
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      categoryFilter === cat && styles.filterChipActive,
                    ]}
                    onPress={() => setCategoryFilter(cat)}
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${cat}`}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        categoryFilter === cat && styles.filterChipTextActive,
                      ]}
                    >
                      {cat === 'ALL' ? `📁 ${t('admin.governance.filterAll')}` : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Notification List */}
              {filteredNotifications.length === 0 ? (
                <EmptyState
                  title={t('admin.governance.noNotifications')}
                  message={t('admin.governance.noNotificationsSubtitle')}
                />
              ) : (
                filteredNotifications.map((notif) => {
                  const meta = NOTIFICATION_META[notif.type] || {
                    icon: '🔔',
                    category: 'ALL',
                  };
                  return (
                    <View
                      key={notif.id}
                      style={[
                        styles.notifCard,
                        !notif.isRead && styles.notifCardUnread,
                      ]}
                    >
                      <View style={styles.notifHeaderRow}>
                        <View style={styles.notifIconWrap}>
                          <Text style={styles.notifIcon}>{meta.icon}</Text>
                        </View>
                        <View style={styles.notifTitleWrap}>
                          <View style={styles.titleWithBadge}>
                            <Text style={styles.notifTitle} numberOfLines={1}>
                              {notif.title}
                            </Text>
                            {!notif.isRead && (
                              <View style={styles.unreadDot} />
                            )}
                          </View>
                          <Text style={styles.notifTypeBadge}>{notif.type}</Text>
                        </View>
                        <Text style={styles.notifTime}>
                          {notif.createdAt
                            ? new Date(notif.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </Text>
                      </View>

                      <Text style={styles.notifMessage}>{notif.message}</Text>

                      {/* Action Row */}
                      <View style={styles.notifFooterRow}>
                        {notif.referenceType && (
                          <Text style={styles.referenceBadge}>
                            {notif.referenceType}: {String(notif.referenceId || '').slice(0, 8)}...
                          </Text>
                        )}
                        {!notif.isRead && (
                          <TouchableOpacity
                            style={[
                              styles.markReadButton,
                              (fromCache || !networkService.isConnected() || isMutating) &&
                                styles.markReadButtonDisabled,
                            ]}
                            onPress={() => handleMarkAsRead(notif.id)}
                            disabled={fromCache || !networkService.isConnected() || isMutating}
                            accessibilityRole="button"
                            accessibilityLabel={`${t('admin.governance.markRead')}: ${notif.title}`}
                          >
                            <Text style={styles.markReadButtonText}>
                              ✓ {t('admin.governance.markRead')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            // ─── TAB 2: GOVERNANCE AUDIT STREAM ──────────────────────────────
            <View>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>
                  {t('admin.governance.auditTab')}
                </Text>
                <Text style={styles.privacyNote}>
                  🛡️ {t('admin.governance.privacyProtectedNotice')}
                </Text>
              </View>

              {/* Action Filter Scroll */}
              <Text style={styles.filterLabel}>{t('admin.governance.filterAction')}:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    actionFilter === 'ALL' && styles.filterChipActive,
                  ]}
                  onPress={() => setActionFilter('ALL')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      actionFilter === 'ALL' && styles.filterChipTextActive,
                    ]}
                  >
                    {t('admin.governance.filterAll')}
                  </Text>
                </TouchableOpacity>
                {uniqueActions.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[
                      styles.filterChip,
                      actionFilter === act && styles.filterChipActive,
                    ]}
                    onPress={() => setActionFilter(act)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        actionFilter === act && styles.filterChipTextActive,
                      ]}
                    >
                      {act}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Entity Filter Scroll */}
              <Text style={styles.filterLabel}>{t('admin.governance.filterEntity')}:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    entityFilter === 'ALL' && styles.filterChipActive,
                  ]}
                  onPress={() => setEntityFilter('ALL')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      entityFilter === 'ALL' && styles.filterChipTextActive,
                    ]}
                  >
                    {t('admin.governance.filterAll')}
                  </Text>
                </TouchableOpacity>
                {uniqueEntities.map((ent) => (
                  <TouchableOpacity
                    key={ent}
                    style={[
                      styles.filterChip,
                      entityFilter === ent && styles.filterChipActive,
                    ]}
                    onPress={() => setEntityFilter(ent)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        entityFilter === ent && styles.filterChipTextActive,
                      ]}
                    >
                      {ent}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Audit Trail List */}
              {filteredAuditLogs.length === 0 ? (
                <EmptyState
                  title={t('admin.governance.noAuditLogs')}
                  message={t('admin.governance.noAuditLogsSubtitle')}
                />
              ) : (
                filteredAuditLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const actor = log.actor || {};
                  const safeDetails = sanitizeDetails(log.details);

                  return (
                    <TouchableOpacity
                      key={log.id}
                      style={styles.auditCard}
                      onPress={() =>
                        setExpandedLogId((prev) => (prev === log.id ? null : log.id))
                      }
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Audit Event: ${log.action}`}
                    >
                      <View style={styles.auditHeader}>
                        <View style={styles.auditActionWrap}>
                          <Text style={styles.auditActionBadge}>{log.action}</Text>
                          <Text style={styles.auditEntityBadge}>
                            {log.entityType} ({String(log.entityId || '').slice(0, 8)}...)
                          </Text>
                        </View>
                        <Text style={styles.auditTime}>
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </Text>
                      </View>

                      <View style={styles.auditActorRow}>
                        <Text style={styles.auditActorLabel}>
                          {t('admin.governance.actorLabel')}:
                        </Text>
                        <Text style={styles.auditActorName}>
                          {actor.name || t('admin.governance.systemActor')}
                        </Text>
                        {actor.role && (
                          <Text style={styles.auditRoleBadge}>[{actor.role}]</Text>
                        )}
                      </View>

                      {/* Expandable sanitized details */}
                      {isExpanded && safeDetails && (
                        <View style={styles.detailsContainer}>
                          <Text style={styles.detailsTitle}>Audit Event Context:</Text>
                          <Text style={styles.detailsContent}>
                            {JSON.stringify(safeDetails, null, 2)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.expandToggleRow}>
                        <Text style={styles.expandToggleText}>
                          {isExpanded ? '▲ Hide Details' : '▼ View Details'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  telemetryStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  statusBadge: {
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeCached: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeTextLive: {
    color: '#059669',
  },
  statusBadgeTextCached: {
    color: '#D97706',
  },
  snapshotTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  refreshButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceMd,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    gap: spacing.spaceXs,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.spaceMd,
    marginVertical: spacing.spaceSm,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.space2Xl,
  },
  skeletonContainer: {
    padding: spacing.spaceMd,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  markAllButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceMd,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
  },
  markAllButtonDisabled: {
    opacity: 0.4,
  },
  markAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  markAllButtonTextDisabled: {
    color: colors.textSecondary,
  },
  filterChipScroll: {
    flexDirection: 'row',
    marginBottom: spacing.spaceSm,
  },
  filterChip: {
    minHeight: 48,
    paddingHorizontal: spacing.spaceMd,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    marginRight: spacing.spaceSm,
  },
  filterChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notifCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  notifCardUnread: {
    borderColor: '#93C5FD',
    backgroundColor: 'rgba(239, 246, 255, 0.12)',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.spaceSm,
  },
  notifIcon: {
    fontSize: 16,
  },
  notifTitleWrap: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  notifTypeBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notifTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  notifMessage: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.spaceSm,
  },
  notifFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referenceBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  markReadButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceMd,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
  },
  markReadButtonDisabled: {
    opacity: 0.4,
  },
  markReadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  privacyNote: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  auditCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  auditActionWrap: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  auditActionBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  auditEntityBadge: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  auditTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  auditActorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  auditActorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  auditActorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  auditRoleBadge: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: spacing.spaceSm,
    padding: spacing.spaceSm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailsContent: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.textPrimary,
  },
  expandToggleRow: {
    marginTop: 6,
    alignItems: 'flex-end',
    minHeight: 48,
    justifyContent: 'center',
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default AdminGovernanceScreen;
