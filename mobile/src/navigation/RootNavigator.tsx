import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/constants';
import { AuthNavigator } from './AuthNavigator';
import { CitizenNavigator } from './CitizenNavigator';
import { CollectorNavigator } from './CollectorNavigator';
import { RecyclerNavigator } from './RecyclerNavigator';
import { AdminNavigator } from './AdminNavigator';
import { PendingVerificationScreen } from '../screens/auth/PendingVerificationScreen';
import { AccountSuspendedScreen } from '../screens/auth/AccountSuspendedScreen';
import { AccountDeactivatedScreen } from '../screens/auth/AccountDeactivatedScreen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { AppIcon } from '../components/ui/AppIcon';
import { EcoSetuLogo } from '../components/common/EcoSetuLogo';

export const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 1. Session Restoration / Startup Loading State
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel="Loading session">
        <EcoSetuLogo size={80} showGlow style={{ marginBottom: spacing.spaceMd }} />
        <Text style={styles.loadingTitle}>EcoSetu</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={styles.loadingSubtitle}>Restoring secure session...</Text>
      </View>
    );
  }

  // 2. Unauthenticated State -> Auth Flow
  if (!isAuthenticated || !user) {
    return <AuthNavigator />;
  }

  // 3. Authenticated State -> Account Status Gating
  if (user.status === 'SUSPENDED') {
    return <AccountSuspendedScreen />;
  }

  if (user.status === 'DEACTIVATED') {
    return <AccountDeactivatedScreen />;
  }

  if (
    user.status === 'PENDING_VERIFICATION' &&
    (user.role === ROLES.INFORMAL_COLLECTOR || user.role === ROLES.RECYCLER)
  ) {
    return <PendingVerificationScreen role={user.role} />;
  }

  // 4. Authenticated & Verified State -> Documented Role-Based Routing
  switch (user.role) {
    case ROLES.CITIZEN:
      return <CitizenNavigator />;

    case ROLES.INFORMAL_COLLECTOR:
      return <CollectorNavigator />;

    case ROLES.RECYCLER:
      return <RecyclerNavigator />;

    case ROLES.ADMIN:
      return <AdminNavigator />;

    default:
      // Unknown / Tampered role: Safe fallback to prevent unauthorized exposure
      console.warn(`[RootNavigator] Unknown user role detected: ${user.role}. Falling back to AuthNavigator.`);
      return <AuthNavigator />;
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
    elevation: spacing.cardElevation,
  },
  logoIcon: {
    fontSize: 38,
    color: colors.surface,
  },
  loadingTitle: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.spaceMd,
  },
  spinner: {
    marginVertical: spacing.spaceMd,
  },
  loadingSubtitle: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
  },
});

export default RootNavigator;
