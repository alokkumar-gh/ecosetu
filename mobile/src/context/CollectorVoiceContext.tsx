/**
 * CollectorVoiceContext.tsx
 * React Context connecting Voice Commands with active Collector screen handlers.
 *
 * Safety Invariants:
 * - Available ONLY to INFORMAL_COLLECTOR.
 * - Bridges parsed intents to existing screen actions (zero backend bypass).
 * - State-changing commands require explicit user confirmation.
 * - Server-authoritative operations are blocked when offline.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { voiceCommandService, VoiceSessionState } from '../services/voiceCommandService';
import { IntentResult } from '../services/intentParser';
import { voiceService } from '../services/voiceService';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { useI18n } from '../i18n';
import { ROLES } from '../utils/constants';

export interface SelectedCollectorEntity {
  type: 'REQUEST' | 'PICKUP' | 'CONSIGNMENT';
  id: string;
  label?: string;
  data?: any;
}

export interface CollectorActionHandlers {
  onAcceptRequest?: (id: string) => Promise<void> | void;
  onStartPickup?: (id: string) => Promise<void> | void;
  onCompletePickup?: (id: string) => Promise<void> | void;
  onDeliverConsignment?: (id: string) => Promise<void> | void;
  onReadAvailableRequests?: () => void;
  onReadMyPickups?: () => void;
  onReadMyConsignments?: () => void;
  onReadStats?: () => void;
  onNavigate?: (screenName: string) => void;
}

export interface ConfirmationPrompt {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface CollectorVoiceContextValue {
  isVoiceModalVisible: boolean;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  sessionState: VoiceSessionState;
  recognizedTranscript: string;
  parsedIntent: IntentResult | null;
  confirmationPrompt: ConfirmationPrompt | null;
  selectedEntity: SelectedCollectorEntity | null;
  setSelectedEntity: (entity: SelectedCollectorEntity | null) => void;
  registerActions: (handlers: CollectorActionHandlers) => () => void;
  triggerListening: () => Promise<void>;
}

const CollectorVoiceContext = createContext<CollectorVoiceContextValue | null>(null);

export const CollectorVoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { language, t } = useI18n();

  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [sessionState, setSessionState] = useState<VoiceSessionState>('IDLE');
  const [recognizedTranscript, setRecognizedTranscript] = useState<string>('');
  const [parsedIntent, setParsedIntent] = useState<IntentResult | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState<ConfirmationPrompt | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedCollectorEntity | null>(null);

  const handlersRef = useRef<CollectorActionHandlers>({});

  useEffect(() => {
    const unsub = voiceCommandService.subscribeState((st) => {
      setSessionState(st);
    });
    return () => unsub();
  }, []);

  const registerActions = useCallback((handlers: CollectorActionHandlers) => {
    handlersRef.current = { ...handlersRef.current, ...handlers };
    return () => {
      // Unregister handlers on screen unmount
      handlersRef.current = {};
    };
  }, []);

  const openVoiceModal = useCallback(() => {
    if (user?.role !== ROLES.INFORMAL_COLLECTOR) {
      return;
    }
    setIsVoiceModalVisible(true);
    setRecognizedTranscript('');
    setParsedIntent(null);
    setConfirmationPrompt(null);
    voiceCommandService.resetState();
  }, [user]);

  const closeVoiceModal = useCallback(() => {
    voiceCommandService.stopListening();
    setIsVoiceModalVisible(false);
    setConfirmationPrompt(null);
  }, []);

  const executeIntent = useCallback(
    async (intentResult: IntentResult) => {
      const handlers = handlersRef.current;
      const { intent, category, requiresConfirmation, targetEntity } = intentResult;

      // ─── 1. Navigation Category ────────────────────────────────────────────────
      if (category === 'NAVIGATION') {
        const routeMap: Record<string, string> = {
          NAVIGATE_DASHBOARD: 'CollectorHome',
          NAVIGATE_REQUESTS: 'CollectorBrowse',
          NAVIGATE_PICKUPS: 'CollectorPickups',
          NAVIGATE_CONSIGNMENTS: 'CollectorConsignments',
          NAVIGATE_RECYCLERS: 'CollectorConsign',
          NAVIGATE_PROFILE: 'CollectorProfile',
        };

        const targetRoute = routeMap[intent];
        if (targetRoute && handlers.onNavigate) {
          handlers.onNavigate(targetRoute);
          voiceService.speak(t('common.done') || 'Opening', { language, priority: 'HIGH' });
          closeVoiceModal();
        }
        return;
      }

      // ─── 2. Read Category ──────────────────────────────────────────────────────
      if (category === 'READ') {
        if (intent === 'READ_AVAILABLE_REQUESTS' && handlers.onReadAvailableRequests) {
          handlers.onReadAvailableRequests();
        } else if (intent === 'READ_MY_PICKUPS' && handlers.onReadMyPickups) {
          handlers.onReadMyPickups();
        } else if (intent === 'READ_MY_CONSIGNMENTS' && handlers.onReadMyConsignments) {
          handlers.onReadMyConsignments();
        } else if (intent === 'READ_COLLECTOR_STATS' && handlers.onReadStats) {
          handlers.onReadStats();
        } else {
          voiceService.speak(t('voice.dashboardSummary') || 'Reading data', {
            language,
            priority: 'HIGH',
          });
        }
        closeVoiceModal();
        return;
      }

      // ─── 3. Workflow Category (Context + Confirmation) ──────────────────────────
      if (category === 'WORKFLOW') {
        // Enforce Selected-Context Model
        if (targetEntity && (!selectedEntity || selectedEntity.type !== targetEntity)) {
          const msg = t('voice.needSelectedEntity') || 'Please select or open an item first.';
          voiceService.speak(msg, { language, priority: 'HIGH' });
          return;
        }

        // Enforce Offline Rule for server-authoritative actions
        if (requiresConfirmation && !isConnected) {
          setSessionState('OFFLINE');
          const msg = t('common.offline') || 'Internet connection required for this action.';
          voiceService.speak(msg, { language, priority: 'HIGH' });
          return;
        }

        // If action requires explicit confirmation
        if (requiresConfirmation) {
          let title = t('common.confirm') || 'Confirm Action';
          let message = 'Are you sure you want to proceed?';

          if (intent === 'WORKFLOW_ACCEPT_REQUEST') {
            title = t('collector.dashboard.acceptConfirmTitle') || 'Accept Request';
            message =
              t('collector.dashboard.acceptConfirmMessage') ||
              'Accept this collection request? You will be responsible for collecting the e-waste.';
          } else if (intent === 'WORKFLOW_START_PICKUP') {
            title = 'Start Pickup';
            message = 'Start this pickup and transition status to IN PROGRESS?';
          } else if (intent === 'WORKFLOW_COMPLETE_PICKUP') {
            title = 'Complete Pickup';
            message = 'Complete this doorstep collection?';
          } else if (intent === 'WORKFLOW_DELIVER_CONSIGNMENT') {
            title = 'Deliver Consignment';
            message = 'Deliver this consignment to the recycling facility?';
          }

          setConfirmationPrompt({
            title,
            message,
            onConfirm: () => {
              setConfirmationPrompt(null);
              closeVoiceModal();
              if (intent === 'WORKFLOW_ACCEPT_REQUEST' && handlers.onAcceptRequest && selectedEntity) {
                handlers.onAcceptRequest(selectedEntity.id);
              } else if (intent === 'WORKFLOW_START_PICKUP' && handlers.onStartPickup && selectedEntity) {
                handlers.onStartPickup(selectedEntity.id);
              } else if (intent === 'WORKFLOW_COMPLETE_PICKUP' && handlers.onCompletePickup && selectedEntity) {
                handlers.onCompletePickup(selectedEntity.id);
              } else if (intent === 'WORKFLOW_DELIVER_CONSIGNMENT' && handlers.onDeliverConsignment && selectedEntity) {
                handlers.onDeliverConsignment(selectedEntity.id);
              }
            },
            onCancel: () => {
              setConfirmationPrompt(null);
            },
          });
          return;
        }

        // Non-destructive workflow opens (e.g. open details)
        if (intent === 'WORKFLOW_OPEN_REQUEST' && handlers.onNavigate && selectedEntity) {
          handlers.onNavigate('RequestDetail');
          closeVoiceModal();
        } else if (intent === 'WORKFLOW_OPEN_PICKUP' && handlers.onNavigate && selectedEntity) {
          handlers.onNavigate('PickupDetail');
          closeVoiceModal();
        } else if (intent === 'WORKFLOW_OPEN_CONSIGNMENT' && handlers.onNavigate && selectedEntity) {
          handlers.onNavigate('CollectorConsignmentStatus');
          closeVoiceModal();
        }
      }
    },
    [selectedEntity, isConnected, language, t, closeVoiceModal]
  );

  const triggerListening = useCallback(async () => {
    if (user?.role !== ROLES.INFORMAL_COLLECTOR) {
      return;
    }
    setConfirmationPrompt(null);
    const result = await voiceCommandService.startVoiceCommandSession(language);
    if (result) {
      setRecognizedTranscript(result.rawTranscript);
      setParsedIntent(result);
      executeIntent(result);
    }
  }, [user, language, executeIntent]);

  const contextValue: CollectorVoiceContextValue = {
    isVoiceModalVisible,
    openVoiceModal,
    closeVoiceModal,
    sessionState,
    recognizedTranscript,
    parsedIntent,
    confirmationPrompt,
    selectedEntity,
    setSelectedEntity,
    registerActions,
    triggerListening,
  };

  return (
    <CollectorVoiceContext.Provider value={contextValue}>
      {children}
    </CollectorVoiceContext.Provider>
  );
};

export const useCollectorVoice = () => {
  const ctx = useContext(CollectorVoiceContext);
  if (!ctx) {
    throw new Error('useCollectorVoice must be used within a CollectorVoiceProvider');
  }
  return ctx;
};
