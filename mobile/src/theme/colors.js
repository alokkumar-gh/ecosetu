/**
 * EcoSetu Color Palette Design Tokens — Premium SaaS Glassmorphism Edition
 *
 * UNIFIED ENVIRONMENTAL SAAS GLASS:
 * Deep dark atmospheric environmental canvas with soft radial emerald/cyan glow pools.
 * Translucent frosted glass card surfaces with subtle emerald/white highlights.
 * High-contrast crisp typography (WCAG AA/AAA compliant).
 * Authoritative deep navy #0F2942 preserved for brand identity and security tokens.
 */

export const colors = Object.freeze({
  // ── Core Brand & Identity ──────────────────────────────────────────────────
  primary: '#10B981',        // Vibrant emerald green — active states, primary CTAs
  primaryDark: '#059669',    // Deep emerald CTA gradient base
  primaryLight: '#34D399',   // Light emerald highlight glow
  primaryBrand: '#0F2942',   // Authoritative deep ECOSETU navy #0F2942 — trust, technology
  navyBrand: '#0F2942',      // Explicit navy brand token #0F2942
  secondary: '#06B6D4',      // Environmental cyan / teal — metrics, active indicators
  secondaryLight: '#22D3EE', // Light cyan highlight
  secondaryDark: '#0891B2',  // Deep cyan
  accent: '#10B981',         // Environmental accent
  accentLight: '#34D399',    // Soft mint
  accentDark: '#047857',     // Deep forest green
  accentMint: '#10B981',     // Glowing emerald mint
  emeraldGlow: 'rgba(16, 185, 129, 0.35)',

  // ── Atmospheric Background Layers ──────────────────────────────────────────
  backgroundDeep: '#02080D',   // Deepest dark cosmic blue-black
  backgroundBase: '#030C12',   // Primary atmospheric canvas base
  backgroundMid: '#06151B',    // Atmospheric gradient mid
  backgroundTop: '#092229',    // Atmospheric gradient top
  background: '#030C12',       // Screen background default

  // ── Glass Surfaces (Translucent Frosted Layers) ───────────────────────────
  glassFill: 'rgba(6, 21, 27, 0.72)',             // Standard translucent glass card
  glassFillElevated: 'rgba(10, 30, 40, 0.82)',     // Elevated/interactive glass
  glassFillHero: 'rgba(8, 25, 33, 0.88)',          // Rich hero glass panel
  glassBorder: 'rgba(255, 255, 255, 0.12)',        // Clean glass border
  glassBorderStrong: 'rgba(45, 212, 191, 0.32)',   // Emerald/cyan highlighted glass border
  glassOverlay: 'rgba(2, 8, 13, 0.85)',            // Scrim overlay behind modals #0F2942 tint
  glassHighlight: 'rgba(255, 255, 255, 0.22)',     // Inner highlight edge

  // ── Accent Fills (Translucent Tint Layers) ─────────────────────────────────
  accentFill: 'rgba(16, 185, 129, 0.14)',         // Emerald glow tint
  accentFillStrong: 'rgba(16, 185, 129, 0.24)',   // Stronger emerald tint
  secondaryFill: 'rgba(6, 182, 212, 0.14)',       // Cyan glow tint
  navyFill: 'rgba(15, 41, 66, 0.35)',             // Navy institutional tint

  // ── High-Contrast Typography (100% Readable, Zero Invisible Text) ─────────
  textPrimary: '#FFFFFF',    // Crisp white — maximum contrast on dark glass
  textSecondary: '#CBD5E1',  // Slate 200 — high-contrast readable secondary copy
  textTertiary: '#94A3B8',   // Slate 400 — clean subtle labels, hints
  textMuted: '#64748B',      // Slate 500 — disabled/meta labels
  textInverse: '#FFFFFF',    // Inverse white
  textEmerald: '#34D399',    // Emerald highlighted text
  textCyan: '#22D3EE',       // Cyan highlighted text

  // ── Semantic Feedback ────────────────────────────────────────────────────
  success: '#10B981',          // Emerald green
  successFill: 'rgba(16, 185, 129, 0.16)',
  warning: '#F59E0B',          // Amber
  warningFill: 'rgba(245, 158, 11, 0.16)',
  error: '#EF4444',            // Red
  errorFill: 'rgba(239, 68, 68, 0.16)',
  info: '#06B6D4',             // Cyan
  infoFill: 'rgba(6, 182, 212, 0.16)',

  // ── Status Badge Colors (Legible on Dark Glass) ───────────────────────────
  badge: {
    draft:     { bg: 'rgba(148, 163, 184, 0.18)', text: '#F1F5F9', border: 'rgba(148, 163, 184, 0.35)' },
    pending:   { bg: 'rgba(245, 158, 11, 0.20)',  text: '#FDE68A', border: 'rgba(245, 158, 11, 0.45)' },
    created:   { bg: 'rgba(6, 182, 212, 0.20)',   text: '#A5F3FC', border: 'rgba(6, 182, 212, 0.45)' },
    inTransit: { bg: 'rgba(6, 182, 212, 0.22)',   text: '#A5F3FC', border: 'rgba(6, 182, 212, 0.50)' },
    delivered: { bg: 'rgba(245, 158, 11, 0.22)',  text: '#FDE68A', border: 'rgba(245, 158, 11, 0.50)' },
    received:  { bg: 'rgba(168, 85, 247, 0.22)',  text: '#E9D5FF', border: 'rgba(168, 85, 247, 0.50)' },
    approved:  { bg: 'rgba(16, 185, 129, 0.22)',  text: '#6EE7B7', border: 'rgba(16, 185, 129, 0.50)' },
    progress:  { bg: 'rgba(249, 115, 22, 0.22)',  text: '#FDBA74', border: 'rgba(249, 115, 22, 0.50)' },
    completed: { bg: 'rgba(16, 185, 129, 0.26)',  text: '#6EE7B7', border: 'rgba(16, 185, 129, 0.55)' },
    cancelled: { bg: 'rgba(239, 68, 68, 0.22)',   text: '#FCA5A5', border: 'rgba(239, 68, 68, 0.45)' },
    expired:   { bg: 'rgba(148, 163, 184, 0.20)', text: '#CBD5E1', border: 'rgba(148, 163, 184, 0.35)' },
  },

  // ── Carousel — Premium Fullscreen Onboarding ────────────────────────────
  carousel: {
    bgDeep: '#041216',
    bgSecondary: '#08252A',
    accentEmerald: '#10B981',
    accentTeal: '#14B8A6',
    accentCyan: '#06B6D4',
    glowEmerald: 'rgba(16, 185, 129, 0.25)',
    glowTeal: 'rgba(20, 184, 166, 0.18)',
    glowCyan: 'rgba(6, 182, 212, 0.15)',
    textHero: '#F0FDF4',
    textBody: 'rgba(255, 255, 255, 0.75)',
    textMicro: 'rgba(255, 255, 255, 0.50)',
    glassFill: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    nodeActive: '#34D399',
    nodeInactive: 'rgba(52, 211, 153, 0.25)',
    pathLine: 'rgba(20, 184, 166, 0.40)',
    gridLine: 'rgba(255, 255, 255, 0.06)',
    particleGlow: 'rgba(52, 211, 153, 0.60)',
  },

  // ── Translucent Glass Surface Shorthands ──────────────────────────────────
  surface: 'rgba(6, 21, 27, 0.72)',
  surfaceStrong: 'rgba(10, 30, 40, 0.85)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderStrong: 'rgba(45, 212, 191, 0.32)',
  divider: 'rgba(255, 255, 255, 0.12)',
  glassSurface: 'rgba(6, 21, 27, 0.72)',
  glassSurfaceRaised: 'rgba(10, 30, 40, 0.85)',
});

export default colors;
