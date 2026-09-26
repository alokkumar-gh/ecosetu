/**
 * EcoCarousel — Premium 5-slide Onboarding Carousel
 *
 * Entry point for the EcoSetu onboarding experience.
 *
 * Architecture:
 *  - Data-driven: all slide content comes from `slideData.ts`
 *  - Full-bleed layout: background fills screen, content layers on top
 *  - Per-slide: animated background glow pools + graphic + stats + text
 *  - Controls: pill-dot progress + Skip/Next/GetStarted
 *  - Performance: GPU-only transforms (opacity, scale, translate)
 *  - Swipe support: native ScrollView with pagingEnabled
 *
 * DO NOT import graphics from the old `graphics/` directory here.
 * All graphics now live in `graphics2/`.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLIDE_DATA, TOTAL_SLIDES } from './data/slideData';
import { OnboardingBackground } from './OnboardingBackground';
import { OnboardingSlide } from './OnboardingSlide';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingControls } from './OnboardingControls';

export interface EcoCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const EcoCarousel: React.FC<EcoCarouselProps> = ({
  onComplete,
  onSkip,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      if (index >= 0 && index < TOTAL_SLIDES && index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [width, activeIndex]
  );

  const scrollToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < TOTAL_SLIDES) {
        scrollViewRef.current?.scrollTo({
          x: index * width,
          animated: true,
        });
        setActiveIndex(index);
      }
    },
    [width]
  );

  const handleNext = useCallback(() => {
    if (activeIndex < TOTAL_SLIDES - 1) {
      scrollToSlide(activeIndex + 1);
    } else {
      onComplete();
    }
  }, [activeIndex, scrollToSlide, onComplete]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }, [onSkip, onComplete]);

  const activeSlide = SLIDE_DATA[activeIndex];
  const isLastSlide = activeIndex === TOTAL_SLIDES - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#020C14" translucent />

      {/* Full-screen atmospheric background behind status and navigation bars */}
      <OnboardingBackground slide={activeSlide} />

      {/* Safe Area protected content layer */}
      <View
        style={[
          styles.contentLayer,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Scrollable slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScroll}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {SLIDE_DATA.map((slide, index) => (
            <OnboardingSlide
              key={slide.id}
              slide={slide}
              active={index === activeIndex}
              screenWidth={width}
            />
          ))}
        </ScrollView>

        {/* Bottom control deck: pagination + action buttons protected from navigation bar */}
        <View
          style={[
            styles.bottomDeck,
            {
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Pill-dot progress */}
          <OnboardingProgress
            total={TOTAL_SLIDES}
            activeIndex={activeIndex}
            onSelectIndex={scrollToSlide}
            accentColor={activeSlide.tagColor}
          />

          {/* Skip / Next / Get Started */}
          <OnboardingControls
            isLastSlide={isLastSlide}
            onSkip={handleSkip}
            onNext={handleNext}
            onGetStarted={onComplete}
            activeSlide={activeSlide}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020C14',
  },
  contentLayer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  bottomDeck: {
    paddingTop: 8,
    gap: 8,
  },
});

export default EcoCarousel;
