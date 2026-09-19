import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { EcoCarouselBackground } from './EcoCarouselBackground';
import { EcoCarouselProgress } from './EcoCarouselProgress';
import { EcoCarouselControls } from './EcoCarouselControls';
import { SlideEwasteProblem } from './slides/SlideEwasteProblem';
import { SlideEcosetuNetwork } from './slides/SlideEcosetuNetwork';
import { SlideSmartCollection } from './slides/SlideSmartCollection';
import { SlideTraceability } from './slides/SlideTraceability';
import { SlideImpact } from './slides/SlideImpact';
import { SlideEcosetuHero } from './slides/SlideEcosetuHero';

const TOTAL_SLIDES = 6;

export interface EcoCarouselProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const EcoCarousel: React.FC<EcoCarouselProps> = ({
  onComplete,
  onSkip,
}) => {
  const { width } = useWindowDimensions();
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

  const isLastSlide = activeIndex === TOTAL_SLIDES - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#041216" translucent />

      {/* Atmospheric Fullscreen Background */}
      <EcoCarouselBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Horizontal Slides View */}
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
          <SlideEwasteProblem width={width} active={activeIndex === 0} />
          <SlideEcosetuNetwork width={width} active={activeIndex === 1} />
          <SlideSmartCollection width={width} active={activeIndex === 2} />
          <SlideTraceability width={width} active={activeIndex === 3} />
          <SlideImpact width={width} active={activeIndex === 4} />
          <SlideEcosetuHero width={width} active={activeIndex === 5} />
        </ScrollView>

        {/* Bottom Control Deck */}
        <View style={styles.bottomDeck}>
          {/* Progress Indicator */}
          <EcoCarouselProgress
            total={TOTAL_SLIDES}
            activeIndex={activeIndex}
            onSelectIndex={scrollToSlide}
          />

          {/* Action Buttons */}
          <EcoCarouselControls
            isLastSlide={isLastSlide}
            onSkip={handleSkip}
            onNext={handleNext}
            onGetStarted={onComplete}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041216',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  bottomDeck: {
    paddingBottom: 8,
  },
});
