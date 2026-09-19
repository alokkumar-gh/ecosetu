/**
 * GlassAvatar
 * Premium glassmorphism profile avatar with optional role badge and status dot.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, ImageSourcePropType } from 'react-native';
import { colors } from '../../theme/colors';

interface GlassAvatarProps {
  name?: string;
  source?: ImageSourcePropType;
  icon?: string;
  size?: number;
  online?: boolean;
  style?: ViewStyle;
}

export const GlassAvatar: React.FC<GlassAvatarProps> = memo(({
  name,
  source,
  icon = '👤',
  size = 48,
  online,
  style,
}) => {
  const getInitials = (n?: string) => {
    if (!n) return '';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {source ? (
        <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : initials ? (
        <Text style={[styles.initials, { fontSize: Math.floor(size * 0.4) }]}>{initials}</Text>
      ) : (
        <Text style={[styles.icon, { fontSize: Math.floor(size * 0.45) }]}>{icon}</Text>
      )}

      {online !== undefined && (
        <View
          style={[
            styles.statusDot,
            { backgroundColor: online ? '#10B981' : '#64748B' },
          ]}
        />
      )}
    </View>
  );
});

GlassAvatar.displayName = 'GlassAvatar';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  icon: {
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#051417',
  },
});

export default GlassAvatar;
