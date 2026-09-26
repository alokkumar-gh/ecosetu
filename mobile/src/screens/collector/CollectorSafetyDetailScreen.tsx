/**
 * CollectorSafetyDetailScreen.tsx
 * Low-Literacy Pictorial & Audio Safety Detail for Informal E-Waste Collectors
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 9: Safety Detail Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { AppIcon, AppIconName } from '../../components/ui/AppIcon';
import {
  getSafetyTopicById,
  generateSafetySpeechText,
  SafetyTopic,
} from '../../data/safetyGuidance';
import voiceService, { AnnouncementPriority } from '../../services/voiceService';
import { useTranslation } from '../../i18n';

const getSafetyIcon = (topicId: string): AppIconName => {
  const upper = topicId.toUpperCase();
  if (upper.includes('BATTER')) return 'battery';
  if (upper.includes('CRT') || upper.includes('TV') || upper.includes('MONITOR')) return 'tv';
  if (upper.includes('PCB') || upper.includes('CIRCUIT')) return 'cpu';
  if (upper.includes('LAMP') || upper.includes('BULB') || upper.includes('MERCURY')) return 'lightbulb';
  if (upper.includes('WIRE') || upper.includes('CABLE') || upper.includes('BURN')) return 'cable';
  return 'shieldCheck';
};

export const CollectorSafetyDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, language } = useTranslation();

  const topicId = route.params?.topicId || 'SAFE-BATTERIES';
  const topic: SafetyTopic =
    getSafetyTopicById(topicId) || getSafetyTopicById('SAFE-BATTERIES')!;

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  const localizedTitle = t(topic.titleKey as any) || topic.category;
  const localizedSubtitle = t(topic.subtitleKey as any) || 'Safety Guide';
  const localizedWarning = t(topic.warningKey as any) || 'Caution required';
  const localizedWhyDangerous =
    t(topic.whyDangerousKey as any) ||
    'Uncontrolled processing or burning releases hazardous toxins.';

  const localizedDont = topic.dontKeys.map((k) => t(k as any) || k);
  const localizedDo = topic.doKeys.map((k) => t(k as any) || k);

  const handleSpeak = async () => {
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const speechText = generateSafetySpeechText(topic, language);
    try {
      await voiceService.speak(speechText, {
        language,
        priority: AnnouncementPriority.HIGH,
        force: true,
      });
    } catch {
      // internal error handled in voiceService
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <TopAppBar
          title={localizedTitle}
          subtitle={topic.category}
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <AppIcon name={getSafetyIcon(topic.id)} size={28} color="#10B981" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{localizedTitle}</Text>
              <Text style={styles.heroSubtitle}>{localizedSubtitle}</Text>
            </View>
          </View>

          {/* Audio TTS Action Button */}
          <TouchableOpacity
            style={[
              styles.speechButton,
              isSpeaking && styles.speechButtonActive,
            ]}
            onPress={handleSpeak}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isSpeaking
                ? 'Stop speaking safety guide'
                : 'Listen to this safety guide in spoken audio'
            }
          >
            <View style={styles.speechIconWrap}>
              <AppIcon name={isSpeaking ? 'close' : 'volume'} size={20} color="#10B981" />
            </View>
            <View style={styles.speechTextContainer}>
              <Text style={styles.speechTitle}>
                {isSpeaking
                  ? 'Speaking Safety Guide...'
                  : t('safety.speakGuide') || 'LISTEN TO SAFETY GUIDE'}
              </Text>
              <Text style={styles.speechSub}>
                {isSpeaking
                  ? 'Tap to stop voice playback'
                  : 'Clear spoken instructions in ' + language.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <AppIcon name="alert" size={18} color="#F59E0B" />
            <Text style={[styles.warningBannerText, { marginLeft: 10, flex: 1 }]}>{localizedWarning}</Text>
          </View>

          {/* Section: Why Dangerous */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <AppIcon name="alert" size={16} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>
                {t('safety.whyDangerous') || 'WHY IT IS DANGEROUS'}
              </Text>
            </View>
            <Text style={styles.sectionBodyText}>{localizedWhyDangerous}</Text>
          </View>

          {/* Section: DON'T (Unsafe Practices) */}
          <View style={[styles.sectionCard, styles.dontCard]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dontHeaderBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <AppIcon name="close" size={12} color="#EF4444" />
                <Text style={styles.dontBadgeText}>
                  {t('safety.dontTitle') || 'DO NOT (Unsafe Practices)'}
                </Text>
              </View>
            </View>
            {localizedDont.map((rule, idx) => (
              <View key={`dont-${idx}`} style={styles.ruleRow}>
                <View style={styles.dontIndexBadge}>
                  <Text style={styles.dontIndexNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.dontRuleText}>{rule}</Text>
              </View>
            ))}
          </View>

          {/* Section: DO (Safe Practices) */}
          <View style={[styles.sectionCard, styles.doCard]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.doHeaderBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <AppIcon name="check" size={12} color="#10B981" />
                <Text style={styles.doBadgeText}>
                  {t('safety.doTitle') || 'DO (Safe Practices)'}
                </Text>
              </View>
            </View>
            {localizedDo.map((rule, idx) => (
              <View key={`do-${idx}`} style={styles.ruleRow}>
                <View style={styles.doIndexBadge}>
                  <Text style={styles.doIndexNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.doRuleText}>{rule}</Text>
              </View>
            ))}
          </View>

          {/* First Aid / Health Notice */}
          <View style={[styles.healthNotice, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <AppIcon name="shieldCheck" size={20} color="#34D399" />
            <Text style={[styles.healthNoticeText, { flex: 1 }]}>
              Stop handling the material and seek appropriate professional help if
              you are injured or feel unwell.
            </Text>
          </View>

          {/* Educational Disclaimer */}
          <View style={styles.statutoryCard}>
            <Text style={styles.statutoryText}>
              {t('safety.disclaimer') ||
                'Safety guidance is informational. Follow applicable local rules and authorized recycler instructions.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 42, 46, 0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    padding: 16,
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroIcon: {
    fontSize: 26,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  speechButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  speechButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  speechIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  speechIcon: {
    fontSize: 20,
  },
  speechTextContainer: {
    flex: 1,
  },
  speechTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  speechSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  warningBannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fca5a5',
    flex: 1,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
  sectionBodyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 19,
  },
  dontCard: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  dontHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dontBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  dontBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f87171',
    letterSpacing: 0.3,
  },
  dontIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  dontIndexNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f87171',
  },
  dontRuleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
    lineHeight: 18,
  },
  doCard: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  doHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  doBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.3,
  },
  doIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  doIndexNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34d399',
  },
  doRuleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
    lineHeight: 18,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  healthNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  healthNoticeIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  healthNoticeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
    lineHeight: 16,
  },
  statutoryCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 10,
  },
  statutoryText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 14,
    textAlign: 'center',
  },
});

export default CollectorSafetyDetailScreen;
