import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { TopAppBar } from '../layout/TopAppBar';
import { GradientBackground } from '../glass/GradientBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface PlaceholderScreenProps {
  title: string;
  role: string;
  description: string;
  apiEndpoints?: string[];
  showSignOut?: boolean;
  onBack?: () => void;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  role,
  description,
  apiEndpoints = [],
  showSignOut = false,
  onBack,
}) => {
  const { logout, user } = useAuth();

  return (
    <GradientBackground>
      <TopAppBar
        title={title}
        roleBadge={role}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PHASE 16 PLACEHOLDER</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>

          {apiEndpoints.length > 0 && (
            <View style={styles.apiBox}>
              <Text style={styles.apiTitle}>Associated API Endpoints:</Text>
              {apiEndpoints.map((endpoint, idx) => (
                <Text key={idx} style={styles.apiItem}>
                  • {endpoint}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              This is a navigation placeholder container. Full feature UI will be implemented in
              subsequent task phases.
            </Text>
          </View>
        </View>

        {showSignOut && (
          <View style={styles.authCard}>
            <Text style={styles.authInfo}>
              Signed in as: <Text style={styles.bold}>{user?.name || user?.email}</Text> ({role})
            </Text>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel="Sign out of account"
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 20,
  },
  card: {
    backgroundColor: colors.glassSurface,
    borderRadius: 16,
    padding: spacing.spaceLg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.spaceMd,
    elevation: 3,
  },
  badge: {
    backgroundColor: 'rgba(74, 222, 128, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '800',
    lineHeight: typography.Headline.lineHeight,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.spaceXs,
  },
  description: {
    fontSize: typography.Body.fontSize,
    lineHeight: typography.Body.lineHeight,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  apiBox: {
    backgroundColor: colors.glassSurfaceRaised,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    padding: spacing.spaceSm + 2,
    marginBottom: spacing.spaceMd,
  },
  apiTitle: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  apiItem: {
    fontSize: typography.Caption.fontSize,
    color: colors.secondaryLight,
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  noticeBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    paddingLeft: spacing.spaceSm,
  },
  noticeText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  authCard: {
    backgroundColor: colors.glassSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.spaceLg,
    elevation: 3,
    alignItems: 'center',
  },
  authInfo: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.spaceMd,
  },
  bold: {
    fontWeight: '700',
    color: colors.primary,
  },
  signOutButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    paddingVertical: spacing.spaceSm + 2,
    paddingHorizontal: spacing.spaceLg,
    borderRadius: 12,
    minHeight: 48,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: typography.Button.fontSize,
    fontWeight: '800',
    color: colors.error,
  },
});

export default PlaceholderScreen;
