/**
 * EcoSetu Typography Design Tokens — Glassmorphism Edition
 * Source of Truth: docs/08_UI_UX_SPECIFICATION.md Section 2.2 (extended)
 */

export const typography = Object.freeze({
  // ── Scale ─────────────────────────────────────────────────────────────────
  Headline: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  Title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  Subheading: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  Body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    letterSpacing: 0,
  },
  BodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    letterSpacing: 0,
  },
  Caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  CaptionStrong: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  Button: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  Label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  // Hero/display size
  Display: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -1,
  },
  Metric: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.5,
  },

  // Direct scale values
  fontSizeXs: 11,
  fontSizeSm: 12,
  fontSizeBase: 14,
  fontSizeMd: 16,
  fontSizeLg: 18,
  fontSizeXl: 20,
  fontSize2Xl: 24,
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemiBold: '600',
  fontWeightBold: '700',
  fontWeightExtraBold: '800',
});

export default typography;
