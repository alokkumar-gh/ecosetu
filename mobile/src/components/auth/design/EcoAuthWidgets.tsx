/**
 * EcoRoleCard — Premium role selection card for registration.
 *
 * Features:
 * - Custom icon, title, description
 * - Selected/unselected animated state
 * - Subtle border glow on selection
 * - Scale spring on press
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { AppIcon, IconName } from '../../ui/AppIcon';
import { AUTH_COLORS, AUTH_TIMING, AUTH_RADIUS } from './AuthTheme';

interface EcoRoleCardProps {
  icon: IconName | string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  accentColor?: string;
  accessibilityLabel?: string;
}

export const EcoRoleCard: React.FC<EcoRoleCardProps> = ({
  icon,
  title,
  description,
  selected,
  onPress,
  accentColor = AUTH_COLORS.primary,
  accessibilityLabel,
}) => {
  const selectAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(selectAnim, {
      toValue: selected ? 1 : 0,
      duration: AUTH_TIMING.input,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [selected, selectAnim]);

  const borderColor = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [AUTH_COLORS.borderSubtle, accentColor],
  });

  const bgColor = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [AUTH_COLORS.bgCard, `${accentColor}15`],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, friction: 6, tension: 200, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  };

  const resolveRoleIcon = (rawIcon?: string): IconName => {
    switch (rawIcon) {
      case 'user':
      case 'citizen':
        return 'user';
      case 'collector':
      case 'truck':
        return 'truck';
      case 'recycler':
      case 'recycle':
        return 'recycle';
      default:
        return 'user';
    }
  };

  const iconName: IconName = typeof icon === 'string' ? resolveRoleIcon(icon) : 'user';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ selected }}
      >
        <Animated.View style={[styles.card, { borderColor, backgroundColor: bgColor }]}>
          {/* Selection indicator */}
          {selected ? (
            <View style={[styles.selectedDot, { backgroundColor: accentColor }]} />
          ) : null}

          <View style={styles.iconCircle}>
            <AppIcon name={iconName} size={22} color={selected ? accentColor : AUTH_COLORS.textMuted} strokeWidth={2} />
          </View>
          <Text style={[styles.title, selected && { color: accentColor }]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * EcoStepIndicator — Horizontal step progress bar (01 ─── 02 ─── 03)
 */
interface EcoStepIndicatorProps {
  totalSteps: number;
  currentStep: number; // 0-indexed
  accentColor?: string;
}

export const EcoStepIndicator: React.FC<EcoStepIndicatorProps> = ({
  totalSteps,
  currentStep,
  accentColor = AUTH_COLORS.primary,
}) => {
  return (
    <View style={indicatorStyles.row}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;

        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <View
                style={[
                  indicatorStyles.connector,
                  isDone && { backgroundColor: accentColor },
                ]}
              />
            ) : null}
            <View
              style={[
                indicatorStyles.dot,
                isActive && { backgroundColor: accentColor, borderColor: accentColor },
                isDone && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
            >
              {isDone ? (
                <AppIcon name="check" size={12} color={AUTH_COLORS.textPrimaryOnLight} />
              ) : (
                <Text
                  style={[
                    indicatorStyles.dotNum,
                    isActive && { color: AUTH_COLORS.textPrimaryOnLight },
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

/**
 * EcoAuthDivider — "or" divider
 */
export const EcoAuthDivider: React.FC<{ label?: string }> = ({ label = 'or' }) => (
  <View style={dividerStyles.row}>
    <View style={dividerStyles.line} />
    <Text style={dividerStyles.text}>{label}</Text>
    <View style={dividerStyles.line} />
  </View>
);

/**
 * EcoGlassCard — Consistent glass card container for form sections
 */
export const EcoGlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={cardStyles.card}>{children}</View>
);

/**
 * EcoPasswordStrength — Compact password strength bar
 */
interface EcoPasswordStrengthProps {
  password: string;
}

export const EcoPasswordStrength: React.FC<EcoPasswordStrengthProps> = ({ password }) => {
  const getStrength = (p: string): number => {
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  };

  const strength = getStrength(password);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    AUTH_COLORS.bgInput,
    'rgba(239,68,68,0.75)',
    'rgba(251,191,36,0.75)',
    'rgba(6,182,212,0.75)',
    AUTH_COLORS.primaryLight,
  ];

  if (!password) return null;

  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.bars}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              strengthStyles.bar,
              { backgroundColor: level <= strength ? colors[strength] : AUTH_COLORS.borderSubtle },
            ]}
          />
        ))}
      </View>
      <Text style={[strengthStyles.label, { color: colors[strength] }]}>
        {labels[strength]}
      </Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: AUTH_RADIUS.md,
    padding: 14,
    alignItems: 'center',
    minHeight: 100,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 26,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: AUTH_COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 10,
    fontWeight: '500',
    color: AUTH_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
});

const indicatorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.borderSubtle,
    backgroundColor: AUTH_COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotNum: {
    fontSize: 11,
    fontWeight: '700',
    color: AUTH_COLORS.textMuted,
  },
  dotCheck: {
    fontSize: 12,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimaryOnLight,
  },
  connector: {
    height: 1.5,
    width: 40,
    backgroundColor: AUTH_COLORS.borderSubtle,
  },
});

const dividerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH_COLORS.borderSubtle,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: AUTH_COLORS.textMuted,
    letterSpacing: 0.5,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: AUTH_COLORS.bgCard,
    borderRadius: AUTH_RADIUS.lg,
    borderWidth: 1.2,
    borderColor: AUTH_COLORS.borderCard,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 5,
  },
});

const strengthStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
});
