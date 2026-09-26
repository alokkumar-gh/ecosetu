/**
 * VoiceInput.tsx
 * Collector-First Vernacular Voice Input component for ECOSETU.
 * 
 * Supports: Odia (or), Hindi (hi), Marathi (mr), English (en).
 * 
 * Accessible State Machine:
 * 1. READY: Prompts collector to tap and speak in their native tongue.
 * 2. PERMISSION_EXPLAIN: Clear vernacular explanation of WHY microphone is needed before system prompt.
 * 3. RECORDING: Active audio listening with clear visual indicator ("Listening...").
 * 4. PROCESSING: High-contrast vernacular loader ("Understanding voice...").
 * 5. RECOGNIZED: Displays "You said..." + preview with "✓ Use this" and "↻ Try again" verification buttons.
 * 6. ERROR: High-contrast error message with friendly vernacular retry.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  NativeModules,
  Platform,
  PermissionsAndroid,
  ViewStyle,
  Modal,
} from 'react-native';
import { useI18n } from '../../i18n';
import { AppIcon } from '../ui/AppIcon';

const { EcoSetuSpeech } = NativeModules;

export type VoiceInputState =
  | 'READY'
  | 'PERMISSION_EXPLAIN'
  | 'RECORDING'
  | 'PROCESSING'
  | 'RECOGNIZED'
  | 'ERROR';

interface Props {
  onTextRecognized: (text: string) => void;
  language?: string;
  placeholder?: string;
  style?: ViewStyle;
  autoSubmit?: boolean;
}

export const VoiceInput: React.FC<Props> = ({
  onTextRecognized,
  language: propLang,
  placeholder,
  style,
  autoSubmit = false,
}) => {
  const { language: currentLang } = useI18n();
  const activeLang = propLang || currentLang || 'en';

  const [state, setState] = useState<VoiceInputState>('READY');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 1. Vernacular Copy Dictionary
  const copy = {
    tapToSpeak:
      activeLang === 'or'
        ? 'କହିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ'
        : activeLang === 'hi'
        ? 'बोलने के लिए माइक दबाएं'
        : activeLang === 'mr'
        ? 'बोलण्यासाठी माइक दाबा'
        : 'Tap to speak',
    subPrompt:
      placeholder ||
      (activeLang === 'or'
        ? 'ଟାଇପ୍ କରିବା ଆବଶ୍ୟକ ନାହିଁ'
        : activeLang === 'hi'
        ? 'टाइप करने की ज़रूरत नहीं है'
        : activeLang === 'mr'
        ? 'टाइप करण्याची गरज नाही'
        : 'No typing needed'),
    listening:
      activeLang === 'or'
        ? 'ଶୁଣୁଛି... ଆପଣଙ୍କ ସାମଗ୍ରୀ ବା ପ୍ରଶ୍ନ କୁହନ୍ତୁ'
        : activeLang === 'hi'
        ? 'सुन रहा हूँ... अपने सामान या सवाल के बारे में बोलें'
        : activeLang === 'mr'
        ? 'ऐकत आहे... आपल्या साहित्याबद्दल किंवा प्रश्नाबद्दल बोला'
        : 'Listening... Speak clearly now',
    stopRecording:
      activeLang === 'or'
        ? 'ବନ୍ଦ କରିବାକୁ ଦବାନ୍ତୁ'
        : activeLang === 'hi'
        ? 'रोकने के लिए दबाएं'
        : activeLang === 'mr'
        ? 'थांबवण्यासाठी दाबा'
        : 'Tap to stop',
    processing:
      activeLang === 'or'
        ? 'ଭାଷା ଯାଞ୍ଚ ହେଉଛି...'
        : activeLang === 'hi'
        ? 'आवाज़ पहचानी जा रही है...'
        : activeLang === 'mr'
        ? 'आवाज समजून घेत आहे...'
        : 'Understanding your voice...',
    youSaid:
      activeLang === 'or'
        ? 'ଆପଣ କହିଲେ:'
        : activeLang === 'hi'
        ? 'आपने कहा:'
        : activeLang === 'mr'
        ? 'तुम्ही म्हणालात:'
        : 'You said:',
    useThis:
      activeLang === 'or'
        ? '✓ ଏହା ବ୍ୟବହାର କରନ୍ତୁ'
        : activeLang === 'hi'
        ? '✓ इसे इस्तेमाल करें'
        : activeLang === 'mr'
        ? '✓ हे वापरा'
        : '✓ Use this',
    tryAgain:
      activeLang === 'or'
        ? '↻ ପୁଣି କୁହନ୍ତୁ'
        : activeLang === 'hi'
        ? '↻ फिर से बोलें'
        : activeLang === 'mr'
        ? '↻ पुन्हा बोला'
        : '↻ Try again',
    permissionTitle:
      activeLang === 'or'
        ? 'ମାଇକ୍ରୋଫୋନ୍ ବ୍ୟବହାର'
        : activeLang === 'hi'
        ? 'माइक्रोफ़ोन का उपयोग'
        : activeLang === 'mr'
        ? 'मायक्रोफोनचा वापर'
        : 'Microphone Access',
    permissionWhy:
      activeLang === 'or'
        ? 'ଆପଣ ଟାଇପ୍ ନକରି ନିଜ ସ୍ୱରରେ ECOSETU ସହିତ କଥା ହୋଇପାରିବେ।'
        : activeLang === 'hi'
        ? 'आप टाइप किए बिना अपनी आवाज़ में ECOSETU से बात कर सकते हैं।'
        : activeLang === 'mr'
        ? 'तुम्ही टाइप न करता आपल्या आवाजात ECOSETU शी बोलू शकता.'
        : 'You can speak directly to ECOSETU instead of typing.',
    permissionContinue:
      activeLang === 'or'
        ? 'ଅନୁମତି ଦିଅନ୍ତୁ'
        : activeLang === 'hi'
        ? 'अनुमति दें'
        : activeLang === 'mr'
        ? 'परवानगी द्या'
        : 'Allow Access',
    permissionCancel:
      activeLang === 'or'
        ? 'ଟାଇପ୍ କରିବି'
        : activeLang === 'hi'
        ? 'टाइप करूँगा'
        : activeLang === 'mr'
        ? 'टाइप करेन'
        : 'Use Keyboard',
    deniedMsg:
      activeLang === 'or'
        ? 'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ। ଆପଣ ଟାଇପ୍ କରି ଚାଲୁ ରଖିପାରିବେ।'
        : activeLang === 'hi'
        ? 'माइक्रोफ़ोन अनुमति नहीं मिली। आप टाइप करके जारी रख सकते हैं।'
        : activeLang === 'mr'
        ? 'मायक्रोफोन परवानगी मिळाली नाही. आपण टाइप करून वापरू शकता.'
        : 'Microphone permission denied. You can continue typing.',
    noSpeechMsg:
      activeLang === 'or'
        ? 'କିଛି ଶୁଣାଗଲା ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ।'
        : activeLang === 'hi'
        ? 'कोई आवाज़ सुनाई नहीं दी। कृपया पुनः बोलें।'
        : activeLang === 'mr'
        ? 'काहीही ऐकू आले नाही. कृपया पुन्हा बोला.'
        : 'No speech detected. Please speak clearly.',
    errorMsg:
      activeLang === 'or'
        ? 'ଆବାଜ୍ ଚିହ୍ନିବାରେ ସମସ୍ୟା ହେଲା। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।'
        : activeLang === 'hi'
        ? 'आवाज़ पहचानने में समस्या हुई। पुनः प्रयास करें।'
        : activeLang === 'mr'
        ? 'आवाज ओळखण्यात अडचण आली. पुन्हा प्रयत्न करा.'
        : 'Unable to recognize voice. Please try again.',
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
    setErrorMessage('');
    const hasPerm = await checkHasPermission();
    if (!hasPerm) {
      setState('PERMISSION_EXPLAIN');
    } else {
      startListeningFlow();
    }
  };

  const handleGrantPermission = async () => {
    setState('READY');
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: copy.permissionTitle,
          message: copy.permissionWhy,
          buttonPositive: copy.permissionContinue,
          buttonNegative: copy.permissionCancel,
        }
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        startListeningFlow();
      } else {
        setState('ERROR');
        setErrorMessage(copy.deniedMsg);
      }
    } catch {
      setState('ERROR');
      setErrorMessage(copy.deniedMsg);
    }
  };

  const startListeningFlow = async () => {
    if (!EcoSetuSpeech?.startListening) {
      setState('ERROR');
      setErrorMessage('Voice recognition module unavailable on this device.');
      return;
    }

    setState('RECORDING');

    try {
      const matches: string[] = await EcoSetuSpeech.startListening(activeLang);
      setState('PROCESSING');

      if (matches && matches.length > 0 && matches[0].trim()) {
        const text = matches[0].trim();
        setRecognizedText(text);
        if (autoSubmit) {
          setState('READY');
          onTextRecognized(text);
        } else {
          setState('RECOGNIZED');
        }
      } else {
        setState('ERROR');
        setErrorMessage(copy.noSpeechMsg);
      }
    } catch {
      setState('ERROR');
      setErrorMessage(copy.errorMsg);
    }
  };

  const handleStopRecording = async () => {
    if (EcoSetuSpeech?.stopListening) {
      try {
        await EcoSetuSpeech.stopListening();
      } catch {}
    }
    setState('READY');
  };

  const handleConfirmRecognized = () => {
    const text = recognizedText;
    setRecognizedText('');
    setState('READY');
    onTextRecognized(text);
  };

  const handleReset = () => {
    setRecognizedText('');
    setErrorMessage('');
    setState('READY');
  };

  return (
    <View style={[styles.container, style]}>
      {/* 1. Pre-Permission Explanation Modal */}
      <Modal
        visible={state === 'PERMISSION_EXPLAIN'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setState('READY')}
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
                onPress={() => setState('READY')}
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
                accessibilityLabel={copy.permissionContinue}
              >
                <Text style={styles.modalPrimaryBtnText}>{copy.permissionContinue}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Recording Status Banner */}
      {state === 'RECORDING' && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingPulse} />
          <Text style={styles.recordingText}>{copy.listening}</Text>
        </View>
      )}

      {/* 3. Processing Status Banner */}
      {state === 'PROCESSING' && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.processingText}>{copy.processing}</Text>
        </View>
      )}

      {/* 4. Recognized Text Preview with Confirm / Retry */}
      {state === 'RECOGNIZED' && (
        <View style={styles.recognizedCard}>
          <View style={styles.recognizedHeader}>
            <AppIcon name="mic" size={16} color="#10B981" />
            <Text style={styles.recognizedLabel}>{copy.youSaid}</Text>
          </View>
          <Text style={styles.recognizedContentText}>"{recognizedText}"</Text>
          <View style={styles.recognizedActionRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmRecognized}
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

      {/* 5. Error State Card */}
      {state === 'ERROR' && (
        <View style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AppIcon name="alert" size={16} color="#F87171" />
            <Text style={styles.errorCardText}>{errorMessage}</Text>
          </View>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={handleMicPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={copy.tryAgain}
          >
            <AppIcon name="refresh" size={14} color="#FCA5A5" />
            <Text style={styles.errorRetryBtnText}>{copy.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Main Tap to Speak Button */}
      {state === 'READY' && (
        <TouchableOpacity
          style={styles.micButtonLarge}
          onPress={handleMicPress}
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

      {/* 7. Active Recording Stop Button */}
      {state === 'RECORDING' && (
        <TouchableOpacity
          style={[styles.micButtonLarge, styles.micButtonRecording]}
          onPress={handleStopRecording}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={copy.stopRecording}
        >
          <View style={[styles.micIconWrap, styles.micIconWrapRecording]}>
            <AppIcon name="square" size={20} color="#EF4444" />
          </View>
          <View style={styles.micLabelContainer}>
            <Text style={[styles.micTitle, { color: '#EF4444' }]}>
              {copy.stopRecording}
            </Text>
            <Text style={styles.micSubtitle}>
              {copy.listening}
            </Text>
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
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FCA5A5',
    flex: 1,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 13,
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
    gap: 6,
  },
  recognizedLabel: {
    fontSize: 12.5,
    color: '#6EE7B7',
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

export default VoiceInput;
