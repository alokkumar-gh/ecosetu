/**
 * AdminActionCenter — "Needs Your Attention" Alert Section
 *
 * Surfaces operational exceptions that require admin action.
 * Each item has a count badge, description, and a VIEW → link.
 * Critical items (error) shown with a stronger color.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_SHADOW,
} from './AdminTheme';

export interface ActionItem {
  id: string;
  count: number;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  screen: string;
  icon?: string;
}

interface Props {
  items: ActionItem[];
  onNavigate: (screen: string) => void;
  isLoading?: boolean;
}

const SEVERITY_STYLE = {
  critical: {
    dot: ADMIN_COLOR.error,
    count: ADMIN_COLOR.textRed,
    countBg: ADMIN_COLOR.errorDim,
    countBorder: ADMIN_COLOR.errorBorder,
  },
  warning: {
    dot: ADMIN_COLOR.warning,
    count: ADMIN_COLOR.textAmber,
    countBg: ADMIN_COLOR.warningDim,
    countBorder: ADMIN_COLOR.warningBorder,
  },
  info: {
    dot: ADMIN_COLOR.info,
    count: ADMIN_COLOR.textTeal,
    countBg: ADMIN_COLOR.infoDim,
    countBorder: ADMIN_COLOR.infoBorder,
  },
};

export const AdminActionCenter: React.FC<Props> = ({
  items,
  onNavigate,
  isLoading,
}) => {
  const hasItems = items.filter((i) => i.count > 0).length > 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.urgentDot} />
          <Text style={styles.title}>NEEDS YOUR ATTENTION</Text>
        </View>
        {hasItems && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {items.filter((i) => i.count > 0).length} items
            </Text>
          </View>
        )}
      </View>

      {/* Items */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonItem}>
              <View style={styles.skeletonDot} />
              <View style={[styles.skeletonBar, { width: `${50 + i * 12}%` }]} />
              <View style={styles.skeletonAction} />
            </View>
          ))}
        </View>
      ) : !hasItems ? (
        <View style={styles.allClear}>
          <Text style={styles.allClearIcon}>✓</Text>
          <View>
            <Text style={styles.allClearTitle}>All clear</Text>
            <Text style={styles.allClearSubtitle}>No pending actions require your attention.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.itemList}>
          {items
            .filter((item) => item.count > 0)
            .map((item, index) => {
              const sev = SEVERITY_STYLE[item.severity];
              return (
                <View
                  key={item.id}
                  style={[
                    styles.item,
                    index < items.filter((i) => i.count > 0).length - 1 &&
                      styles.itemBorder,
                  ]}
                >
                  {/* Severity dot */}
                  <View
                    style={[styles.severityDot, { backgroundColor: sev.dot }]}
                  />

                  {/* Count badge */}
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: sev.countBg,
                        borderColor: sev.countBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.countBadgeText, { color: sev.count }]}>
                      {item.count}
                    </Text>
                  </View>

                  {/* Label */}
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {item.icon ? `${item.icon} ` : ''}
                    {item.label}
                  </Text>

                  {/* View → */}
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => onNavigate(item.screen)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.label}`}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.viewBtnText}>VIEW →</Text>
                  </TouchableOpacity>
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
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ADMIN_COLOR.error,
  },
  title: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.textMid,
    letterSpacing: 0.6,
  },
  totalBadge: {
    backgroundColor: ADMIN_COLOR.warningDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.warningBorder,
    borderRadius: ADMIN_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  totalBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textAmber,
  },
  itemList: {
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLOR.divider,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  countBadge: {
    minWidth: 28,
    height: 20,
    borderRadius: ADMIN_RADIUS.xs,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  itemLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMid,
    flex: 1,
  },
  viewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: ADMIN_RADIUS.xs,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    flexShrink: 0,
  },
  viewBtnText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: ADMIN_COLOR.brand,
    letterSpacing: 0.4,
  },

  // All clear state
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
  },
  allClearIcon: {
    fontSize: 22,
    color: ADMIN_COLOR.brand,
  },
  allClearTitle: {
    ...ADMIN_TYPE.h4,
    color: ADMIN_COLOR.textMid,
    marginBottom: 2,
  },
  allClearSubtitle: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
  },

  // Skeleton loaders
  skeletonContainer: {
    padding: 16,
    gap: 14,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ADMIN_COLOR.divider,
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: ADMIN_COLOR.divider,
    flex: 1,
  },
  skeletonAction: {
    width: 52,
    height: 22,
    borderRadius: ADMIN_RADIUS.xs,
    backgroundColor: ADMIN_COLOR.divider,
  },
});

export default AdminActionCenter;
