/**
 * CollectorSafetyCenterScreen.tsx
 * Low-Literacy Pictorial & Audio Safety Center for Informal E-Waste Collectors
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 9: Safety Center
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  SAFETY_TOPICS,
  SafetyTopic,
  generateSafetyOverviewSpeechText,
  getTopicColorTheme,
} from '../../data/safetyGuidance';
import voiceService, { AnnouncementPriority } from '../../services/voiceService';
import { useTranslation } from '../../i18n';

export const CollectorSafetyCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, language } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeakOverview = async () => {
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const speechText = generateSafetyOverviewSpeechText(language);
    try {
      await voiceService.speak(speechText, {
        language,
        priority: AnnouncementPriority.HIGH,
        force: true,
      });
    } catch {
      // voiceService handles internal fallback
    } finally {
      setIsSpeaking(false);
    }
  };

  const navigateToDetail = (topicId: string) => {
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
    }
    navigation.navigate('CollectorSafetyDetail', { topicId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {t('safety.centerTitle') || 'Collector Safety Center'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('safety.centerSubtitle') ||
                'Pictorial & audio guide for safe e-waste handling. Prevention & awareness first.'}
            </Text>
          </View>
        </View>

        {/* Audio Overview Action Banner */}
        <TouchableOpacity
          style={[
            styles.audioBanner,
            isSpeaking && styles.audioBannerSpeaking,
          ]}
          onPress={handleSpeakOverview}
          accessibilityRole="button"
          accessibilityLabel={
            isSpeaking
              ? 'Stop speaking safety overview'
              : 'Listen to safety overview in your language'
          }
        >
          <Text style={styles.audioBannerIcon}>
            {isSpeaking ? '⏹️' : '🔊'}
          </Text>
          <View style={styles.audioBannerTextContainer}>
            <Text style={styles.audioBannerTitle}>
              {isSpeaking
                ? 'Speaking Safety Overview...'
                : t('safety.speakOverview') || 'Listen to Safety Overview'}
            </Text>
            <Text style={styles.audioBannerSubtitle}>
              {isSpeaking
                ? 'Tap here to stop voice playback'
                : 'Tap for spoken explanation in ' + language.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Offline Badge */}
        <View style={styles.offlineNoticeContainer}>
          <Text style={styles.offlineNoticeIcon}>📶</Text>
          <Text style={styles.offlineNoticeText}>
            {t('safety.offlineNotice') ||
              'Offline Mode: Complete safety guidance is available locally on your device.'}
          </Text>
        </View>

        {/* Topic Grid */}
        <View style={styles.gridContainer}>
          {SAFETY_TOPICS.map((topic: SafetyTopic) => {
            const colorTheme = getTopicColorTheme(topic.id);
            const localizedTitle = t(topic.titleKey as any) || topic.category;
            const localizedWarning = t(topic.warningKey as any) || 'Hazardous handling caution';

            return (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicCard,
                  { borderColor: colorTheme.border },
                ]}
                onPress={() => navigateToDetail(topic.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${localizedTitle}: ${localizedWarning}. Tap to learn safety`}
              >
                {/* Visual Icon Badge */}
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colorTheme.background },
                  ]}
                >
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                </View>

                {/* Title & Short Warning */}
                <Text style={styles.topicTitle} numberOfLines={2}>
                  {localizedTitle}
                </Text>

                <View style={styles.warningPill}>
                  <Text style={styles.warningPillIcon}>⚠️</Text>
                  <Text style={styles.topicWarning} numberOfLines={3}>
                    {localizedWarning}
                  </Text>
                </View>

                {/* Learn Safety Action */}
                <View
                  style={[
                    styles.learnActionBtn,
                    { backgroundColor: colorTheme.primary },
                  ]}
                >
                  <Text style={styles.learnActionBtnText}>
                    {t('safety.learnSafety') || 'Learn Safety'} →
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Educational Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>
            {t('safety.disclaimer') ||
              'Safety guidance is informational. Follow applicable local rules and authorized recycler instructions. Never dismantle or process hazardous scrap yourself.'}
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  audioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    minHeight: 56,
  },
  audioBannerSpeaking: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  audioBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  audioBannerTextContainer: {
    flex: 1,
  },
  audioBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  audioBannerSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2,
  },
  offlineNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  offlineNoticeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  offlineNoticeText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topicCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 220,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  topicIcon: {
    fontSize: 34,
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 38,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7ed',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
  warningPillIcon: {
    fontSize: 12,
    marginRight: 4,
    marginTop: 1,
  },
  topicWarning: {
    fontSize: 11,
    color: '#c2410c',
    flex: 1,
    lineHeight: 14,
    fontWeight: '500',
  },
  learnActionBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  learnActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  disclaimerIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    lineHeight: 16,
  },
});

export default CollectorSafetyCenterScreen;
