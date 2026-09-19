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
  borderRadius: spacing.radiusMd,
  borderWidth: spacing.glassBorderWidth,
  borderColor: colors.glassBorder,
  overflow: 'hidden',
  elevation: 1,
};

/** Elevated glass card — for featured or interactive surfaces */
export const glassCardElevated = {
  backgroundColor: colors.glassFillElevated,
  borderRadius: spacing.radiusMd,
  borderWidth: spacing.glassBorderWidth,
  borderColor: colors.glassBorderStrong,
  elevation: spacing.glassElevation,
  overflow: 'hidden',
};

/** Hero glass panel — for landing/dashboard hero areas */
export const glassHero = {
  backgroundColor: colors.glassFillHero,
  borderRadius: spacing.radiusLg,
  borderWidth: spacing.glassBorderWidth,
  borderColor: colors.glassBorderStrong,
  overflow: 'hidden',
  elevation: 2,
};

/** Pill glass surface — for tags, chips, small status containers */
export const glassPill = {
  backgroundColor: colors.glassFill,
  borderRadius: spacing.radiusPill,
  borderWidth: spacing.glassBorderWidth,
  borderColor: colors.glassBorder,
};

/** Glass input field */
export const glassInput = {
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderRadius: spacing.radiusSm,
  borderWidth: spacing.glassBorderWidth,
  borderColor: colors.glassBorder,
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
  borderWidth: spacing.glassBorderWidthFocused,
  backgroundColor: '#FFFFFF',
};

/** Primary deep navy CTA button */
export const glassPrimaryButton = {
  backgroundColor: colors.primary,
  borderRadius: spacing.radiusMd,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.spaceLg,
  paddingVertical: spacing.spaceSm + 2,
  elevation: 2,
};

/** Ghost/outline button on glass */
export const glassOutlineButton = {
  backgroundColor: 'rgba(255, 255, 255, 0.80)',
  borderRadius: spacing.radiusMd,
  borderWidth: spacing.glassBorderWidth,
  borderColor: colors.glassBorderStrong,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.spaceLg,
  paddingVertical: spacing.spaceSm + 2,
};

/** Accent-tinted button (ECOSETU green) */
export const glassAccentButton = {
  backgroundColor: colors.accent,
  borderRadius: spacing.radiusMd,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.spaceLg,
  paddingVertical: spacing.spaceSm + 2,
  elevation: 2,
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
