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
import { useAuth } from '../../hooks/useAuth';
import { userProfileService } from '../../services/userProfileService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const AdminProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
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
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar title="Admin Profile" subtitle="System Administrator Controls" showBack={false} />

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
            <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '700' }]}>
              Full Platform Governance
            </Text>
          </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceSm,
  },
  avatarText: {
    fontSize: 28,
  },
  nameText: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
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
    color: colors.primary,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailLabel: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
  },
  sessionNotice: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: spacing.spaceSm + 2,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutButtonText: {
    color: '#C62828',
    fontWeight: '700',
    fontSize: typography.Button.fontSize,
  },
});

export default AdminProfileScreen;
