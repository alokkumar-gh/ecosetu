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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  getSafetyTopicById,
  generateSafetySpeechText,
  getTopicColorTheme,
  SafetyTopic,
} from '../../data/safetyGuidance';
import voiceService, { AnnouncementPriority } from '../../services/voiceService';
import { useTranslation } from '../../i18n';

export const CollectorSafetyDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, language } = useTranslation();

  const topicId = route.params?.topicId || 'SAFE-BATTERIES';
  const topic: SafetyTopic =
    getSafetyTopicById(topicId) || getSafetyTopicById('SAFE-BATTERIES')!;
  const colorTheme = getTopicColorTheme(topic.id);

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up TTS when leaving screen
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to Safety Center"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerCategoryBadge}>{topic.category}</Text>
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {localizedTitle}
            </Text>
          </View>
        </View>

        {/* Hero Pictorial Illustration Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colorTheme.background,
              borderColor: colorTheme.border,
            },
          ]}
        >
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>{topic.icon}</Text>
          </View>
          <Text style={styles.heroTitle}>{localizedTitle}</Text>
          <Text style={styles.heroSubtitle}>{localizedSubtitle}</Text>
        </View>

        {/* Audio TTS Action Button Prominent */}
        <TouchableOpacity
          style={[
            styles.speechButton,
            isSpeaking && styles.speechButtonActive,
          ]}
          onPress={handleSpeak}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            isSpeaking
              ? 'Stop speaking safety guide'
              : 'Listen to this safety guide in spoken audio'
          }
        >
          <Text style={styles.speechIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
          <View style={styles.speechTextContainer}>
            <Text style={styles.speechTitle}>
              {isSpeaking
                ? 'Speaking Safety Guide...'
                : t('safety.speakGuide') || 'SPEAK THIS SAFETY GUIDE'}
            </Text>
            <Text style={styles.speechSub}>
              {isSpeaking
                ? 'Tap here to stop voice playback'
                : 'Listen to clear audio in ' + language.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerIcon}>⚠️</Text>
          <Text style={styles.warningBannerText}>{localizedWarning}</Text>
        </View>

        {/* Section: Why Dangerous */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderIcon}>⚠️</Text>
            <Text style={styles.sectionTitle}>
              {t('safety.whyDangerous') || 'WHY IT IS DANGEROUS'}
            </Text>
          </View>
          <Text style={styles.sectionBodyText}>{localizedWhyDangerous}</Text>
        </View>

        {/* Section: DON'T (Unsafe Practices) */}
        <View style={[styles.sectionCard, styles.dontCard]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.dontHeaderBadge}>
              <Text style={styles.dontBadgeIcon}>❌</Text>
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
            <View style={styles.doHeaderBadge}>
              <Text style={styles.doBadgeIcon}>✅</Text>
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

        {/* First Aid / Health Notice (Non-medical, common sense safety) */}
        <View style={styles.healthNotice}>
          <Text style={styles.healthNoticeIcon}>🩺</Text>
          <Text style={styles.healthNoticeText}>
            Stop handling the material and seek appropriate professional help if
            you are injured or feel unwell.
          </Text>
        </View>

        {/* Statutory Educational Disclaimer */}
        <View style={styles.statutoryCard}>
          <Text style={styles.statutoryText}>
            {t('safety.disclaimer') ||
              'Safety guidance is informational. Follow applicable local rules and authorized recycler instructions.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backArrow: {
    fontSize: 22,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerCategoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerScreenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  heroIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heroIcon: {
    fontSize: 48,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
  },
  speechButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    minHeight: 56,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  speechButtonActive: {
    backgroundColor: '#d97706',
  },
  speechIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  speechTextContainer: {
    flex: 1,
  },
  speechTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  speechSub: {
    fontSize: 12,
    color: '#e0f2fe',
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#fecdd3',
  },
  warningBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#be123c',
    flex: 1,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  sectionBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  dontCard: {
    backgroundColor: '#fffbfa',
    borderColor: '#fca5a5',
  },
  dontHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dontBadgeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dontBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#991b1b',
  },
  dontIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  dontIndexNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
  },
  dontRuleText: {
    fontSize: 13,
    color: '#7f1d1d',
    flex: 1,
    lineHeight: 19,
    fontWeight: '600',
  },
  doCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  doHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doBadgeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  doBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#166534',
  },
  doIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  doIndexNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  doRuleText: {
    fontSize: 13,
    color: '#14532d',
    flex: 1,
    lineHeight: 19,
    fontWeight: '600',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  healthNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  healthNoticeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  healthNoticeText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  statutoryCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statutoryText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default CollectorSafetyDetailScreen;
