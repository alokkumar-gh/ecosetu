/**
 * AdminAuditLogsScreen
 * Authenticated ADMIN — Immutable platform audit trail viewer.
 *
 * Operational Scope:
 *   - Query immutable audit logs via GET /api/v1/admin/audit-logs
 *   - Filter by canonical action name and entity type
 *   - Displays timestamp, actor, role, entity, IP address, and details
 *   - Read-only inspection; no deletion or editing
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 14
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md Section 4
 *   docs/21_TRACEABILITY_AND_AUDIT.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { EcoSetuBackground } from '../../components/eco';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { adminService } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const AdminAuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const refreshingRef = useRef<boolean>(false);

  const loadLogs = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setError(null);
      try {
        const result = await adminService.getAuditLogs({
          action: actionFilter,
          entityType: entityFilter,
          page: targetPage,
          limit: 25,
        });
        setLogs(result.auditLogs || []);
        setPagination(result.pagination || null);
        setPage(targetPage);
        setFromCache(result.fromCache);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Unable to load audit trail.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [actionFilter, entityFilter],
  );

  useEffect(() => {
    setIsLoading(true);
    loadLogs(1, false);
  }, [loadLogs]);

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadLogs(1, true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadLogs]);

  const toggleExpand = (logId: string) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const isExpanded = expandedLogId === item.id;
    const actor = item.actor || {};

    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Audit Log: ${item.action}, Actor: ${actor.name || 'System'}`}
      >
        <View style={styles.logHeader}>
          <Text style={styles.actionName}>{item.action}</Text>
          <Text style={styles.timestamp}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </Text>
        </View>

        <View style={styles.actorRow}>
          <Text style={styles.actorText}>
            👤 {actor.name || 'System / Automated'} ({actor.role || 'SYSTEM'})
          </Text>
          {actor.email ? <Text style={styles.actorEmail}>• {actor.email}</Text> : null}
        </View>

        <View style={styles.entityRow}>
          <Text style={styles.entityTag}>Entity: {item.entityType}</Text>
          {item.entityId && (
            <Text style={styles.entityIdText} numberOfLines={1}>
              ID: {item.entityId}
            </Text>
          )}
        </View>

        {item.ipAddress ? (
          <Text style={styles.ipText}>IP: {item.ipAddress}</Text>
        ) : null}

        {/* Expandable Details JSON */}
        {isExpanded && item.details && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>Event Payload & Metadata:</Text>
            <Text style={styles.detailsCode}>
              {typeof item.details === 'string'
                ? item.details
                : JSON.stringify(item.details, null, 2)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title="System Audit Trail"
          subtitle="Immutable compliance & event logs"
          showBack={false}
        />

        <OfflineBanner />

        <View style={styles.filterSection}>
        <View style={styles.filterInputRow}>
          <TextInput
            style={[styles.filterInput, { flex: 1 }]}
            placeholder="Filter by action (e.g. RECYCLING_STARTED)..."
            placeholderTextColor={colors.textSecondary}
            value={actionFilter}
            onChangeText={setActionFilter}
            returnKeyType="search"
            onSubmitEditing={() => loadLogs(1, false)}
          />
          <TextInput
            style={[styles.filterInput, { width: 130 }]}
            placeholder="Entity type..."
            placeholderTextColor={colors.textSecondary}
            value={entityFilter}
            onChangeText={setEntityFilter}
            returnKeyType="search"
            onSubmitEditing={() => loadLogs(1, false)}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={80} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
          <Skeleton width="100%" height={80} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
          <Skeleton width="100%" height={80} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
        </View>
      ) : error && logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Unable to Load Audit Trail"
            message={error}
            actionLabel="Retry"
            onAction={() => loadLogs(1, false)}
          />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Audit Logs Found"
              message="No audit events matched your search query or have been recorded."
              actionLabel="Clear Filters"
              onAction={() => {
                setActionFilter('');
                setEntityFilter('');
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterSection: {
    paddingHorizontal: spacing.spaceMd,
    paddingTop: spacing.spaceSm,
    paddingBottom: spacing.spaceXs,
  },
  filterInputRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  filterInput: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    paddingHorizontal: spacing.spaceSm + 4,
    paddingVertical: spacing.spaceSm,
    fontSize: typography.Caption.fontSize,
    color: '#F8FAFC',
  },
  loadingContainer: {
    padding: spacing.spaceMd,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  listContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
    gap: spacing.spaceSm,
  },
  logCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceXs,
  },
  actionName: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.primary,
  },
  timestamp: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  actorText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  actorEmail: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginTop: 2,
  },
  entityTag: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entityIdText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    flex: 1,
  },
  ipText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  detailsContainer: {
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(45, 212, 191, 0.20)',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    padding: spacing.spaceSm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.20)',
  },
  detailsLabel: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: '#2DD4BF',
    marginBottom: 4,
  },
  detailsCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#34D399',
  },
});

export default AdminAuditLogsScreen;
