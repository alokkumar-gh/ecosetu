import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from '../../navigation/types';
import { EcoCarousel } from '../../components/auth/carousel';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { STORAGE_KEYS } from '../../utils/constants';
import { useI18n, SupportedLanguage, LANGUAGE_OPTIONS } from '../../i18n';
import { AppIcon } from '../../components/ui/AppIcon';
import { EcoSetuLogo } from '../../components/common/EcoSetuLogo';
import voiceService from '../../services/voiceService';
import { bhashiniClientService } from '../../services/bhashiniClientService';
import { voiceRecordingService } from '../../services/voiceRecordingService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

const WELCOME_VOICE_TEXTS: Record<SupportedLanguage, { greeting: string; listenBtn: string; trySpeakingBtn: string; continueBtn: string; listeningText: string; recognizedPrefix: string }> = {
  or: {
    greeting: 'ଇକୋସେତୁ କୁ ସ୍ୱାଗତ। ଆପଣ ଟାଇପ୍ ନକରି ନିଜ ସ୍ୱରରେ ପ୍ରଶ୍ନ ପଚାରିପାରିବେ ଏବଂ ସୂଚନା ଶୁଣିପାରିବେ।',
    listenBtn: 'ଶୁଣନ୍ତୁ',
    trySpeakingBtn: 'କହି ଦେଖନ୍ତୁ',
    continueBtn: 'ଆଗକୁ ବଢ଼ନ୍ତୁ',
    listeningText: 'ଶୁଣୁଛି... କିଛି କୁହନ୍ତୁ',
    recognizedPrefix: 'ଆପଣ କହିଲେ:',
  },
  hi: {
    greeting: 'इकोसेतु में आपका स्वागत है। आप बिना टाइप किए अपनी आवाज़ से सवाल पूछ सकते हैं और जानकारी सुन सकते हैं।',
    listenBtn: 'सुनें',
    trySpeakingBtn: 'बोलकर देखें',
    continueBtn: 'आगे बढ़ें',
    listeningText: 'सुन रहा हूँ... कुछ बोलें',
    recognizedPrefix: 'आपने कहा:',
  },
  mr: {
    greeting: 'इकोसेतू मध्ये आपले स्वागत आहे. तुम्ही न लिहिता आपल्या आवाजात प्रश्न विचारू शकता आणि माहिती ऐकू शकता.',
    listenBtn: 'ऐका',
    trySpeakingBtn: 'बोलून पहा',
    continueBtn: 'पुढे जा',
    listeningText: 'ऐकत आहे... काहीतरी बोला',
    recognizedPrefix: 'तुम्ही म्हणालात:',
  },
  en: {
    greeting: 'Welcome to ECOSETU. You can use your voice to ask questions and listen to information instead of typing.',
    listenBtn: 'Listen',
    trySpeakingBtn: 'Try speaking',
    continueBtn: 'Continue',
    listeningText: 'Listening... Speak now',
    recognizedPrefix: 'You said:',
  },
};

