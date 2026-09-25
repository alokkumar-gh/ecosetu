/**
 * EcoSetu — Eco-Saathi Type Definitions
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * Strict TypeScript types for the offline-first deterministic knowledge engine.
 */

import { SupportedLanguage } from '../i18n/config';

export type SaathiUserRole = 'ALL' | 'CITIZEN' | 'INFORMAL_COLLECTOR' | 'RECYCLER' | 'ADMIN';

export type SaathiCategory =
  | 'GENERAL'
  | 'AI_CAMERA'
  | 'PRICING'
  | 'LOTS'
  | 'MARKETPLACE'
  | 'DEALS'
  | 'HANDOVER'
  | 'PAYMENT'
  | 'EARNINGS'
  | 'SAFETY'
  | 'DISPUTES'
  | 'ACCOUNT'
  | 'OFFLINE'
  | 'LANGUAGE'
  | 'RECYCLER';

export type SaathiSafetySensitivity = 'STANDARD' | 'HIGH' | 'HAZARD_CRITICAL';

export interface SaathiSuggestedAction {
  actionType: 'NAVIGATE';
  targetRoute: string;
  actionLabelI18nKey: string;
  params?: Record<string, string | number | boolean>;
}

export interface SaathiIntent {
  id: string;
  category: SaathiCategory;
  applicableRoles: SaathiUserRole[];
  triggerPatterns: Record<SupportedLanguage, string[]>;
  keywords: Record<SupportedLanguage, string[]>;
  responseI18nKey: string;
  suggestedAction?: SaathiSuggestedAction;
  requiresDynamicData: boolean;
  dynamicDataResolverKey?: string;
  quickReplies?: string[];
  safetySensitivity: SaathiSafetySensitivity;
}

export interface SaathiMatcherContext {
  role?: 'CITIZEN' | 'INFORMAL_COLLECTOR' | 'RECYCLER' | 'ADMIN' | null;
  language?: SupportedLanguage;
  currentRoute?: string;
  isAuthenticated?: boolean;
}

export interface SaathiClarificationOption {
  intentId: string;
  labelI18nKey: string;
  query: string;
}

export interface SaathiMatchResult {
  intentId: string | null;
  matched: boolean;
  confidence: number;
  category?: SaathiCategory;
  responseI18nKey: string;
  suggestedAction?: SaathiSuggestedAction;
  requiresDynamicData: boolean;
  dynamicDataResolverKey?: string;
  quickReplies?: string[];
  safetySensitivity: SaathiSafetySensitivity;
  matchedPattern?: string;
  matchMethod: 'EXACT' | 'KEYWORD' | 'SYNONYM' | 'FUZZY' | 'CLARIFICATION' | 'FALLBACK';
  isAmbiguous?: boolean;
  clarificationOptions?: SaathiClarificationOption[];
}

export type EcoSaathiDynamicStatus =
  | 'SUCCESS'
  | 'UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'OFFLINE'
  | 'ERROR'
  | 'NOT_IMPLEMENTED';

export interface EcoSaathiDynamicResult {
  intentId: string;
  status: EcoSaathiDynamicStatus;
  message: string;
  action?: SaathiSuggestedAction;
  data?: Record<string, unknown>;
  timestamp?: number;
  isCached?: boolean;
  lastSyncedAt?: string | null;
}

export interface EcoSaathiDynamicContext {
  userId?: string | null;
  role?: 'CITIZEN' | 'INFORMAL_COLLECTOR' | 'RECYCLER' | 'ADMIN' | null;
  language?: SupportedLanguage;
  isAuthenticated: boolean;
  isOnline?: boolean;
  user?: {
    id: string;
    email?: string;
    name?: string;
    role: string;
    status: string;
    phone?: string;
    isVerified?: boolean;
  } | null;
}

