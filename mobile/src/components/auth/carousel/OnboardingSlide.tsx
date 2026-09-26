/**
 * OnboardingSlide — Full-bleed responsive slide layout
 *
 * Designed to adapt responsively across diverse screen dimensions:
 * - 360 × 640
 * - 360 × 800
 * - 390 × 844
 * - 412 × 915
 *
 * Visual Hierarchy:
 *  ┌─────────────────────────────┐
 *  │   [Category chip tag]       │  ← Top safe spacing
 *  │                             │
 *  │      [Graphic Area]         │  ← Centered flex hero
 *  │                             │
 *  │   [Stat badges row]         │  ← Dynamic wrap badges
 *  │                             │
 *  │   Headline                  │  ← Responsive typography
 *  │   Body copy                 │
 *  └─────────────────────────────┘
 *
 * All in-transitions are driven by the `active` prop.
 * GPU-safe: opacity + translate only.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { OnboardingSlide as SlideData } from './data/slideData';
import { OnboardingStatBadge } from './OnboardingStatBadge';
import { GraphicEwasteCrisis } from './graphics2/GraphicEwasteCrisis';
import { GraphicEcosystem } from './graphics2/GraphicEcosystem';
import { GraphicSmartCollection } from './graphics2/GraphicSmartCollection';
import { GraphicTraceability } from './graphics2/GraphicTraceability';
import { GraphicImpact } from './graphics2/GraphicImpact';
import { useTranslation } from '../../../i18n';

interface Props {
  slide: SlideData;
  active: boolean;
  screenWidth?: number;
}

function renderGraphic(slide: SlideData, active: boolean) {
  switch (slide.theme) {
    case 'crisis':
      return <GraphicEwasteCrisis active={active} />;
    case 'ecosystem':
      return <GraphicEcosystem active={active} />;
    case 'smart':
      return <GraphicSmartCollection active={active} />;
    case 'trace':
      return <GraphicTraceability active={active} />;
    case 'impact':
      return <GraphicImpact active={active} />;
    default:
      return null;
  }
}

export const OnboardingSlide: React.FC<Props> = ({ slide, active, screenWidth }) => {
  const { width: windowWidth, height } = useWindowDimensions();
  const width = screenWidth || windowWidth;
  const { t } = useTranslation();

  const isSmallScreen = height < 700;
  const isUltraSmallScreen = height < 640;

  // Compute dynamic scale for hero graphic based on available dimensions
  const availableHeroHeight = Math.max(120, height * 0.32);
  const heroScaleFactor = Math.min(
    1.0,
    (width * 0.82) / 280,
    availableHeroHeight / 210
  );

  const chipAnim = useRef(new Animated.Value(0)).current;
  const graphicAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      chipAnim.setValue(0);
      graphicAnim.setValue(0);
      textAnim.setValue(0);

      Animated.stagger(100, [
        Animated.timing(chipAnim, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(graphicAnim, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [active, chipAnim, graphicAnim, textAnim]);

  const chipTranslateY = chipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });
  const graphicTranslateY = graphicAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const textTranslateY = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <View style={[styles.slide, { width }]}>
      {/* Category Chip */}
      <Animated.View
        style={[
          styles.chipWrap,
          {
            opacity: chipAnim,
            transform: [{ translateY: chipTranslateY }],
            marginTop: isSmallScreen ? 4 : 10,
            marginBottom: isSmallScreen ? 6 : 12,
          },
        ]}
      >
        <View
          style={[
            styles.chip,
            {
              backgroundColor: slide.tagBg,
              borderColor: slide.tagColor + '50',
            },
          ]}
        >
          <View style={[styles.chipDot, { backgroundColor: slide.tagColor }]} />
          <Text style={[styles.chipText, { color: slide.tagColor }]}>{slide.tag}</Text>
        </View>
      </Animated.View>

      {/* Hero Visual Area - Centered & Responsive */}
      <View style={styles.heroSection}>
        <Animated.View
          style={[
            styles.graphicContainer,
            {
              width: Math.round(280 * heroScaleFactor),
              height: Math.round(230 * heroScaleFactor),
              opacity: graphicAnim,
              transform: [
                { scale: heroScaleFactor },
                { translateY: graphicTranslateY },
              ],
            },
          ]}
        >
          {renderGraphic(slide, active)}
        </Animated.View>
      </View>

      {/* Content Area: Stats + Typography */}
      <View style={styles.contentSection}>
        {/* Stat Badges Row */}
        <View
          style={[
            styles.statsRow,
            {
              marginBottom: isSmallScreen ? 6 : 14,
            },
          ]}
        >
          {slide.stats.map((stat, i) => (
            <OnboardingStatBadge
              key={i}
              badge={stat}
              delay={200 + i * 80}
              active={active}
              accentColor={slide.tagColor}
            />
          ))}
        </View>

        {/* Text Block */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textAnim,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.headline,
              {
                fontSize: isUltraSmallScreen ? 18 : isSmallScreen ? 20 : 23,
                lineHeight: isUltraSmallScreen ? 23 : isSmallScreen ? 26 : 30,
                marginBottom: isSmallScreen ? 4 : 8,
              },
            ]}
          >
            {t(`onboarding.${slide.titleKey}`)}
          </Text>
          <Text
            style={[
              styles.body,
              {
                fontSize: isUltraSmallScreen ? 12 : isSmallScreen ? 13 : 14,
                lineHeight: isUltraSmallScreen ? 17 : isSmallScreen ? 18 : 20,
              },
            ]}
          >
            {t(`onboarding.${slide.subtitleKey}`)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  chipWrap: {
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heroSection: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  headline: {
    fontWeight: '900',
    color: '#F0FDF4',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  body: {
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    maxWidth: 330,
  },
});

export default OnboardingSlide;
