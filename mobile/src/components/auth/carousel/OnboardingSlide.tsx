/**
 * OnboardingSlide — Full-bleed slide layout
 *
 * Layout:
 *  ┌─────────────────────────────┐
 *  │   [Category chip tag]       │  ← top 10%
 *  │                             │
 *  │      [Graphic Area]         │  ← center 42%
 *  │                             │
 *  │   [Stat badges row]         │  ← 15%
 *  │                             │
 *  │   Headline                  │  ← 18%
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

export const OnboardingSlide: React.FC<Props> = ({ slide, active }) => {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

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
    outputRange: [-12, 0],
  });
  const graphicScale = graphicAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const graphicTranslateY = graphicAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const textTranslateY = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
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

      {/* Graphic Area */}
      <Animated.View
        style={[
          styles.graphicArea,
          {
            opacity: graphicAnim,
            transform: [
              { scale: graphicScale },
              { translateY: graphicTranslateY },
            ],
          },
        ]}
      >
        {renderGraphic(slide, active)}
      </Animated.View>

      {/* Stat Badges Row */}
      <View style={styles.statsRow}>
        {slide.stats.map((stat, i) => (
          <OnboardingStatBadge
            key={i}
            badge={stat}
            delay={220 + i * 100}
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
        <Text style={styles.headline}>
          {t(`onboarding.${slide.titleKey}`)}
        </Text>
        <Text style={styles.body}>
          {t(`onboarding.${slide.subtitleKey}`)}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  chipWrap: {
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 7,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  graphicArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    // Min height to keep layout stable across slides
    minHeight: 180,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F0FDF4',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  body: {
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 310,
  },
});
