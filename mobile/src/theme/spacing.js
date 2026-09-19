/**
 * EcoSetu Spacing, Elevation & Border Radius Design Tokens
 * Source of Truth: docs/08_UI_UX_SPECIFICATION.md Section 2.3 (extended)
 */

export const spacing = Object.freeze({
  // ── Base Spacing Scale ────────────────────────────────────────────────────
  spaceXs: 4,   // Tight component padding
  spaceSm: 8,   // Inner card element spacing
  spaceMd: 16,  // Screen margin, standard padding
  spaceLg: 24,  // Section separation
  spaceXl: 32,  // Major block spacing
  space2Xl: 48, // Hero sections

  // ── Elevation ─────────────────────────────────────────────────────────────
  cardElevation: 2,          // Card shadow on Android surface
  appBarElevation: 4,        // Top App Bar elevation
  bottomSheetElevation: 8,   // Modal bottom sheet elevation
  glassElevation: 6,         // Glass card elevation

  // ── Border Radius ─────────────────────────────────────────────────────────
  radiusXs: 6,    // Chips, small badges
  radiusSm: 10,   // Inputs, small cards
  radiusMd: 16,   // Standard glass cards
  radiusLg: 24,   // Hero cards, large panels
  radiusXl: 32,   // Modals, bottom sheets
  radiusPill: 100, // Pills, tags, full-round buttons

  // ── Glass-specific ─────────────────────────────────────────────────────────
  glassBorderWidth: 1,         // Glass surface border width
  glassBorderWidthFocused: 1.5, // Focused/active state
});

export default spacing;
