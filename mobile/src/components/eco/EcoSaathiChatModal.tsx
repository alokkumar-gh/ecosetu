/**
 * EcoSetu — Eco-Saathi In-App Interactive Chat Modal
 *
 * COMPLETE REDESIGN — Collector-First Conversational Assistant
 *
 * Design Philosophy:
 * - Human, warm, approachable — NOT a ChatGPT clone
 * - Voice-first: microphone is the primary input control
 * - No hardcoded fixed widths/heights — fully responsive flex layout
 * - Low-literacy friendly: large targets, short labels, visual icons
 * - Vernacular-first: Odia / Hindi / Hinglish / Marathi / English
 * - Contextual home state with real collector quick-actions
 * - Structured "thinking" state (not generic spinner)
 * - TTS playback with sanitized text (no markdown in speech)
 *
 * Architecture:
 * - EcoSaathiModal (root, safe-area, keyboard-aware)
 *   ├─ EcoSaathiHeader (identity, voice-toggle, close)
 *   ├─ EcoSaathiLangBar (language selector pills)
 *   ├─ EcoSaathiStatusBanner (listening / offline banners)
 *   ├─ EcoSaathiConversation (flex-grow FlatList)
 *   │    ├─ SaathiHomeState (empty conversation welcome)
 *   │    ├─ SaathiMessage (assistant bubble + TTS button)
 *   │    ├─ UserMessage (collector bubble)
 *   │    ├─ SaathiTypingIndicator (thinking state)
 *   │    └─ QuickActionGrid (context-aware suggestion grid)
 *   └─ EcoSaathiComposer (voice mic + text input + send)
 *
 * Preserved without modification:
 * - EcoSaathiContext (messages, sendMessage, quickReplies, etc.)
 * - voiceService (TTS via Bhashini / native fallback)
 * - voiceRecordingService (mic capture)
 * - bhashiniClientService (ASR transcription)
 * - All confirmation / security workflows
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { useEcoSaathi, EcoSaathiMessage, QuickReplyOption, getEcoSaathiGreetingText } from '../../context/EcoSaathiContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { navigateSafely } from '../../navigation/navigationRef';
import { voiceService } from '../../services/voiceService';
import { bhashiniClientService } from '../../services/bhashiniClientService';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import { AppIcon } from '../ui/AppIcon';

// ─── Text Sanitisation ────────────────────────────────────────────────────────

/**
 * Strip emojis and markdown artifacts before passing text to TTS.
 * Markdown must NEVER reach the speech synthesiser.
 */
