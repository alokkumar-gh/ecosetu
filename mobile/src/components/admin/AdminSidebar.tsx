/**
 * AdminSidebar — ECOSETU Admin Control Center Navigation
 *
 * Collapsible side navigation with grouped nav items.
 * Remembers collapsed state across sessions.
 * Tooltips on hover (via long-press on mobile).
 *
 * Expanded: 220px — icon + label + group headers
 * Collapsed: 60px — icon only, group headers hidden
 *
 * Animation: smooth width transition (220ms)
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_ANIM,
  ADMIN_LAYOUT,
  ADMIN_NAV_GROUPS,
  AdminNavItem,
} from './AdminTheme';

import { AppIcon, IconName } from '../ui/AppIcon';
import { EcoSetuLogo } from '../common/EcoSetuLogo';

interface AdminSidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  sidebarAnim: Animated.Value; // animated width value from parent
  /** True when rendering as a mobile drawer overlay (full width, no collapse). */
  isMobile?: boolean;
  /** Width to fill when isMobile=true. Defaults to 260. */
  mobileDrawerWidth?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentScreen,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  sidebarAnim,
  isMobile = false,
  mobileDrawerWidth = 260,
}) => {
  const { user, logout } = useAuth();
  const adminName = user?.name?.split(' ')[0] || 'Admin';

  const handleNav = useCallback(
    (item: AdminNavItem) => {
      onNavigate(item.screen);
    },
    [onNavigate]
  );

  const labelOpacity = sidebarAnim.interpolate({
    inputRange: [ADMIN_LAYOUT.sidebarCollapsedWidth, ADMIN_LAYOUT.sidebarExpandedWidth],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const labelTranslate = sidebarAnim.interpolate({
    inputRange: [ADMIN_LAYOUT.sidebarCollapsedWidth, ADMIN_LAYOUT.sidebarExpandedWidth],
    outputRange: [-8, 0],
    extrapolate: 'clamp',
  });

  const groupHeaderOpacity = sidebarAnim.interpolate({
    inputRange: [
      ADMIN_LAYOUT.sidebarCollapsedWidth,
      ADMIN_LAYOUT.sidebarCollapsedWidth + 40,
      ADMIN_LAYOUT.sidebarExpandedWidth,
    ],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.sidebar,
        isMobile
          ? { width: mobileDrawerWidth }
          : { width: sidebarAnim },
      ]}
    >
      {/* ── Logo / Brand ───────────────────────────────────────── */}
      <View style={[styles.brand, isMobile && styles.brandMobile]}>
        <EcoSetuLogo size={28} bordered={false} style={styles.brandLogoCircle} />
        <Animated.View
          style={{
            flex: 1,
            opacity: labelOpacity,
            transform: [{ translateX: labelTranslate }],
            overflow: 'hidden',
          }}
        >
          <Text style={styles.brandName} numberOfLines={1}>
            ECOSETU
          </Text>
          <Text style={styles.brandSub} numberOfLines={1}>
            ADMIN
          </Text>
        </Animated.View>

        {isMobile && (
          <TouchableOpacity
            style={styles.mobileCloseBtn}
            onPress={onToggleCollapse}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            activeOpacity={0.75}
          >
            <Text style={styles.mobileCloseIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* ── Navigation Groups ──────────────────────────────────── */}
      <ScrollView
        style={styles.navScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navContent}
      >
        {ADMIN_NAV_GROUPS.map((group) => (
          <View key={group.group} style={styles.navGroup}>
            {/* Group label — hidden when collapsed */}
            <Animated.Text
              style={[styles.groupLabel, { opacity: groupHeaderOpacity }]}
              numberOfLines={1}
            >
              {group.group}
            </Animated.Text>

            {group.items.map((item) => {
              const isActive = currentScreen === item.screen;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                  ]}
                  onPress={() => handleNav(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: isActive }}
                  activeOpacity={0.75}
                >
                  {/* Active indicator bar */}
                  {isActive && <View style={styles.activeBar} />}

                  {/* Vector Icon */}
                  <View style={styles.navIconBox}>
                    <AppIcon
                      name={item.icon as IconName}
                      size={16}
                      color={isActive ? ADMIN_COLOR.brand : ADMIN_COLOR.textLow}
                      strokeWidth={2}
                    />
                  </View>

                  {/* Label */}
                  <Animated.Text
                    style={[
                      styles.navLabel,
                      isActive && styles.navLabelActive,
                      {
                        opacity: labelOpacity,
                        transform: [{ translateX: labelTranslate }],
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Animated.Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* ── Spacer ────────────────────────────────────────────── */}
        <View style={styles.spacer} />

        {/* ── Sign Out ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          activeOpacity={0.75}
        >
          <View style={styles.navIconBox}>
            <AppIcon name="logout" size={16} color={ADMIN_COLOR.textMuted} strokeWidth={2} />
          </View>
          <Animated.Text
            style={[
              styles.signOutLabel,
              {
                opacity: labelOpacity,
                transform: [{ translateX: labelTranslate }],
              },
            ]}
            numberOfLines={1}
          >
            Sign Out
          </Animated.Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bottom: Collapse (tablet only) toggle ──────── */}
      {!isMobile && (
        <TouchableOpacity
          style={styles.collapseBtn}
          onPress={onToggleCollapse}
          accessibilityRole="button"
          accessibilityLabel={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          activeOpacity={0.75}
        >
          <Text style={styles.collapseIcon}>
            {isCollapsed ? '›' : '‹'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    height: '100%',
    backgroundColor: ADMIN_COLOR.sidebar,
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLOR.divider,
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Brand ──────────────────────────────────────────────────────────────────
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    minHeight: 56,
  },
  brandMobile: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16,
    paddingBottom: 14,
  },
  mobileCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  mobileCloseIcon: {
    fontSize: 15,
    color: ADMIN_COLOR.textMid,
    fontWeight: '600' as const,
  },
  brandLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ADMIN_COLOR.brandDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.brandBorder,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandLogoText: {
    fontSize: 16,
    color: ADMIN_COLOR.brand,
  },
  brandName: {
    ...ADMIN_TYPE.h4,
    color: ADMIN_COLOR.textHigh,
    letterSpacing: 0.8,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.brand,
    letterSpacing: 1.2,
  },

  // ── Divider ────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: ADMIN_COLOR.divider,
    marginHorizontal: 12,
    marginBottom: 8,
  },

  // ── Nav ────────────────────────────────────────────────────────────────────
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingBottom: 16,
    paddingTop: 4,
  },
  navGroup: {
    marginBottom: 4,
  },
  groupLabel: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.textMuted,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 5,
    letterSpacing: 0.8,
    fontSize: 9,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 6,
    borderRadius: ADMIN_RADIUS.sm,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  navItemActive: {
    backgroundColor: ADMIN_COLOR.sidebarActive,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 2.5,
    backgroundColor: ADMIN_COLOR.brand,
    borderRadius: 2,
  },
  navIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navIcon: {
    fontSize: 15,
    color: ADMIN_COLOR.textLow,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  navIconActive: {
    color: ADMIN_COLOR.brand,
  },
  navLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMid,
    fontWeight: '500' as const,
    flex: 1,
  },
  navLabelActive: {
    color: ADMIN_COLOR.textHigh,
    fontWeight: '600' as const,
  },

  // ── Spacer ─────────────────────────────────────────────────────────────────
  spacer: {
    height: 16,
  },

  // ── Sign Out ───────────────────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 6,
    borderRadius: ADMIN_RADIUS.sm,
    gap: 10,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.divider,
    marginBottom: 8,
  },
  signOutIcon: {
    fontSize: 15,
    color: ADMIN_COLOR.textMuted,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  signOutLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMuted,
    fontWeight: '500' as const,
    flex: 1,
  },

  // ── Collapse toggle ────────────────────────────────────────────────────────
  collapseBtn: {
    position: 'absolute',
    right: -1,
    top: '50%',
    marginTop: -16,
    width: 16,
    height: 32,
    backgroundColor: ADMIN_COLOR.cardElevated,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderLeftWidth: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  collapseIcon: {
    fontSize: 12,
    color: ADMIN_COLOR.textLow,
    fontWeight: '700' as const,
  },
});

export default AdminSidebar;
