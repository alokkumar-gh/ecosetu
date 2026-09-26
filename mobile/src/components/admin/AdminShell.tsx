/**
 * AdminShell — ECOSETU Admin Control Center Layout Wrapper
 *
 * ┌─ Tablet/Desktop (≥ 600px) ─────────────────────────────────┐
 * │  [Sidebar 220/60px] │ [TopBar]                              │
 * │                     │ [Content]                             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ┌─ Mobile (< 600px) ─────────────────────────────────────────┐
 * │  [TopBar — hamburger icon on left]                         │
 * │  [Content — full width]                                    │
 * │                                                             │
 * │  Sidebar slides in from left as a drawer overlay:          │
 * │  [Scrim (tap to close)] [Drawer 260px]                     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   <AdminShell screenKey="AdminHome" breadcrumb={['Dashboard']} navigation={navigation}>
 *     <YourScreenContent />
 *   </AdminShell>
 *
 * Sidebar collapse state is persisted via AsyncStorage (tablet only).
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableWithoutFeedback,
  useWindowDimensions,
  PixelRatio,
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
} from './AdminTheme';

const SIDEBAR_STATE_KEY = '@ecosetu_admin_sidebar_collapsed';

/** Width of the sliding drawer on mobile (px). */
const MOBILE_DRAWER_WIDTH = 260;

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
  const { width: screenWidth } = useWindowDimensions();
  const dpWidth = screenWidth / PixelRatio.get();
  const isMobile = dpWidth < ADMIN_LAYOUT.mobileBreakpoint || screenWidth < 1300;

  const effectiveScreenKey = screenKey || activeScreen || 'AdminHome';
  const effectiveBreadcrumb =
    breadcrumb && breadcrumb.length > 0
      ? breadcrumb
      : title
      ? [title]
      : [effectiveScreenKey.replace(/^Admin/, '')];

  // ── Tablet sidebar collapse state ──────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const sidebarAnim = useRef(
    new Animated.Value(ADMIN_LAYOUT.sidebarExpandedWidth)
  ).current;

  // ── Mobile drawer state ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-MOBILE_DRAWER_WIDTH)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;

  // ── Search palette ─────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);

  // Restore tablet sidebar collapsed state from storage
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

  // Close drawer when rotating from mobile → tablet
  useEffect(() => {
    if (!isMobile && drawerOpen) {
      closeDrawer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // ── Tablet sidebar toggle ──────────────────────────────────────────────────
  const handleToggleSidebar = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    AsyncStorage.setItem(SIDEBAR_STATE_KEY, String(newCollapsed)).catch(() => {});
    Animated.timing(sidebarAnim, {
      toValue: newCollapsed
        ? ADMIN_LAYOUT.sidebarCollapsedWidth
        : ADMIN_LAYOUT.sidebarExpandedWidth,
      duration: ADMIN_ANIM.sidebar,
      useNativeDriver: false, // width cannot use native driver
    }).start();
  }, [isCollapsed, sidebarAnim]);

  // ── Mobile drawer open / close ─────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: ADMIN_ANIM.drawer,
        useNativeDriver: true,
      }),
      Animated.timing(scrimAnim, {
        toValue: 1,
        duration: ADMIN_ANIM.drawer,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerAnim, scrimAnim]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: -MOBILE_DRAWER_WIDTH,
        duration: ADMIN_ANIM.drawer,
        useNativeDriver: true,
      }),
      Animated.timing(scrimAnim, {
        toValue: 0,
        duration: ADMIN_ANIM.drawer,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  }, [drawerAnim, scrimAnim]);

  const handleMenuToggle = useCallback(() => {
    if (drawerOpen) closeDrawer();
    else openDrawer();
  }, [drawerOpen, openDrawer, closeDrawer]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (screen: string) => {
      if (isMobile && drawerOpen) {
        closeDrawer();
        setTimeout(() => {
          if (navigation) navigation.navigate(screen);
        }, 180);
      } else {
        if (navigation) navigation.navigate(screen);
      }
    },
    [navigation, isMobile, drawerOpen, closeDrawer]
  );

  const handleSearchClose = useCallback(() => setSearchOpen(false), []);
  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);

  // Stable expanded Animated.Value for mobile drawer (always fully expanded)
  const drawerExpandedAnim = useRef(
    new Animated.Value(MOBILE_DRAWER_WIDTH)
  ).current;

  if (!initialized) {
    return (
      <View style={[styles.root, { backgroundColor: ADMIN_COLOR.canvasBase }]} />
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={ADMIN_COLOR.sidebar} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <AdminTopBar
            breadcrumb={effectiveBreadcrumb}
            onSearchOpen={handleSearchOpen}
            onNavigate={handleNavigate}
            notificationCount={notificationCount}
            isMobile={true}
            onMenuToggle={handleMenuToggle}
          />
          <View style={styles.mobileContent}>{children}</View>
        </SafeAreaView>

        {/* Scrim — tap anywhere to close drawer */}
        {drawerOpen && (
          <TouchableWithoutFeedback
            onPress={closeDrawer}
            accessibilityLabel="Close navigation menu"
          >
            <Animated.View
              style={[styles.scrim, { opacity: scrimAnim }]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* Sliding drawer */}
        {drawerOpen && (
          <Animated.View
            style={[
              styles.mobileDrawer,
              { transform: [{ translateX: drawerAnim }] },
            ]}
          >
            <AdminSidebar
              currentScreen={effectiveScreenKey}
              onNavigate={handleNavigate}
              isCollapsed={false}
              onToggleCollapse={closeDrawer}
              sidebarAnim={drawerExpandedAnim}
              isMobile={true}
              mobileDrawerWidth={MOBILE_DRAWER_WIDTH}
            />
          </Animated.View>
        )}

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
  }

  // ── Tablet / Desktop layout ────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_COLOR.sidebar} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.appFrame}>
          <AdminSidebar
            currentScreen={effectiveScreenKey}
            onNavigate={handleNavigate}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleSidebar}
            sidebarAnim={sidebarAnim}
            isMobile={false}
          />

          <View style={styles.mainArea}>
            <AdminTopBar
              breadcrumb={effectiveBreadcrumb}
              onSearchOpen={handleSearchOpen}
              onNavigate={handleNavigate}
              notificationCount={notificationCount}
              isMobile={false}
            />
            <View style={styles.contentArea}>{children}</View>
          </View>
        </View>
      </SafeAreaView>

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

  // ── Tablet / Desktop ──────────────────────────────────────────────────────
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

  // ── Mobile ────────────────────────────────────────────────────────────────
  mobileContent: {
    flex: 1,
    backgroundColor: ADMIN_COLOR.canvasBase,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ADMIN_COLOR.scrim,
    zIndex: 200,
  },
  mobileDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    height: '100%',
    width: MOBILE_DRAWER_WIDTH,
    zIndex: 300,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 20,
  },
});



