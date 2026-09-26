/**
 * AdminTheme — ECOSETU Admin Control Center Design System
 *
 * Philosophy: Premium SaaS + logistics control center + circular-economy platform.
 * Color: Deep charcoal canvas, emerald brand, teal metrics, off-white typography.
 * Use color sparingly — charcoal and off-white do the heavy lifting.
 * Emerald highlights only for primary actions and key metrics.
 *
 * This token set is SEPARATE from the consumer app's glass theme.
 * The admin panel has its own visual language: sharper, denser, more data-forward.
 */

// ── Palette ────────────────────────────────────────────────────────────────────

export const ADMIN_COLOR = Object.freeze({
  // Brand
  brand: '#10B981',           // ECOSETU emerald — used very sparingly
  brandDark: '#059669',
  brandLight: '#34D399',
  brandDim: 'rgba(16, 185, 129, 0.12)',
  brandGlow: 'rgba(16, 185, 129, 0.25)',
  brandBorder: 'rgba(16, 185, 129, 0.30)',

  teal: '#14B8A6',
  tealDim: 'rgba(20, 184, 166, 0.12)',
  tealBorder: 'rgba(20, 184, 166, 0.30)',
  cyan: '#06B6D4',
  cyanDim: 'rgba(6, 182, 212, 0.12)',

  // Canvas / backgrounds
  canvasDeep: '#0A0D0F',      // Page background — deepest
  canvasBase: '#0F1417',      // Standard screen bg
  canvasMid: '#141C21',       // Slightly elevated bg
  sidebar: '#0C1115',         // Sidebar background — deep charcoal
  sidebarHover: 'rgba(255, 255, 255, 0.045)',
  sidebarActive: 'rgba(16, 185, 129, 0.10)',
  sidebarActiveBorder: '#10B981',

  // Card / surface layers
  card: '#151E24',            // Standard card background
  cardElevated: '#1A242C',    // Hovered / focused card
  cardHero: '#1E2932',        // Hero / hero metric card
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  cardBorderHover: 'rgba(255, 255, 255, 0.13)',
  cardBorderAccent: 'rgba(16, 185, 129, 0.22)',

  // Top bar
  topbar: '#0F1417',
  topbarBorder: 'rgba(255, 255, 255, 0.07)',

  // Typography
  textHigh: '#F1F5F9',        // Highest contrast headings
  textMid: '#CBD5E1',         // Body / secondary
  textLow: '#94A3B8',         // Labels / meta / hints
  textMuted: '#64748B',       // Disabled / very low contrast
  textEmerald: '#34D399',     // Emerald highlight text
  textTeal: '#2DD4BF',        // Teal highlight text
  textAmber: '#FCD34D',       // Warning highlight text
  textRed: '#F87171',         // Error highlight text

  // Semantic
  success: '#10B981',
  successDim: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.25)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.25)',
  error: '#EF4444',
  errorDim: 'rgba(239, 68, 68, 0.12)',
  errorBorder: 'rgba(239, 68, 68, 0.25)',
  info: '#06B6D4',
  infoDim: 'rgba(6, 182, 212, 0.12)',
  infoBorder: 'rgba(6, 182, 212, 0.25)',
  amber: '#F59E0B',
  amberDim: 'rgba(245, 158, 11, 0.12)',

  // Dividers
  divider: 'rgba(255, 255, 255, 0.07)',
  dividerStrong: 'rgba(255, 255, 255, 0.11)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.65)',
  scrim: 'rgba(0, 0, 0, 0.80)',
});

// ── Layout ─────────────────────────────────────────────────────────────────────

export const ADMIN_LAYOUT = Object.freeze({
  sidebarExpandedWidth: 220,
  sidebarCollapsedWidth: 60,
  topbarHeight: 52,
  topbarHeightMobile: 48,
  contentPaddingH: 20,
  contentPaddingHMobile: 12,
  contentPaddingV: 20,
  cardGap: 14,
  cardGapMobile: 10,
  sectionGap: 24,
  sectionGapMobile: 16,
  /** Screens narrower than this are treated as mobile phones. */
  mobileBreakpoint: 900,
});

// ── Radius ─────────────────────────────────────────────────────────────────────

export const ADMIN_RADIUS = Object.freeze({
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
});

// ── Typography ─────────────────────────────────────────────────────────────────

export const ADMIN_TYPE = Object.freeze({
  // Headings
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.1 },
  h4: { fontSize: 13, fontWeight: '600' as const },

  // Body
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },

  // Labels / badges
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  badge: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.4 },

  // Metrics
  metric: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  metricSm: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  metricXs: { fontSize: 15, fontWeight: '700' as const },

  // Misc
  mono: { fontSize: 12, fontFamily: 'monospace' as const },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
});

// ── Shadow ─────────────────────────────────────────────────────────────────────

export const ADMIN_SHADOW = Object.freeze({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  brand: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
});

// ── Animation durations ────────────────────────────────────────────────────────