export const LandingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { language, setLanguage } = useI18n();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [needsLanguageSelection, setNeedsLanguageSelection] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage | null>(null);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [isListeningTest, setIsListeningTest] = useState(false);
  const [testedSpeechText, setTestedSpeechText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkCompletion = async () => {
      try {
        if (route?.params?.forceShow) {
          if (isMounted) setCheckingStatus(false);
          return;
        }

        // Check if language was ever selected
        const key = (STORAGE_KEYS && STORAGE_KEYS.LANGUAGE) || '@ecosetu_language';
        const savedLang = await AsyncStorage.getItem(key);
        if (!savedLang && isMounted) {
          setNeedsLanguageSelection(true);
          setCheckingStatus(false);
          return;
        }

        const completed = await AsyncStorage.getItem(STORAGE_KEYS.CAROUSEL_COMPLETED);
        if (completed === 'true' && isMounted) {
          navigation.replace('AuthGateway');
          return;
        }
      } catch {
        // Fall back to displaying carousel on storage read error
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };

    checkCompletion();

    return () => {
      isMounted = false;
      voiceService.stop();
    };
  }, [navigation, route?.params?.forceShow]);

  const handleFinishCarousel = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CAROUSEL_COMPLETED, 'true');
    } catch {
      // Continue to AuthGateway even if storage write fails
    }
    navigation.replace('AuthGateway');
  };

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    await setLanguage(code);
    setSelectedLang(code);
    setTestedSpeechText(null);
  };

  const handlePlayVoiceIntro = async (code: SupportedLanguage) => {
    if (isPlayingIntro) {
      await voiceService.stop();
      setIsPlayingIntro(false);
      return;
    }

    const text = WELCOME_VOICE_TEXTS[code]?.greeting || WELCOME_VOICE_TEXTS.en.greeting;
    setIsPlayingIntro(true);
    try {
      await voiceService.speak(text, {
        language: code,
        force: true,
      });
    } catch {
      // Handled
    } finally {
      setIsPlayingIntro(false);
    }
  };

  const handleTrySpeaking = async (code: SupportedLanguage) => {
    if (isListeningTest) {
      voiceRecordingService.cancelRecording();
      setIsListeningTest(false);
      return;
    }

    const hasPerm = await voiceRecordingService.requestMicrophonePermission();
    if (!hasPerm) {
      return;
    }

    voiceService.stop();
    setIsListeningTest(true);
    setTestedSpeechText(null);

    const started = await voiceRecordingService.startRecording();
    if (!started) {
      setIsListeningTest(false);
      return;
    }

    // Auto-stop preview recording after 3.5 seconds
    setTimeout(async () => {
      try {
        const recording = await voiceRecordingService.stopRecording();
        setIsListeningTest(false);
        if (recording && recording.audioBase64) {
          const res = await bhashiniClientService.transcribe(recording.audioBase64, code);
          if (res && res.transcript && res.transcript.trim()) {
            setTestedSpeechText(res.transcript.trim());
          }
        }
      } catch {
        setIsListeningTest(false);
      }
    }, 3500);
  };

  const handleProceedAfterLanguage = async () => {
    voiceService.stop();
    setNeedsLanguageSelection(false);
    const completed = await AsyncStorage.getItem(STORAGE_KEYS.CAROUSEL_COMPLETED);
    if (completed === 'true') {
      navigation.replace('AuthGateway');
    }
  };

  if (checkingStatus) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel="Loading ECOSETU">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  // First-Launch Language Onboarding Step
  if (needsLanguageSelection) {
    const currentCode = selectedLang || language || 'en';
    const config = WELCOME_VOICE_TEXTS[currentCode] || WELCOME_VOICE_TEXTS.en;

    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.firstLaunchContainer}>
            <EcoSetuLogo size={64} showGlow style={{ marginBottom: 16 }} />

            <Text style={styles.firstLaunchTitle}>
              {selectedLang ? 'ECOSETU Voice' : 'Choose Language'}
            </Text>
            <Text style={styles.firstLaunchSubtitle}>
              {selectedLang ? 'भाषा • Language' : 'ଓଡ଼ିଆ • हिन्दी • मराठी • English'}
            </Text>

            {!selectedLang ? (
              <View style={styles.langList}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.code}
                    style={styles.firstLaunchLangBtn}
                    onPress={() => {
                      setLanguage(opt.code);
                      handleSelectLanguage(opt.code);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${opt.englishName}, ${opt.label}`}
                  >
                    <Text style={styles.langBtnNative}>{opt.label}</Text>
                    <Text style={styles.langBtnEnglish}>{opt.englishName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.voiceIntroCard}>
                <Text style={styles.voiceGreetingText}>{config.greeting}</Text>

                {/* Voice Interaction Controls */}
                <View style={styles.voiceActionsRow}>
                  <TouchableOpacity
                    style={[styles.voiceActionBtn, isPlayingIntro && styles.voiceActionBtnActive]}
                    onPress={() => handlePlayVoiceIntro(currentCode)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={config.listenBtn}
                  >
                    <AppIcon name={isPlayingIntro ? 'square' : 'volume'} size={18} color={isPlayingIntro ? '#EF4444' : '#10B981'} />
                    <Text style={[styles.voiceActionBtnText, isPlayingIntro && { color: '#EF4444' }]}>
                      {config.listenBtn}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.voiceActionBtn, isListeningTest && styles.voiceActionBtnActive]}
                    onPress={() => handleTrySpeaking(currentCode)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={config.trySpeakingBtn}
                  >
                    <AppIcon name="mic" size={18} color={isListeningTest ? '#22D3EE' : '#10B981'} />
                    <Text style={[styles.voiceActionBtnText, isListeningTest && { color: '#22D3EE' }]}>
                      {isListeningTest ? config.listeningText : config.trySpeakingBtn}
                    </Text>
                  </TouchableOpacity>
                </View>

                {testedSpeechText ? (
                  <View style={styles.recognizedBox}>
                    <Text style={styles.recognizedLabel}>{config.recognizedPrefix}</Text>
                    <Text style={styles.recognizedText}>"{testedSpeechText}"</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={handleProceedAfterLanguage}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={config.continueBtn}
                >
                  <Text style={styles.continueBtnText}>{config.continueBtn} →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeLangLink}
                  onPress={() => setSelectedLang(null)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Change Language"
                >
                  <Text style={styles.changeLangLinkText}>Change Language / ଭାଷା ବଦଳାନ୍ତୁ</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  return (
    <View style={styles.container}>
      <EcoCarousel
        onComplete={handleFinishCarousel}
        onSkip={handleFinishCarousel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  firstLaunchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  firstLaunchTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  firstLaunchSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  langList: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  firstLaunchLangBtn: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  langBtnNative: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  langBtnEnglish: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  voiceIntroCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  voiceGreetingText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  voiceActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  voiceActionBtn: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 12,
  },
  voiceActionBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  voiceActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recognizedBox: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recognizedLabel: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
    marginBottom: 2,
  },
  recognizedText: {
    fontSize: 14,
    color: '#F8FAFC',
    fontStyle: 'italic',
  },
  continueBtn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#02080D',
  },
  changeLangLink: {
    marginTop: 14,
    padding: 8,
  },
  changeLangLinkText: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
});

export default LandingScreen;
