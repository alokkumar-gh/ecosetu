/**
 * AdminProfileScreen
 * Authenticated ADMIN — Administrator account overview and session controls.
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 3
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md Section 4
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EcoSetuBackground } from '../../components/eco';
import { AdminShell } from '../../components/admin/AdminShell';
import { useAuth } from '../../hooks/useAuth';
import { useEcoSaathi } from '../../context/EcoSaathiContext';
import { userProfileService } from '../../services/userProfileService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const AdminProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { openChat } = useEcoSaathi();
  const [profileData, setProfileData] = useState<any>(user);

  useEffect(() => {
    userProfileService.getProfile().then((res) => {
      if (res?.user) setProfileData(res.user);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your administrative session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  };

  return (
    <AdminShell
      title="Admin Profile"
      subtitle="System Administrator Controls"
      activeScreen="AdminProfile"
      navigation={navigation}
    >
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContainer}>
          {/* Profile Card */}
          <View style={styles.card}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>🛡️</Text>
            </View>
            <Text style={styles.nameText}>{profileData?.name || 'Platform Administrator'}</Text>
            <Text style={styles.emailText}>{profileData?.email || 'admin@ecosetu.org'}</Text>

            <View style={styles.badgeRow}>
              <Text style={styles.roleBadge}>ROLE: ADMIN</Text>
              {profileData?.status && <StatusBadge status={profileData.status} />}
            </View>
          </View>

          {/* Account Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Administrative Account</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User ID:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {profileData?.id || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{profileData?.phone || 'Not configured'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Access Level:</Text>
              <Text style={[styles.detailValue, { color: '#2DD4BF', fontWeight: '700' }]}>
                Full Platform Governance
              </Text>
            </View>
          </View>

          {/* Eco-Saathi Help Assistant */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌿 Eco-Saathi AI Assistant</Text>
            <Text style={styles.sessionNotice}>
              Instant guidance on platform features, verification guidelines, regulations, and e-waste rules.
            </Text>
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: '#10B981', marginTop: 12 }]}
              onPress={() => openChat('AdminProfile')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Launch Eco-Saathi Assistant"
            >
              <Text style={[styles.logoutButtonText, { color: '#042F2C' }]}>Ask Eco-Saathi</Text>
            </TouchableOpacity>
          </View>

          {/* Security / Sign Out */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Session Security</Text>
            <Text style={styles.sessionNotice}>
              All administrative actions are permanently recorded in the immutable audit trail.
            </Text>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign Out of Administrator Account"
            >
              <Text style={styles.logoutButtonText}>Sign Out of Console</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
    gap: spacing.spaceMd,
  },
  card: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    elevation: 2,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  avatarText: {
    fontSize: 28,
  },
  nameText: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  emailText: {
    fontSize: typography.Body.fontSize,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  roleBadge: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: '#2DD4BF',
    marginBottom: spacing.spaceSm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 212, 191, 0.15)',
  },
  detailLabel: {
    fontSize: typography.Body.fontSize,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: typography.Body.fontSize,
    color: '#F8FAFC',
    fontWeight: '600',
    maxWidth: '65%',
  },
  sessionNotice: {
    fontSize: typography.Caption.fontSize,
    color: '#94A3B8',
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: spacing.spaceSm + 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  logoutButtonText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: typography.Button.fontSize,
  },
});

export default AdminProfileScreen;
