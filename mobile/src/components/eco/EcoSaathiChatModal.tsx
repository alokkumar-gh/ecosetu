/**
 * EcoSetu — Eco-Saathi In-App Interactive Chat Modal with Voice Assistant
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * Production-quality Conversational UI with dark emerald glassmorphism,
 * Voice Assistant (STT Speech Recognition & TTS Speech Synthesis),
 * dynamic data alerts, safe navigation actions, and multilingual support.
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
} from 'react-native';
import { useEcoSaathi, EcoSaathiMessage, QuickReplyOption } from '../../context/EcoSaathiContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { navigateSafely } from '../../navigation/navigationRef';
import { voiceService } from '../../services/voiceService';
import { colors } from '../../theme/colors';

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
  const { t, language } = useI18n();
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

  const flatListRef = useRef<FlatList>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Read out Eco-Saathi responses using Voice Assistant TTS when enabled
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
          voiceService.speak(cleanText, { force: true, language: language || 'en' });
        }
      }
    }
  }, [messages, isVoiceOutputEnabled, language]);

  if (!isOpen || !isAuthenticated || !user) {
    return null;
  }

  const handleClose = () => {
    voiceService.stop();
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
    clearChat();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    sendMessage(textToSend);
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

    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (!hasPermission) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'Eco-Saathi uses your microphone to listen to your voice questions.',
              buttonPositive: 'Allow',
              buttonNegative: 'Cancel',
            }
          );
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            setSpeechStatus('Microphone permission required for voice input.');
            setTimeout(() => setSpeechStatus(null), 3000);
            return;
          }
        }
      } catch (e) {
        console.warn('[EcoSaathiVoice] Permission check error:', e);
      }
    }

    if (!EcoSetuSpeech?.startListening) {
      setSpeechStatus('Voice recognition not supported on this device.');
      setTimeout(() => setSpeechStatus(null), 3000);
      return;
    }

    voiceService.stop();
    setIsListening(true);
    setSpeechStatus(
      language === 'hi'
        ? 'सुन रहा हूँ... अपना सवाल बोलें'
        : language === 'mr'
        ? 'ऐकत आहे... तुमचा प्रश्न बोला'
        : language === 'or'
        ? 'ଶୁଣୁଛି... ଆପଣଙ୍କ ପ୍ରଶ୍ନ କୁହନ୍ତୁ'
        : 'Listening... Speak your question now'
    );

    try {
      const matches: string[] = await EcoSetuSpeech.startListening(language || 'en');
      setIsListening(false);
      setSpeechStatus(null);

      if (matches && matches.length > 0 && matches[0].trim()) {
        const recognizedText = matches[0].trim();
        setInputText(recognizedText);
        sendMessage(recognizedText);
      } else {
        setSpeechStatus('No speech detected. Please try again.');
        setTimeout(() => setSpeechStatus(null), 3000);
      }
    } catch (err: any) {
      setIsListening(false);
      if (err?.code === 'NO_SPEECH' || err?.message?.includes('cancelled')) {
        setSpeechStatus(null);
      } else {
        setSpeechStatus('Voice input error. Please try again.');
        setTimeout(() => setSpeechStatus(null), 3000);
      }
    }
  };

  const handleQuickReplyPress = (qr: QuickReplyOption) => {
    sendMessage(qr.query);
  };

  const handleActionPress = (action: { route: string; params?: Record<string, any> }) => {
    handleClose();
    setTimeout(() => {
      navigateSafely(action.route, action.params);
    }, 200);
  };

  const renderMessageItem = ({ item }: { item: EcoSaathiMessage }) => {
    const isUser = item.sender === 'user';

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
            <Text style={styles.saathiAvatarText}>🌿</Text>
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
              <Text style={styles.hazardBadgeText}>⚠️ CRITICAL SAFETY HAZARD</Text>
            </View>
          )}

          {/* Message Content */}
          <Text style={[styles.messageText, isUser ? styles.textUser : styles.textSaathi]}>
            {item.text}
          </Text>

          {/* Dynamic Data Notification */}
          {item.requiresDynamicData && (
            <View style={styles.dynamicDataNotice}>
              <Text style={styles.dynamicDataText}>
                ℹ️ Requires live account data
              </Text>
            </View>
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
                <Text style={styles.avatarEmoji}>🌿</Text>
                <View style={styles.onlineDot} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Eco-Saathi</Text>
                <Text style={styles.headerSubtitle}>
                  {user?.role === 'INFORMAL_COLLECTOR'
                    ? 'Voice & Collector Assistant'
                    : user?.role === 'CITIZEN'
                    ? 'Voice & Citizen Assistant'
                    : 'Voice Assistant'}
                </Text>
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
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={isVoiceOutputEnabled ? 'Mute Eco-Saathi voice' : 'Enable Eco-Saathi voice'}
              >
                <Text style={styles.voiceToggleText}>
                  {isVoiceOutputEnabled ? '🔊 Voice' : '🔇 Muted'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Reset conversation"
              >
                <Text style={styles.resetButtonText}>↺ Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close Eco-Saathi"
              >
                <Text style={styles.closeButtonText}>✕</Text>
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
              <Text style={styles.offlineBannerText}>
                📡 Offline Mode Active — Voice assistant and offline FAQs working.
              </Text>
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
              <Text style={styles.micButtonIcon}>{isListening ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, isListening && styles.inputListening]}
              placeholder={
                isListening
                  ? 'Listening...'
                  : language === 'hi'
                  ? 'बोलें या टाइप करें...'
                  : language === 'mr'
                  ? 'बोला किंवा टाइप करा...'
                  : language === 'or'
                  ? 'କୁହନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ...'
                  : 'Speak or ask prices, lots, payments...'
              }
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
              <Text style={styles.sendButtonIcon}>➤</Text>
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
  avatarEmoji: {
    fontSize: 20,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  resetButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  speechStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    backgroundColor: '#F59E0B',
  },
  speechStatusText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  offlineBannerText: {
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  saathiAvatarText: {
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleSaathi: {
    backgroundColor: 'rgba(7, 30, 34, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
    borderBottomLeftRadius: 4,
  },
  bubbleHazard: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(40, 10, 15, 0.92)',
  },
  hazardBadge: {
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
  dynamicDataNotice: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  dynamicDataText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(3, 12, 18, 0.95)',
  },
  quickRepliesList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: 'rgba(10, 35, 42, 0.90)',
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
    backgroundColor: 'rgba(7, 30, 34, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
    gap: 8,
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  micButtonIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 22,
    paddingHorizontal: 14,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  sendButtonIcon: {
    color: '#02080D',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 2,
  },
});

export default EcoSaathiChatModal;
