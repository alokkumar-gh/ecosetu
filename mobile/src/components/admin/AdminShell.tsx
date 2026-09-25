/**
 * AdminShell — ECOSETU Admin Control Center Layout Wrapper
 *
 * The master layout for every admin screen. Wraps:
 *  - AdminSidebar (collapsible, animated)
 *  - AdminTopBar (breadcrumb, search, notifications, profile)
 *  - Content area (children)
 *  - AdminSearchPalette (global Ctrl+K overlay)
 *
 * Usage:
 *   <AdminShell screenKey="AdminHome" breadcrumb={['Dashboard']} navigation={navigation}>
 *     <YourScreenContent />
 *   </AdminShell>
 *
 * Sidebar collapse state is persisted via AsyncStorage.
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminSearchPalette } from './AdminSearchPalette';
import {
  ADMIN_COLOR,
  ADMIN_LAYOUT,
  ADMIN_ANIM,
  ADMIN_NAV_GROUPS,
} from './AdminTheme';

const SIDEBAR_STATE_KEY = '@ecosetu_admin_sidebar_collapsed';

export interface AdminShellProps {
  screenKey?: string;
  activeScreen?: string;
  title?: string;
  subtitle?: string;
  breadcrumb?: string[];
  navigation: any;
  children: React.ReactNode;
  notificationCount?: number;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  screenKey,
  activeScreen,
  title,
  subtitle,
  breadcrumb,
  navigation,
  children,
  notificationCount = 0,
}) => {
  const effectiveScreenKey = screenKey || activeScreen || 'AdminHome';
  const effectiveBreadcrumb =
    breadcrumb && breadcrumb.length > 0
      ? breadcrumb
      : title
      ? [title]
      : [effectiveScreenKey.replace(/^Admin/, '')];
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const sidebarAnim = useRef(
    new Animated.Value(ADMIN_LAYOUT.sidebarExpandedWidth)
  ).current;

  // Restore sidebar state from storage
  useEffect(() => {
    AsyncStorage.getItem(SIDEBAR_STATE_KEY)
      .then((val) => {
        const collapsed = val === 'true';
        setIsCollapsed(collapsed);
        sidebarAnim.setValue(
          collapsed
            ? ADMIN_LAYOUT.sidebarCollapsedWidth
            : ADMIN_LAYOUT.sidebarExpandedWidth
        );
      })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, [sidebarAnim]);

  const handleToggleSidebar = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    AsyncStorage.setItem(SIDEBAR_STATE_KEY, String(newCollapsed)).catch(() => {});

    Animated.timing(sidebarAnim, {
      toValue: newCollapsed
        ? ADMIN_LAYOUT.sidebarCollapsedWidth
        : ADMIN_LAYOUT.sidebarExpandedWidth,
      duration: ADMIN_ANIM.sidebar,
      useNativeDriver: false, // width can't use native driver
    }).start();
  }, [isCollapsed, sidebarAnim]);

  const handleNavigate = useCallback(
    (screen: string) => {
      if (navigation) {
        navigation.navigate(screen);
      }
    },
    [navigation]
  );

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleSearchOpen = useCallback(() => {
    setSearchOpen(true);
  }, []);

  if (!initialized) {
    return (
      <View style={[styles.root, { backgroundColor: ADMIN_COLOR.canvasBase }]} />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={ADMIN_COLOR.sidebar}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.appFrame}>
          {/* ── Sidebar ──────────────────────────────────────────── */}
          <AdminSidebar
            currentScreen={effectiveScreenKey}
            onNavigate={handleNavigate}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleSidebar}
            sidebarAnim={sidebarAnim}
          />

          {/* ── Main Area (TopBar + Content) ─────────────────────── */}
          <View style={styles.mainArea}>
            {/* Top Bar */}
            <AdminTopBar
              breadcrumb={effectiveBreadcrumb}
              onSearchOpen={handleSearchOpen}
              onNavigate={handleNavigate}
              notificationCount={notificationCount}
            />

            {/* Content */}
            <View style={styles.contentArea}>{children}</View>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Global Search Palette ─────────────────────────────────── */}
      {searchOpen && (
        <AdminSearchPalette
          onClose={handleSearchClose}
          onNavigate={(screen) => {
            handleSearchClose();
            handleNavigate(screen);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ADMIN_COLOR.canvasBase,
  },
  safeArea: {
    flex: 1,
  },
  appFrame: {
    flex: 1,
    flexDirection: 'row',
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  contentArea: {
    flex: 1,
    backgroundColor: ADMIN_COLOR.canvasBase,
  },
});

export default AdminShell;
