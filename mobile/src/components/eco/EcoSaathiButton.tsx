/**
 * EcoSetu — Eco-Saathi Floating Action Button
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * Floating Assistant Button with EcoSetu Glassmorphism & Emerald Glow.
 * 56dp touch target, accessible, low-literacy friendly.
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useEcoSaathi } from '../../context/EcoSaathiContext';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { ROLES } from '../../utils/constants';

export const EcoSaathiButton: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isOpen, openChat } = useEcoSaathi();

  // Hide button on onboarding, login, register (unauthenticated) or when chat modal is open
  if (!isAuthenticated || !user || isOpen) {
    return null;
  }

  // Position: Stack cleanly above Voice button (bottom: 140) for Collector, standard (bottom: 80) for others
  const isCollector = user?.role === ROLES.INFORMAL_COLLECTOR;
  const bottomPosition = isCollector ? 140 : 80;

  return (
    <TouchableOpacity
      style={[styles.fabContainer, { bottom: bottomPosition }]}
      onPress={() => openChat()}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel="Open Eco-Saathi Help Assistant"
      accessibilityHint="Tap to open interactive help and support chat"
    >
      <View style={styles.fabInner}>
        <View style={styles.glowRing} pointerEvents="none" />
        <Text style={styles.icon}>🌿</Text>
        <View style={styles.badgeIndicator}>
          <Text style={styles.badgeText}>SAATHI</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    zIndex: 99999,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 25,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(7, 30, 34, 0.94)',
    borderWidth: 1.8,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  icon: {
    fontSize: 26,
  },
  badgeIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: '#02080D',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#02080D',
    letterSpacing: 0.4,
  },
});

export default EcoSaathiButton;
