/**
 * EcoSetu Glassmorphism Style Factory
 *
 * Provides reusable, StyleSheet-compatible style objects for all glass surfaces.
 * Import this wherever you need consistent glass styling.
 *
 * ANDROID PERFORMANCE NOTE:
 *   - No BlurView dependency — blur is simulated via layered translucent fills.
 *   - Keep elevation values low on glass cards to avoid overdraw.
 *   - All style objects are frozen plain objects — safe for StyleSheet.create().
 */

import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

// ── Glass Surface Style Objects ───────────────────────────────────────────────

/** Standard glass card — the primary surface for content blocks */
export const glassCard = {
  backgroundColor: colors.glassFill,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  overflow: 'hidden',
  elevation: 2,
};

/** Elevated glass card — for featured or interactive surfaces */
export const glassCardElevated = {
  backgroundColor: colors.glassFillElevated,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.glassBorderStrong,
  elevation: 4,
  overflow: 'hidden',
};

/** Hero glass panel — for landing/dashboard hero areas */
export const glassHero = {
  backgroundColor: colors.glassFillHero,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: colors.glassBorderStrong,
  overflow: 'hidden',
  elevation: 4,
};

/** Pill glass surface — for tags, chips, small status containers */
export const glassPill = {
  backgroundColor: colors.glassFill,
  borderRadius: 9999,
  borderWidth: 1,
  borderColor: colors.glassBorder,
};

/** Glass input field */
export const glassInput = {
  backgroundColor: 'rgba(16, 44, 48, 0.65)',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.16)',
  color: colors.textPrimary,
  paddingHorizontal: spacing.spaceMd,
  paddingVertical: spacing.spaceSm + 4,
  fontSize: 15,
  minHeight: 48,
};

/** Glass input — focused state */
export const glassInputFocused = {
  ...glassInput,
  borderColor: colors.primary,
  borderWidth: 1.5,
  backgroundColor: 'rgba(16, 185, 129, 0.08)',
};

/** Primary glowing emerald CTA button */
export const glassPrimaryButton = {
  backgroundColor: colors.primary,
  borderRadius: 14,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.spaceLg,
  paddingVertical: spacing.spaceSm + 2,
  elevation: 3,
};

/** Ghost/outline button on glass */
export const glassOutlineButton = {
  backgroundColor: colors.glassFill,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.glassBorderStrong,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.spaceLg,
  paddingVertical: spacing.spaceSm + 2,
};

/** Accent-tinted button (ECOSETU teal/emerald) */
export const glassAccentButton = {
  backgroundColor: colors.accent,
  borderRadius: 14,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.spaceLg,
  paddingVertical: spacing.spaceSm + 2,
  elevation: 3,
};

// ── Background Gradient Layers ─────────────────────────────────────────────

/**
 * Three-layer gradient simulation (bottom-up stacking).
 * Place these as absolutely-positioned Views behind screen content.
 */
export const gradientLayers = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundBase,
  },
  midLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundMid,
    opacity: 0.6,
    top: '30%',
  },
  topLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundTop,
    opacity: 0.35,
    top: '65%',
  },
});

// ── Section Header ─────────────────────────────────────────────────────────
export const sectionHeaderStyle = {
  fontSize: 11,
  fontWeight: '700',
  color: colors.textSecondary,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  marginBottom: spacing.spaceSm,
  marginTop: spacing.spaceLg,
};

// ── Divider ───────────────────────────────────────────────────────────────
export const glassDivider = {
  height: 1,
  backgroundColor: colors.glassBorder,
  marginVertical: spacing.spaceSm,
};

export default {
  glassCard,
  glassCardElevated,
  glassHero,
  glassPill,
  glassInput,
  glassInputFocused,
  glassPrimaryButton,
  glassOutlineButton,
  glassAccentButton,
  gradientLayers,
  sectionHeaderStyle,
  glassDivider,
};
