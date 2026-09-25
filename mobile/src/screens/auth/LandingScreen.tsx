import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from '../../navigation/types';
import { EcoCarousel } from '../../components/auth/carousel';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { STORAGE_KEYS } from '../../utils/constants';
import { useI18n, SupportedLanguage, LANGUAGE_OPTIONS } from '../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export const LandingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { setLanguage } = useI18n();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [needsLanguageSelection, setNeedsLanguageSelection] = useState(false);

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

  // Minimal First-Launch Language Selection Step (SIH-LANG-002, SIH-LANG-003)
  if (needsLanguageSelection) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.firstLaunchContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🌐</Text>
            </View>
            <Text style={styles.firstLaunchTitle}>Choose Language</Text>
            <Text style={styles.firstLaunchSubtitle}>भाषा चुनें • भाषा निवडा • ଭାଷା ବାଛନ୍ତୁ</Text>

            <View style={styles.langList}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={styles.firstLaunchLangBtn}
                  onPress={async () => {
                    await setLanguage(opt.code);
                    setNeedsLanguageSelection(false);
                    const completed = await AsyncStorage.getItem(STORAGE_KEYS.CAROUSEL_COMPLETED);
                    if (completed === 'true') {
                      navigation.replace('AuthGateway');
                    }
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 32,
  },
  firstLaunchTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  firstLaunchSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    textAlign: 'center',
  },
  langList: {
    width: '100%',
    maxWidth: 360,
    gap: 14,
  },
  firstLaunchLangBtn: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
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
});

export default LandingScreen;
