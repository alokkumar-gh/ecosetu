/**
 * Admin Component Library — ECOSETU Admin Control Center
 *
 * All admin-specific components are organized here:
 *
 * Shell:
 *   AdminShell       — Master layout wrapper (sidebar + topbar + content)
 *   AdminSidebar     — Collapsible nav sidebar
 *   AdminTopBar      — Breadcrumb + search + notifications + profile
 *   AdminSearchPalette — Global Ctrl+K search overlay
 *
 * Dashboard Components:
 *   AdminKPICard     — Metric card with trend + sparkline
 *   AdminActionCenter — "Needs Attention" alert list
 *   AdminActivityFeed — Live operations timeline
 *   AdminFunnel      — Collection conversion funnel
 *
 * Shared UI:
 *   AdminSectionHeader — Section title row with action
 *   AdminStatusBadge   — Status / role pill badge
 *   AdminEmptyState    — Empty state with icon
 *   AdminErrorState    — Error state with retry
 *   AdminSkeleton      — Generic skeleton block
 *   AdminKPISkeleton   — KPI row skeleton
 *
 * Theme:
 *   AdminTheme       — All design tokens
 */

// Shell
export { AdminShell } from './AdminShell';
export { AdminSidebar } from './AdminSidebar';
export { AdminTopBar } from './AdminTopBar';
export { AdminSearchPalette } from './AdminSearchPalette';

// Dashboard
export { AdminKPICard } from './AdminKPICard';
export type { AdminKPICardProps } from './AdminKPICard';
export { AdminActionCenter } from './AdminActionCenter';
export type { ActionItem } from './AdminActionCenter';
export { AdminActivityFeed } from './AdminActivityFeed';
export type { ActivityEntry } from './AdminActivityFeed';
export { AdminFunnel } from './AdminFunnel';
export type { FunnelStage } from './AdminFunnel';

// Shared UI
export {
  AdminSectionHeader,
  AdminStatusBadge,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
  AdminKPISkeleton,
} from './AdminUI';

// Theme
export {
  ADMIN_COLOR,
  ADMIN_LAYOUT,
  ADMIN_RADIUS,
  ADMIN_TYPE,
  ADMIN_SHADOW,
  ADMIN_ANIM,
  ADMIN_STATUS_COLOR,
  ADMIN_ROLE_COLOR,
  ADMIN_NAV_GROUPS,
} from './AdminTheme';
export type { AdminNavItem, AdminNavGroup } from './AdminTheme';
