/**
 * AdminFunnel — Collection Conversion Funnel
 *
 * Visual funnel showing the 7-stage circular economy flow:
 * Requests → Accepted → Assigned → Picked Up → Verified → Recycled
 *
 * Each stage shows: stage name, count, conversion % from previous stage.
 * Drop-off points highlighted with warning color.
 * Data from analytics.collectionOperations.funnel
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_SHADOW,
} from './AdminTheme';

export interface FunnelStage {
  label: string;
  count: number;
  icon?: string;
}

interface Props {
  stages: FunnelStage[];
  isLoading?: boolean;
}

export const AdminFunnel: React.FC<Props> = ({ stages, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>COLLECTION FUNNEL</Text>
        </View>
        <View style={styles.skeletonContainer}>
          {[100, 85, 72, 58, 44, 36].map((w, i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={[styles.skeletonBar, { width: `${w}%` }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!stages || stages.length === 0) {
    return null;
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const first = stages[0]?.count || 1;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>COLLECTION FUNNEL</Text>
        <Text style={styles.subtitle}>
          {stages[0]?.count?.toLocaleString('en-IN') || '0'} requests →{' '}
          {stages[stages.length - 1]?.count?.toLocaleString('en-IN') || '0'} completed
        </Text>
      </View>

      {/* Funnel stages */}
      <View style={styles.funnelContainer}>
        {stages.map((stage, index) => {
          const prev = index > 0 ? stages[index - 1].count || 1 : null;
          const conversion =
            prev !== null && prev > 0
              ? ((stage.count / prev) * 100).toFixed(0)
              : null;
          const isDropOff =
            conversion !== null && Number(conversion) < 70;
          const barWidth = `${Math.max((stage.count / maxCount) * 100, 8)}%`;

          // Determine bar color based on position in funnel
          const barColors = [
            ADMIN_COLOR.brand,    // Requests
            '#34D399',            // Accepted
            '#2DD4BF',            // Assigned
            '#06B6D4',            // Picked Up
            '#818CF8',            // Verified
            '#A78BFA',            // Recycled
            '#C084FC',            // Extra
          ];
          const barColor = barColors[index % barColors.length];

          return (
            <View key={stage.label} style={styles.stageRow}>
              {/* Stage label */}
              <View style={styles.stageLeft}>
                <Text style={styles.stageLabel} numberOfLines={1}>
                  {stage.label}
                </Text>
              </View>

              {/* Bar */}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth as any,
                      backgroundColor: `${barColor}22`,
                      borderLeftWidth: 2,
                      borderLeftColor: barColor,
                    },
                  ]}
                >
                  <Text
                    style={[styles.barCount, { color: barColor }]}
                    numberOfLines={1}
                  >
                    {stage.count.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* Conversion % */}
              {conversion !== null && (
                <View style={styles.conversionCol}>
                  <Text
                    style={[
                      styles.conversionText,
                      { color: isDropOff ? ADMIN_COLOR.warning : ADMIN_COLOR.textLow },
                    ]}
                  >
                    {isDropOff ? '⚠ ' : ''}{conversion}%
                  </Text>
                </View>
              )}
              {conversion === null && <View style={styles.conversionCol} />}
            </View>
          );
        })}
      </View>

      {/* Overall conversion */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Overall: {first > 0 ? (((stages[stages.length - 1]?.count || 0) / first) * 100).toFixed(1) : 0}% end-to-end completion
        </Text>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLOR.divider,
  },
  title: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.textMid,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  subtitle: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
  },
  funnelContainer: {
    padding: 16,
    gap: 8,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 28,
  },
  stageLeft: {
    width: 72,
    flexShrink: 0,
  },
  stageLabel: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textLow,
    fontWeight: '500' as const,
  },
  barWrapper: {
    flex: 1,
    height: 24,
    backgroundColor: ADMIN_COLOR.canvasMid,
    borderRadius: ADMIN_RADIUS.xs,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    height: '100%',
    borderRadius: ADMIN_RADIUS.xs,
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 40,
  },
  barCount: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  conversionCol: {
    width: 48,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  conversionText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLOR.divider,
  },
  footerText: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
  },
  // Skeleton
  skeletonContainer: {
    padding: 16,
    gap: 10,
  },
  skeletonRow: {
    height: 24,
    justifyContent: 'center',
  },
  skeletonBar: {
    height: 20,
    borderRadius: ADMIN_RADIUS.xs,
    backgroundColor: ADMIN_COLOR.divider,
  },
});

export default AdminFunnel;
