/**
 * CitizenProfileScreen
 * Authenticated CITIZEN — Account profile management screen.
 *
 * ECOSETU Business Chain: CITIZEN → LOCAL INFORMAL COLLECTOR → FORMAL RECYCLER
 *
 * This screen:
 *   - Displays the authenticated citizen's profile (name, email, phone, role, status, createdAt)
 *   - Allows editing of ONLY the documented mutable fields: name and phone
 *   - Enforces protected fields: role, status, email, id, createdAt, updatedAt, avatarUrl
 *   - Validates inputs against backend rules before submission
 *   - Prevents duplicate/concurrent submissions
 *   - Requires connectivity for profile mutations
 *   - Shows cached profile when offline (read-only)
 *   - Provides accessible logout with confirmation dialog
 *   - Does NOT introduce any Citizen → Recycler functionality
 *
 * Profile Data Source: GET /api/v1/users/me
 * Update Endpoint:     PATCH /api/v1/users/me (name, phone only)
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 3
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *   docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { userProfileService } from '../../services/userProfileService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Canonical UserStatus values from Prisma schema / backend/src/utils/constants.js
 * PENDING_VERIFICATION | ACTIVE | SUSPENDED | DEACTIVATED
 */
const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

/**
 * Canonical UserRole values verified from Prisma schema.
 * Client must NEVER allow role change.
 */
const USER_ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  INFORMAL_COLLECTOR: 'INFORMAL_COLLECTOR',
  RECYCLER: 'RECYCLER',
  ADMIN: 'ADMIN',
});

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Validate name per backend/src/validators/userValidators.js:
 *   - optional field
 *   - 2–100 characters if provided
 */
const validateName = (name: string): string | null => {
  if (!name || !name.trim()) return 'Name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  if (name.trim().length > 100) return 'Name must be 100 characters or fewer.';
  return null;
};

/**
 * Validate phone per backend/src/validators/userValidators.js:
 *   - optional/nullable
 *   - must match /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/ if provided
 */
const validatePhone = (phone: string): string | null => {
  if (!phone || !phone.trim()) return null; // phone is optional/nullable
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
  if (!phoneRegex.test(phone.trim())) {
    return 'Invalid phone number format.';
  }
  return null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getStatusLabel = (status: string): { label: string; color: string } => {
  switch (status) {
    case USER_STATUS.ACTIVE:
      return { label: 'Active', color: '#2E7D32' };
    case USER_STATUS.PENDING_VERIFICATION:
      return { label: 'Pending Verification', color: '#E65100' };
    case USER_STATUS.SUSPENDED:
      return { label: 'Suspended', color: '#C62828' };
    case USER_STATUS.DEACTIVATED:
      return { label: 'Deactivated', color: '#4E4E4E' };
    default:
      return { label: status || '—', color: colors.textSecondary };
  }
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case USER_ROLES.CITIZEN:
      return 'Citizen';
    case USER_ROLES.INFORMAL_COLLECTOR:
      return 'Informal Collector';
    case USER_ROLES.RECYCLER:
      return 'Formal Recycler';
    case USER_ROLES.ADMIN:
      return 'Administrator';
    default:
      return role || '—';
  }
};

// ─── ProfileSkeleton ──────────────────────────────────────────────────────────

const ProfileSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Avatar placeholder */}
    <Skeleton width={80} height={80} borderRadius={40} style={styles.skeletonAvatar} />
    <Skeleton height={20} width="50%" style={styles.skeletonLine} />
    <Skeleton height={14} width="35%" style={styles.skeletonLine} />
    {/* Card placeholder */}
    <View style={styles.skeletonCard}>
      <Skeleton height={16} width="40%" style={styles.skeletonLine} />
      <Skeleton height={48} style={styles.skeletonInput} />
      <Skeleton height={16} width="40%" style={styles.skeletonLine} />
      <Skeleton height={48} style={styles.skeletonInput} />
    </View>
    {/* Info card */}
    <View style={styles.skeletonCard}>
      <Skeleton height={16} width="40%" style={styles.skeletonLine} />
      <Skeleton height={16} style={styles.skeletonLine} />
      <Skeleton height={16} style={styles.skeletonLine} />
      <Skeleton height={16} style={styles.skeletonLine} />
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CitizenProfileScreen: React.FC = () => {
  const { user: authUser, logout } = useAuth();
  const { isConnected } = useNetwork();

  // ── Profile data state ─────────────────────────────────────────────────────
  const [profile, setProfile] = useState<any>(authUser || null);
  const [isLoading, setIsLoading] = useState<boolean>(!authUser);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Edit form state ────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Prevent duplicate submissions
  const isSavingRef = useRef<boolean>(false);

  // ── Logout state ───────────────────────────────────────────────────────────
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // ── Data Load ──────────────────────────────────────────────────────────────

  const loadProfile = useCallback(async (silent = false) => {
    if (!silent) setLoadError(null);
    try {
      const result = await userProfileService.getProfile();
      if (result.user) {
        setProfile(result.user);
        setFromCache(result.fromCache);
      } else if (!profile) {
        setLoadError('Could not load your profile. Please try again.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load profile. Please check your connection.';
      // Only show error if we have no profile to display
      if (!profile) setLoadError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    // Seed form from AuthContext user immediately (avoids blank state)
    if (authUser) {
      setProfile(authUser);
      setIsLoading(false);
    }
    // Then refresh from API
    loadProfile(Boolean(authUser));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfile(true);
  }, [loadProfile]);

  // ── Edit mode ──────────────────────────────────────────────────────────────

  const openEdit = useCallback(() => {
    setEditName(profile?.name || '');
    setEditPhone(profile?.phone || '');
    setNameError(null);
    setPhoneError(null);
    setSaveError(null);
    setIsEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setNameError(null);
    setPhoneError(null);
    setSaveError(null);
  }, []);

  // Validate on change
  const handleNameChange = (val: string) => {
    setEditName(val);
    if (nameError) setNameError(validateName(val));
  };

  const handlePhoneChange = (val: string) => {
    setEditPhone(val);
    if (phoneError) setPhoneError(validatePhone(val));
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Duplicate submission guard
    if (isSavingRef.current) return;

    // Validate
    const nErr = validateName(editName);
    const pErr = validatePhone(editPhone);
    setNameError(nErr);
    setPhoneError(pErr);
    if (nErr || pErr) return;

    // Connectivity required
    if (!isConnected) {
      setSaveError('Profile updates require an internet connection. Please connect and try again.');
      return;
    }

    // Check if anything actually changed
    const nameChanged = editName.trim() !== (profile?.name || '').trim();
    const phoneChanged = (editPhone || '').trim() !== (profile?.phone || '').trim();
    if (!nameChanged && !phoneChanged) {
      setIsEditing(false);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      const payload: { name?: string; phone?: string | null } = {};
      if (nameChanged) payload.name = editName.trim();
      if (phoneChanged) payload.phone = editPhone.trim() || null;

      const updatedUser = await userProfileService.updateProfile(payload);
      setProfile(updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      // Handle field-level validation errors from backend
      const errors = err?.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        errors.forEach((e: { field?: string; message: string }) => {
          if (e.field === 'name') setNameError(e.message);
          if (e.field === 'phone') setPhoneError(e.message);
        });
      } else {
        const msg =
          err?.isOfflineError
            ? 'Profile updates require an internet connection.'
            : err?.response?.data?.message ||
              err?.message ||
              'Failed to update profile. Please try again.';
        setSaveError(msg);
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [editName, editPhone, isConnected, profile]);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogoutPress = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch {
              // AuthContext handles cleanup regardless
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [logout]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title="My Profile" roleBadge="CITIZEN" />
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error with no profile ──────────────────────────────────────────────────

  if (loadError && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title="My Profile" roleBadge="CITIZEN" />
        {!isConnected && <OfflineBanner />}
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could Not Load Profile</Text>
          <Text style={styles.errorMessage}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { setIsLoading(true); loadProfile(); }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Status badge ───────────────────────────────────────────────────────────

  const statusMeta = getStatusLabel(profile?.status || '');
  const roleLabel = getRoleLabel(profile?.role || '');

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar title="My Profile" roleBadge="CITIZEN" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Offline banner */}
          {!isConnected && <OfflineBanner />}

          {/* Cached data notice */}
          {fromCache && (
            <View style={styles.cachedNotice}>
              <Text style={styles.cachedNoticeText}>
                📴 Showing cached profile (last synced while online)
              </Text>
            </View>
          )}

          {/* ── PROFILE HEADER ─────────────────────────────────────── */}
          <View style={styles.profileHeader}>
            <View
              style={styles.avatarCircle}
              accessibilityElementsHidden
            >
              <Text style={styles.avatarInitial}>
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.profileName} accessibilityRole="header">
              {profile?.name || '—'}
            </Text>

            <View style={styles.statusRow}>
              <View
                style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}18` }]}
                accessibilityLabel={`Account status: ${statusMeta.label}`}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusMeta.color }]}
                  accessibilityElementsHidden
                />
                <Text style={[styles.statusText, { color: statusMeta.color }]}>
                  {statusMeta.label}
                </Text>
              </View>

              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>

            <Text style={styles.profileEmail}>{profile?.email || '—'}</Text>
          </View>

          {/* ── EDITABLE PROFILE FIELDS ────────────────────────────── */}
          {!isEditing ? (
            // READ MODE
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Contact Information</Text>
                <TouchableOpacity
                  onPress={openEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Edit contact information"
                  style={styles.editButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <Text style={styles.fieldValue}>{profile?.name || '—'}</Text>
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <Text style={styles.fieldValue}>{profile?.phone || 'Not provided'}</Text>
              </View>
            </View>
          ) : (
            // EDIT MODE
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit Contact Information</Text>

              {/* Offline save warning */}
              {!isConnected && (
                <View style={styles.offlineEditNotice}>
                  <Text style={styles.offlineEditText}>
                    ⚠️ You are offline. Profile updates require a connection.
                  </Text>
                </View>
              )}

              {/* Save-level error */}
              {saveError && (
                <View
                  style={styles.saveErrorBanner}
                  accessibilityRole="alert"
                  accessibilityLabel={saveError}
                >
                  <Text style={styles.saveErrorText}>{saveError}</Text>
                </View>
              )}

              {/* Name Field */}
              <Text
                style={styles.inputLabel}
                nativeID="name-label"
              >
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                value={editName}
                onChangeText={handleNameChange}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                maxLength={100}
                accessibilityLabel="Full name"
                accessibilityHint="Enter your full name, 2 to 100 characters"
                accessibilityState={{ selected: false }}
                accessibilityLabelledBy="name-label"
                editable={!isSaving}
                returnKeyType="next"
              />
              {nameError && (
                <Text
                  style={styles.fieldError}
                  accessibilityRole="alert"
                  accessibilityLabel={nameError}
                >
                  {nameError}
                </Text>
              )}

              {/* Phone Field */}
              <Text
                style={[styles.inputLabel, { marginTop: spacing.spaceMd }]}
                nativeID="phone-label"
              >
                Phone Number
              </Text>
              <TextInput
                style={[styles.input, phoneError ? styles.inputError : null]}
                value={editPhone}
                onChangeText={handlePhoneChange}
                placeholder="e.g. +91 98765 43210 (optional)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={20}
                accessibilityLabel="Phone number"
                accessibilityHint="Enter your phone number or leave blank"
                accessibilityLabelledBy="phone-label"
                editable={!isSaving}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              {phoneError && (
                <Text
                  style={styles.fieldError}
                  accessibilityRole="alert"
                  accessibilityLabel={phoneError}
                >
                  {phoneError}
                </Text>
              )}

              {/* Action Buttons */}
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.cancelButton]}
                  onPress={cancelEdit}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel profile edit"
                  accessibilityState={{ disabled: isSaving }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (isSaving || !isConnected) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving || !isConnected}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSaving ? 'Saving profile changes' : 'Save profile changes'
                  }
                  accessibilityState={{ disabled: isSaving || !isConnected, busy: isSaving }}
                  activeOpacity={0.75}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── ACCOUNT INFORMATION ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Information</Text>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <Text style={styles.fieldValue}>{profile?.email || '—'}</Text>
            </View>
            <View style={styles.fieldDivider} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Role</Text>
              <Text style={styles.fieldValue}>{roleLabel}</Text>
            </View>
            <View style={styles.fieldDivider} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Account Status</Text>
              <Text style={[styles.fieldValue, { color: statusMeta.color, fontWeight: '600' }]}>
                {statusMeta.label}
              </Text>
            </View>
            <View style={styles.fieldDivider} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Member Since</Text>
              <Text style={styles.fieldValue}>{fmtDate(profile?.createdAt)}</Text>
            </View>
          </View>

          {/* ── ACCOUNT NOTICE — suspended/pending ──────────────────── */}
          {(profile?.status === USER_STATUS.SUSPENDED ||
            profile?.status === USER_STATUS.DEACTIVATED) && (
            <View
              style={styles.statusWarningBanner}
              accessibilityRole="alert"
            >
              <Text style={styles.statusWarningText}>
                {profile?.status === USER_STATUS.SUSPENDED
                  ? '⚠️ Your account is currently suspended. Please contact support for assistance.'
                  : '⚠️ Your account has been deactivated.'}
              </Text>
            </View>
          )}

          {profile?.status === USER_STATUS.PENDING_VERIFICATION && (
            <View
              style={styles.pendingBanner}
              accessibilityRole="alert"
            >
              <Text style={styles.pendingBannerText}>
                🕐 Your account is pending verification. You'll receive a notification once verified.
              </Text>
            </View>
          )}

          {/* ── ACCOUNT ACTIONS / LOGOUT ─────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Actions</Text>

            <TouchableOpacity
              style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
              onPress={handleLogoutPress}
              disabled={isLoggingOut}
              accessibilityRole="button"
              accessibilityLabel={isLoggingOut ? 'Signing out' : 'Sign out of ECOSETU'}
              accessibilityState={{ disabled: isLoggingOut, busy: isLoggingOut }}
              activeOpacity={0.75}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.logoutButtonText}>🚪 Sign Out</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── ECOSETU chain note ───────────────────────────────────── */}
          <View style={styles.chainNote}>
            <Text style={styles.chainNoteText}>
              ECOSETU connects citizens with local informal collectors (Kabadiwalas) for responsible e-waste collection.
            </Text>
          </View>

          <View style={{ height: spacing.spaceXl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },

  // ── Profile Header ──
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.spaceLg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceSm,
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.spaceXs,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceXs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceMd,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },

  // ── Fields ──
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.spaceSm,
    gap: spacing.spaceSm,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },

  // ── Edit Button ──
  editButton: {
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Inputs ──
  inputLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },

  // ── Edit Actions ──
  editActions: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceLg,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Status banners ──
  statusWarningBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
  },
  statusWarningText: {
    fontSize: 13,
    color: '#B71C1C',
    lineHeight: 19,
  },
  pendingBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
  },
  pendingBannerText: {
    fontSize: 13,
    color: '#BF360C',
    lineHeight: 19,
  },

  // ── Save error ──
  saveErrorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  saveErrorText: {
    fontSize: 13,
    color: colors.error,
  },

  // ── Offline edit notice ──
  offlineEditNotice: {
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  offlineEditText: {
    fontSize: 12,
    color: '#F57F17',
  },

  // ── Cached notice ──
  cachedNotice: {
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    padding: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  cachedNoticeText: {
    fontSize: 12,
    color: '#F57F17',
  },

  // ── Logout ──
  logoutButton: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.spaceXs,
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  logoutButtonText: {
    fontSize: 15,
    color: colors.error,
    fontWeight: '700',
  },

  // ── Chain note ──
  chainNote: {
    paddingHorizontal: spacing.spaceMd,
    paddingBottom: spacing.spaceSm,
  },
  chainNoteText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // ── Skeleton ──
  skeletonContainer: {
    padding: spacing.spaceMd,
    alignItems: 'center',
  },
  skeletonAvatar: {
    marginBottom: spacing.spaceSm,
  },
  skeletonLine: {
    marginBottom: spacing.spaceSm,
    alignSelf: 'center',
  },
  skeletonCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  skeletonInput: {
    marginBottom: spacing.spaceSm,
    borderRadius: 8,
  },

  // ── Error state ──
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceLg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.spaceSm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.spaceMd,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CitizenProfileScreen;
