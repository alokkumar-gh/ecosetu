import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface TopAppBarProps {
  title: string;
  subtitle?: string;
  roleBadge?: string;
  showBack?: boolean;
  onBack?: () => void;
  unreadNotificationsCount?: number;
  onNotificationsPress?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  roleBadge,
  showBack = false,
  onBack,
  unreadNotificationsCount = 0,
  onNotificationsPress,
}) => {
  return (
    <View style={styles.container} accessibilityRole="header">
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
        {roleBadge && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{roleBadge}</Text>
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
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    elevation: spacing.appBarElevation,
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
    lineHeight: typography.Title.lineHeight,
    color: colors.surface,
  },
  subtitle: {
    fontSize: typography.Caption.fontSize,
    lineHeight: typography.Caption.lineHeight,
    color: colors.primaryLight,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    color: colors.surface,
  },
  badgeContainer: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.5,
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
    color: colors.surface,
  },
});

export default TopAppBar;
