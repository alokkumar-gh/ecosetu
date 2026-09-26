/**
 * AdminActivityFeed — Live Operations Timeline
 *
 * Shows recent platform activity from AuditLog entries.
 * Displays: timestamp, action label, entity, actor context.
 * Uses polling (no fake websocket) — refreshes with parent.
 *
 * The component is purely presentational — data passed in from parent.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_SHADOW,
} from './AdminTheme';
import { AppIcon, IconName } from '../ui/AppIcon';

export interface ActivityEntry {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actorName?: string;
  actorRole?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface Props {
  entries: ActivityEntry[];
  isLoading?: boolean;
  onViewAll?: () => void;
  maxItems?: number;
}

// Human-readable action labels
function formatAction(action: string, entityType?: string): { label: string; icon: IconName } {
  const a = action?.toUpperCase?.() || '';
  if (a.includes('VERIFICATION') && a.includes('APPROVED')) return { label: 'Verification approved', icon: 'checkCircle' };
  if (a.includes('VERIFICATION') && a.includes('REJECTED')) return { label: 'Verification rejected', icon: 'xCircle' };
  if (a.includes('VERIFICATION')) return { label: 'Verification submitted', icon: 'shieldCheck' };
  if (a.includes('STATUS') && a.includes('SUSPEND')) return { label: 'Account suspended', icon: 'shieldAlert' };
  if (a.includes('STATUS') && a.includes('ACTIVE')) return { label: 'Account activated', icon: 'checkCircle' };
  if (a.includes('STATUS') && a.includes('DEACTIVAT')) return { label: 'Account deactivated', icon: 'xCircle' };
  if (a.includes('PICKUP') && a.includes('COMPLETE')) return { label: 'Pickup completed', icon: 'truck' };
  if (a.includes('PICKUP') && a.includes('ASSIGN')) return { label: 'Pickup assigned', icon: 'truck' };
  if (a.includes('PICKUP') && a.includes('CREAT')) return { label: 'Pickup created', icon: 'truck' };
  if (a.includes('REQUEST') && a.includes('CREAT')) return { label: 'Collection request created', icon: 'box' };
  if (a.includes('REQUEST')) return { label: 'Collection request updated', icon: 'box' };
  if (a.includes('EWASTE') || (entityType?.includes('EWASTE'))) return { label: 'E-waste recorded', icon: 'recycle' };
  if (a.includes('NOTIFICATION') && a.includes('SEND')) return { label: 'Notification broadcast', icon: 'bell' };
  if (a.includes('RECYCLER') && a.includes('AUTH')) return { label: 'Recycler authorization updated', icon: 'shieldCheck' };
  if (a.includes('LOGIN')) return { label: 'Admin sign-in', icon: 'lock' };
  if (a.includes('ADMIN')) return { label: 'Admin action', icon: 'activity' };
  return { label: action?.replace(/_/g, ' ') || 'System event', icon: 'activity' };
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export const AdminActivityFeed: React.FC<Props> = ({
  entries,
  isLoading,
  onViewAll,
  maxItems = 8,
}) => {
  const displayEntries = (entries || []).slice(0, maxItems);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.title}>RECENT ACTIVITY</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel="View all audit logs"
            activeOpacity={0.75}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.viewAllText}>View All</Text>
              <AppIcon name="arrowRight" size={11} color={ADMIN_COLOR.brand} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonItem}>
              <View style={styles.skeletonDot} />
              <View style={styles.skeletonContent}>
                <View style={[styles.skeletonBar, { width: '70%' }]} />
                <View style={[styles.skeletonBar, { width: '40%', marginTop: 5 }]} />
              </View>
              <View style={styles.skeletonTime} />
            </View>
          ))}
        </View>
      ) : displayEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent activity to display.</Text>
        </View>
      ) : (
        <View style={styles.feed}>
          {displayEntries.map((entry, index) => {
            const { label, icon } = formatAction(entry.action, entry.entityType);
            const isLast = index === displayEntries.length - 1;
            return (
              <View
                key={entry.id}
                style={[styles.feedItem, !isLast && styles.feedItemBorder]}
              >
                {/* Timeline line + dot */}
                <View style={styles.timeline}>
                  <View style={styles.timelineDot} />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Content */}
                <View style={styles.content}>
                  <Text style={styles.actionLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <View style={styles.meta}>
                    {entry.entityId && (
                      <Text style={styles.metaText} numberOfLines={1}>
                        #{entry.entityId.slice(0, 8)}
                      </Text>
                    )}
                    {entry.actorName && (
                      <Text style={styles.metaText} numberOfLines={1}>
                        · {entry.actorName}
                      </Text>
                    )}
                    {entry.actorRole && (
                      <Text style={styles.metaRole} numberOfLines={1}>
                        · {entry.actorRole.replace('_', ' ')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Time */}
                <Text style={styles.time}>{formatTime(entry.createdAt)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    overflow: 'hidden',
    ...ADMIN_SHADOW.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLOR.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ADMIN_COLOR.brand,
  },
  title: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.textMid,
    letterSpacing: 0.6,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.brand,
  },
  feed: {
    paddingVertical: 4,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  feedItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLOR.divider,
  },
  timeline: {
    width: 14,
    alignItems: 'center',
    paddingTop: 2,
    flexShrink: 0,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ADMIN_COLOR.brand,
    opacity: 0.7,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: ADMIN_COLOR.divider,
    marginTop: 4,
    alignSelf: 'center',
    minHeight: 16,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  actionLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMid,
    fontWeight: '500' as const,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  metaText: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textLow,
  },
  metaRole: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
    fontStyle: 'italic',
  },
  time: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 52,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMuted,
  },
  // Skeleton
  skeletonContainer: {
    padding: 16,
    gap: 14,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  skeletonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ADMIN_COLOR.divider,
    marginTop: 3,
    flexShrink: 0,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonBar: {
    height: 11,
    borderRadius: 5,
    backgroundColor: ADMIN_COLOR.divider,
  },
  skeletonTime: {
    width: 40,
    height: 11,
    borderRadius: 5,
    backgroundColor: ADMIN_COLOR.divider,
    flexShrink: 0,
  },
});

export default AdminActivityFeed;
