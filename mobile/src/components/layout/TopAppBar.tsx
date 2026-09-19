/**
 * TopAppBar — Glassmorphism Edition
 * Props interface unchanged.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { LanguageSelector } from '../common/LanguageSelector';

export interface TopAppBarProps {
  title: string;
  subtitle?: string;
  roleBadge?: string;
  showBack?: boolean;
  onBack?: () => void;
  unreadNotificationsCount?: number;
  onNotificationsPress?: () => void;
  showLanguageSelector?: boolean;
}

export const TopAppBar: React.FC<TopAppBarProps> = memo(({
  title,
  subtitle,
  roleBadge,
  showBack = false,
  onBack,
  unreadNotificationsCount = 0,
  onNotificationsPress,
  showLanguageSelector = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, height: 58 + insets.top },
      ]}
      accessibilityRole="header"
    >
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {showLanguageSelector && (
          <LanguageSelector variant="compact" style={{ marginRight: spacing.spaceXs }} />
        )}
        {roleBadge && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {roleBadge === 'INFORMAL_COLLECTOR' ? 'Collector' : roleBadge === 'RECYCLER' ? 'Recycler' : roleBadge.replace(/_/g, ' ')}
            </Text>
          </View>
        )}
        {onNotificationsPress && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNotificationsPress}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${unreadNotificationsCount} unread`}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>🔔</Text>
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

TopAppBar.displayName = 'TopAppBar';

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    elevation: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    marginLeft: spacing.spaceXs,
    flex: 1,
  },
  title: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    letterSpacing: typography.Title.letterSpacing,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.Caption.fontSize,
    letterSpacing: 0.2,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceXs,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  badgeContainer: {
    backgroundColor: colors.accentFill,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 3,
    borderRadius: spacing.radiusPill,
  },
  badgeText: {
    fontSize: typography.Label.fontSize,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.6,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default TopAppBar;
