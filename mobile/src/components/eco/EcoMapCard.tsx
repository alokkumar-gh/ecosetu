/**
 * EcoMapCard — Dark Glass Map Surface Wrapper
 * Wraps geolocation or facility maps with dark glass frame and address controls.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface EcoMapCardProps {
  title?: string;
  subtitle?: string;
  onLocateMe?: () => void;
  isLocating?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const EcoMapCard: React.FC<EcoMapCardProps> = memo(({
  title,
  subtitle,
  onLocateMe,
  isLocating = false,
  children,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {(title || onLocateMe) && (
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            {Boolean(title) && <Text style={styles.title}>{title}</Text>}
            {Boolean(subtitle) && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {onLocateMe && (
            <TouchableOpacity
              style={styles.locateButton}
              onPress={onLocateMe}
              disabled={isLocating}
              accessibilityRole="button"
              accessibilityLabel="Use current location"
            >
              <Text style={styles.locateText}>
                {isLocating ? 'Locating...' : '📍 Use My Location'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.mapSurface}>{children}</View>
    </View>
  );
});

EcoMapCard.displayName = 'EcoMapCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(6, 21, 27, 0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    padding: spacing.spaceMd,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  headerTextCol: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  locateButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locateText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  mapSurface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default EcoMapCard;
