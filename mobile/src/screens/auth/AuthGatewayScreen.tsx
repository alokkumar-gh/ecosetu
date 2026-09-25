/**
 * AuthGatewayScreen — The bridge between onboarding and authentication.
 *
 * This screen prevents the user from being "dumped" directly into a login form.
 * It reinforces the brand, surfaces the value proposition, and gives a clean,
 * intentional choice: Get Started (new user) or Sign In (existing user).
 *
 * Visual: Large animated ECOSETU logo ring + tagline + two clear CTAs.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AuthBackground } from '../../components/auth/design/AuthBackground';
import { AUTH_COLORS, AUTH_ORBS, AUTH_SPACE, AUTH_RADIUS, AUTH_SHADOW } from '../../components/auth/design/AuthTheme';
import { LanguageSelector } from '../../components/common/LanguageSelector';

const LOGO_IMAGE = require('../../assets/images/logo.png');

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AuthGateway'>;
}

const TRUST_BADGES = [
  { icon: '🔒', label: 'Secure Auth' },
  { icon: '♻️', label: 'Traceable' },
  { icon: '🏆', label: 'MeitY Aligned' },
];

export const AuthGatewayScreen: React.FC<Props> = ({ navigation }) => {
  // Entrance animations
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.85)).current;
  const breathOpacity = useRef(new Animated.Value(0.6)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const ctaTranslateY = useRef(new Animated.Value(30)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    // Ring slow rotation loop
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Breathing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathOpacity, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathOpacity, { toValue: 0.5, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Content stagger
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(contentTranslateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    // CTAs
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ctaTranslateY, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rotateDeg = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <AuthBackground orbs={AUTH_ORBS.gateway}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar: Language selector */}
        <View style={styles.topBar}>
          <View style={styles.logoChip}>
            <Text style={styles.logoChipText}>♻</Text>
          </View>
          <Text style={styles.logoChipLabel}>ECOSETU</Text>
          <View style={styles.spacer} />
          <LanguageSelector variant="compact" />
        </View>

        {/* Hero Section */}
        <View style={styles.heroArea}>
          {/* Breathing glow halo */}
          <Animated.View style={[styles.glowHalo, { opacity: breathOpacity }]} />

          {/* Rotating ring */}
          <Animated.View
            style={[
              styles.rotatingRing,
              {
                transform: [{ scale: ringScale }, { rotate: rotateDeg }],
              },
            ]}
          >
            {/* Ring dots */}
            {[0, 90, 180, 270].map((deg, i) => (
              <View
                key={i}
                style={[
                  styles.ringDot,
                  {
                    transform: [
                      { rotate: `${deg}deg` },
                      { translateY: -62 },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Logo circle */}
          <Animated.View
            style={[
              styles.logoCircle,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={LOGO_IMAGE}
              style={styles.logoImage}
              resizeMode="cover"
              accessibilityLabel="ECOSETU logo"
            />
          </Animated.View>
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <Text style={styles.tagline}>MAKE EVERY DEVICE COUNT.</Text>
          <Text style={styles.subtitle}>
            Join a smarter circular ecosystem for collecting, tracking and responsibly recycling e-waste.
          </Text>

          {/* Trust badges */}
          <View style={styles.trustRow}>
            {TRUST_BADGES.map((badge) => (
              <View key={badge.label} style={styles.trustBadge}>
                <Text style={styles.trustIcon}>{badge.icon}</Text>
                <Text style={styles.trustLabel}>{badge.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* CTAs */}
        <Animated.View
          style={[
            styles.ctaArea,
            {
              opacity: ctaOpacity,
              transform: [{ translateY: ctaTranslateY }],
            },
          ]}
        >
          {/* Primary: Get Started */}
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create account and get started"
          >
            <Text style={styles.primaryCTAText}>GET STARTED</Text>
            <Text style={styles.primaryCTAArrow}>→</Text>
          </TouchableOpacity>

          {/* Secondary: Already have an account */}
          <TouchableOpacity
            style={styles.secondaryCTA}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Sign in to existing account"
          >
            <Text style={styles.secondaryCTAText}>I ALREADY HAVE AN ACCOUNT</Text>
          </TouchableOpacity>

          {/* See how it works link */}
          <TouchableOpacity
            style={styles.learnMoreBtn}
            onPress={() => navigation.navigate('Landing', { forceShow: true })}
            accessibilityRole="button"
          >
            <Text style={styles.learnMoreText}>
              ℹ How ECOSETU works
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </AuthBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: AUTH_SPACE.screenH,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.primaryDim,
    borderWidth: 1,
    borderColor: AUTH_COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoChipText: {
    fontSize: 14,
    color: AUTH_COLORS.primaryLight,
    fontWeight: 'bold',
  },
  logoChipLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  spacer: { flex: 1 },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  rotatingRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AUTH_COLORS.primaryLight,
    shadowColor: AUTH_COLORS.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AUTH_COLORS.primaryDim,
    borderWidth: 2,
    borderColor: AUTH_COLORS.primaryGlow,
    overflow: 'hidden',
    ...AUTH_SHADOW.glow,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  tagline: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 310,
    marginBottom: 20,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AUTH_COLORS.primaryDim,
    borderWidth: 1,
    borderColor: AUTH_COLORS.primaryGlow,
    borderRadius: AUTH_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trustIcon: { fontSize: 12 },
  trustLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
    letterSpacing: 0.3,
  },
  ctaArea: {
    paddingBottom: 20,
    gap: 12,
  },
  primaryCTA: {
    minHeight: 56,
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...AUTH_SHADOW.button,
  },
  primaryCTAText: {
    fontSize: 16,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimaryOnLight,
    letterSpacing: 1,
  },
  primaryCTAArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimaryOnLight,
  },
  secondaryCTA: {
    minHeight: 52,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.borderCard,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  learnMoreBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: AUTH_COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});

export default AuthGatewayScreen;
