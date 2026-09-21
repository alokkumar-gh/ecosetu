/**
 * ReadAloudButton.tsx
 * Unified accessible Voice Assistance button for ECOSETU.
 *
 * Provides a consistent, accessible glassmorphic control to read card or screen
 * summaries aloud across Citizen, Collector, Recycler, and Admin portals.
 *
 * States:
 * - IDLE: Speaker icon with "Read Aloud"
 * - SPEAKING: Stop icon with "Stop" and active audio pulse indicator
 * - UNAVAILABLE: Disabled when TTS capability is missing
 *
 * Source of Truth: docs/08_UI_UX_SPECIFICATION.md
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';
import { useI18n } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export type ReadAloudVariant = 'pill' | 'compact' | 'icon';

interface Props {
  text?: string | (() => string);
  textToRead?: string;
  variant?: ReadAloudVariant;
  size?: 'sm' | 'md' | 'lg' | string;
  priority?: AnnouncementPriority;
  language?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  label?: string;
  accessibilityLabel?: string;
  onStart?: () => void;
  onStop?: () => void;
}

export const ReadAloudButton: React.FC<Props> = ({
  text,
  textToRead,
  variant: propVariant,
  size,
  priority = AnnouncementPriority.NORMAL,
  language: propLang,
  style,
  textStyle,
  label,
  accessibilityLabel,
  onStart,
  onStop,
}) => {
  const variant: ReadAloudVariant = propVariant || (size === 'sm' ? 'compact' : 'pill');
  const { language: currentLang, t } = useI18n();
  const effectiveLang = propLang || currentLang;

  const [isSpeakingThis, setIsSpeakingThis] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const effectiveText = useMemo(() => {
    const raw = text ?? textToRead ?? '';
    if (typeof raw === 'function') {
      return raw();
    }
    return raw;
  }, [text, textToRead]);

  useEffect(() => {
    voiceService.isAvailable().then(setIsAvailable).catch(() => setIsAvailable(true));
  }, []);

  const handlePress = useCallback(async () => {
    if (isSpeakingThis) {
      await voiceService.stop();
      setIsSpeakingThis(false);
      onStop?.();
      return;
    }

    const content = effectiveText;
    if (!content || !content.trim()) return;

    setIsSpeakingThis(true);
    onStart?.();

    try {
      const spoke = await voiceService.speak(content, {
        priority,
        language: effectiveLang,
        force: true, // Manual user invocation always speaks
      });
      if (!spoke) {
        setIsSpeakingThis(false);
      }
    } catch {
      setIsSpeakingThis(false);
    }
  }, [isSpeakingThis, effectiveText, priority, effectiveLang, onStart, onStop]);

  const defaultLabel = isSpeakingThis
    ? (t('voice.stopSpeech') || 'Stop')
    : (label || t('voice.readAloud') || 'Read Aloud');

  if (!isAvailable) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.iconBtn,
          isSpeakingThis && styles.iconBtnSpeaking,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || defaultLabel}
        accessibilityState={{ busy: isSpeakingThis }}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.speakerIcon}>{isSpeakingThis ? '⏹' : '🔊'}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.compactBtn,
          isSpeakingThis && styles.compactBtnSpeaking,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || defaultLabel}
        accessibilityState={{ busy: isSpeakingThis }}
        activeOpacity={0.8}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.speakerIcon}>{isSpeakingThis ? '⏹' : '🔊'}</Text>
        <Text style={[styles.compactLabel, textStyle]}>{defaultLabel}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.pillBtn,
        isSpeakingThis && styles.pillBtnSpeaking,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || defaultLabel}
      accessibilityState={{ busy: isSpeakingThis }}
      activeOpacity={0.8}
    >
      <View style={styles.pillContent}>
        <Text style={styles.pillIcon}>{isSpeakingThis ? '⏹' : '🔊'}</Text>
        <Text
          style={[
            styles.pillLabel,
            isSpeakingThis && styles.pillLabelSpeaking,
            textStyle,
          ]}
        >
          {defaultLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
  },
  pillBtnSpeaking: {
    backgroundColor: 'rgba(20, 184, 166, 0.22)',
    borderColor: colors.primary,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillIcon: {
    fontSize: 16,
    color: colors.primary,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  pillLabelSpeaking: {
    color: colors.primary,
    fontWeight: '700',
  },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    gap: 6,
  },
  compactBtnSpeaking: {
    backgroundColor: 'rgba(20, 184, 166, 0.20)',
    borderColor: colors.primary,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnSpeaking: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: colors.primary,
  },
  speakerIcon: {
    fontSize: 20,
  },
});

export default ReadAloudButton;
