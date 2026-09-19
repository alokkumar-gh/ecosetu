/**
 * LoginCarousel — Restrained, Government-Grade Public Service Carousel
 * Credible institutional visual language: trustworthy, accessible, clean, human-designed.
 * 100% Vector/geometric diagrams; Zero AI-generated artwork, zero neon, zero fake seals.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  useWindowDimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useI18n } from '../../i18n';

interface Props {
  onComplete: () => void;
  onSkip?: () => void;
}

export const LoginCarousel: React.FC<Props> = ({ onComplete, onSkip }) => {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth > 0 ? windowWidth : (Dimensions.get('window').width || 360);

  const slides = [
    {
      id: 'slide-1',
      title: t('auth.slide1Title') || 'Responsible E-Waste Management',
      subtitle:
        t('auth.slide1Subtitle') ||
        'Connect households, local collectors and authorized recyclers through a transparent collection chain.',
      renderVisual: () => (
        <View style={styles.diagramContainer} accessibilityLabel="Process: Citizen to Collector to Recycler to Recycling">
          <View style={styles.flowRow}>
            <View style={styles.flowNode}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🏠</Text>
              </View>
              <Text style={styles.nodeLabel}>{t('roles.citizen') || 'Citizen'}</Text>
            </View>

            <View style={styles.arrowContainer}>
              <Text style={styles.arrowText}>→</Text>
            </View>

            <View style={styles.flowNode}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🚚</Text>
              </View>
              <Text style={styles.nodeLabel}>{t('roles.collector') || 'Collector'}</Text>
            </View>

            <View style={styles.arrowContainer}>
              <Text style={styles.arrowText}>→</Text>
            </View>

            <View style={styles.flowNode}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🏭</Text>
              </View>
              <Text style={styles.nodeLabel}>{t('roles.recycler') || 'Recycler'}</Text>
            </View>

            <View style={styles.arrowContainer}>
              <Text style={styles.arrowText}>→</Text>
            </View>

            <View style={styles.flowNode}>
              <View style={[styles.iconCircle, styles.iconCircleActive]}>
                <Text style={styles.iconText}>♻</Text>
              </View>
              <Text style={styles.nodeLabel}>Recycling</Text>
            </View>
          </View>
          <View style={styles.captionBanner}>
            <Text style={styles.captionText}>Transparent & Auditable Material Flow</Text>
          </View>
        </View>
      ),
    },
    {
      id: 'slide-2',
      title: t('auth.slide2Title') || 'From Collection to Recycling',
      subtitle:
        t('auth.slide2Subtitle') ||
        'Track the movement of eligible electronic waste through each stage of the recycling process.',
      renderVisual: () => (
        <View style={styles.diagramContainer} accessibilityLabel="Three verified lifecycle stages">
          <View style={styles.stagesContainer}>
            <View style={styles.stageItem}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stageTextCol}>
                <Text style={styles.stageTitle}>Household Request</Text>
                <Text style={styles.stageDesc}>Registered with item condition & quantity</Text>
              </View>
            </View>

            <View style={styles.stageDivider} />

            <View style={styles.stageItem}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stageTextCol}>
                <Text style={styles.stageTitle}>Verified Handover</Text>
                <Text style={styles.stageDesc}>Direct collection with digital handoff confirmation</Text>
              </View>
            </View>

            <View style={styles.stageDivider} />

            <View style={styles.stageItem}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stageTextCol}>
                <Text style={styles.stageTitle}>Facility Inward</Text>
                <Text style={styles.stageDesc}>Authorized facility verification & processing</Text>
              </View>
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'slide-3',
      title: t('auth.slide3Title') || 'Empowering Local Collectors',
      subtitle:
        t('auth.slide3Subtitle') ||
        'Help informal collectors participate in a more organized and traceable recycling ecosystem.',
      renderVisual: () => (
        <View style={styles.diagramContainer} accessibilityLabel="Collector ecosystem benefits">
          <View style={styles.empowerCard}>
            <View style={styles.empowerHeader}>
              <Text style={styles.empowerBadgeText}>INFORMAL COLLECTOR INTEGRATION</Text>
            </View>
            <View style={styles.empowerRow}>
              <Text style={styles.empowerCheck}>✓</Text>
              <Text style={styles.empowerPoint}>Direct digital link to authorized recyclers</Text>
            </View>
            <View style={styles.empowerRow}>
              <Text style={styles.empowerCheck}>✓</Text>
              <Text style={styles.empowerPoint}>Transparent consignment batch records</Text>
            </View>
            <View style={styles.empowerRow}>
              <Text style={styles.empowerCheck}>✓</Text>
              <Text style={styles.empowerPoint}>Equitable, organized circular economy participation</Text>
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'slide-4',
      title: t('auth.slide4Title') || 'Transparent & Traceable',
      subtitle:
        t('auth.slide4Subtitle') ||
        'Follow the lifecycle of collected e-waste and understand where it goes next.',
      renderVisual: () => (
        <View style={styles.diagramContainer} accessibilityLabel="Traceability lifecycle timeline">
          <View style={styles.traceGrid}>
            <View style={styles.traceBlock}>
              <Text style={styles.traceIcon}>📋</Text>
              <Text style={styles.traceHeading}>Unique ID</Text>
              <Text style={styles.traceSub}>Verified lot record</Text>
            </View>
            <View style={styles.traceBlock}>
              <Text style={styles.traceIcon}>📍</Text>
              <Text style={styles.traceHeading}>Area Level</Text>
              <Text style={styles.traceSub}>Privacy-protected tracking</Text>
            </View>
            <View style={styles.traceBlock}>
              <Text style={styles.traceIcon}>🔄</Text>
              <Text style={styles.traceHeading}>Consignment</Text>
              <Text style={styles.traceSub}>Batch custody chain</Text>
            </View>
            <View style={styles.traceBlock}>
              <Text style={styles.traceIcon}>🛡</Text>
              <Text style={styles.traceHeading}>Safe Disposal</Text>
              <Text style={styles.traceSub}>Authorized processing</Text>
            </View>
          </View>
        </View>
      ),
    },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== activeIndex && index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  const goToNextSlide = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
      setActiveIndex(nextIndex);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  return (
    <View style={styles.container} testID="login-carousel">
      {/* ── Top Bar: Skip Button ────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBranding}>
          <View style={styles.govMarkCircle}>
            <Text style={styles.govMarkIcon}>♻</Text>
          </View>
          <Text style={styles.appNameText}>ECOSETU</Text>
        </View>

        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel={t('auth.skip') || 'Skip introduction'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>{t('auth.skip') || 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Slide ScrollView ────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="adjustable"
        accessibilityLabel={`Slide ${activeIndex + 1} of ${slides.length}`}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={[styles.slideCard, { width: screenWidth }]}>
            <View style={styles.slideInner}>
              {/* Visual Diagram Box */}
              <View style={styles.visualWrapper}>{slide.renderVisual()}</View>

              {/* Text Information */}
              <View style={styles.textWrapper}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Pagination & Action Controls ─────────────────────────────────── */}
      <View style={styles.footerControls}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow} accessibilityLabel={`Step ${activeIndex + 1} of 4`}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={goToNextSlide}
          accessibilityRole="button"
          accessibilityLabel={
            activeIndex === slides.length - 1
              ? t('auth.getStarted') || 'Get Started'
              : t('auth.next') || 'Next slide'
          }
          activeOpacity={0.85}
        >
          <Text style={styles.primaryActionText}>
            {activeIndex === slides.length - 1
              ? t('auth.getStarted') || 'Get Started'
              : t('auth.next') || 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Institutional clean background
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  topBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  govMarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F2942',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  govMarkIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  appNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2942',
    letterSpacing: 0.8,
  },
  skipButton: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideCard: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  slideInner: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.90)',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  visualWrapper: {
    marginBottom: 12,
  },
  diagramContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  flowNode: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F2942',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircleActive: {
    backgroundColor: '#E2FBE8',
    borderColor: '#15803D',
  },
  iconText: {
    fontSize: 20,
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  arrowContainer: {
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },
  captionBanner: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  captionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F2942',
    letterSpacing: 0.3,
  },
  stagesContainer: {
    paddingVertical: 4,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F2942',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageTextCol: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stageDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  stageDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginLeft: 46,
  },
  empowerCard: {
    padding: 6,
  },
  empowerHeader: {
    backgroundColor: '#0F2942',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  empowerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  empowerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  empowerCheck: {
    color: '#15803D',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 10,
  },
  empowerPoint: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontWeight: '500',
  },
  traceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  traceBlock: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  traceIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  traceHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  traceSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  textWrapper: {
    marginTop: 6,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 26,
  },
  slideSubtitle: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
  footerControls: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#0F2942',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  primaryActionButton: {
    minHeight: 48,
    backgroundColor: '#0F2942',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default LoginCarousel;
