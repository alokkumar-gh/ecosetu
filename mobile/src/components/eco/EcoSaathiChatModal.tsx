/**
 * EcoSetu — Eco-Saathi In-App Interactive Chat Modal with Vernacular Voice Assistant
 * 
 * Collector-First Voice & Conversational Assistant:
 * - Natural 4-language support: Odia (or), Hindi (hi), Marathi (mr), English (en)
 * - Auto-speak preference toggle with manual "Listen" button on each message
 * - Pre-permission explanation dialog in native language
 * - Human-friendly processing states ("Listening...", "Understanding...", "Preparing answer...")
 * - High-contrast institutional dark emerald design (no AI sparkle gimmicks)
 */

import React, { useState, useRef, useEffect } from 'react';
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
  NativeModules,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { useEcoSaathi, EcoSaathiMessage, QuickReplyOption } from '../../context/EcoSaathiContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { navigateSafely } from '../../navigation/navigationRef';
import { voiceService } from '../../services/voiceService';
import { AppIcon } from '../ui/AppIcon';

const { EcoSetuSpeech } = NativeModules;

const sanitizeTextForSpeech = (text: string): string => {
  return text
    .replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[*_#`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const EcoSaathiChatModal: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { language } = useI18n();
  const activeLang = language || 'en';

  const {
    isOpen,
    closeChat,
    clearChat,
    messages,
    sendMessage,
    isOnline,
    quickReplies,
  } = useEcoSaathi();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  // Vernacular copy dictionary
  const copy = {
    title: 'Eco-Saathi',
    subtitle:
      activeLang === 'or'
        ? 'ଆପଣଙ୍କ ସ୍ୱର ସହାୟକ'
        : activeLang === 'hi'
        ? 'आपका आवाज़ सहायक'
        : activeLang === 'mr'
        ? 'तुमचा आवाज सहाय्यक'
        : 'Voice Assistant',
    voiceOn:
      activeLang === 'or' ? 'ସ୍ୱର: ଚାଲୁ' : activeLang === 'hi' ? 'आवाज़: चालू' : activeLang === 'mr' ? 'आवाज: चालू' : 'Voice: ON',
    voiceOff:
      activeLang === 'or' ? 'ସ୍ୱର: ବନ୍ଦ' : activeLang === 'hi' ? 'आवाज़: बंद' : activeLang === 'mr' ? 'आवाज: बंद' : 'Voice: OFF',
    reset:
      activeLang === 'or' ? 'ନୂଆ' : activeLang === 'hi' ? 'नया' : activeLang === 'mr' ? 'नवीन' : 'Reset',
    listeningStatus:
      activeLang === 'or'
        ? 'ଶୁଣୁଛି... ଆପଣଙ୍କ ପ୍ରଶ୍ନ କୁହନ୍ତୁ'
        : activeLang === 'hi'
        ? 'सुन रहा हूँ... अपना सवाल बोलें'
        : activeLang === 'mr'
        ? 'ऐकत आहे... तुमचा प्रश्न बोला'
        : 'Listening... Speak your question',
    understandingStatus:
      activeLang === 'or'
        ? 'ବୁଝୁଛି...'
        : activeLang === 'hi'
        ? 'समझ रहा हूँ...'
        : activeLang === 'mr'
        ? 'समजून घेत आहे...'
        : 'Understanding...',
    preparingStatus:
      activeLang === 'or'
        ? 'ଉତ୍ତର ପ୍ରସ୍ତୁତ ହେଉଛି...'
        : activeLang === 'hi'
        ? 'उत्तर तैयार हो रहा है...'
        : activeLang === 'mr'
        ? 'उत्तर तयार होत आहे...'
        : 'Preparing answer...',
    inputPlaceholder:
      activeLang === 'or'
        ? 'କୁହନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ...'
        : activeLang === 'hi'
        ? 'बोलें या टाइप करें...'
        : activeLang === 'mr'
        ? 'बोला किंवा टाइप करा...'
        : 'Speak or type here...',
    listenBtn:
      activeLang === 'or' ? 'ଶୁଣନ୍ତୁ' : activeLang === 'hi' ? 'सुनें' : activeLang === 'mr' ? 'ऐका' : 'Listen',
    stopBtn:
      activeLang === 'or' ? 'ଥାଆନ୍ତୁ' : activeLang === 'hi' ? 'रोकें' : activeLang === 'mr' ? 'थांबवा' : 'Stop',
    hazardAlert:
      activeLang === 'or'
        ? 'ସୁରକ୍ଷା ଚେତାବନୀ'
        : activeLang === 'hi'
        ? 'सुरक्षा चेतावनी'
        : activeLang === 'mr'
        ? 'सुरक्षा सूचना'
        : 'SAFETY NOTICE',
    offlineBanner:
      activeLang === 'or'
        ? 'ଅଫଲାଇନ୍ ମୋଡ୍ ଚାଲୁଅଛି — ସ୍ୱର ସହାୟତା ଉପଲବ୍ଧ।'
        : activeLang === 'hi'
        ? 'ऑफ़लाइन मोड सक्रिय — आवाज़ सहायता उपलब्ध है।'
        : activeLang === 'mr'
        ? 'ऑफलाइन मोड चालू आहे — आवाज मदत उपलब्ध आहे.'
        : 'Offline mode active — Voice assistant available.',
    permissionTitle:
      activeLang === 'or'
        ? 'ମାଇକ୍ରୋଫୋନ୍ ବ୍ୟବହାର'
        : activeLang === 'hi'
        ? 'माइक्रोफ़ोन का उपयोग'
        : activeLang === 'mr'
        ? 'मायक्रोफोनचा वापर'
        : 'Microphone Permission',
    permissionWhy:
      activeLang === 'or'
        ? 'ଆପଣ ଟାଇପ୍ ନକରି ନିଜ ସ୍ୱରରେ Eco-Saathi କୁ ପ୍ରଶ୍ନ ପଚାରିପାରିବେ।'
        : activeLang === 'hi'
        ? 'आप टाइप किए बिना अपनी आवाज़ में Eco-Saathi से सवाल पूछ सकते हैं।'
        : activeLang === 'mr'
        ? 'तुम्ही टाइप न करता आपल्या आवाजात Eco-Saathi ला प्रश्न विचारू शकता.'
        : 'You can ask Eco-Saathi questions using your voice instead of typing.',
    permissionAllow:
      activeLang === 'or' ? 'ଅନୁମତି ଦିଅନ୍ତୁ' : activeLang === 'hi' ? 'अनुमति दें' : activeLang === 'mr' ? 'परवानगी द्या' : 'Allow',
    permissionCancel:
      activeLang === 'or' ? 'ଟାଇପ୍ କରିବି' : activeLang === 'hi' ? 'टाइप करूँगा' : activeLang === 'mr' ? 'टाइप करेन' : 'Type instead',
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Read out Eco-Saathi responses using Voice Assistant TTS when auto-speak is enabled
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg.sender === 'saathi' &&
        lastMsg.id !== lastSpokenMessageIdRef.current
      ) {
        lastSpokenMessageIdRef.current = lastMsg.id;
        if (isVoiceOutputEnabled) {
          const cleanText = sanitizeTextForSpeech(lastMsg.text);
          setPlayingMessageId(lastMsg.id);
          voiceService
            .speak(cleanText, { force: true, language: activeLang })
            .finally(() => {
              setPlayingMessageId(null);
            });
        }
      }
    }
  }, [messages, isVoiceOutputEnabled, activeLang]);

  if (!isOpen || !isAuthenticated || !user) {
    return null;
  }

  const handleClose = () => {
    voiceService.stop();
    setPlayingMessageId(null);
    if (isListening && EcoSetuSpeech?.stopListening) {
      try {
        EcoSetuSpeech.stopListening();
      } catch {}
      setIsListening(false);
    }
    closeChat();
  };

  const handleClear = () => {
    voiceService.stop();
    setPlayingMessageId(null);
    clearChat();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    setSpeechStatus(copy.understandingStatus);
    sendMessage(textToSend);
    setTimeout(() => setSpeechStatus(null), 1500);
  };

  const checkHasPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
    } catch {
      return false;
    }
  };

  const handleMicPress = async () => {
    if (isListening) {
      if (EcoSetuSpeech?.stopListening) {
        try {
          await EcoSetuSpeech.stopListening();
        } catch {}
      }
      setIsListening(false);
      setSpeechStatus(null);
      return;
    }

    const hasPerm = await checkHasPermission();
    if (!hasPerm) {
      setShowPermissionModal(true);
      return;
    }

    startListeningFlow();
  };

  const handleGrantPermission = async () => {
    setShowPermissionModal(false);
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: copy.permissionTitle,
          message: copy.permissionWhy,
          buttonPositive: copy.permissionAllow,
          buttonNegative: copy.permissionCancel,
        }
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        startListeningFlow();
      } else {
        setSpeechStatus(copy.permissionCancel);
        setTimeout(() => setSpeechStatus(null), 2500);
      }
    } catch {
      setShowPermissionModal(false);
    }
  };

  const startListeningFlow = async () => {
    if (!EcoSetuSpeech?.startListening) {
      setSpeechStatus('Voice recognition not supported on this device.');
      setTimeout(() => setSpeechStatus(null), 3000);
      return;
    }

    voiceService.stop();
    setPlayingMessageId(null);
    setIsListening(true);
    setSpeechStatus(copy.listeningStatus);

    try {
      const matches: string[] = await EcoSetuSpeech.startListening(activeLang);
      setIsListening(false);
      setSpeechStatus(copy.understandingStatus);

      if (matches && matches.length > 0 && matches[0].trim()) {
        const recognizedText = matches[0].trim();
        setInputText(recognizedText);
        setSpeechStatus(copy.preparingStatus);
        sendMessage(recognizedText);
        setTimeout(() => setSpeechStatus(null), 1500);
      } else {
        setSpeechStatus(null);
      }
    } catch (err: any) {
      setIsListening(false);
      setSpeechStatus(null);
    }
  };

  const handleQuickReplyPress = (qr: QuickReplyOption) => {
    setSpeechStatus(copy.understandingStatus);
    sendMessage(qr.query);
    setTimeout(() => setSpeechStatus(null), 1200);
  };

  const handleActionPress = (action: { route: string; params?: Record<string, any> }) => {
    handleClose();
    setTimeout(() => {
      navigateSafely(action.route, action.params);
    }, 200);
  };

  const handlePlayIndividualMessage = async (msg: EcoSaathiMessage) => {
    if (playingMessageId === msg.id) {
      await voiceService.stop();
      setPlayingMessageId(null);
      return;
    }

    await voiceService.stop();
    setPlayingMessageId(msg.id);
    const cleanText = sanitizeTextForSpeech(msg.text);
    try {
      await voiceService.speak(cleanText, { force: true, language: activeLang });
    } finally {
      setPlayingMessageId(null);
    }
  };

  const renderMessageItem = ({ item }: { item: EcoSaathiMessage }) => {
    const isUser = item.sender === 'user';
    const isThisPlaying = playingMessageId === item.id;

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowSaathi,
        ]}
        accessibilityRole="text"
        accessibilityLabel={`${isUser ? 'You' : 'Eco-Saathi'}: ${item.text}`}
      >
        {!isUser && (
          <View style={styles.saathiAvatarMini}>
            <AppIcon name="eco" size={16} color="#10B981" />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.bubbleUser : styles.bubbleSaathi,
            item.safetySensitivity === 'HAZARD_CRITICAL' && styles.bubbleHazard,
          ]}
        >
          {/* Hazard Alert Badge */}
          {item.safetySensitivity === 'HAZARD_CRITICAL' && (
            <View style={styles.hazardBadge}>
              <AppIcon name="alert" size={12} color="#FCA5A5" />
              <Text style={styles.hazardBadgeText}>{copy.hazardAlert}</Text>
            </View>
          )}

          {/* Message Content */}
          <Text style={[styles.messageText, isUser ? styles.textUser : styles.textSaathi]}>
            {item.text}
          </Text>

          {/* Individual Listen / Stop Button on Bot Messages */}
          {!isUser && (
            <TouchableOpacity
              style={[
                styles.bubbleListenBtn,
                isThisPlaying && styles.bubbleListenBtnPlaying,
              ]}
              onPress={() => handlePlayIndividualMessage(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${isThisPlaying ? copy.stopBtn : copy.listenBtn} response`}
            >
              <AppIcon
                name={isThisPlaying ? 'square' : 'volume'}
                size={14}
                color={isThisPlaying ? '#EF4444' : '#6EE7B7'}
              />
              <Text
                style={[
                  styles.bubbleListenText,
                  isThisPlaying && styles.bubbleListenTextPlaying,
                ]}
              >
                {isThisPlaying ? copy.stopBtn : copy.listenBtn}
              </Text>
            </TouchableOpacity>
          )}

          {/* Suggested Navigation Action Button */}
          {item.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(item.action!)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Navigate to ${item.action.label}`}
            >
              <Text style={styles.actionButtonText}>↗ {item.action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#02080D" />

        {/* Pre-Permission Explanation Modal */}
        <Modal
          visible={showPermissionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPermissionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrap}>
                <AppIcon name="mic" size={28} color="#10B981" />
              </View>
              <Text style={styles.modalTitle}>{copy.permissionTitle}</Text>
              <Text style={styles.modalBody}>{copy.permissionWhy}</Text>
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => setShowPermissionModal(false)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.permissionCancel}
                >
                  <Text style={styles.modalSecondaryBtnText}>{copy.permissionCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={handleGrantPermission}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.permissionAllow}
                >
                  <Text style={styles.modalPrimaryBtnText}>{copy.permissionAllow}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Container */}
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <AppIcon name="eco" size={22} color="#10B981" />
                <View style={styles.onlineDot} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{copy.title}</Text>
                <Text style={styles.headerSubtitle}>{copy.subtitle}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* Voice Readout Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.voiceToggleButton,
                  isVoiceOutputEnabled ? styles.voiceToggleActive : styles.voiceToggleMuted,
                ]}
                onPress={() => {
                  const nextState = !isVoiceOutputEnabled;
                  setIsVoiceOutputEnabled(nextState);
                  if (!nextState) {
                    voiceService.stop();
                    setPlayingMessageId(null);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={isVoiceOutputEnabled ? copy.voiceOn : copy.voiceOff}
              >
                <AppIcon
                  name={isVoiceOutputEnabled ? 'volume' : 'volumeMute'}
                  size={14}
                  color={isVoiceOutputEnabled ? '#6EE7B7' : '#94A3B8'}
                />
                <Text style={styles.voiceToggleText}>
                  {isVoiceOutputEnabled ? copy.voiceOn : copy.voiceOff}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Reset conversation"
              >
                <AppIcon name="refresh" size={13} color="#CBD5E1" />
                <Text style={styles.resetButtonText}>{copy.reset}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close Eco-Saathi"
              >
                <AppIcon name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Speech Status Banner */}
          {speechStatus && (
            <View style={[styles.speechStatusBanner, isListening && styles.speechStatusBannerActive]}>
              <View style={isListening ? styles.listeningPulse : styles.statusIconDot} />
              <Text style={styles.speechStatusText}>{speechStatus}</Text>
            </View>
          )}

          {/* Offline Banner */}
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <AppIcon name="alert" size={14} color="#FDE68A" />
              <Text style={styles.offlineBannerText}>{copy.offlineBanner}</Text>
            </View>
          )}

          {/* Messages Stream */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          />

          {/* Quick Replies Tray */}
          {quickReplies.length > 0 && (
            <View style={styles.quickRepliesContainer}>
              <FlatList
                horizontal
                data={quickReplies}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRepliesList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.quickReplyChip}
                    onPress={() => handleQuickReplyPress(item)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Text style={styles.quickReplyText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Input Bar with Voice Mic Button */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              onPress={handleMicPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              <AppIcon
                name={isListening ? 'square' : 'mic'}
                size={20}
                color={isListening ? '#EF4444' : '#10B981'}
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, isListening && styles.inputListening]}
              placeholder={isListening ? copy.listeningStatus : copy.inputPlaceholder}
              placeholderTextColor={isListening ? '#10B981' : '#64748B'}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              accessibilityLabel="Chat input field"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <AppIcon
                name="send"
                size={18}
                color={inputText.trim() ? '#02080D' : '#64748B'}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#02080D',
  },
  container: {
    flex: 1,
    backgroundColor: '#030C12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(7, 30, 34, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 36,
  },
  voiceToggleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderColor: '#10B981',
  },
  voiceToggleMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  voiceToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 36,
  },
  resetButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  speechStatusBannerActive: {
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    borderBottomColor: '#10B981',
  },
  listeningPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  statusIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  speechStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#FDE68A',
    fontWeight: '600',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowSaathi: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  saathiAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleSaathi: {
    backgroundColor: '#071E22',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
    borderBottomLeftRadius: 4,
  },
  bubbleHazard: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(40, 10, 15, 0.95)',
  },
  hazardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  hazardBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textSaathi: {
    color: '#F1F5F9',
    fontWeight: '400',
  },
  bubbleListenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 32,
  },
  bubbleListenBtnPlaying: {
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: '#EF4444',
  },
  bubbleListenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  bubbleListenTextPlaying: {
    color: '#F87171',
  },
  actionButton: {
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.2,
    borderColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  quickRepliesContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#030C12',
  },
  quickRepliesList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: '#071E22',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
  },
  quickReplyText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#071E22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
    gap: 8,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inputListening: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#071E22',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 21,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalPrimaryBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#02080D',
  },
});

export default EcoSaathiChatModal;
