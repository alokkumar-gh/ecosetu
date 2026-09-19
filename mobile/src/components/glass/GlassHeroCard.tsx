/**
 * GlassHeroCard
 * Premium hero card for dashboards (Citizen "Your E-Waste Impact", Collector stats, etc.).
 * Features layered dark translucent glass with subtle green glow border and prominent typography.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface GlassHeroCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const GlassHeroCard: React.FC<GlassHeroCardProps> = memo(({
  title,
  subtitle,
  badge,
  icon,
  children,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {/* Top subtle ambient highlight */}
      <View style={styles.topHighlight} pointerEvents="none" />

      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          {badge ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      </View>

      {/* Body Content / Metrics */}
      {children ? <View style={styles.contentContainer}>{children}</View> : null}
    </View>
  );
});

GlassHeroCard.displayName = 'GlassHeroCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(16, 44, 48, 0.75)',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    padding: spacing.spaceLg,
    marginVertical: spacing.spaceSm,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    marginBottom: 6,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 4,
    lineHeight: 18,
  },
  iconWrapper: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    marginTop: spacing.spaceMd,
  },
});

export default GlassHeroCard;
