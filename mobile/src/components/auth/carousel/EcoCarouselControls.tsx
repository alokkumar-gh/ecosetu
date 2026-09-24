import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../../../i18n';
import { colors } from '../../../theme/colors';

interface EcoCarouselControlsProps {
  isLastSlide: boolean;
  onSkip: () => void;
  onNext: () => void;
  onGetStarted: () => void;
}

export const EcoCarouselControls: React.FC<EcoCarouselControlsProps> = ({
  isLastSlide,
  onSkip,
  onNext,
  onGetStarted,
}) => {
  const { t } = useTranslation();

  if (isLastSlide) {
    return (
      <View style={styles.containerFinal}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onGetStarted}
          style={styles.getStartedButton}
        >
          <Text style={styles.getStartedText}>{t('onboarding.slide6Cta', 'Get Started') || t('onboarding.getStarted', 'Get Started')}</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onSkip}
        style={styles.skipButton}
      >
        <Text style={styles.skipText}>{t('onboarding.skip', 'Skip')}</Text>
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onNext}
        style={styles.nextButton}
      >
        <Text style={styles.nextArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    width: '100%',
  },
  skipButton: {
    minHeight: 48,
    minWidth: 80,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
  },
  nextButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.carousel.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  nextArrow: {
    fontSize: 22,
    fontWeight: '900',
    color: '#02080D',
    lineHeight: 24,
  },
  containerFinal: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    width: '100%',
    borderRadius: 27,
    backgroundColor: colors.carousel.accentEmerald,
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 7,
    gap: 10,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#02080D',
    letterSpacing: 0.8,
  },
  arrowIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#02080D',
  },
});
