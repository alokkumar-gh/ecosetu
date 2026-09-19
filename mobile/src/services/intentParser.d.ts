export type CollectorIntentCategory = 'NAVIGATION' | 'READ' | 'WORKFLOW' | 'UNKNOWN';

export type CollectorIntent =
  | 'NAVIGATE_DASHBOARD'
  | 'NAVIGATE_REQUESTS'
  | 'NAVIGATE_PICKUPS'
  | 'NAVIGATE_CONSIGNMENTS'
  | 'NAVIGATE_RECYCLERS'
  | 'NAVIGATE_PROFILE'
  | 'READ_AVAILABLE_REQUESTS'
  | 'READ_MY_PICKUPS'
  | 'READ_MY_CONSIGNMENTS'
  | 'READ_NEARBY_RECYCLERS'
  | 'READ_COLLECTOR_STATS'
  | 'WORKFLOW_ACCEPT_REQUEST'
  | 'WORKFLOW_START_PICKUP'
  | 'WORKFLOW_COMPLETE_PICKUP'
  | 'WORKFLOW_DELIVER_CONSIGNMENT'
  | 'WORKFLOW_OPEN_REQUEST'
  | 'WORKFLOW_OPEN_PICKUP'
  | 'WORKFLOW_OPEN_CONSIGNMENT'
  | 'UNKNOWN';

export interface IntentResult {
  intent: CollectorIntent;
  confidence: number;
  category: CollectorIntentCategory;
  rawTranscript: string;
  normalizedText: string;
  requiresConfirmation: boolean;
  targetEntity?: 'REQUEST' | 'PICKUP' | 'CONSIGNMENT' | 'RECYCLER' | null;
  parameters?: Record<string, any>;
}

export function normalizeTranscript(text: string): string;
export function parseIntent(transcript: string, activeLanguage?: string): IntentResult;
export const INTENT_RULES: any[];
