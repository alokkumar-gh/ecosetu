import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTranslation } from '../../../../i18n';
import { colors } from '../../../../theme/colors';
import { MapGraphic } from '../graphics/MapGraphic';

interface SlideProps {
  width: number;
  active: boolean;
}

export const SlideSmartCollection: React.FC<SlideProps> = ({ width, active }) => {
  const { t } = useTranslation();
  const graphicAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      graphicAnim.setValue(0);
      textAnim.setValue(0);

      Animated.stagger(180, [
        Animated.timing(graphicAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [active, graphicAnim, textAnim]);

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
    outputRange: [16, 0],
  });

  return (
    <View style={[styles.slideContainer, { width }]}>
      {/* Category Pill Tag */}
      <View style={styles.tagContainer}>
        <View style={styles.tagDot} />
        <Text style={styles.tagText}>SMART COLLECTION</Text>
      </View>

      {/* Graphic Area */}
      <Animated.View
        style={[
          styles.graphicWrapper,
          {
            opacity: graphicAnim,
            transform: [{ scale: graphicScale }, { translateY: graphicTranslateY }],
          },
        ]}
      >
        <MapGraphic active={active} />
      </Animated.View>

      {/* Narrative Headline & Body */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textAnim,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.headlineText}>{t('onboarding.slide3Title')}</Text>
        <Text style={styles.subtitleText}>{t('onboarding.slide3Subtitle')}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.carousel.accentCyan,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.carousel.accentCyan,
    letterSpacing: 1.2,
  },
  graphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
  },
  headlineText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.carousel.textHero,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.carousel.textBody,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 320,
  },
});
