/**
 * Admin shared UI components — barrel file
 *
 * AdminSectionHeader — section title row with optional action
 * AdminStatusBadge   — status/role pill badge
 * AdminEmptyState    — full empty state with illustration
 * AdminErrorState    — error state with retry button
 * AdminSkeleton      — generic skeleton loader blocks
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_STATUS_COLOR,
  ADMIN_ROLE_COLOR,
} from './AdminTheme';

// ─────────────────────────────────────────────────────────────────────────────
// AdminSectionHeader
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  icon?: string;
  style?: ViewStyle;
}

export const AdminSectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  style,
}) => (
  <View style={[sectionStyles.row, style]}>
    <View style={sectionStyles.left}>
      {icon && <Text style={sectionStyles.icon}>{icon}</Text>}
      <View>
        <Text style={sectionStyles.title}>{title.toUpperCase()}</Text>
        {subtitle && <Text style={sectionStyles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    {action && (
      <TouchableOpacity
        onPress={action.onPress}
        accessibilityRole="button"
        activeOpacity={0.75}
      >
        <Text style={sectionStyles.actionText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  icon: {
    fontSize: 14,
    color: ADMIN_COLOR.brand,
  },
  title: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.textMid,
    letterSpacing: 0.6,
  },
  subtitle: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
    marginTop: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.brand,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AdminStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'role';
  size?: 'sm' | 'md';
}

export const AdminStatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'status',
  size = 'sm',
}) => {
  const colorMap =
    type === 'role' ? ADMIN_ROLE_COLOR : ADMIN_STATUS_COLOR;
  const colors = (colorMap as any)[status] || {
    bg: ADMIN_COLOR.infoDim,
    text: ADMIN_COLOR.textLow,
    border: ADMIN_COLOR.infoBorder,
  };

  const displayLabel =
    type === 'role'
      ? status.replace('INFORMAL_', '').replace('_', ' ')
      : status.replace('_', ' ');

  return (
    <View
      style={[
        badgeStyles.badge,
        size === 'md' && badgeStyles.badgeMd,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          badgeStyles.text,
          size === 'md' && badgeStyles.textMd,
          { color: colors.text },
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: ADMIN_RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  text: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  textMd: {
    fontSize: 10,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AdminEmptyState
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export const AdminEmptyState: React.FC<EmptyStateProps> = ({
  icon = '◈',
  title,
  subtitle,
  action,
  style,
}) => (
  <View style={[emptyStyles.container, style]}>
    <View style={emptyStyles.iconCircle}>
      <Text style={emptyStyles.icon}>{icon}</Text>
    </View>
    <Text style={emptyStyles.title}>{title}</Text>
    {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
    {action && (
      <TouchableOpacity
        style={emptyStyles.actionBtn}
        onPress={action.onPress}
        accessibilityRole="button"
        activeOpacity={0.75}
      >
        <Text style={emptyStyles.actionText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN_COLOR.brandDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.brandBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 24,
    color: ADMIN_COLOR.brand,
  },
  title: {
    ...ADMIN_TYPE.h3,
    color: ADMIN_COLOR.textMid,
    textAlign: 'center',
  },
  subtitle: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: ADMIN_RADIUS.full,
    backgroundColor: ADMIN_COLOR.brandDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.brandBorder,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.brand,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AdminErrorState
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const AdminErrorState: React.FC<ErrorStateProps> = ({
  message = 'We couldn\'t load this data right now.',
  onRetry,
  style,
}) => (
  <View style={[errorStyles.container, style]}>
    <View style={errorStyles.iconCircle}>
      <Text style={errorStyles.icon}>⚠</Text>
    </View>
    <Text style={errorStyles.title}>Something went wrong</Text>
    <Text style={errorStyles.message}>{message}</Text>
    {onRetry && (
      <TouchableOpacity
        style={errorStyles.retryBtn}
        onPress={onRetry}
        accessibilityRole="button"
        activeOpacity={0.75}
      >
        <Text style={errorStyles.retryText}>Try Again</Text>
      </TouchableOpacity>
    )}
  </View>
);

const errorStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ADMIN_COLOR.errorDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.errorBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
    color: ADMIN_COLOR.error,
  },
  title: {
    ...ADMIN_TYPE.h4,
    color: ADMIN_COLOR.textMid,
  },
  message: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: ADMIN_RADIUS.full,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.dividerStrong,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textMid,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AdminSkeleton
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export const AdminSkeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  radius = ADMIN_RADIUS.xs,
  style,
}) => (
  <View
    style={[
      { width: width as any, height, borderRadius: radius, backgroundColor: ADMIN_COLOR.divider },
      style,
    ]}
  />
);

// KPI skeleton row
export const AdminKPISkeleton: React.FC = () => (
  <View style={kpiSkeletonStyles.row}>
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={kpiSkeletonStyles.card}>
        <AdminSkeleton width="60%" height={10} style={{ marginBottom: 12 }} />
        <AdminSkeleton width="70%" height={28} radius={4} style={{ marginBottom: 10 }} />
        <AdminSkeleton width="40%" height={10} />
      </View>
    ))}
  </View>
);

const kpiSkeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    padding: 16,
  },
});
