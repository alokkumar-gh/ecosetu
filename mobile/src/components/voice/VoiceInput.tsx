/**
 * VoiceInput.tsx
 * Professional BHASHINI-Powered Multilingual Voice Input Component for ECOSETU.
 *
 * Architecture:
 * - Direct integration with ECOSETU Backend BHASHINI ASR & Audio Language Detection.
 * - Zero Google/browser SpeechRecognition dependencies.
 * - Supports Auto-Detection and 12+ Indic languages:
 *   Auto Detect, Odia (or), Hindi (hi), Bengali (bn), Telugu (te), Tamil (ta),
 *   Kannada (kn), Malayalam (ml), Marathi (mr), Gujarati (gu), Punjabi (pa), Assamese (as), English (en).
 *
 * Professional UX State Machine:
 * 1. IDLE / READY: Clean, non-intrusive voice activation button with language selector pill.
 * 2. LISTENING: Visual pulse indicator ("Listening...").
 * 3. PROCESSING / TRANSCRIBING: High-contrast vernacular loader ("Understanding your request...").
 * 4. RECOGNIZED: Displays "You said..." + detected language tag + preview with confirmation & retry options.
 * 5. ERROR: High-contrast error message with friendly vernacular retry.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useI18n } from '../../i18n';
import { AppIcon } from '../ui/AppIcon';
import { bhashiniClientService, ASRResponse } from '../../services/bhashiniClientService';
import { voiceRecordingService } from '../../services/voiceRecordingService';

export type VoiceInputState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'TRANSCRIBING'
  | 'RECOGNIZED'
  | 'ERROR';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'Auto Detect (ସ୍ୱତଃ / स्वचालित)' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
];

interface Props {
  onTextRecognized: (text: string, metadata?: { language: string; confidence: number | null }) => void;
  language?: string;
  placeholder?: string;
  style?: ViewStyle;
  autoSubmit?: boolean;
  showLanguageSelector?: boolean;
}

export const VoiceInput: React.FC<Props> = ({
  onTextRecognized,
  language: propLang,
  placeholder,
  style,
  autoSubmit = false,
  showLanguageSelector = true,
}) => {
  const { language: currentAppLang } = useI18n();

  const [selectedLang, setSelectedLang] = useState<string>(propLang || 'auto');
  const [state, setState] = useState<VoiceInputState>('IDLE');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [detectedLangInfo, setDetectedLangInfo] = useState<{ code: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);
  const recordingTimeoutRef = useRef<any>(null);

  // Active language for prompt display
  const activePromptLang = selectedLang === 'auto' ? currentAppLang || 'en' : selectedLang;

  const copy = {
    tapToSpeak:
      activePromptLang === 'or'
        ? 'କହିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ'
        : activePromptLang === 'hi'
        ? 'बोलने के लिए माइक दबाएं'
        : activePromptLang === 'mr'
        ? 'बोलण्यासाठी माइक दाबा'
        : 'Tap to speak',
    subPrompt:
      placeholder ||
      (activePromptLang === 'or'
        ? 'ଭାଷିଣୀ ସ୍ୱର ସହାୟତା (Auto Detect)'
        : activePromptLang === 'hi'
        ? 'भाषिणी वॉइस सेवा (Auto Detect)'
        : activePromptLang === 'mr'
        ? 'भाषिणी व्हॉइस सेवा (Auto Detect)'
        : 'BHASHINI Voice Assistant'),
    listening:
      activePromptLang === 'or'
        ? 'ଶୁଣୁଛି... କୁହନ୍ତୁ'
        : activePromptLang === 'hi'
        ? 'सुन रहा हूँ... बोलें'
        : activePromptLang === 'mr'
        ? 'ऐकत आहे... बोला'
        : 'Listening... Speak now',
    stopRecording:
      activePromptLang === 'or'
        ? 'ବନ୍ଦ କରିବାକୁ ଦବାନ୍ତୁ'
        : activePromptLang === 'hi'
        ? 'रोकने के लिए दबाएं'
        : 'Tap to stop',
    processing:
      activePromptLang === 'or'
        ? 'ଆପଣଙ୍କ ଅନୁରୋଧ ବୁଝାଯାଉଛି...'
        : activePromptLang === 'hi'
        ? 'आपकी बात समझी जा रही है...'
        : activePromptLang === 'mr'
        ? 'आपला संदेश समजून घेत आहे...'
        : 'Understanding your request...',
    transcribing:
      activePromptLang === 'or'
        ? 'ଭାଷିଣୀ ASR ଯାଞ୍ଚ ହେଉଛି...'
        : activePromptLang === 'hi'
        ? 'भाषिणी ASR रूपांतरण...'
        : 'Transcribing via BHASHINI...',
    youSaid:
      activePromptLang === 'or'
        ? 'ଆପଣ କହିଲେ:'
        : activePromptLang === 'hi'
        ? 'आपने कहा:'
        : activePromptLang === 'mr'
        ? 'तुम्ही म्हणालात:'
        : 'You said:',
    useThis:
      activePromptLang === 'or'
        ? '✓ ବ୍ୟବହାର କରନ୍ତୁ'
        : activePromptLang === 'hi'
        ? '✓ इस्तेमाल करें'
        : '✓ Use this',
    tryAgain:
      activePromptLang === 'or'
        ? '↻ ପୁଣି କୁହନ୍ତୁ'
        : activePromptLang === 'hi'
        ? '↻ फिर से बोलें'
        : '↻ Try again',
    selectLanguage:
      activePromptLang === 'or'
        ? 'ଭାଷା ବାଛନ୍ତୁ'
        : activePromptLang === 'hi'
        ? 'भाषा चुनें'
        : 'Select Voice Language',
  };

  const handleStartRecording = async () => {
    setErrorMessage('');
    setRecognizedText('');
    setDetectedLangInfo(null);

    const hasPerm = await voiceRecordingService.requestMicrophonePermission();
    if (!hasPerm) {
      setState('ERROR');
      setErrorMessage('Microphone permission is required to use voice assistance.');
      return;
    }

    setState('LISTENING');

    const started = await voiceRecordingService.startRecording();
    if (!started) {
      setState('ERROR');
      setErrorMessage("We couldn't access the microphone. Please try again.");
      return;
    }

    // Auto-stop after 6 seconds of speech
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    recordingTimeoutRef.current = setTimeout(() => {
      handleStopRecording();
    }, 6000);
  };

  const handleStopRecording = async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    setState('PROCESSING');

    try {
      const recording = await voiceRecordingService.stopRecording();
      if (!recording || !recording.audioBase64 || !recording.audioBase64.trim()) {
        setState('ERROR');
        setErrorMessage("We couldn't hear anything. Please try again.");
        return;
      }

      setState('TRANSCRIBING');

      // Dispatch to ECOSETU Backend BHASHINI ASR
      const response: ASRResponse | null = await bhashiniClientService.transcribe(
        recording.audioBase64,
        selectedLang,
        {
          audioFormat: recording.audioFormat,
          samplingRate: recording.samplingRate,
        }
      );

      if (!response || !response.transcript || !response.transcript.trim()) {
        setState('ERROR');
        setErrorMessage("We couldn't understand the audio. Please try again.");
        return;
      }

      const text = response.transcript.trim();
      setRecognizedText(text);
      if (response.language) {
        setDetectedLangInfo({
          code: response.language.code,
          name: response.language.name,
        });
      }

      if (autoSubmit) {
        setState('IDLE');
        onTextRecognized(text, {
          language: response.language?.code || selectedLang,
          confidence: response.confidence,
        });
      } else {
        setState('RECOGNIZED');
      }
    } catch (err: any) {
      setState('ERROR');
      setErrorMessage(
        'Voice assistance is temporarily unavailable. You can continue using ECOSETU with text input.'
      );
    }
  };

  const handleConfirm = () => {
    const text = recognizedText;
    const metadata = detectedLangInfo
      ? { language: detectedLangInfo.code, confidence: null }
      : undefined;
    setRecognizedText('');
    setState('IDLE');
    onTextRecognized(text, metadata);
  };

  const handleReset = () => {
    setRecognizedText('');
    setErrorMessage('');
    setDetectedLangInfo(null);
    setState('IDLE');
  };

  const currentLangLabel =
    LANGUAGE_OPTIONS.find((l) => l.code === selectedLang)?.nativeName || 'Auto Detect';

  return (
    <View style={[styles.container, style]}>
      {/* Language Selector Pill */}
      {showLanguageSelector && state === 'IDLE' && (
        <View style={styles.langSelectorRow}>
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setIsLangModalOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Selected voice language: ${currentLangLabel}`}
          >
            <AppIcon name="globe" size={14} color="#10B981" />
            <Text style={styles.langPillText}>{currentLangLabel}</Text>
            <AppIcon name="chevron-down" size={12} color="#6EE7B7" />
          </TouchableOpacity>
        </View>
      )}

      {/* Language Selection Modal */}
      <Modal
        visible={isLangModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{copy.selectLanguage}</Text>
              <TouchableOpacity
                onPress={() => setIsLangModalOpen(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close language selector"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
              {LANGUAGE_OPTIONS.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOptionItem, isSelected && styles.langOptionSelected]}
                    onPress={() => {
                      setSelectedLang(lang.code);
                      setIsLangModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.langOptionNative, isSelected && styles.langOptionTextActive]}>
                        {lang.nativeName}
                      </Text>
                      {lang.code !== 'auto' && (
                        <Text style={styles.langOptionSub}>{lang.name}</Text>
                      )}
                    </View>
                    {isSelected && <AppIcon name="check" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 1. LISTENING State Banner */}
      {state === 'LISTENING' && (
        <TouchableOpacity
          style={[styles.micButtonLarge, styles.micButtonRecording]}
          onPress={handleStopRecording}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={copy.stopRecording}
        >
          <View style={[styles.micIconWrap, styles.micIconWrapRecording]}>
            <View style={styles.pulseDot} />
          </View>
          <View style={styles.micLabelContainer}>
            <Text style={[styles.micTitle, { color: '#EF4444' }]}>{copy.listening}</Text>
            <Text style={styles.micSubtitle}>{copy.stopRecording}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 2. PROCESSING / TRANSCRIBING State Banner */}
      {(state === 'PROCESSING' || state === 'TRANSCRIBING') && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.processingText}>
              {state === 'TRANSCRIBING' ? copy.transcribing : copy.processing}
            </Text>
          </View>
        </View>
      )}

      {/* 3. RECOGNIZED Transcript Preview */}
      {state === 'RECOGNIZED' && (
        <View style={styles.recognizedCard}>
          <View style={styles.recognizedHeader}>
            <View style={styles.recognizedHeaderLeft}>
              <AppIcon name="mic" size={16} color="#10B981" />
              <Text style={styles.recognizedLabel}>{copy.youSaid}</Text>
            </View>
            {detectedLangInfo && (
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>{detectedLangInfo.name} detected</Text>
              </View>
            )}
          </View>
          <Text style={styles.recognizedContentText}>"{recognizedText}"</Text>
          <View style={styles.recognizedActionRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={copy.useThis}
            >
              <AppIcon name="check" size={16} color="#02080D" />
              <Text style={styles.confirmBtnText}>{copy.useThis}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleReset}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={copy.tryAgain}
            >
              <AppIcon name="refresh" size={15} color="#CBD5E1" />
              <Text style={styles.retryBtnText}>{copy.tryAgain}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. ERROR State Card */}
      {state === 'ERROR' && (
        <View style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AppIcon name="alert" size={16} color="#F87171" />
            <Text style={styles.errorCardText}>{errorMessage}</Text>
          </View>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={handleStartRecording}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={copy.tryAgain}
          >
            <AppIcon name="refresh" size={14} color="#FCA5A5" />
            <Text style={styles.errorRetryBtnText}>{copy.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. IDLE Main Button */}
      {state === 'IDLE' && (
        <TouchableOpacity
          style={styles.micButtonLarge}
          onPress={handleStartRecording}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={copy.tapToSpeak}
        >
          <View style={styles.micIconWrap}>
            <AppIcon name="mic" size={24} color="#10B981" />
          </View>
          <View style={styles.micLabelContainer}>
            <Text style={styles.micTitle}>{copy.tapToSpeak}</Text>
            <Text style={styles.micSubtitle}>{copy.subPrompt}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  langSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  micButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    gap: 14,
  },
  micButtonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  micIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIconWrapRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
  },
  micLabelContainer: {
    flex: 1,
  },
  micTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  micSubtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  processingText: {
    fontSize: 13.5,
    color: '#6EE7B7',
    fontWeight: '600',
  },
  recognizedCard: {
    backgroundColor: '#071E22',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  recognizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recognizedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recognizedLabel: {
    fontSize: 12.5,
    color: '#6EE7B7',
    fontWeight: '700',
  },
  detectedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detectedBadgeText: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '700',
  },
  recognizedContentText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 22,
  },
  recognizedActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 48,
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#02080D',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 48,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  errorCard: {
    backgroundColor: 'rgba(40, 10, 15, 0.95)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorCardText: {
    fontSize: 13,
    color: '#FCA5A5',
    flex: 1,
    lineHeight: 18,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.40)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 40,
  },
  errorRetryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#071E22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: '#10B981',
    maxHeight: '75%',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  langList: {
    marginBottom: 14,
  },
  langOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  langOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  langOptionNative: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  langOptionTextActive: {
    color: '#6EE7B7',
  },
  langOptionSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
});

export default VoiceInput;
