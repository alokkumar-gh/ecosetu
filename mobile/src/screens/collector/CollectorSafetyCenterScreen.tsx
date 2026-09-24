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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import {
  SAFETY_TOPICS,
  SafetyTopic,
  generateSafetyOverviewSpeechText,
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
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <TopAppBar
          title={t('safety.centerTitle') || 'Safety Center'}
          subtitle={
            t('safety.centerSubtitle') ||
            'Pictorial & audio guide for safe e-waste handling.'
          }
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
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
            activeOpacity={0.85}
          >
            <View style={styles.audioIconWrapper}>
              <Text style={styles.audioBannerIcon}>
                {isSpeaking ? '⏹️' : '🔊'}
              </Text>
            </View>
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

          {/* Section Heading */}
          <Text style={styles.sectionHeader}>
            {t('safety.topicsTitle') || 'MATERIAL HAZARDS & SAFE PRACTICES'}
          </Text>

          {/* Topic Grid */}
          <View style={styles.gridContainer}>
            {SAFETY_TOPICS.map((topic: SafetyTopic) => {
              const localizedTitle = t(topic.titleKey as any) || topic.category;
              const localizedWarning = t(topic.warningKey as any) || 'Hazardous handling caution';

              return (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.topicCard}
                  onPress={() => navigateToDetail(topic.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${localizedTitle}: ${localizedWarning}. Tap to learn safety`}
                >
                  <View style={styles.cardTopRow}>
                    {/* Visual Icon Badge */}
                    <View style={styles.iconCircle}>
                      <Text style={styles.topicEmoji}>{topic.icon}</Text>
                    </View>

                    {/* Danger / Severity Pill */}
                    <View style={styles.severityBadge}>
                      <Text style={styles.severityText}>HIGH RISK</Text>
                    </View>
                  </View>

                  <View style={styles.topicContent}>
                    <Text style={styles.topicTitle}>{localizedTitle}</Text>
                    <Text style={styles.topicWarning} numberOfLines={2}>
                      {localizedWarning}
                    </Text>
                  </View>

                  {/* Learn Safety Action Row */}
                  <View style={styles.actionRow}>
                    <Text style={styles.actionText}>
                      {t('safety.tapToLearn') || 'View Safety Guide'}
                    </Text>
                    <Text style={styles.actionArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emergency Safety Footer */}
          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyIcon}>⚠️</Text>
            <View style={styles.emergencyTextWrap}>
              <Text style={styles.emergencyTitle}>
                {t('safety.emergencyNoticeTitle') || 'Safety First Protocol'}
              </Text>
              <Text style={styles.emergencyDesc}>
                {t('safety.emergencyNoticeDesc') ||
                  'Never burn cables, break CRT glass, or puncture lithium batteries. Always deliver intact to authorized facilities.'}
              </Text>
            </View>
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
  audioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  audioBannerSpeaking: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  audioIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioBannerIcon: {
    fontSize: 22,
  },
  audioBannerTextContainer: {
    flex: 1,
  },
  audioBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  audioBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  offlineNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  offlineNoticeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  offlineNoticeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    flex: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  gridContainer: {
    gap: 12,
  },
  topicCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.18)',
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicEmoji: {
    fontSize: 22,
  },
  severityBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f87171',
    letterSpacing: 0.5,
  },
  topicContent: {
    marginBottom: 12,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  topicWarning: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22D3EE',
  },
  actionArrow: {
    fontSize: 15,
    fontWeight: '800',
    color: '#22D3EE',
  },
  emergencyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  emergencyIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  emergencyTextWrap: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fbbf24',
    marginBottom: 2,
  },
  emergencyDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 16,
  },
});

export default CollectorSafetyCenterScreen;
