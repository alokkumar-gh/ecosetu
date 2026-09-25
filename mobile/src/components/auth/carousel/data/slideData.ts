/**
 * EcoSetu Onboarding Slide Data Model
 *
 * Each slide is a pure data object — no JSX, no logic.
 * Graphics and animations are driven by the slide's `id` and `theme`.
 */

export type SlideTheme =
  | 'crisis'      // Slide 1: The E-Waste Problem
  | 'ecosystem'   // Slide 2: One Connected Ecosystem
  | 'smart'       // Slide 3: Smart Collection
  | 'trace'       // Slide 4: Traceability Chain
  | 'impact';     // Slide 5: Join the Mission

export interface StatBadge {
  value: string;
  label: string;
  icon: string;
}

export interface OnboardingSlide {
  id: number;
  theme: SlideTheme;
  /** Category chip label */
  tag: string;
  /** Tag color override (hex) */
  tagColor: string;
  /** Tag background rgba */
  tagBg: string;
  /** Large headline */
  titleKey: string;
  /** Body paragraph */
  subtitleKey: string;
  /** Micro stats shown in glass badges */
  stats: StatBadge[];
  /** Accent glow color for this slide's atmosphere */
  glowColor: string;
  /** Secondary glow */
  glowColor2: string;
}

export const SLIDE_DATA: OnboardingSlide[] = [
  {
    id: 0,
    theme: 'crisis',
    tag: 'THE CHALLENGE',
    tagColor: '#FCA5A5',
    tagBg: 'rgba(239, 68, 68, 0.14)',
    titleKey: 'slide1Title',
    subtitleKey: 'slide1Subtitle',
    stats: [
      { value: '3.2M', label: 'Tonnes/Year', icon: '⚡' },
      { value: '95%', label: 'Informal', icon: '⚠️' },
      { value: '₹0', label: 'Citizen Value', icon: '📉' },
    ],
    glowColor: 'rgba(239, 68, 68, 0.18)',
    glowColor2: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 1,
    theme: 'ecosystem',
    tag: 'THE SOLUTION',
    tagColor: '#6EE7B7',
    tagBg: 'rgba(16, 185, 129, 0.14)',
    titleKey: 'slide2Title',
    subtitleKey: 'slide2Subtitle',
    stats: [
      { value: '3', label: 'Stakeholders', icon: '🔗' },
      { value: '1', label: 'Platform', icon: '🌐' },
      { value: '∞', label: 'Traceability', icon: '♾️' },
    ],
    glowColor: 'rgba(16, 185, 129, 0.22)',
    glowColor2: 'rgba(6, 182, 212, 0.12)',
  },
  {
    id: 2,
    theme: 'smart',
    tag: 'SMART COLLECTION',
    tagColor: '#A5F3FC',
    tagBg: 'rgba(6, 182, 212, 0.14)',
    titleKey: 'slide3Title',
    subtitleKey: 'slide3Subtitle',
    stats: [
      { value: 'AI', label: 'Detection', icon: '🤖' },
      { value: '< 2m', label: 'Pickup Match', icon: '📍' },
      { value: 'Live', label: 'Tracking', icon: '🛰️' },
    ],
    glowColor: 'rgba(6, 182, 212, 0.20)',
    glowColor2: 'rgba(16, 185, 129, 0.10)',
  },
  {
    id: 3,
    theme: 'trace',
    tag: 'FULL TRACEABILITY',
    tagColor: '#E9D5FF',
    tagBg: 'rgba(168, 85, 247, 0.14)',
    titleKey: 'slide4Title',
    subtitleKey: 'slide4Subtitle',
    stats: [
      { value: '100%', label: 'Chain Tracked', icon: '🔍' },
      { value: 'QR', label: 'Every Item', icon: '📦' },
      { value: 'CPCB', label: 'Compliant', icon: '✅' },
    ],
    glowColor: 'rgba(168, 85, 247, 0.18)',
    glowColor2: 'rgba(45, 212, 191, 0.10)',
  },
  {
    id: 4,
    theme: 'impact',
    tag: 'JOIN THE MISSION',
    tagColor: '#FDE68A',
    tagBg: 'rgba(245, 158, 11, 0.14)',
    titleKey: 'slide5Title',
    subtitleKey: 'slide5Subtitle',
    stats: [
      { value: '1 kg', label: 'CO₂ Saved', icon: '🌱' },
      { value: '₹500+', label: 'Earned/Month', icon: '💰' },
      { value: 'India', label: 'Wide Network', icon: '🗺️' },
    ],
    glowColor: 'rgba(245, 158, 11, 0.18)',
    glowColor2: 'rgba(16, 185, 129, 0.18)',
  },
];

export const TOTAL_SLIDES = SLIDE_DATA.length;
