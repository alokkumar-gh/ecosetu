/**
 * EcoSetu Color Palette Design Tokens — Global Glassmorphism Edition
 * Source of Truth: docs/08_UI_UX_SPECIFICATION.md
 *
 * UNIFIED PUBLIC-SERVICE GLASS:
 * Restrained, elegant translucent white surfaces on soft off-white canvas.
 * Deep ECOSETU navy typography with restrained forest green accents.
 * 100% WCAG AA contrast compliant. Zero neon, zero cyberpunk.
 */

export const colors = Object.freeze({
  // ── Core Brand ───────────────────────────────────────────────────────────
  primary: '#0F2942',        // Deep ECOSETU navy — Primary brand, buttons, headers
  primaryLight: '#1E3A8A',   // Navy blue highlight
  primaryDark: '#0A192F',    // Deepest navy
  secondary: '#2563EB',      // Public-service blue — Info, active indicators
  secondaryLight: '#3B82F6', // Lighter accent blue
  accent: '#059669',         // Restrained ECOSETU green — Environmental accent, success
  accentLight: '#10B981',    // Emerald green
  accentDark: '#047857',     // Forest green

  // ── Background Layers (Soft Off-White Canvas) ────────────────────────────
  backgroundDeep: '#FFFFFF',   // Pure white for card contrast
  backgroundBase: '#F8FAFC',   // Slate 50 — primary canvas background
  backgroundMid: '#F1F5F9',    // Slate 100 — subtle ambient gradient mid
  backgroundTop: '#E2E8F0',    // Slate 200 — subtle ambient gradient top
  background: '#F8FAFC',       // Primary screen background

  // ── Glass Surfaces ────────────────────────────────────────────────────────
  glassFill: 'rgba(255, 255, 255, 0.80)',         // Standard glass card fill
  glassFillElevated: 'rgba(255, 255, 255, 0.92)', // Elevated card fill
  glassFillHero: 'rgba(255, 255, 255, 0.86)',     // Hero/featured card fill
  glassBorder: 'rgba(226, 232, 240, 0.85)',       // Subtle glass border
  glassBorderStrong: 'rgba(203, 213, 225, 0.95)', // Prominent glass border
  glassOverlay: 'rgba(15, 41, 66, 0.40)',         // Scrim/overlay behind modals

  // ── Accent Fills (Translucent) ────────────────────────────────────────────
  accentFill: 'rgba(5, 150, 105, 0.10)',      // Restrained green transparent tint
  accentFillStrong: 'rgba(5, 150, 105, 0.20)', // Stronger green tint
  secondaryFill: 'rgba(37, 99, 235, 0.10)',    // Blue accent tint

  // ── High-Contrast Typography ──────────────────────────────────────────────
  textPrimary: '#0F2942',    // Deep navy — High emphasis, headers, body
  textSecondary: '#475569',  // Slate 600 — Medium emphasis, subtitles, descriptions
  textTertiary: '#94A3B8',   // Slate 400 — Low emphasis, placeholders, hints
  textInverse: '#FFFFFF',    // Pure white on dark navy / green buttons

  // ── Semantic ─────────────────────────────────────────────────────────────
  success: '#059669',          // Forest green
  successFill: 'rgba(5, 150, 105, 0.12)',
  warning: '#D97706',          // Warm amber
  warningFill: 'rgba(217, 119, 6, 0.12)',
  error: '#DC2626',            // Crimson red
  errorFill: 'rgba(220, 38, 38, 0.12)',
  info: '#2563EB',             // Royal blue
  infoFill: 'rgba(37, 99, 235, 0.12)',

  // ── Status Badge Colors (Legible on Light Glass) ──────────────────────────
  badge: {
    draft:     { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' },
    pending:   { bg: 'rgba(217, 119, 6, 0.12)',  text: '#B45309' },
    created:   { bg: 'rgba(37, 99, 235, 0.12)',  text: '#1D4ED8' },
    inTransit: { bg: 'rgba(217, 119, 6, 0.15)',  text: '#B45309' },
    delivered: { bg: 'rgba(5, 150, 105, 0.12)',  text: '#047857' },
    received:  { bg: 'rgba(124, 58, 237, 0.12)', text: '#6D28D9' },
    approved:  { bg: 'rgba(5, 150, 105, 0.15)',  text: '#047857' },
    progress:  { bg: 'rgba(234, 88, 12, 0.12)',  text: '#C2410C' },
    completed: { bg: 'rgba(5, 150, 105, 0.18)',  text: '#065F46' },
    cancelled: { bg: 'rgba(220, 38, 38, 0.12)',  text: '#B91C1C' },
    expired:   { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748B' },
  },

  // Translucent public-service glass surface for consistent depth
  surface: 'rgba(255, 255, 255, 0.88)',
  divider: 'rgba(226, 232, 240, 0.90)',
  glassSurface: 'rgba(255, 255, 255, 0.82)',
  glassSurfaceRaised: 'rgba(255, 255, 255, 0.92)',
  accentMint: '#059669',
});

export default colors;
