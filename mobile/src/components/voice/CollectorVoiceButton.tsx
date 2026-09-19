/**
 * CollectorVoiceButton.tsx
 * Floating Action Button for triggering Informal Collector Voice Commands.
 *
 * RBAC Invariant:
 * - Rendered strictly and exclusively for INFORMAL_COLLECTOR role.
 * - Minimum 48dp touch target for accessibility.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useCollectorVoice } from '../../context/CollectorVoiceContext';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { ROLES } from '../../utils/constants';

export const CollectorVoiceButton: React.FC = () => {
  const { user } = useAuth();
  const { openVoiceModal, triggerListening } = useCollectorVoice();

  // Strict RBAC boundary: Voice button is never rendered for other roles
  if (user?.role !== ROLES.INFORMAL_COLLECTOR) {
    return null;
  }

  const handlePress = () => {
    openVoiceModal();
    // Prompt speech listening directly after opening modal
    setTimeout(() => {
      triggerListening();
    }, 150);
  };

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Activate voice commands"
      accessibilityHint="Tap to speak a voice command"
    >
      <Text style={styles.icon}>🎙️</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 74,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(20, 48, 26, 0.92)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
  icon: {
    fontSize: 24,
  },
});
