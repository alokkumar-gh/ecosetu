import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/colors';

interface EcoCarouselProgressProps {
  total: number;
  activeIndex: number;
  onSelectIndex?: (index: number) => void;
}

export const EcoCarouselProgress: React.FC<EcoCarouselProgressProps> = ({
  total,
  activeIndex,
  onSelectIndex,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        const isPassed = index < activeIndex;
        const padIndex = (index + 1).toString().padStart(2, '0');

        return (
          <React.Fragment key={`progress-step-${index}`}>
            {/* Step Number Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSelectIndex?.(index)}
              style={[
                styles.stepItem,
                isActive && styles.stepItemActive,
                isPassed && styles.stepItemPassed,
              ]}
            >
              <Text
                style={[
                  styles.stepText,
                  isActive && styles.stepTextActive,
                  isPassed && styles.stepTextPassed,
                ]}
              >
                {padIndex}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* Connecting Bar between steps */}
            {index < total - 1 && (
              <View
                style={[
                  styles.connector,
                  (isPassed || isActive) && styles.connectorActive,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stepItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    minWidth: 28,
  },
  stepItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
  },
  stepItemPassed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.5,
  },
  stepTextActive: {
    color: colors.carousel.accentEmerald,
    fontWeight: '900',
  },
  stepTextPassed: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.carousel.accentEmerald,
  },
  connector: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 3,
    maxWidth: 24,
  },
  connectorActive: {
    backgroundColor: colors.carousel.accentEmerald,
    opacity: 0.8,
  },
});
