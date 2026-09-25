/**
 * AdminTopBar — ECOSETU Admin Control Center Top Navigation
 *
 * Provides:
 * - Breadcrumb (current section context)
 * - Global search trigger (Ctrl/Cmd+K)
 * - Notification badge
 * - Admin profile button with dropdown
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_LAYOUT,
} from './AdminTheme';

interface AdminTopBarProps {
  breadcrumb: string[];
  onSearchOpen: () => void;
  onNavigate: (screen: string) => void;
  notificationCount?: number;
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  breadcrumb,
  onSearchOpen,
  onNavigate,
  notificationCount = 0,
}) => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const adminName = user?.name?.split(' ')[0]?.toUpperCase() || 'ADMIN';

  const toggleProfile = useCallback(() => {
    setProfileOpen((v) => !v);
  }, []);

  return (
    <View style={styles.topbar}>
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbRoot}>ECOSETU</Text>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={i}>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text
              style={[
                styles.breadcrumbItem,
                i === breadcrumb.length - 1 && styles.breadcrumbCurrent,
              ]}
              numberOfLines={1}
            >
              {crumb}
            </Text>
          </React.Fragment>
        ))}
      </View>

      {/* ── Right Controls ────────────────────────────────────────────────── */}
      <View style={styles.rightRow}>
        {/* Search trigger */}
        <TouchableOpacity
          style={styles.searchTrigger}
          onPress={onSearchOpen}
          accessibilityRole="search"
          accessibilityLabel="Search (Ctrl+K)"
          activeOpacity={0.75}
        >
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchLabel}>Search...</Text>
          <View style={styles.searchKbd}>
            <Text style={styles.searchKbdText}>⌘K</Text>
          </View>
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => onNavigate('AdminNotificationCenter')}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
          activeOpacity={0.75}
        >
          <Text style={styles.iconBtnText}>🔔</Text>
          {notificationCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {notificationCount > 9 ? '9+' : String(notificationCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* System Health quick-link */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => onNavigate('AdminSystemHealth')}
          accessibilityRole="button"
          accessibilityLabel="System health"
          activeOpacity={0.75}
        >
          <Text style={styles.iconBtnText}>◐</Text>
        </TouchableOpacity>

        {/* Profile dropdown */}
        <View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={toggleProfile}
            accessibilityRole="button"
            accessibilityLabel="Admin profile menu"
            activeOpacity={0.75}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {adminName.charAt(0)}
              </Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {adminName}
            </Text>
            <Text style={styles.profileChevron}>
              {profileOpen ? '▴' : '▾'}
            </Text>
          </TouchableOpacity>

          {/* Dropdown */}
          {profileOpen && (
            <View style={styles.profileDropdown}>
              {/* Identity */}
              <View style={styles.dropdownIdentity}>
                <View style={styles.dropdownAvatarLg}>
                  <Text style={styles.dropdownAvatarLgText}>
                    {adminName.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.dropdownName} numberOfLines={1}>
                    {user?.name || 'Administrator'}
                  </Text>
                  <Text style={styles.dropdownRole}>Administrator</Text>
                </View>
              </View>

              <View style={styles.dropdownDivider} />

              {/* Actions */}
              {[
                { label: 'My Profile', icon: '◯', screen: 'AdminProfile' },
                { label: 'Audit Log', icon: '▤', screen: 'AdminAuditLogs' },
                { label: 'System Health', icon: '◐', screen: 'AdminSystemHealth' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileOpen(false);
                    onNavigate(item.screen);
                  }}
                  accessibilityRole="menuitem"
                  activeOpacity={0.75}
                >
                  <Text style={styles.dropdownItemIcon}>{item.icon}</Text>
                  <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setProfileOpen(false);
                  logout();
                }}
                accessibilityRole="menuitem"
                activeOpacity={0.75}
              >
                <Text style={[styles.dropdownItemIcon, styles.dropdownSignOutIcon]}>⎋</Text>
                <Text style={[styles.dropdownItemLabel, styles.dropdownSignOutLabel]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topbar: {
    height: ADMIN_LAYOUT.topbarHeight,
    backgroundColor: ADMIN_COLOR.topbar,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLOR.topbarBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 100,
  },

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  breadcrumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  breadcrumbRoot: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.brand,
    fontSize: 10,
  },
  breadcrumbSep: {
    fontSize: 12,
    color: ADMIN_COLOR.textMuted,
  },
  breadcrumbItem: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textLow,
    fontWeight: '500' as const,
  },
  breadcrumbCurrent: {
    color: ADMIN_COLOR.textMid,
    fontWeight: '600' as const,
  },

  // ── Right row ───────────────────────────────────────────────────────────────
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Search trigger ──────────────────────────────────────────────────────────
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 7,
    minWidth: 160,
  },
  searchIcon: {
    fontSize: 14,
    color: ADMIN_COLOR.textLow,
  },
  searchLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMuted,
    flex: 1,
  },
  searchKbd: {
    backgroundColor: ADMIN_COLOR.canvasMid,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.divider,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  searchKbdText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textMuted,
    letterSpacing: 0.3,
  },

  // ── Icon buttons ────────────────────────────────────────────────────────────
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: ADMIN_RADIUS.sm,
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconBtnText: {
    fontSize: 14,
    color: ADMIN_COLOR.textLow,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ADMIN_COLOR.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },

  // ── Profile button ──────────────────────────────────────────────────────────
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ADMIN_RADIUS.sm,
    backgroundColor: ADMIN_COLOR.card,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
  },
  profileAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ADMIN_COLOR.brandDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.brandBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: ADMIN_COLOR.brand,
  },
  profileName: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMid,
    fontWeight: '600' as const,
    maxWidth: 70,
  },
  profileChevron: {
    fontSize: 9,
    color: ADMIN_COLOR.textMuted,
  },

  // ── Profile dropdown ────────────────────────────────────────────────────────
  profileDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 200,
    backgroundColor: ADMIN_COLOR.cardElevated,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.md,
    paddingVertical: 6,
    zIndex: 999,
    // shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdownIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownAvatarLg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ADMIN_COLOR.brandDim,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.brandBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarLgText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: ADMIN_COLOR.brand,
  },
  dropdownName: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textHigh,
    fontWeight: '600' as const,
  },
  dropdownRole: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: ADMIN_COLOR.brand,
    letterSpacing: 0.4,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: ADMIN_COLOR.divider,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dropdownItemIcon: {
    fontSize: 13,
    color: ADMIN_COLOR.textLow,
    width: 16,
    textAlign: 'center',
  },
  dropdownItemLabel: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMid,
    fontWeight: '500' as const,
  },
  dropdownSignOutIcon: {
    color: ADMIN_COLOR.error,
  },
  dropdownSignOutLabel: {
    color: ADMIN_COLOR.textRed,
  },
});

export default AdminTopBar;
