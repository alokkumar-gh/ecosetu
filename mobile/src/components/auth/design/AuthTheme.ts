/**
 * EcoSetu Auth Design System — Single Source of Truth
 *
 * All authentication screens share these tokens.
 * Extend here, never hardcode in screen/component files.
 */

// ─── Color Palette ──────────────────────────────────────────────────────────

export const AUTH_COLORS = {
  // Base surface
  bg: '#020C14',
  bgCard: 'rgba(8, 28, 36, 0.82)',
  bgCardLight: 'rgba(16, 44, 52, 0.60)',
  bgInput: 'rgba(5, 20, 28, 0.80)',
  bgInputFocus: 'rgba(16, 185, 129, 0.06)',

  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.11)',
  borderCard: 'rgba(255, 255, 255, 0.14)',
  borderFocus: '#10B981',
  borderError: 'rgba(239, 68, 68, 0.65)',

  // Accent — emerald
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDim: 'rgba(16, 185, 129, 0.18)',
  primaryGlow: 'rgba(16, 185, 129, 0.35)',

  // Accent — cyan
  secondary: '#06B6D4',
  secondaryDim: 'rgba(6, 182, 212, 0.15)',

  // Text
  textPrimary: '#F0FDF4',
  textSecondary: 'rgba(255, 255, 255, 0.68)',
  textMuted: 'rgba(255, 255, 255, 0.42)',
  textPrimaryOnLight: '#020C14',

  // Status
  error: '#F87171',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  errorBorder: 'rgba(248, 113, 113, 0.38)',
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.10)',
  warning: '#FBBF24',

  // Chip accents
  chipCitizen: 'rgba(16, 185, 129, 0.18)',
  chipCollector: 'rgba(6, 182, 212, 0.18)',
  chipRecycler: 'rgba(167, 139, 250, 0.18)',
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────

export const AUTH_TYPE = {
  // Headlines
  h1: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.5, color: AUTH_COLORS.textPrimary },
  h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, color: AUTH_COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.1, color: AUTH_COLORS.textPrimary },

  // Body
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21, color: AUTH_COLORS.textSecondary },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const, lineHeight: 21, color: AUTH_COLORS.textSecondary },

  // Labels
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6, color: AUTH_COLORS.textSecondary },
  chip: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.2 },

  // CTA
  ctaPrimary: { fontSize: 16, fontWeight: '800' as const, letterSpacing: 0.4, color: AUTH_COLORS.textPrimaryOnLight },
  ctaSecondary: { fontSize: 14, fontWeight: '600' as const, color: AUTH_COLORS.textSecondary },
  link: { fontSize: 13, fontWeight: '700' as const, color: AUTH_COLORS.primaryLight },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const AUTH_SPACE = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
  screenH: 24,  // horizontal screen padding
} as const;

// ─── Radius ──────────────────────────────────────────────────────────────────

export const AUTH_RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const AUTH_SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.50,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.60,
    shadowRadius: 20,
    elevation: 0,
  },
} as const;

// ─── Animation Timings ───────────────────────────────────────────────────────

export const AUTH_TIMING = {
  micro: 150,
  input: 220,
  screen: 350,
  success: 800,
} as const;

// ─── Orb config (background atmosphere) ──────────────────────────────────────

export type OrbConfig = {
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  width: number;
  height: number;
  color: string;
};

/** Per-screen orb presets */
export const AUTH_ORBS: Record<string, OrbConfig[]> = {
  gateway: [
    { top: -80, right: -60, width: 280, height: 280, color: 'rgba(16, 185, 129, 0.12)' },
    { top: '40%', left: -100, width: 300, height: 300, color: 'rgba(6, 182, 212, 0.07)' },
    { bottom: -60, right: -40, width: 240, height: 240, color: 'rgba(5, 150, 105, 0.09)' },
  ],
  login: [
    { top: -60, right: -50, width: 240, height: 240, color: 'rgba(16, 185, 129, 0.11)' },
    { top: '30%', left: -80, width: 260, height: 260, color: 'rgba(6, 182, 212, 0.07)' },
    { bottom: -50, right: -30, width: 200, height: 200, color: 'rgba(16, 185, 129, 0.07)' },
  ],
  register: [
    { top: -50, left: -40, width: 220, height: 220, color: 'rgba(6, 182, 212, 0.10)' },
    { top: '45%', right: -90, width: 280, height: 280, color: 'rgba(16, 185, 129, 0.07)' },
    { bottom: -60, left: -50, width: 220, height: 220, color: 'rgba(167, 139, 250, 0.06)' },
  ],
  forgot: [
    { top: -60, left: -60, width: 240, height: 240, color: 'rgba(6, 182, 212, 0.11)' },
    { bottom: -50, right: -50, width: 220, height: 220, color: 'rgba(16, 185, 129, 0.08)' },
  ],
};
