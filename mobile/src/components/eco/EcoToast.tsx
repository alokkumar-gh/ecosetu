/**
 * EcoToast — Non-intrusive Glassmorphic Toast Notification
 * Provides immediate feedback with high contrast, semantic tone, and auto-dismiss.
 */

import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon, IconName } from '../ui/AppIcon';

export type EcoToastTone = 'info' | 'success' | 'warning' | 'error';

interface EcoToastProps {
  message: string;
  tone?: EcoToastTone;
  visible: boolean;
  onDismiss?: () => void;
  durationMs?: number;
  style?: ViewStyle;
}

export const EcoToast: React.FC<EcoToastProps> = memo(({
  message,
  tone = 'info',
  visible,
  onDismiss,
  durationMs = 3000,
  style,
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onDismiss?.();
        });
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, durationMs, onDismiss, opacity]);

  if (!visible) return null;

  let bg = 'rgba(7, 26, 33, 0.95)';
  let border = 'rgba(6, 182, 212, 0.40)';
  let text = '#FFFFFF';
  let iconName: IconName = 'info';

  if (tone === 'success') {
    border = 'rgba(16, 185, 129, 0.50)';
    text = '#A7F3D0';
    iconName = 'check';
  } else if (tone === 'warning') {
    border = 'rgba(245, 158, 11, 0.50)';
    text = '#FDE68A';
    iconName = 'alert';
  } else if (tone === 'error') {
    border = 'rgba(239, 68, 68, 0.50)';
    text = '#FCA5A5';
    iconName = 'close';
  }

  return (
    <Animated.View style={[styles.container, { opacity }, style]}>
      <View style={[styles.toast, { backgroundColor: bg, borderColor: border }]}>
        <View style={styles.iconBox}>
          <AppIcon name={iconName} size={16} color={text} strokeWidth={2.5} />
        </View>
        <Text style={[styles.message, { color: text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
});

EcoToast.displayName = 'EcoToast';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 420,
  },
  iconBox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default EcoToast;