export const ADMIN_ANIM = Object.freeze({
  sidebar: 220,         // Sidebar expand/collapse
  pageTransition: 200,  // Page enter/exit
  drawer: 280,          // Detail drawer slide
  modal: 220,           // Modal open/close
  hover: 150,           // Hover/press micro-interactions
  kpiCountUp: 800,      // KPI number count-up duration
  chartEnter: 600,      // Chart animate-in duration
});

// ── Status maps ────────────────────────────────────────────────────────────────

export const ADMIN_STATUS_COLOR = {
  ACTIVE:               { bg: ADMIN_COLOR.successDim, text: ADMIN_COLOR.textEmerald, border: ADMIN_COLOR.successBorder },
  INACTIVE:             { bg: ADMIN_COLOR.amberDim, text: ADMIN_COLOR.textAmber, border: ADMIN_COLOR.warningBorder },
  SUSPENDED:            { bg: ADMIN_COLOR.errorDim, text: ADMIN_COLOR.textRed, border: ADMIN_COLOR.errorBorder },
  DEACTIVATED:          { bg: 'rgba(100, 116, 139, 0.12)', text: ADMIN_COLOR.textLow, border: 'rgba(100, 116, 139, 0.25)' },
  PENDING_VERIFICATION: { bg: ADMIN_COLOR.amberDim, text: ADMIN_COLOR.textAmber, border: ADMIN_COLOR.warningBorder },
  PENDING:              { bg: ADMIN_COLOR.amberDim, text: ADMIN_COLOR.textAmber, border: ADMIN_COLOR.warningBorder },
  APPROVED:             { bg: ADMIN_COLOR.successDim, text: ADMIN_COLOR.textEmerald, border: ADMIN_COLOR.successBorder },
  REJECTED:             { bg: ADMIN_COLOR.errorDim, text: ADMIN_COLOR.textRed, border: ADMIN_COLOR.errorBorder },
  COMPLETED:            { bg: ADMIN_COLOR.successDim, text: ADMIN_COLOR.textEmerald, border: ADMIN_COLOR.successBorder },
  IN_PROGRESS:          { bg: ADMIN_COLOR.cyanDim, text: ADMIN_COLOR.textTeal, border: ADMIN_COLOR.infoBorder },
  OPEN:                 { bg: ADMIN_COLOR.infoDim, text: '#93C5FD', border: ADMIN_COLOR.infoBorder },
  RESOLVED:             { bg: ADMIN_COLOR.successDim, text: ADMIN_COLOR.textEmerald, border: ADMIN_COLOR.successBorder },
} as const;

export const ADMIN_ROLE_COLOR = {
  ADMIN:              { bg: 'rgba(139, 92, 246, 0.12)', text: '#C4B5FD', border: 'rgba(139, 92, 246, 0.25)' },
  CITIZEN:            { bg: ADMIN_COLOR.cyanDim, text: ADMIN_COLOR.textTeal, border: ADMIN_COLOR.infoBorder },
  INFORMAL_COLLECTOR: { bg: ADMIN_COLOR.amberDim, text: '#FCD34D', border: ADMIN_COLOR.warningBorder },
  RECYCLER:           { bg: ADMIN_COLOR.brandDim, text: ADMIN_COLOR.textEmerald, border: ADMIN_COLOR.brandBorder },
} as const;

// ── Navigation group definitions ───────────────────────────────────────────────

export type AdminNavItem = {
  key: string;
  label: string;
  icon: string;
  screen: string;
  description?: string;
};

export type AdminNavGroup = {
  group: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    group: 'OVERVIEW',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'home', screen: 'AdminHome', description: 'Platform command center' },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      { key: 'verifications', label: 'Verifications', icon: 'shieldCheck', screen: 'AdminVerifications', description: 'Review pending applications' },
      { key: 'disputes', label: 'Disputes', icon: 'alert', screen: 'AdminDisputes', description: 'Manage active disputes' },
      { key: 'reports', label: 'Reports', icon: 'document', screen: 'AdminReports', description: 'Export & schedule reports' },
    ],
  },
  {
    group: 'ECOSYSTEM',
    items: [
      { key: 'users', label: 'Users', icon: 'user', screen: 'AdminUsers', description: 'Manage all platform users' },
      { key: 'governance', label: 'Recyclers', icon: 'factory', screen: 'AdminGovernance', description: 'Recycler governance & authorization' },
    ],
  },
  {
    group: 'INSIGHTS',
    items: [
      { key: 'analytics', label: 'Analytics', icon: 'chart', screen: 'AdminHistoricalAnalytics', description: 'Historical trends & insights' },
      { key: 'geographic', label: 'Geographic', icon: 'location', screen: 'AdminGeographicAnalytics', description: 'Map & collection activity' },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { key: 'notifications', label: 'Notifications', icon: 'bell', screen: 'AdminNotificationCenter', description: 'Broadcast & manage alerts' },
      { key: 'audit', label: 'Audit Log', icon: 'clipboard', screen: 'AdminAuditLogs', description: 'Immutable action trail' },
      { key: 'health', label: 'System Health', icon: 'refresh', screen: 'AdminSystemHealth', description: 'Backend diagnostics' },
      { key: 'profile', label: 'My Profile', icon: 'user', screen: 'AdminProfile', description: 'Account & preferences' },
    ],
  },
];
