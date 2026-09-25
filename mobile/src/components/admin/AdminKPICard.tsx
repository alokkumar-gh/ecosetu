/**
 * AdminKPICard — Premium metric card for dashboard hero row
 *
 * Shows: label, primary value, trend (↑/↓ + %), comparison text, sparkline, context.
 * Optional: onclick → navigate to detail screen.
 * Count-up animation on first mount.
 *
 * Trend colors: up green, down red (or inverted for "lower is better" metrics like bottlenecks).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_SHADOW,
  ADMIN_ANIM,
} from './AdminTheme';

export interface AdminKPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;      // positive = up, negative = down
  trendLabel?: string; // e.g. "vs last 30 days"
  context?: string;    // subtle footnote
  icon?: string;
  accentColor?: string;
  invertTrend?: boolean; // true = lower is better (e.g. bottlenecks)
  onPress?: () => void;
  style?: ViewStyle;
  sparkData?: number[]; // 7 data points for sparkline
}

// Tiny SVG-free sparkline using View bars
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({
  data,
  color,
}) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const height = 24;

  return (
    <View style={sparkStyles.container}>
      {data.map((v, i) => {
        const barH = Math.max(((v - min) / range) * height, 2);
        return (
          <View
            key={i}
            style={[
              sparkStyles.bar,
              {
                height: barH,
                backgroundColor:
                  i === data.length - 1
                    ? color
                    : `${color}55`,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const sparkStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 24,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 2,
  },
});

export const AdminKPICard: React.FC<AdminKPICardProps> = ({
  label,
  value,
  unit,
  trend,
  trendLabel,
  context,
  icon,
  accentColor = ADMIN_COLOR.brand,
  invertTrend = false,
  onPress,
  style,
  sparkData,
}) => {
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 350,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, [mountAnim]);

  const hasTrend = trend !== undefined && trend !== null;
  const isUp = hasTrend && trend! >= 0;

  // Invert meaning for "lower is better" metrics
  const isPositive = invertTrend ? !isUp : isUp;

  const trendColor = !hasTrend
    ? ADMIN_COLOR.textLow
    : isPositive
    ? ADMIN_COLOR.success
    : ADMIN_COLOR.error;

  const trendText = hasTrend
    ? `${isUp ? '↑' : '↓'} ${Math.abs(trend!).toFixed(1)}%`
    : null;

  const cardContent = (
    <View style={styles.card}>
      {/* Top row: label + icon */}
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        {icon && (
          <View style={[styles.iconBadge, { backgroundColor: `${accentColor}18` }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
        )}
      </View>

      {/* Primary value */}
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: ADMIN_COLOR.textHigh }]}>
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      {/* Trend + sparkline */}
      <View style={styles.bottomRow}>
        <View style={styles.trendSection}>
          {hasTrend && (
            <Text style={[styles.trend, { color: trendColor }]}>
              {trendText}
            </Text>
          )}
          {trendLabel && (
            <Text style={styles.trendLabel} numberOfLines={1}>
              {trendLabel}
            </Text>
          )}
          {context && !trendLabel && (
            <Text style={styles.context} numberOfLines={1}>
              {context}
            </Text>
          )}
        </View>
        {sparkData && sparkData.length > 0 && (
          <MiniSparkline data={sparkData} color={accentColor} />
        )}
      </View>

      {/* Context footnote */}
      {context && trendLabel && (
        <Text style={styles.contextBottom} numberOfLines={1}>
          {context}
        </Text>
      )}

      {/* Accent border top */}
      <View
        style={[
          styles.accentBorderTop,
          { backgroundColor: accentColor },
        ]}
      />
    </View>
  );

  return (
    <Animated.View style={[styles.wrapper, { opacity: mountAnim }, style]}>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.80}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}${trendText ? `, ${trendText}` : ''}`}
        >
          {cardContent}
        </TouchableOpacity>
      ) : (
        cardContent
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 140,
  },
  card: {
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    ...ADMIN_SHADOW.card,
  },
  accentBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: ADMIN_RADIUS.md,
    borderTopRightRadius: ADMIN_RADIUS.md,
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: ADMIN_COLOR.textMuted,
    letterSpacing: 0.8,
    flex: 1,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  value: {
    ...ADMIN_TYPE.metric,
    lineHeight: 34,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textLow,
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  trendSection: {
    flex: 1,
    gap: 2,
  },
  trend: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  trendLabel: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
  },
  context: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
  },
  contextBottom: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
    marginTop: 6,
  },
});

export default AdminKPICard;
