/**
 * EcoSetu — Eco-Saathi Chat Context & Provider
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * Provides global state and actions for the Eco-Saathi conversational assistant.
 * Purely local, offline-first, and deterministic.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { matchEcoSaathiQuery } from '../services/ecoSaathiMatcher';
import { SaathiCategory, SaathiSafetySensitivity } from '../types/ecoSaathi';
import { networkService } from '../services/networkService';
import { resolveEcoSaathiDynamicIntent } from '../services/ecoSaathiDynamicService';

export interface EcoSaathiMessage {
  id: string;
  sender: 'user' | 'saathi';
  text: string;
  timestamp: number;
  action?: {
    label: string;
    route: string;
    params?: Record<string, string | number | boolean>;
  };
  requiresDynamicData?: boolean;
  dynamicDataResolverKey?: string;
  safetySensitivity?: SaathiSafetySensitivity;
  category?: SaathiCategory;
}

export interface QuickReplyOption {
  id: string;
  label: string;
  query: string;
}

export interface EcoSaathiContextValue {
  isOpen: boolean;
  openChat: (initialRoute?: string) => void;
  closeChat: () => void;
  clearChat: () => void;
  messages: EcoSaathiMessage[];
  sendMessage: (text: string) => void;
  currentRoute: string | null;
  setCurrentRoute: (route: string) => void;
  isOnline: boolean;
  quickReplies: QuickReplyOption[];
}

const EcoSaathiContext = createContext<EcoSaathiContextValue | null>(null);

export const getEcoSaathiGreetingText = (lang: string): string => {
  if (lang === 'or') return '👋 ନମସ୍କାର! ମୁଁ Eco-Saathi। ଆପଣଙ୍କ ଇ-ବର୍ଜ୍ୟ ସଂଗ୍ରହ କାର୍ଯ୍ୟରେ ସାହାଯ୍ୟ କରିବି।';
  if (lang === 'hi') return '👋 नमस्ते! मैं Eco-Saathi हूँ। आपके ई-कचरा संग्रह कार्य में मदद करूँगा।';
  if (lang === 'mr') return '👋 नमस्कार! मी Eco-Saathi आहे. तुमच्या ई-कचरा संग्रह कार्यात मदत करेन.';
  return '👋 Namaste! I am Eco-Saathi. I help you manage pickup requests, offers, and recycling work.';
};

export const EcoSaathiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);
  const [messages, setMessages] = useState<EcoSaathiMessage[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isConnected());

  // Listen to network connectivity
  useEffect(() => {
    const unsub = networkService.addListener((state: { isConnected: boolean }) => {
      setIsOnline(state.isConnected);
    });
    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, []);

  // Compute Initial Greeting message
  const getInitialGreeting = useCallback((): EcoSaathiMessage => {
    const greetingText = getEcoSaathiGreetingText(language || 'or');

    return {
      id: 'msg_welcome_' + Date.now(),
      sender: 'saathi',
      text: greetingText,
      timestamp: Date.now(),
      category: 'GENERAL',
      safetySensitivity: 'STANDARD',
    };
  }, [language]);

  // Reset or initialize conversation
  const clearChat = useCallback(() => {
    setMessages([getInitialGreeting()]);
  }, [getInitialGreeting]);

  // Open chat with route awareness
  const openChat = useCallback((initialRoute?: string) => {
    if (initialRoute) {
      setCurrentRoute(initialRoute);
    }
    setIsOpen(true);
    setMessages((prev) => (prev.length === 0 ? [getInitialGreeting()] : prev));
  }, [getInitialGreeting]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Compute context-aware quick replies
  const quickReplies = useMemo<QuickReplyOption[]>(() => {
    const role = user?.role;
    const route = currentRoute;

    // Route-specific overrides
    if (route === 'CollectorPriceBoard' && role === 'INFORMAL_COLLECTOR') {
      return [
        { id: 'qr_pb_rates', label: t('saathi.intents.todays_price.answer', 'What is today’s price?').slice(0, 30), query: 'What is today’s price?' },
        { id: 'qr_pb_how', label: 'How are prices decided?', query: 'How are prices decided?' },
        { id: 'qr_pb_sell', label: 'How to create a lot?', query: 'How to create a lot?' },
      ];
    }

    if (route === 'CollectorDeals' && role === 'INFORMAL_COLLECTOR') {
      return [
        { id: 'qr_deals_view', label: 'View my active offers', query: 'Show my offers' },
        { id: 'qr_deals_neg', label: 'How to negotiate?', query: 'How to negotiate price?' },
        { id: 'qr_deals_ho', label: 'How handover works', query: 'How does handover work?' },
      ];
    }

    if (route === 'CollectorSafetyCenter') {
      return [
        { id: 'qr_safe_bat', label: 'Swollen battery safety', query: 'How to handle swollen battery?' },
        { id: 'qr_safe_burn', label: 'Why burning is banned', query: 'Can I burn cables for copper?' },
        { id: 'qr_safe_acid', label: 'Acid leaching hazard', query: 'Can I use acid for gold on PCB?' },
        { id: 'qr_safe_ppe', label: 'Recommended PPE gear', query: 'What PPE should I wear?' },
      ];
    }

    // Role-based defaults
    if (role === 'INFORMAL_COLLECTOR') {
      return [
        { id: 'qr_col_sell', label: 'How to sell scrap?', query: 'How to create a lot?' },
        { id: 'qr_col_price', label: 'Check scrap price board', query: 'Where can I see prices?' },
        { id: 'qr_col_offers', label: 'View recycler bids', query: 'Show my offers' },
        { id: 'qr_col_earn', label: 'Check my total earnings', query: 'Where to see total earnings?' },
        { id: 'qr_col_safe', label: 'Battery safety rules', query: 'How to handle swollen battery?' },
      ];
    }

    if (role === 'CITIZEN') {
      return [
        { id: 'qr_cit_give', label: 'How to give e-waste?', query: 'How do I give old phone?' },
        { id: 'qr_cit_stat', label: 'Where is my pickup?', query: 'Where is my pickup?' },
        { id: 'qr_cit_cert', label: 'Green certificate & CO2', query: 'What is green certificate?' },
        { id: 'qr_cit_lang', label: 'Change language', query: 'How to change language?' },
        { id: 'qr_cit_help', label: 'Contact support', query: 'Contact support' },
      ];
    }

    if (role === 'RECYCLER') {
      return [
        { id: 'qr_rec_market', label: 'Browse available scrap', query: 'How to buy ewaste?' },
        { id: 'qr_rec_verif', label: 'Recycler CPCB approval', query: 'How are recyclers verified?' },
        { id: 'qr_rec_ho', label: 'Digital handover code', query: 'How does handover work?' },
        { id: 'qr_rec_pay', label: 'Payment methods', query: 'Payment modes' },
      ];
    }

    // Generic / Admin fallback
    return [
      { id: 'qr_gen_about', label: 'What is EcoSetu?', query: 'What is EcoSetu?' },
      { id: 'qr_gen_price', label: 'Scrap Price Board', query: 'Where can I see prices?' },
      { id: 'qr_gen_ai', label: 'AI Camera capabilities', query: 'What does AI camera detect?' },
      { id: 'qr_gen_safe', label: 'E-Waste safety rules', query: 'Battery safety' },
      { id: 'qr_gen_lang', label: 'Change language', query: 'How to change language?' },
    ];
  }, [user?.role, currentRoute, t]);

  // Send message and process via deterministic matcher
  const sendMessage = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const userMessage: EcoSaathiMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    // Invoke deterministic matcher
    const match = matchEcoSaathiQuery(text, {
      role: user?.role as 'CITIZEN' | 'INFORMAL_COLLECTOR' | 'RECYCLER' | 'ADMIN' | null | undefined,
      language: language as any,
      currentRoute: currentRoute || undefined,
      isAuthenticated,
    });

    let answerText = t(match.responseI18nKey);
    if (!answerText) {
      answerText = match.matched
        ? 'Here is the verified information for your question.'
        : t('saathi.intents.unknown.answer', 'I don’t have a verified answer for that yet. Try asking about scrap prices, creating lots, deals, payments, safety warnings, or language settings.');
    }

    // Ambiguity Clarification Handling
    if (match.isAmbiguous && match.clarificationOptions && match.clarificationOptions.length > 0) {
      let clarificationText = t('saathi.clarification_prompt', 'I found a few related topics. Which one would you like to explore?');
      clarificationText += '\n\n' + match.clarificationOptions.map((opt, idx) => `${idx + 1}. "${opt.query}"`).join('\n');

      const saathiClarificationMsg: EcoSaathiMessage = {
        id: 'msg_saathi_' + (Date.now() + 1),
        sender: 'saathi',
        text: clarificationText,
        timestamp: Date.now() + 1,
        requiresDynamicData: false,
        safetySensitivity: 'STANDARD',
        category: match.category,
      };

      setMessages((prev) => [...prev, userMessage, saathiClarificationMsg]);
      return;
    }

    // Dynamic data resolution
    if (match.requiresDynamicData && match.intentId) {
      setMessages((prev) => [...prev, userMessage]);

      resolveEcoSaathiDynamicIntent(match.intentId, match.dynamicDataResolverKey, {
        userId: user?.id,
        role: user?.role as any,
        language: language as any,
        isAuthenticated,
        isOnline,
        user,
      })
        .then((dynResult) => {
          const dynamicSaathiMessage: EcoSaathiMessage = {
            id: 'msg_saathi_' + Date.now(),
            sender: 'saathi',
            text: dynResult.message,
            timestamp: dynResult.timestamp || Date.now(),
            requiresDynamicData: true,
            dynamicDataResolverKey: match.dynamicDataResolverKey,
            safetySensitivity: match.safetySensitivity,
            category: match.category,
            action: dynResult.action
              ? {
                  label: t(dynResult.action.actionLabelI18nKey, 'Open Screen'),
                  route: dynResult.action.targetRoute,
                  params: dynResult.action.params,
                }
              : match.suggestedAction
              ? {
                  label: t(match.suggestedAction.actionLabelI18nKey, 'Open Screen'),
                  route: match.suggestedAction.targetRoute,
                  params: match.suggestedAction.params,
                }
              : undefined,
          };
          setMessages((prev) => [...prev, dynamicSaathiMessage]);
        })
        .catch(() => {
          const fallbackMsg: EcoSaathiMessage = {
            id: 'msg_saathi_' + Date.now(),
            sender: 'saathi',
            text: answerText,
            timestamp: Date.now(),
            requiresDynamicData: true,
            safetySensitivity: match.safetySensitivity,
            category: match.category,
          };
          setMessages((prev) => [...prev, fallbackMsg]);
        });
      return;
    }

    // Static intent resolution
    const saathiMessage: EcoSaathiMessage = {
      id: 'msg_saathi_' + (Date.now() + 1),
      sender: 'saathi',
      text: answerText,
      timestamp: Date.now() + 1,
      requiresDynamicData: false,
      dynamicDataResolverKey: match.dynamicDataResolverKey,
      safetySensitivity: match.safetySensitivity,
      category: match.category,
      action: match.suggestedAction
        ? {
            label: t(match.suggestedAction.actionLabelI18nKey, 'Open Screen'),
            route: match.suggestedAction.targetRoute,
            params: match.suggestedAction.params,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMessage, saathiMessage]);
  }, [user, language, currentRoute, isAuthenticated, isOnline, t]);

  return (
    <EcoSaathiContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        clearChat,
        messages,
        sendMessage,
        currentRoute,
        setCurrentRoute,
        isOnline,
        quickReplies,
      }}
    >
      {children}
    </EcoSaathiContext.Provider>
  );
};

export const useEcoSaathi = (): EcoSaathiContextValue => {
  const context = useContext(EcoSaathiContext);
  if (!context) {
    throw new Error('useEcoSaathi must be used within an EcoSaathiProvider');
  }
  return context;
};