const sanitizeTextForSpeech = (text: string): string =>
  text
    .replace(
      /[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .replace(/[*_#`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ─── Voice State ──────────────────────────────────────────────────────────────

export type VoiceState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'STARTING_RECORDING'
  | 'LISTENING'
  | 'STOPPING_RECORDING'
  | 'UPLOADING'
  | 'DETECTING_LANGUAGE'
  | 'TRANSCRIBING'
  | 'RECOGNIZED'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ERROR';

const MAX_RECORDING_DURATION_MS = 10000;
const HARD_SAFETY_TIMEOUT_MS = 25000;

// ─── Language Configuration ───────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'or', label: 'ଓଡ଼ିଆ', fullLabel: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'hi', label: 'हिन्दी', fullLabel: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी', fullLabel: 'मराठी (Marathi)' },
  { code: 'en', label: 'EN', fullLabel: 'English' },
] as const;

type LangCode = 'or' | 'hi' | 'mr' | 'en';

/** Minimal localised copy — UI labels only, not content */
const getCopy = (lang: LangCode) => ({
  subtitle:
    lang === 'or'
      ? 'ଆପଣଙ୍କ ସ୍ୱର ସହାୟକ'
      : lang === 'hi'
      ? 'आपका संग्रह साथी'
      : lang === 'mr'
      ? 'तुमचा संग्रह साथी'
      : 'Your collection companion',
  voiceOn:
    lang === 'or' ? 'ସ୍ୱର: ଚାଲୁ' : lang === 'hi' ? 'आवाज़: चालू' : lang === 'mr' ? 'आवाज: चालू' : 'Voice: ON',
  voiceOff:
    lang === 'or' ? 'ସ୍ୱର: ବନ୍ଦ' : lang === 'hi' ? 'आवाज़: बंद' : lang === 'mr' ? 'आवाज: बंद' : 'Voice: OFF',
  newChat:
    lang === 'or' ? 'ନୂଆ' : lang === 'hi' ? 'नया' : lang === 'mr' ? 'नवीन' : 'New',
  listening:
    lang === 'or'
      ? 'ଶୁଣୁଛି...'
      : lang === 'hi'
      ? 'सुन रहा हूँ...'
      : lang === 'mr'
      ? 'ऐकत आहे...'
      : 'Listening...',
  transcribing:
    lang === 'or'
      ? 'ସ୍ୱର ବୁଝୁଛି...'
      : lang === 'hi'
      ? 'आवाज़ समझ रहा हूँ...'
      : lang === 'mr'
      ? 'आवाज समजून घेत आहे...'
      : 'Understanding your voice...',
  thinking:
    lang === 'or'
      ? 'Eco-Saathi ଭାବୁଛି...'
      : lang === 'hi'
      ? 'Eco-Saathi सोच रहा है...'
      : lang === 'mr'
      ? 'Eco-Saathi विचार करत आहे...'
      : 'Eco-Saathi is thinking…',
  speaking:
    lang === 'or'
      ? 'ବୋଲୁଛି...'
      : lang === 'hi'
      ? 'बोल रहा है...'
      : lang === 'mr'
      ? 'बोलत आहे...'
      : 'Speaking…',
  placeholder:
    lang === 'or'
      ? 'ବୋଲନ୍ତୁ ବା ଟାଇପ୍ କରନ୍ତୁ...'
      : lang === 'hi'
      ? 'बोलें या टाइप करें...'
      : lang === 'mr'
      ? 'बोला किंवा टाइप करा...'
      : 'Speak or type here…',
  listenBtn:
    lang === 'or' ? 'ଶୁଣନ୍ତୁ' : lang === 'hi' ? 'सुनें' : lang === 'mr' ? 'ऐका' : 'Listen',
  stopBtn:
    lang === 'or' ? 'ଥାଆନ୍ତୁ' : lang === 'hi' ? 'रोकें' : lang === 'mr' ? 'थांबवा' : 'Stop',
  hazardAlert:
    lang === 'or'
      ? 'ସୁରକ୍ଷା ଚେତାବନୀ'
      : lang === 'hi'
      ? 'सुरक्षा चेतावनी'
      : lang === 'mr'
      ? 'सुरक्षा सूचना'
      : 'SAFETY NOTICE',
  offline:
    lang === 'or'
      ? 'ଅଫଲାଇନ୍ — ସ୍ୱର ସହାୟତା ଉପଲବ୍ଧ'
      : lang === 'hi'
      ? 'ऑफ़लाइन — आवाज़ सहायता उपलब्ध'
      : lang === 'mr'
      ? 'ऑफलाइन — आवाज मदत उपलब्ध'
      : 'Offline — Voice assistant available',
  permissionTitle:
    lang === 'or'
      ? 'ମାଇକ୍ ବ୍ୟବହାର'
      : lang === 'hi'
      ? 'माइक्रोफ़ोन'
      : lang === 'mr'
      ? 'मायक्रोफोन'
      : 'Microphone',
  permissionBody:
    lang === 'or'
      ? 'ଟାଇପ୍ ନ କରି ନିଜ ଭାଷାରେ Eco-Saathi କୁ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ।'
      : lang === 'hi'
      ? 'टाइप किए बिना अपनी भाषा में Eco-Saathi से बात करें।'
      : lang === 'mr'
      ? 'टाइप न करता आपल्या भाषेत Eco-Saathi शी बोला.'
      : 'Ask Eco-Saathi questions in your language without typing.',
  permissionAllow:
    lang === 'or' ? 'ଅନୁମତି ଦିଅନ୍ତୁ' : lang === 'hi' ? 'अनुमति दें' : lang === 'mr' ? 'परवानगी द्या' : 'Allow',
  permissionType:
    lang === 'or' ? 'ଟାଇପ୍ କରିବି' : lang === 'hi' ? 'टाइप करूँगा' : lang === 'mr' ? 'टाइप करेन' : 'Type instead',
  tapToSpeak:
    lang === 'or' ? 'ବୋଲିବାକୁ ଦବାନ୍ତୁ' : lang === 'hi' ? 'बोलने के लिए दबाएं' : lang === 'mr' ? 'बोलण्यासाठी दाबा' : 'Tap to speak',
  send:
    lang === 'or' ? 'ପଠାନ୍ତୁ' : lang === 'hi' ? 'भेजें' : lang === 'mr' ? 'पाठवा' : 'Send',
  retryVoice:
    lang === 'or' ? 'ପୁଣି ଚେଷ୍ଟା' : lang === 'hi' ? 'फिर कोशिश' : lang === 'mr' ? 'पुन्हा प्रयत्न' : 'Try again',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pulsing recording dot animation */
const RecordingPulse = memo(() => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]}
    />
  );
});
RecordingPulse.displayName = 'RecordingPulse';

/** Animated typing dots (three dots bouncing) */
const TypingDots = memo(() => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingDotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
});
TypingDots.displayName = 'TypingDots';

