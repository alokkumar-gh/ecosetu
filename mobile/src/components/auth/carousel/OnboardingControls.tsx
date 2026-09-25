/**
 * OnboardingControls — Bottom action bar
 *
 * Shows Skip (left) + Next arrow (right) on intermediate slides.
 * Shows full-width "Get Started" emerald CTA on the last slide.
 *
 * Transitions between states with a cross-fade.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTranslation } from '../../../i18n';
import { OnboardingSlide } from './data/slideData';

interface Props {
  isLastSlide: boolean;
  onSkip: () => void;
  onNext: () => void;
  onGetStarted: () => void;
  activeSlide: OnboardingSlide;
}

export const OnboardingControls: React.FC<Props> = ({
  isLastSlide,
  onSkip,
  onNext,
  onGetStarted,
  activeSlide,
}) => {
  const { t } = useTranslation();
  const ctaScale = useRef(new Animated.Value(1)).current;
  const normalOpacity = useRef(new Animated.Value(isLastSlide ? 0 : 1)).current;
  const ctaOpacity = useRef(new Animated.Value(isLastSlide ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(normalOpacity, {
        toValue: isLastSlide ? 0 : 1,
        duration: 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ctaOpacity, {
        toValue: isLastSlide ? 1 : 0,
        duration: 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isLastSlide, normalOpacity, ctaOpacity]);

  const handleCtaPress = () => {
    Animated.sequence([
      Animated.timing(ctaScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(ctaScale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onGetStarted());
  };

  return (
    <View style={styles.container}>
      {/* Normal slide controls (Skip / Next) */}
      <Animated.View
        style={[styles.normalRow, { opacity: normalOpacity }]}
        pointerEvents={isLastSlide ? 'none' : 'auto'}
      >
        <TouchableOpacity
          onPress={onSkip}
          activeOpacity={0.7}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>{t('onboarding.skip', 'Skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.82}
          style={[styles.nextBtn, { backgroundColor: activeSlide.tagColor }]}
          accessibilityRole="button"
          accessibilityLabel="Next slide"
        >
          <Text style={[styles.nextArrow, { color: '#020C14' }]}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Last slide: Get Started CTA */}
      <Animated.View
        style={[styles.ctaRow, { opacity: ctaOpacity }]}
        pointerEvents={isLastSlide ? 'auto' : 'none'}
      >
        <TouchableOpacity
          onPress={handleCtaPress}
          activeOpacity={0.88}
          style={styles.ctaBtn}
          accessibilityRole="button"
          accessibilityLabel="Get started with EcoSetu"
        >
          <Animated.View
            style={[styles.ctaInner, { transform: [{ scale: ctaScale }] }]}
          >
            <Text style={styles.ctaText}>{t('onboarding.getStarted', 'Get Started')}</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: 68,
    justifyContent: 'center',
  },
  normalRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  skipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.4,
  },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 7,
  },
  nextArrow: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  ctaRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  ctaBtn: {
    width: '100%',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 8,
    gap: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#020C14',
    letterSpacing: 0.7,
  },
  ctaArrow: {
    fontSize: 18,
    fontWeight: '900',
    color: '#020C14',
  },
});
