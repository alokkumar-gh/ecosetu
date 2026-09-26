/**
 * TopAppBar — Glassmorphism Edition
 * Props interface unchanged.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { LanguageSelector } from '../common/LanguageSelector';

import { AppIcon } from '../ui/AppIcon';

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
  showBack,
  onBack,
  unreadNotificationsCount = 0,
  onNotificationsPress,
  showLanguageSelector = false,
}) => {
  const shouldShowBack = showBack !== undefined ? showBack : Boolean(onBack);

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
    >
      <View style={styles.leftSection}>
        {shouldShowBack && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <AppIcon name="chevronLeft" size={20} color={colors.textPrimary} />
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
            <AppIcon name="bell" size={20} color={colors.textPrimary} />
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
    minHeight: 56,
    backgroundColor: 'rgba(7, 30, 34, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs,
    elevation: 2,
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
    minWidth: 44,
    minHeight: 44,
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
    top: 6,
    right: 6,
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
