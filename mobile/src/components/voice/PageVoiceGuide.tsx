/**
 * PageVoiceGuide.tsx
 * Collector-First Reusable Page Voice Guide component for ECOSETU.
 * 
 * Provides an accessible, institutional voice explanation for important collector screens.
 * Seamlessly integrates BHASHINI TTS backend voice engine with native Indic phonetic rules.
 * Supports: Odia (or), Hindi (hi), Marathi (mr), English (en).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useI18n } from '../../i18n';
import { voiceService } from '../../services/voiceService';
import { getPageVoiceGuideText } from '../../data/simpleLanguageExplanations';
import { AppIcon } from '../ui/AppIcon';

interface Props {
  pageKey: string;
  customText?: string;
  title?: string;
  style?: ViewStyle;
  compact?: boolean;
}

export const PageVoiceGuide: React.FC<Props> = ({
  pageKey,
  customText,
  title,
  style,
  compact = false,
}) => {
  const { language } = useI18n();
  const activeLang = language || 'en';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const guideText = customText || getPageVoiceGuideText(pageKey, activeLang);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        voiceService.stop();
      }
    };
  }, [isPlaying]);

  const handleTogglePlay = useCallback(async () => {
    if (isPlaying) {
      await voiceService.stop();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    if (!guideText || !guideText.trim()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const started = await voiceService.speak(guideText, {
        language: activeLang,
        force: true,
      });

      setIsLoading(false);
      if (started) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    } catch {
      setIsLoading(false);
      setIsPlaying(false);
      setErrorMessage(
        activeLang === 'or'
          ? 'ଅଡିଓ ଚଲାଇବାରେ ସମସ୍ୟା ହେଲା। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।'
          : activeLang === 'hi'
          ? 'ऑडियो चलाने में समस्या हुई। कृपया पुनः प्रयास करें।'
          : activeLang === 'mr'
          ? 'ऑडिओ प्ले करण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Unable to play voice guide. Please try again.'
      );
      setTimeout(() => setErrorMessage(null), 4000);
    }
  }, [isPlaying, guideText, activeLang]);

  if (!guideText) {
    return null;
  }

  const defaultButtonLabel = isPlaying
    ? activeLang === 'or'
      ? 'ବନ୍ଦ କରନ୍ତୁ'
      : activeLang === 'hi'
      ? 'रोकें'
      : activeLang === 'mr'
      ? 'थांबवा'
      : 'Stop'
    : isLoading
    ? activeLang === 'or'
      ? 'ଅଡିଓ ପ୍ରସ୍ତୁତ ହେଉଛି...'
      : activeLang === 'hi'
      ? 'तैयार हो रहा है...'
      : activeLang === 'mr'
      ? 'तयार होत आहे...'
      : 'Loading...'
    : activeLang === 'or'
    ? 'ଶୁଣନ୍ତୁ'
    : activeLang === 'hi'
    ? 'सुनें'
    : activeLang === 'mr'
    ? 'ऐका'
    : 'Listen';

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          isPlaying && styles.compactPlaying,
          style,
        ]}
        onPress={handleTogglePlay}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${defaultButtonLabel} page guide`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : (
          <AppIcon
            name={isPlaying ? 'square' : 'volume'}
            size={18}
            color={isPlaying ? '#EF4444' : '#10B981'}
          />
        )}
        <Text style={[styles.compactText, isPlaying && styles.compactTextPlaying]}>
          {defaultButtonLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.contentRow}>
        <View style={styles.iconBadge}>
          <AppIcon name="volume" size={18} color="#10B981" />
        </View>
        <View style={styles.textContainer}>
          {title ? <Text style={styles.titleText}>{title}</Text> : null}
          <Text style={styles.previewText} numberOfLines={2}>
            {guideText}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.playButton,
            isPlaying && styles.playButtonActive,
            isLoading && styles.playButtonLoading,
          ]}
          onPress={handleTogglePlay}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${defaultButtonLabel} page guide`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.buttonInner}>
              <AppIcon
                name={isPlaying ? 'square' : 'volume'}
                size={16}
                color={isPlaying ? '#EF4444' : '#02080D'}
              />
              <Text style={[styles.buttonLabel, isPlaying && styles.buttonLabelActive]}>
                {defaultButtonLabel}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <AppIcon name="alert" size={14} color="#F87171" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#071E22',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6EE7B7',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#E2E8F0',
    fontWeight: '400',
  },
  playButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    minHeight: 44,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  playButtonLoading: {
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#02080D',
  },
  buttonLabelActive: {
    color: '#F87171',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
  },
  compactPlaying: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#EF4444',
  },
  compactText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  compactTextPlaying: {
    color: '#F87171',
  },
});

export default PageVoiceGuide;
