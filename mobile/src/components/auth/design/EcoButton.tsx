/**
 * EcoButton — Primary and secondary CTA buttons.
 *
 * Primary: Emerald glowing pill with loading state transform.
 * Secondary: Ghost pill.
 * Social: Glass surface with icon.
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { AUTH_COLORS, AUTH_RADIUS, AUTH_SHADOW, AUTH_TIMING } from './AuthTheme';

// ─── Primary ──────────────────────────────────────────────────────────────────

interface EcoButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const EcoButton: React.FC<EcoButtonProps> = ({
  label,
  onPress,
  loading = false,
  loadingLabel,
  disabled = false,
  icon,
  style,
  accessibilityLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: AUTH_TIMING.micro,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        style={[
          styles.primary,
          isDisabled && styles.primaryDisabled,
        ]}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={AUTH_COLORS.textPrimaryOnLight} />
            {loadingLabel ? (
              <Text style={styles.primaryText}>{loadingLabel}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.contentRow}>
            {icon ? <Text style={styles.primaryIcon}>{icon}</Text> : null}
            <Text style={styles.primaryText}>{label}</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Secondary / Ghost ─────────────────────────────────────────────────────

interface EcoSecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const EcoSecondaryButton: React.FC<EcoSecondaryButtonProps> = ({
  label,
  onPress,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
    style={[styles.secondary, disabled && { opacity: 0.5 }, style]}
  >
    <Text style={[styles.secondaryText, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Social (Google / Phone) ──────────────────────────────────────────────

interface EcoSocialButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  leftContent?: React.ReactNode;
  accessibilityLabel?: string;
}

export const EcoSocialButton: React.FC<EcoSocialButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  leftContent,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
    style={[styles.social, (disabled || loading) && { opacity: 0.6 }]}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <View style={styles.contentRow}>
        {leftContent ? <View style={styles.socialIconSlot}>{leftContent}</View> : null}
        <Text style={styles.socialText}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  primary: {
    minHeight: 54,
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...AUTH_SHADOW.button,
  },
  primaryDisabled: {
    opacity: 0.55,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryIcon: {
    fontSize: 16,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: AUTH_COLORS.textPrimaryOnLight,
    letterSpacing: 0.4,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimaryOnLight,
  },
  secondary: {
    minHeight: 48,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: AUTH_COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  social: {
    minHeight: 52,
    borderRadius: AUTH_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  socialIconSlot: {
    marginRight: 8,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_COLORS.textPrimary,
    letterSpacing: 0.2,
  },
});