/** Saathi thinking indicator bubble */
const SaathiTypingIndicator = memo(({ label }: { label: string }) => (
  <View style={styles.messageRow}>
    <View style={styles.saathiAvatarMini}>
      <Text style={styles.avatarEmoji}>🌱</Text>
    </View>
    <View style={[styles.messageBubble, styles.bubbleSaathi, styles.typingBubble]}>
      <TypingDots />
      <Text style={styles.typingLabel}>{label}</Text>
    </View>
  </View>
));
SaathiTypingIndicator.displayName = 'SaathiTypingIndicator';

/** Quick action button for home/contextual state */
interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
}
const QuickActionChip = memo(({ icon, label, onPress }: QuickActionProps) => (
  <TouchableOpacity
    style={styles.quickActionChip}
    onPress={onPress}
    activeOpacity={0.78}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Text style={styles.quickActionIcon}>{icon}</Text>
    <Text style={styles.quickActionLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
));
QuickActionChip.displayName = 'QuickActionChip';

/** Home / empty conversation state with contextual welcome */
interface HomeStateProps {
  quickReplies: QuickReplyOption[];
  onQuickReply: (qr: QuickReplyOption) => void;
  lang: LangCode;
}
const SaathiHomeState = memo(({ quickReplies, onQuickReply, lang }: HomeStateProps) => {
  const fullGreetingText = getEcoSaathiGreetingText(lang);

  const prompts: Record<LangCode, string> = {
    or: 'ଆଜି କ\'ଣ ଦେଖିବା?',
    hi: 'आज क्या देखना है?',
    mr: 'आज काय पहायचे आहे?',
    en: 'What would you like to see today?',
  };

  const promptText = prompts[lang];

  // Map quick replies to icon hints
  const getIcon = (label: string): string => {
    const l = label.toLowerCase();
    if (l.includes('request') || l.includes('scrap') || l.includes('lot')) return '📦';
    if (l.includes('price') || l.includes('rate') || l.includes('price')) return '💰';
    if (l.includes('offer') || l.includes('bid')) return '🤝';
    if (l.includes('earn') || l.includes('wallet') || l.includes('pay')) return '💵';
    if (l.includes('pickup') || l.includes('delivery')) return '🚚';
    if (l.includes('negoti')) return '💬';
    if (l.includes('safety') || l.includes('battery') || l.includes('सुरक्षा')) return '⚠️';
    if (l.includes('help') || l.includes('contact')) return '❓';
    if (l.includes('language') || l.includes('भाषा')) return '🌐';
    if (l.includes('certificate') || l.includes('co2')) return '🏆';
    return '✨';
  };

  return (
    <View style={styles.homeState}>
      {/* Greeting bubble */}
      <View style={styles.homeGreetingRow}>
        <View style={styles.homeAvatar}>
          <Text style={styles.homeAvatarEmoji}>🌱</Text>
        </View>
        <View style={styles.homeGreetingBubble}>
          <Text style={styles.homeIntro}>{fullGreetingText}</Text>
        </View>
      </View>

      {/* Contextual prompt */}
      {quickReplies.length > 0 && (
        <View style={styles.homePromptSection}>
          <Text style={styles.homePromptLabel}>{promptText}</Text>
          <View style={styles.quickActionGrid}>
            {quickReplies.slice(0, 6).map((qr) => (
              <QuickActionChip
                key={qr.id}
                icon={getIcon(qr.label)}
                label={qr.label}
                onPress={() => onQuickReply(qr)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
});
SaathiHomeState.displayName = 'SaathiHomeState';

/** Individual message: Saathi (assistant) */
interface SaathiMessageProps {
  item: EcoSaathiMessage;
  isPlaying: boolean;
  copy: ReturnType<typeof getCopy>;
  onPlay: () => void;
  onAction: (action: NonNullable<EcoSaathiMessage['action']>) => void;
}
const SaathiMessage = memo(({ item, isPlaying, copy, onPlay, onAction }: SaathiMessageProps) => (
  <View
    style={styles.messageRow}
    accessibilityRole="text"
    accessibilityLabel={`Eco-Saathi: ${item.text}`}
  >
    <View style={styles.saathiAvatarMini}>
      <Text style={styles.avatarEmoji}>🌱</Text>
    </View>

    <View style={[
      styles.messageBubble,
      styles.bubbleSaathi,
      item.safetySensitivity === 'HAZARD_CRITICAL' && styles.bubbleHazard,
    ]}>
      {/* Safety badge */}
      {item.safetySensitivity === 'HAZARD_CRITICAL' && (
        <View style={styles.hazardBadge}>
          <Text style={styles.hazardBadgeText}>⚠️ {copy.hazardAlert}</Text>
        </View>
      )}

      <Text style={[styles.messageText, styles.textSaathi]}>{item.text}</Text>

      {/* TTS button */}
      <TouchableOpacity
        style={[styles.ttsButton, isPlaying && styles.ttsButtonPlaying]}
        onPress={onPlay}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? copy.stopBtn : copy.listenBtn}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.ttsButtonIcon}>{isPlaying ? '⏹' : '🔊'}</Text>
        <Text style={[styles.ttsButtonText, isPlaying && styles.ttsButtonTextPlaying]}>
          {isPlaying ? copy.stopBtn : copy.listenBtn}
        </Text>
      </TouchableOpacity>

      {/* Navigation action */}
      {item.action && (
        <TouchableOpacity
          style={styles.actionChip}
          onPress={() => onAction(item.action!)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Go to: ${item.action.label}`}
        >
          <Text style={styles.actionChipText}>↗ {item.action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
));
SaathiMessage.displayName = 'SaathiMessage';

/** Individual message: User (collector) */
const UserMessage = memo(({ item }: { item: EcoSaathiMessage }) => (
  <View
    style={[styles.messageRow, styles.messageRowUser]}
    accessibilityRole="text"
    accessibilityLabel={`You: ${item.text}`}
  >
    <View style={[styles.messageBubble, styles.bubbleUser]}>
      <Text style={[styles.messageText, styles.textUser]}>{item.text}</Text>
    </View>
  </View>
));
UserMessage.displayName = 'UserMessage';

// ─── Main Modal Component ─────────────────────────────────────────────────────

export const EcoSaathiChatModal: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage } = useI18n();
  const activeLang = (language || 'or') as LangCode;

  const {
    isOpen,
    closeChat,
    clearChat,
    messages,
    sendMessage,
    isOnline,
    quickReplies,
  } = useEcoSaathi();

  // ── Local state ──
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [selectedLang, setSelectedLang] = useState<LangCode>(activeLang);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // ── Refs ──
  const flatListRef = useRef<FlatList>(null);
  const lastSpokenMsgIdRef = useRef<string | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hardSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const inputRef = useRef<TextInput>(null);

  // ── Derived ──
  const copy = getCopy(selectedLang);
  const isRecording = voiceState === 'LISTENING';
  const isVoiceBusy =
    voiceState === 'TRANSCRIBING' ||
    voiceState === 'UPLOADING' ||
    voiceState === 'STOPPING_RECORDING' ||
    voiceState === 'STARTING_RECORDING';
  const showThinking = isThinking || voiceState === 'PROCESSING';

  // ── Sync language ──
  useEffect(() => {
    if (language) setSelectedLang(language as LangCode);
  }, [language]);

  // ── Cleanup timers on unmount ──
  useEffect(() => () => clearTimers(), []);

  // ── Auto-scroll on new message ──
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages]);

  // ── Auto-TTS for Saathi responses ──
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (
      last.sender === 'saathi' &&
      last.id !== lastSpokenMsgIdRef.current &&
      isVoiceOutputEnabled
    ) {
      lastSpokenMsgIdRef.current = last.id;
      const clean = sanitizeTextForSpeech(last.text);
      setPlayingMessageId(last.id);
      setVoiceState('SPEAKING');
      voiceService
        .speak(clean, { force: true, language: selectedLang })
        .finally(() => {
          setPlayingMessageId(null);
          if (voiceState === 'SPEAKING') setVoiceState('IDLE');
        });
    }
  }, [messages, isVoiceOutputEnabled, selectedLang]);

  // ── Stop thinking indicator when saathi responds ──
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender === 'saathi') {
      setIsThinking(false);
    }
  }, [messages]);

  if (!isOpen || !isAuthenticated || !user) return null;

  // ── Handlers ──

  const clearTimers = () => {
    if (recordingTimerRef.current) { clearTimeout(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (hardSafetyTimerRef.current) { clearTimeout(hardSafetyTimerRef.current); hardSafetyTimerRef.current = null; }
  };

  const handleClose = () => {
    clearTimers();
    voiceService.stop();
    setPlayingMessageId(null);
    if (isRecording) voiceRecordingService.cancelRecording();
    setVoiceState('IDLE');
    setSpeechStatus(null);
    setIsThinking(false);
    closeChat();
  };

  const handleNewChat = () => {
    clearTimers();
    voiceService.stop();
    setPlayingMessageId(null);
    setVoiceState('IDLE');
    setSpeechStatus(null);
    setIsThinking(false);
    setInputText('');
    inputRef.current?.blur();
    clearChat();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setIsThinking(true);
    sendMessage(text);
  };

  const handleQuickReply = (qr: QuickReplyOption) => {
    setIsThinking(true);
    sendMessage(qr.query);
  };

  const handleAction = (action: NonNullable<EcoSaathiMessage['action']>) => {
    handleClose();
    setTimeout(() => navigateSafely(action.route, action.params), 200);
  };

  const handlePlayMessage = async (msg: EcoSaathiMessage) => {
    if (playingMessageId === msg.id) {
      await voiceService.stop();
      setPlayingMessageId(null);
      return;
    }
    await voiceService.stop();
    setPlayingMessageId(msg.id);
    const clean = sanitizeTextForSpeech(msg.text);
    try {
      await voiceService.speak(clean, { force: true, language: activeLang });
    } finally {
      setPlayingMessageId(null);
    }
  };

  const handleMicPress = async () => {
    if (isRecording) { handleStopRecording(); return; }
    if (voiceState !== 'IDLE' && voiceState !== 'ERROR' && voiceState !== 'SPEAKING') return;

    voiceService.stop();
    setPlayingMessageId(null);

    setVoiceState('REQUESTING_PERMISSION');
    const hasPermission = await voiceRecordingService.requestMicrophonePermission();
    if (!hasPermission) {
      setVoiceState('IDLE');
      setShowPermissionModal(true);
      return;
    }
    startRecording();
  };

  const startRecording = async () => {
    clearTimers();
    setVoiceState('STARTING_RECORDING');
    setSpeechStatus(copy.listening);

    const started = await voiceRecordingService.startRecording();
    if (!started) {
      setVoiceState('ERROR');
      setSpeechStatus('Microphone not available.');
      setTimeout(() => { setVoiceState('IDLE'); setSpeechStatus(null); }, 3000);
      return;
    }

    recordingStartTimeRef.current = Date.now();
    setVoiceState('LISTENING');

    recordingTimerRef.current = setTimeout(() => {
      if (voiceState === 'LISTENING') handleStopRecording();
    }, MAX_RECORDING_DURATION_MS);

    hardSafetyTimerRef.current = setTimeout(() => {
      clearTimers();
      voiceRecordingService.cancelRecording();
      setVoiceState('IDLE');
      setSpeechStatus(copy.retryVoice);
      setTimeout(() => setSpeechStatus(null), 2500);
    }, HARD_SAFETY_TIMEOUT_MS);
  };

  const handleStopRecording = async () => {
    clearTimers();
    if (voiceState !== 'LISTENING') return;

    setVoiceState('STOPPING_RECORDING');
    setSpeechStatus(copy.transcribing);

    try {
      const recording = await voiceRecordingService.stopRecording();

      if (!recording?.audioBase64 || recording.audioBase64.trim().length < 50) {
        setVoiceState('ERROR');
        setSpeechStatus(copy.retryVoice);
        setTimeout(() => { setVoiceState('IDLE'); setSpeechStatus(null); }, 2500);
        return;
      }

      setVoiceState('TRANSCRIBING');
      const targetLang = selectedLang || activeLang || 'or';

      const asrResult = await bhashiniClientService.transcribe(
        recording.audioBase64,
        targetLang,
        { audioFormat: 'wav', samplingRate: 16000 }
      );

      if (asrResult?.transcript?.trim()) {
        const transcript = asrResult.transcript.trim();
        setVoiceState('RECOGNIZED');
        setInputText(transcript);
        setSpeechStatus(null);
        setIsThinking(true);
        sendMessage(transcript);
        setTimeout(() => setVoiceState('IDLE'), 1200);
      } else {
        setVoiceState('ERROR');
        setSpeechStatus(copy.retryVoice);
        setTimeout(() => { setVoiceState('IDLE'); setSpeechStatus(null); }, 2500);
      }
    } catch {
      setVoiceState('ERROR');
      setSpeechStatus(copy.retryVoice);
      setTimeout(() => { setVoiceState('IDLE'); setSpeechStatus(null); }, 3000);
    } finally {
      clearTimers();
    }
  };

  const handleGrantPermission = async () => {
    setShowPermissionModal(false);
    setVoiceState('REQUESTING_PERMISSION');
    const granted = await voiceRecordingService.requestMicrophonePermission();
    if (granted) {
      startRecording();
    } else {
      setVoiceState('IDLE');
      setSpeechStatus('Microphone permission required for voice input.');
      setTimeout(() => setSpeechStatus(null), 2500);
    }
  };

  const handleLangChange = (code: LangCode) => {
    setSelectedLang(code);
    if (code !== activeLang) setLanguage(code as any);
  };

  // ── Render helpers ──

  const isConversationEmpty = messages.length === 0 ||
    (messages.length === 1 && messages[0].sender === 'saathi');

  const displayMessages = isConversationEmpty ? [] : messages;

  const renderMessageItem = ({ item }: { item: EcoSaathiMessage }) => {
    if (item.sender === 'user') {
      return <UserMessage item={item} />;
    }
    return (
      <SaathiMessage
        item={item}
        isPlaying={playingMessageId === item.id}
        copy={copy}
        onPlay={() => handlePlayMessage(item)}
        onAction={handleAction}
      />
    );
  };

  const renderListHeader = () => {
    if (isConversationEmpty) {
      return (
        <SaathiHomeState
          quickReplies={quickReplies}
          onQuickReply={handleQuickReply}
          lang={selectedLang}
        />
      );
    }
    return null;
  };

  const renderListFooter = () => {
    if (showThinking) {
      return <SaathiTypingIndicator label={copy.thinking} />;
    }
    return null;
  };

  // ── Mic button style ──
  const micBtnStyle = [
    styles.micButton,
    isRecording && styles.micButtonRecording,
    isVoiceBusy && styles.micButtonBusy,
    voiceState === 'SPEAKING' && styles.micButtonSpeaking,
  ];

  const micIcon = isRecording ? '⏹' : isVoiceBusy ? '' : '🎙️';
  const micLabel = isRecording ? copy.stopBtn : copy.tapToSpeak;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#02080D" />

        {/* ── Microphone Permission Dialog ── */}
        <Modal
          visible={showPermissionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPermissionModal(false)}
        >
          <View style={styles.permissionOverlay}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconWrap}>
                <Text style={styles.permissionIcon}>🎙️</Text>
              </View>
              <Text style={styles.permissionTitle}>{copy.permissionTitle}</Text>
              <Text style={styles.permissionBody}>{copy.permissionBody}</Text>
              <View style={styles.permissionActions}>
                <TouchableOpacity
                  style={styles.permissionSecondaryBtn}
                  onPress={() => setShowPermissionModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={copy.permissionType}
                >
                  <Text style={styles.permissionSecondaryText}>{copy.permissionType}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.permissionPrimaryBtn}
                  onPress={handleGrantPermission}
                  accessibilityRole="button"
                  accessibilityLabel={copy.permissionAllow}
                >
                  <Text style={styles.permissionPrimaryText}>{copy.permissionAllow}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Main Layout ── */}
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarMainEmoji}>🌱</Text>
                <View style={styles.onlineDot} />
              </View>

              {/* Identity */}
              <View style={styles.headerIdentity}>
                <Text style={styles.headerTitle}>Eco-Saathi</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {copy.subtitle}
                </Text>
              </View>
            </View>

            {/* Header actions */}
            <View style={styles.headerRight}>
              {/* Voice readout toggle */}
              <TouchableOpacity
                style={[
                  styles.headerActionBtn,
                  isVoiceOutputEnabled ? styles.headerActionBtnActive : styles.headerActionBtnMuted,
                ]}
                onPress={() => {
                  const next = !isVoiceOutputEnabled;
                  setIsVoiceOutputEnabled(next);
                  if (!next) { voiceService.stop(); setPlayingMessageId(null); }
                }}
                accessibilityRole="button"
                accessibilityLabel={isVoiceOutputEnabled ? copy.voiceOn : copy.voiceOff}
              >
                <Text style={styles.headerActionIcon}>
                  {isVoiceOutputEnabled ? '🔊' : '🔇'}
                </Text>
                <Text style={[
                  styles.headerActionText,
                  !isVoiceOutputEnabled && styles.headerActionTextMuted,
                ]}>
                  {isVoiceOutputEnabled ? copy.voiceOn : copy.voiceOff}
                </Text>
              </TouchableOpacity>

              {/* New chat */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleNewChat}
                accessibilityRole="button"
                accessibilityLabel="Start new conversation"
              >
                <Text style={styles.headerIconBtnText}>🔄</Text>
              </TouchableOpacity>

              {/* Close */}
              <TouchableOpacity
                style={[styles.headerIconBtn, styles.closeBtn]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close Eco-Saathi"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Language Selector ── */}
          <View style={styles.langBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langBarContent}
            >
              {LANGUAGES.map((l) => {
                const active = selectedLang === l.code;
                return (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.langPill, active && styles.langPillActive]}
                    onPress={() => handleLangChange(l.code as LangCode)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${l.fullLabel}`}
                  >
                    <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Listening / Status Banner ── */}
          {(isRecording || isVoiceBusy || speechStatus) && (
            <View
              style={[
                styles.statusBanner,
                isRecording && styles.statusBannerRecording,
                voiceState === 'ERROR' && styles.statusBannerError,
              ]}
            >
              {isRecording ? (
                <RecordingPulse />
              ) : (
                <View style={styles.statusDot} />
              )}
              <Text style={styles.statusBannerText} numberOfLines={1}>
                {speechStatus ||
                  (isRecording ? copy.listening : copy.transcribing)}
              </Text>
              {isRecording && (
                <TouchableOpacity
                  style={styles.stopPill}
                  onPress={handleStopRecording}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.stopBtn}
                >
                  <Text style={styles.stopPillText}>⏹ {copy.stopBtn}</Text>
                </TouchableOpacity>
              )}
              {isVoiceBusy && (
                <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 4 }} />
              )}
            </View>
          )}

          {/* ── Offline Banner ── */}
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>🚫 {copy.offline}</Text>
            </View>
          )}

          {/* ── Conversation ── */}
          <FlatList
            ref={flatListRef}
            style={styles.conversationList}
            data={displayMessages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.conversationContent}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          {/* ── Quick Replies Tray (after conversation starts) ── */}
          {!isConversationEmpty && quickReplies.length > 0 && (
            <View style={styles.quickRepliesTray}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRepliesTrayContent}
              >
                {quickReplies.map((qr) => (
                  <TouchableOpacity
                    key={qr.id}
                    style={styles.quickReplyPill}
                    onPress={() => handleQuickReply(qr)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={qr.label}
                  >
                    <Text style={styles.quickReplyPillText}>{qr.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Composer ── */}
          <View style={styles.composer}>
            {/* Mic button — prominent, voice-first */}
            <TouchableOpacity
              style={micBtnStyle}
              onPress={handleMicPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={micLabel}
              accessibilityHint="Tap to speak your question to Eco-Saathi"
            >
              {isVoiceBusy ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={styles.micIcon}>{micIcon}</Text>
              )}
            </TouchableOpacity>

            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={[styles.textInput, isRecording && styles.textInputListening]}
              placeholder={isRecording ? copy.listening : copy.placeholder}
              placeholderTextColor={isRecording ? '#10B981' : '#64748B'}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              onFocus={() => {
                if (voiceState === 'SPEAKING') {
                  voiceService.stop();
                  setPlayingMessageId(null);
                  setVoiceState('IDLE');
                }
              }}
              returnKeyType="send"
              editable={!isRecording && voiceState !== 'TRANSCRIBING' && voiceState !== 'UPLOADING'}
              accessibilityLabel="Type your message"
              multiline={false}
            />

            {/* Send button */}
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={copy.send}
            >
              <Text style={[styles.sendIcon, !inputText.trim() && styles.sendIconDisabled]}>
                📤
              </Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
//
// CRITICAL: No hardcoded modal width/height.
// All sizing uses flex, min/max constraints, or content-driven sizing.
// The modal fills the full native SafeAreaView on every screen size.

const styles = StyleSheet.create({
  // ── Foundation ──────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: '#02080D',
  },
  container: {
    flex: 1,
    backgroundColor: '#03080F',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#041218',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  avatarMainEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#02080D',
  },
  headerIdentity: {
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 36,
  },
  headerActionBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  headerActionBtnMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerActionIcon: {
    fontSize: 13,
  },
  headerActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  headerActionTextMuted: {
    color: '#64748B',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconBtnText: {
    fontSize: 14,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '700',
  },

  // ── Language Bar ─────────────────────────────────────────────────────────────
  langBar: {
    backgroundColor: '#030E14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  langBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    minHeight: 30,
    justifyContent: 'center',
  },
  langPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  langPillTextActive: {
    color: '#6EE7B7',
    fontWeight: '800',
  },

  // ── Status Banner ────────────────────────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#071C22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    gap: 8,
  },
  statusBannerRecording: {
    backgroundColor: 'rgba(6, 78, 59, 0.90)',
    borderBottomColor: '#10B981',
  },
  statusBannerError: {
    backgroundColor: 'rgba(100, 20, 20, 0.80)',
    borderBottomColor: '#EF4444',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    flexShrink: 0,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    flexShrink: 0,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  stopPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    flexShrink: 0,
  },
  stopPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Offline Banner ───────────────────────────────────────────────────────────
  offlineBanner: {
    backgroundColor: 'rgba(120, 80, 0, 0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.30)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FDE68A',
  },

  // ── Conversation ─────────────────────────────────────────────────────────────
  conversationList: {
    flex: 1,
  },
  conversationContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    flexGrow: 1,
  },

  // ── Home State ───────────────────────────────────────────────────────────────
  homeState: {
    paddingBottom: 4,
  },
  homeGreetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  homeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  homeAvatarEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  homeGreetingBubble: {
    flex: 1,
    backgroundColor: '#071E26',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    padding: 14,
    gap: 6,
  },
  homeHello: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  homeIntro: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CBD5E1',
    lineHeight: 20,
  },
  homePromptSection: {
    gap: 12,
    paddingHorizontal: 2,
  },
  homePromptLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // ── Quick Action Chip ─────────────────────────────────────────────────────────
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#071E26',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    // Allow chips to grow but not overflow on very narrow screens
    minWidth: '44%',
    flexGrow: 1,
    flexBasis: '44%',
    maxWidth: '100%',
    minHeight: 52,
  },
  quickActionIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  quickActionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#A7F3D0',
    lineHeight: 18,
  },

  // ── Message Rows ──────────────────────────────────────────────────────────────
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 2,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  saathiAvatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  avatarEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageBubble: {
    // No hardcoded maxWidth — use flex constraints
    flexShrink: 1,
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  bubbleSaathi: {
    backgroundColor: '#071E26',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleHazard: {
    backgroundColor: 'rgba(50, 10, 15, 0.96)',
    borderColor: '#EF4444',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textSaathi: {
    color: '#F1F5F9',
    fontWeight: '400',
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // ── Hazard Badge ──────────────────────────────────────────────────────────────
  hazardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  hazardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.2,
  },

  // ── TTS Button ────────────────────────────────────────────────────────────────
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    minHeight: 30,
  },
  ttsButtonPlaying: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: '#EF4444',
  },
  ttsButtonIcon: {
    fontSize: 13,
  },
  ttsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  ttsButtonTextPlaying: {
    color: '#F87171',
  },

  // ── Action Chip ───────────────────────────────────────────────────────────────
  actionChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1.2,
    borderColor: '#10B981',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6EE7B7',
  },

  // ── Typing Indicator ──────────────────────────────────────────────────────────
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 16,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  typingLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    fontStyle: 'italic',
    flexShrink: 1,
  },

  // ── Quick Replies Tray ────────────────────────────────────────────────────────
  quickRepliesTray: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#03080F',
  },
  quickRepliesTrayContent: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  quickReplyPill: {
    backgroundColor: '#071E26',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  quickReplyPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A7F3D0',
  },

  // ── Composer ─────────────────────────────────────────────────────────────────
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#041218',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    // Voice is the primary affordance — give it visual weight
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  micButtonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  micButtonBusy: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  micButtonSpeaking: {
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: '#06B6D4',
    shadowColor: '#06B6D4',
  },
  micIcon: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    // No hardcoded height — use minHeight and let content expand if needed
    minHeight: 48,
    maxHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  textInputListening: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  sendIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  sendIconDisabled: {
    opacity: 0.4,
  },

  // ── Permission Modal ──────────────────────────────────────────────────────────
  permissionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#071E26',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  permissionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  permissionIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  permissionSecondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  permissionPrimaryBtn: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#02080D',
  },
});

export default EcoSaathiChatModal;
