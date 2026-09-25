/**
 * RoleSelectionModal — Post-Google Authentication Role Gateway
 * Displayed when a new user signs in with Google and has not yet chosen an ECOSETU role.
 * Canonical Reference: Prompt Sections 1, 3, 4, 30
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AUTH_COLORS, AUTH_SPACE, AUTH_RADIUS, AUTH_SHADOW } from './design/AuthTheme';
import { ROLES } from '../../utils/constants';

interface RoleSelectionModalProps {
  visible: boolean;
  userName?: string;
  userEmail?: string;
  onSelectRole: (role: string) => Promise<void>;
  onCancel: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  visible,
  userName,
  userEmail,
  onSelectRole,
  onCancel,
}) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleConfirm = async (roleToConfirm?: string) => {
    const role = roleToConfirm || selectedRole;
    if (!role || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSelectRole(role);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1612" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>♻</Text>
            </View>
            <Text style={styles.welcomeTitle}>WELCOME TO ECOSETU</Text>
            <Text style={styles.subtitle}>
              {userName ? `Hi ${userName}, how` : 'How'} do you want to use ECOSETU?
            </Text>
            {userEmail ? <Text style={styles.emailChip}>{userEmail}</Text> : null}
          </View>

          {/* Role Cards */}
          <View style={styles.cardsContainer}>
            {/* CITIZEN CARD */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === ROLES.CITIZEN && styles.roleCardActive,
              ]}
              onPress={() => {
                setSelectedRole(ROLES.CITIZEN);
                handleConfirm(ROLES.CITIZEN);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Select Citizen role"
            >
              <View style={styles.cardHeader}>
                <View style={[styles.roleIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={styles.roleIcon}>🏠</Text>
                </View>
                <View style={styles.tagBadgeActive}>
                  <Text style={styles.tagBadgeText}>INSTANT ACCESS</Text>
                </View>
              </View>

              <Text style={styles.roleTitle}>CITIZEN</Text>
              <Text style={styles.roleDescription}>
                Dispose and track your e-waste responsibly from home or office. Schedule door-step pickups and earn eco-credits.
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.flowInfo}>Google Login → Immediate Access</Text>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </TouchableOpacity>

            {/* COLLECTOR CARD */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === ROLES.INFORMAL_COLLECTOR && styles.roleCardActive,
              ]}
              onPress={() => {
                setSelectedRole(ROLES.INFORMAL_COLLECTOR);
                handleConfirm(ROLES.INFORMAL_COLLECTOR);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Select Collector role"
            >
              <View style={styles.cardHeader}>
                <View style={[styles.roleIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Text style={styles.roleIcon}>🚚</Text>
                </View>
                <View style={[styles.tagBadgeActive, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Text style={[styles.tagBadgeText, { color: '#FBBF24' }]}>VERIFICATION REQUIRED</Text>
                </View>
              </View>

              <Text style={styles.roleTitle}>COLLECTOR / KABADIWALA</Text>
              <Text style={styles.roleDescription}>
                Collect e-waste from your local community, digitize your lots, and connect with authorized formal recycling facilities.
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.flowInfo}>Identity Verification → Admin Review</Text>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </TouchableOpacity>

            {/* RECYCLER CARD */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === ROLES.RECYCLER && styles.roleCardActive,
              ]}
              onPress={() => {
                setSelectedRole(ROLES.RECYCLER);
                handleConfirm(ROLES.RECYCLER);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Select Recycler role"
            >
              <View style={styles.cardHeader}>
                <View style={[styles.roleIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Text style={styles.roleIcon}>🏭</Text>
                </View>
                <View style={[styles.tagBadgeActive, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Text style={[styles.tagBadgeText, { color: '#C4B5FD' }]}>FACILITY & LICENSE KYC</Text>
                </View>
              </View>

              <Text style={styles.roleTitle}>RECYCLER</Text>
              <Text style={styles.roleDescription}>
                Process e-waste, manage bulk consignments, issue certificates, and participate in formal recycling compliance chains.
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.flowInfo}>Facility Details + License → Admin Review</Text>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </TouchableOpacity>
          </View>

          {isSubmitting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={AUTH_COLORS.primary} />
              <Text style={styles.loadingText}>Initializing role onboarding...</Text>
            </View>
          )}

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel & Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1612',
  },
  scrollContent: {
    paddingHorizontal: AUTH_SPACE.screenH,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 26,
    color: AUTH_COLORS.primary,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emailChip: {
    fontSize: 12,
    color: AUTH_COLORS.primaryLight,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: AUTH_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    ...AUTH_SHADOW.card,
  },
  roleCardActive: {
    borderColor: AUTH_COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 22,
  },
  tagBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AUTH_RADIUS.full,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: AUTH_COLORS.primaryLight,
    letterSpacing: 0.5,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  roleDescription: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  flowInfo: {
    fontSize: 11,
    color: AUTH_COLORS.textMuted,
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 18,
    color: AUTH_COLORS.primaryLight,
    fontWeight: '700',
  },
  loadingOverlay: {
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: AUTH_COLORS.primaryLight,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    fontSize: 13,
    color: AUTH_COLORS.textMuted,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default RoleSelectionModal;
