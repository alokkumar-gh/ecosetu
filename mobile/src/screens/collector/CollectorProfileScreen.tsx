/**
 * CollectorProfileScreen
 * Authenticated INFORMAL_COLLECTOR — Profile and availability management screen.
 *
 * ECOSETU Business Chain:
 *   CITIZEN → LOCAL INFORMAL COLLECTOR (KABADIWALA) → FORMAL RECYCLER
 *
 * This screen:
 *   - Displays authenticated collector's verified profile details (name, email, phone, role, status)
 *   - Displays collector operational details (bio, service radius, total pickups)
 *   - Allows editing of permitted user fields (name, phone) via PATCH /api/v1/users/me
 *   - Allows updating collector details (bio, serviceRadiusKm) via PUT /api/v1/collectors/profile
 *   - Enforces protected fields (role, status, email, id, totalPickups, idDocumentUrl, createdAt, updatedAt)
 *   - Manages collector online availability via PATCH /api/v1/collectors/availability
 *   - Displays operational statistics from GET /api/v1/collectors/stats
 *   - Preserves location privacy (does NOT expose raw latitude/longitude coordinates)
 *   - Requires connectivity for server-authoritative mutations (availability, profile updates)
 *   - Shows cached profile when offline with stale-cache indication
 *   - Provides accessible logout with confirmation dialog
 *   - Strictly maintains role boundaries (no recycler/consignment/admin features)
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Sections 3 & 4
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *   docs/10_BACKEND_ARCHITECTURE.md
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
  Switch,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import {
  EcoSetuBackground,
  EcoGlassInput,
  EcoGlassTextArea,
  EcoGlassNumberInput,
} from '../../components/eco';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';
import { collectorService } from '../../services/collectorService';
import { userProfileService } from '../../services/userProfileService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

const USER_ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  INFORMAL_COLLECTOR: 'INFORMAL_COLLECTOR',
  RECYCLER: 'RECYCLER',
  ADMIN: 'ADMIN',
});

// ─── Validation Helpers ───────────────────────────────────────────────────────

const validateName = (name: string): string | null => {
  if (!name || !name.trim()) return 'Name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  if (name.trim().length > 100) return 'Name must be 100 characters or fewer.';
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone || !phone.trim()) return null;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
  if (!phoneRegex.test(phone.trim())) {
    return 'Enter a valid phone number (e.g. +91 98765 43210).';
  }
  return null;
};

const validateRadius = (radius: string): string | null => {
  if (!radius || !radius.trim()) return null;
  const num = parseFloat(radius);
  if (isNaN(num) || num < 1 || num > 50) {
    return 'Service radius must be between 1 and 50 km.';
  }
  return null;
};

const validateBio = (bio: string): string | null => {
  if (bio && bio.length > 500) {
    return 'Bio must be 500 characters or fewer.';
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  navigation?: any;
}

export const CollectorProfileScreen: React.FC<Props> = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();

  // Voice Assistance state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);

  useEffect(() => {
    voiceService.isVoiceAssistanceEnabled().then((enabled) => {
      setIsVoiceEnabled(enabled);
    });
    const unsub = voiceService.subscribe((enabled) => {
      setIsVoiceEnabled(enabled);
    });
    return () => unsub();
  }, []);

  const handleToggleVoice = async (value: boolean) => {
    setIsVoiceEnabled(value);
    await voiceService.setVoiceAssistanceEnabled(value);
    if (!value) {
      voiceService.stop();
    }
  };

  const handlePlaySample = async () => {
    setIsPlayingSample(true);
    try {
      await voiceService.speak(
        t('voice.sampleAnnouncement') ||
          'Voice assistance is enabled. You will receive voice announcements for important collection updates.',
        {
          language,
          priority: AnnouncementPriority.HIGH,
          force: true,
        }
      );
    } finally {
      setIsPlayingSample(false);
    }
  };

  // Screen states
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Availability state
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState<boolean>(false);
  const availabilityRef = useRef<boolean>(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editRadius, setEditRadius] = useState<string>('');

  // Edit validation & in-flight states
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [radiusError, setRadiusError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const saveRef = useRef<boolean>(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Status & verification
  const collectorStatus = profile?.user?.status || user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── Load Profile & Stats ────────────────────────────────────────────────────

  const loadProfileData = useCallback(async (silent = false) => {
    if (!silent) setLoadError(null);

    let anyFromCache = false;

    try {
      const [profileRes, statsRes] = await Promise.allSettled([
        collectorService.getProfile(),
        collectorService.getStats(),
      ]);

      if (profileRes.status === 'fulfilled') {
        const p: any = profileRes.value.profile;
        if (p) {
          setProfile(p);
          setIsAvailable(Boolean(p.isAvailable));
          setEditName(p.user?.name || user?.name || '');
          setEditPhone(p.user?.phone || user?.phone || '');
          setEditBio(p.bio || '');
          setEditRadius(p.serviceRadiusKm != null ? String(p.serviceRadiusKm) : '5');
          if (profileRes.value.fromCache) anyFromCache = true;
        }
      } else {
        const msg =
          (profileRes.reason as any)?.response?.data?.message ||
          (profileRes.reason as any)?.message ||
          'Failed to load collector profile.';
        setLoadError(msg);
      }

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.stats;
        if (s) {
          setStats(s);
          if (statsRes.value.fromCache) anyFromCache = true;
        }
      }

      setFromCache(anyFromCache);
    } catch {
      setLoadError('An unexpected error occurred while loading your profile.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData(false);
  }, [loadProfileData]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfileData(true);
  }, [loadProfileData]);

  // ── Availability Toggle ────────────────────────────────────────────────────

  const handleToggleAvailability = useCallback(
    async (newValue: boolean) => {
      if (!isConnected) {
        Alert.alert(
          'Internet Connection Required',
          'Toggling availability requires an active internet connection so citizens know you are online to accept requests.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (!isVerified) {
        Alert.alert(
          'Verification Required',
          'Only verified active collectors can toggle availability. Your account is currently pending administrative verification.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (availabilityRef.current) return;
      availabilityRef.current = true;
      setIsTogglingAvailability(true);

      // Optimistic update
      const previousValue = isAvailable;
      setIsAvailable(newValue);

      try {
        const updated = await collectorService.toggleAvailability(newValue);
        if (updated) {
          setProfile((prev: any) => (prev ? { ...prev, isAvailable: newValue } : prev));
        }
      } catch (err: any) {
        // Rollback optimistic update
        setIsAvailable(previousValue);
        const status = err?.response?.status;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Could not update availability. Please try again.';

        if (status === 403) {
          Alert.alert(
            'Verification Required',
            'Your account is pending verification. Only active collectors can set availability.',
            [{ text: 'OK' }],
          );
        } else {
          Alert.alert('Update Failed', msg, [{ text: 'OK' }]);
        }
      } finally {
        availabilityRef.current = false;
        setIsTogglingAvailability(false);
      }
    },
    [isConnected, isVerified, isAvailable],
  );

  // ── Start Editing ──────────────────────────────────────────────────────────

  const handleStartEdit = useCallback(() => {
    if (!isConnected) {
      Alert.alert(
        'Offline Mode',
        'Profile editing requires an internet connection. Please connect to update your profile.',
        [{ text: 'OK' }],
      );
      return;
    }
    setEditName(profile?.user?.name || user?.name || '');
    setEditPhone(profile?.user?.phone || user?.phone || '');
    setEditBio(profile?.bio || '');
    setEditRadius(profile?.serviceRadiusKm != null ? String(profile?.serviceRadiusKm) : '5');
    setNameError(null);
    setPhoneError(null);
    setRadiusError(null);
    setBioError(null);
    setSaveError(null);
    setIsEditing(true);
  }, [isConnected, profile, user]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setNameError(null);
    setPhoneError(null);
    setRadiusError(null);
    setBioError(null);
    setSaveError(null);
  }, []);

  // ── Save Profile ───────────────────────────────────────────────────────────

  const handleSaveProfile = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Connecting to the internet is required to save changes.', [
        { text: 'OK' },
      ]);
      return;
    }

    // Validate fields
    const nErr = validateName(editName);
    const pErr = validatePhone(editPhone);
    const rErr = validateRadius(editRadius);
    const bErr = validateBio(editBio);

    setNameError(nErr);
    setPhoneError(pErr);
    setRadiusError(rErr);
    setBioError(bErr);

    if (nErr || pErr || rErr || bErr) return;

    if (saveRef.current) return;
    saveRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Update user fields (name, phone) via PATCH /api/v1/users/me
      const updatedUser = await userProfileService.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || null,
      });

      // 2. Update collector profile fields (bio, serviceRadiusKm) via PUT /api/v1/collectors/profile
      const updatedCollector = await collectorService.updateCollectorProfile({
        bio: editBio.trim() || null,
        serviceRadiusKm: editRadius.trim() ? parseFloat(editRadius.trim()) : 5.0,
      });

      // Update state
      setProfile((prev: any) => ({
        ...prev,
        ...updatedCollector,
        user: {
          ...(prev?.user || {}),
          ...updatedUser,
        },
      }));

      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile details have been successfully saved.', [
        { text: 'OK' },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not save profile changes. Please try again.';
      setSaveError(msg);
    } finally {
      saveRef.current = false;
      setIsSaving(false);
    }
  }, [isConnected, editName, editPhone, editRadius, editBio]);

  // ── Logout Flow ────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your ECOSETU collector account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch {
              setIsLoggingOut(false);
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
          },
        },
      ],
    );
  }, [logout]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayName = profile?.user?.name || user?.name || 'Collector';
  const displayEmail = profile?.user?.email || user?.email || '—';
  const displayPhone = profile?.user?.phone || user?.phone || 'Not provided';
  const displayBio = profile?.bio || 'No bio provided.';
  const displayRadius =
    profile?.serviceRadiusKm != null ? `${profile.serviceRadiusKm} km coverage radius` : '5 km radius';

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('collector.profile.title') || "Collector Profile"}
        subtitle="Manage your collector account & availability"
      />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Stale Cache Notice */}
      {isConnected && fromCache && (
        <View style={styles.cacheNotice} accessibilityRole="alert">
          <Text style={styles.cacheNoticeText}>
            {t('offline.cachedNotice') || 'ℹ Showing cached profile data. Pull down to refresh live details.'}
          </Text>
        </View>
      )}

      {/* Verification Status Warning Banner */}
      {collectorStatus && collectorStatus !== USER_STATUS.ACTIVE && (
        <View style={styles.warningBanner} accessibilityRole="alert">
          <Text style={styles.warningBannerText}>
            {collectorStatus === USER_STATUS.PENDING_VERIFICATION
              ? (t('collector.dashboard.pendingNotice') || '⏳ Account Pending Verification: Your credentials are under review by an administrator. Availability toggle and pickup actions will be enabled upon approval.')
              : (t('collector.dashboard.suspendedNotice') || '⚠ Account Suspended: Your collector privileges are temporarily restricted.')}
          </Text>
        </View>
      )}

      {/* Error Banner */}
      {Boolean(loadError) && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadProfileData(false)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton width="100%" height={120} style={styles.skeletonCard} />
          <Skeleton width="100%" height={150} style={styles.skeletonCard} />
          <Skeleton width="100%" height={100} style={styles.skeletonCard} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.headerName} accessibilityRole="header">
                {displayName}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge} accessibilityRole="text">
                  <Text style={styles.roleBadgeText}>{t('roles.collector') || 'Informal Collector'}</Text>
                </View>
                <StatusBadge status={collectorStatus || 'ACTIVE'} />
              </View>
            </View>

            {/* Availability Switch Section */}
            <View style={styles.card}>
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityInfo}>
                  <Text style={styles.sectionTitle}>{t('collector.profile.availability') || 'Online Availability'}</Text>
                  <Text style={styles.availabilitySub}>
                    {isAvailable
                      ? ('🟢 ' + (t('collector.profile.availableNow') || 'You are available to accept new doorstep collection requests.'))
                      : ('⚪ ' + (t('collector.profile.unavailableNow') || 'You are offline. Citizens will not see you in active collectors.'))}
                  </Text>
                </View>
                <View style={styles.switchWrapper}>
                  {isTogglingAvailability ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Switch
                      value={isAvailable}
                      onValueChange={handleToggleAvailability}
                      trackColor={{ false: '#E0E0E0', true: `${colors.primary}80` }}
                      thumbColor={isAvailable ? colors.primary : '#BDBDBD'}
                      disabled={!isVerified || !isConnected || isTogglingAvailability}
                      accessibilityRole="switch"
                      accessibilityLabel="Collector availability switch"
                      accessibilityHint="Toggles your availability to accept citizen collection requests"
                      accessibilityState={{
                        checked: isAvailable,
                        busy: isTogglingAvailability,
                        disabled: !isVerified || !isConnected,
                      }}
                    />
                  )}
                </View>
              </View>
            </View>

            {/* Operational Statistics Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading} accessibilityRole="header">
                {t('collector.profile.operationalDetails') || 'Operational Statistics'}
              </Text>
              <View style={styles.statsGrid}>
                <MetricCard
                  icon="📦"
                  value={stats?.totalPickups ?? profile?.totalPickups ?? 0}
                  label={t('collector.profile.totalPickups') || 'Total Pickups'}
                  accentColor={colors.primary}
                />
                <MetricCard
                  icon="⚖️"
                  value={`${stats?.totalWeightKg ?? 0} kg`}
                  label={t('collector.dashboard.totalCollected') || 'E-Waste Collected'}
                  accentColor="#2E7D32"
                />
              </View>
              <View style={[styles.statsGrid, { marginTop: spacing.spaceSm }]}>
                <MetricCard
                  icon="🚚"
                  value={stats?.activeRequests ?? 0}
                  label={t('collector.dashboard.activeRequests') || 'Active Requests'}
                  accentColor="#E65100"
                />
                <MetricCard
                  icon="🏢"
                  value={stats?.totalConsignments ?? 0}
                  label={t('collector.dashboard.consignments') || 'Consignments'}
                  accentColor="#1565C0"
                />
              </View>
            </View>

            {/* Personal Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {t('collector.profile.collectorInfo') || 'Personal Information'}
                </Text>
                {!isEditing && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleStartEdit}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile details"
                    disabled={!isConnected}
                  >
                    <Text
                      style={[
                        styles.editButtonText,
                        !isConnected && styles.textDisabled,
                      ]}
                    >
                      {t('common.edit') || 'Edit'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Save Error */}
              {Boolean(saveError) && (
                <View style={styles.saveErrorBox} accessibilityRole="alert">
                  <Text style={styles.saveErrorText}>{saveError}</Text>
                </View>
              )}

              {/* Full Name */}
              <View style={styles.fieldGroup}>
                {isEditing ? (
                  <EcoGlassInput
                    label={t('auth.name') || 'Full Name'}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder={t('auth.name') || 'Enter full name'}
                    maxLength={100}
                    error={nameError}
                    editable={!isSaving}
                  />
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>{t('auth.name') || 'Full Name'}</Text>
                    <Text style={styles.fieldValue}>{displayName}</Text>
                  </>
                )}
              </View>

              {/* Email (Read Only - Protected) */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>{t('auth.email') || 'Email Address'}</Text>
                  <Text style={styles.protectedLabel}>{t('citizen.profile.accountStatus') || 'Protected'}</Text>
                </View>
                <Text style={styles.fieldValueReadOnly}>{displayEmail}</Text>
              </View>

              {/* Phone */}
              <View style={styles.fieldGroup}>
                {isEditing ? (
                  <EcoGlassInput
                    label={t('auth.phone') || 'Phone Number'}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    error={phoneError}
                    editable={!isSaving}
                  />
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>{t('auth.phone') || 'Phone Number'}</Text>
                    <Text style={styles.fieldValue}>{displayPhone}</Text>
                  </>
                )}
              </View>
            </View>

            {/* Collector Information Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('collector.profile.operationalDetails') || 'Collector Details'}
              </Text>

              {/* Bio */}
              <View style={styles.fieldGroup}>
                {isEditing ? (
                  <EcoGlassTextArea
                    label={t('collector.profile.bio') || 'Bio / Introduction'}
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="Share a short bio with citizens..."
                    maxLength={500}
                    error={bioError}
                    editable={!isSaving}
                  />
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>{t('collector.profile.bio') || 'Bio / Introduction'}</Text>
                    <Text style={styles.fieldValue}>{displayBio}</Text>
                  </>
                )}
              </View>

              {/* Service Radius */}
              <View style={styles.fieldGroup}>
                {isEditing ? (
                  <EcoGlassNumberInput
                    label={t('collector.profile.serviceRadius') || 'Operating Service Radius'}
                    value={editRadius}
                    onChangeText={setEditRadius}
                    placeholder="5"
                    unit="km"
                    error={radiusError}
                    editable={!isSaving}
                  />
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>{t('collector.profile.serviceRadius') || 'Operating Service Radius'}</Text>
                    <Text style={styles.fieldValue}>{displayRadius}</Text>
                  </>
                )}
              </View>

              {/* Action Buttons when editing */}
              {isEditing && (
                <View style={styles.editActionsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing"
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.btnDisabled]}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel="Save profile changes"
                    accessibilityState={{ busy: isSaving, disabled: isSaving }}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('collector.profile.saveChanges') || 'Save Changes'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Voice Assistance Preferences Card */}
            <View style={styles.card}>
              <View style={styles.voiceHeaderRow}>
                <View style={styles.voiceTitleContainer}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">
                    🔊 {t('voice.voiceAssistance') || 'Voice Assistance'}
                  </Text>
                  <Text style={styles.voiceStatusSubtitle}>
                    {isVoiceEnabled
                      ? (t('voice.voiceEnabled') || 'Voice Enabled')
                      : (t('voice.voiceDisabled') || 'Voice Disabled')}
                  </Text>
                </View>
                <Switch
                  value={isVoiceEnabled}
                  onValueChange={handleToggleVoice}
                  trackColor={{ false: colors.divider, true: colors.primaryLight }}
                  thumbColor={isVoiceEnabled ? colors.primary : '#f4f3f4'}
                  accessibilityRole="switch"
                  accessibilityLabel={t('voice.voiceAssistance') || 'Voice Assistance'}
                  accessibilityState={{ checked: isVoiceEnabled }}
                />
              </View>

              <Text style={styles.voiceDescText}>
                {t('voice.voiceSettingsDesc') ||
                  'Receive spoken audio announcements for new requests, pickup status updates, and read aloud summaries.'}
              </Text>

              <TouchableOpacity
                style={[styles.sampleButton, isPlayingSample && styles.sampleButtonActive]}
                onPress={handlePlaySample}
                disabled={isPlayingSample}
                accessibilityRole="button"
                accessibilityLabel={t('voice.playSample') || 'Play Sample'}
                accessibilityHint="Plays a sample audio announcement"
              >
                {isPlayingSample ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.sampleButtonText}>
                    ▶️ {t('voice.playSample') || 'Play Sample'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Language Preferences Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('collector.profile.selectLanguage') || 'Language Preferences'}
              </Text>
              <LanguageSelector variant="chips" />
            </View>

            {/* EcoSetu Model Architecture Info */}
            <View style={styles.chainNoteCard}>
              <Text style={styles.chainNoteTitle}>EcoSetu Chain of Custody</Text>
              <Text style={styles.chainNoteText}>
                CITIZEN → INFORMAL COLLECTOR (KABADIWALA) → FORMAL RECYCLER
              </Text>
              <Text style={styles.chainNoteSub}>
                As a local collector, you bridge citizens to authorized recyclers. E-waste collected is batched into consignments for delivery to formal recycling centers.
              </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
              accessibilityRole="button"
              accessibilityLabel="Log out of account"
              accessibilityHint="Logs out of the application and returns to the login screen"
              accessibilityState={{ busy: isLoggingOut, disabled: isLoggingOut }}
              activeOpacity={0.8}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.logoutButtonText}>{t('collector.profile.signOut') || 'Log Out'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  cacheNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
  },
  cacheNoticeText: {
    fontSize: typography.Caption.fontSize,
    color: '#FBBF24',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
  },
  warningBannerText: {
    fontSize: typography.Caption.fontSize,
    color: '#FBBF24',
    fontWeight: '600',
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: spacing.spaceMd,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    fontSize: typography.Body.fontSize,
    color: '#F87171',
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  retryBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs,
    borderRadius: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonContainer: {
    padding: spacing.spaceMd,
  },
  skeletonCard: {
    marginBottom: spacing.spaceMd,
    borderRadius: 8,
  },
  headerCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.78)',
    borderRadius: 16,
    padding: spacing.spaceMd,
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceSm,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#34D399',
  },
  headerName: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: spacing.spaceSm,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22D3EE',
  },
  card: {
    backgroundColor: 'rgba(6, 21, 27, 0.78)',
    borderRadius: 14,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  editButton: {
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    minHeight: 48,
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: typography.Body.fontSize,
  },
  textDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityInfo: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  availabilitySub: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  switchWrapper: {
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: spacing.spaceMd,
  },
  sectionHeading: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceSm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.spaceSm,
  },
  fieldGroup: {
    marginBottom: spacing.spaceMd,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  protectedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fieldValue: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  fieldValueReadOnly: {
    fontSize: typography.Body.fontSize,
    color: '#CBD5E1',
    backgroundColor: 'rgba(6, 21, 27, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    borderRadius: 10,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    minHeight: 48,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    borderRadius: 10,
    padding: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  radiusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusInput: {
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    borderRadius: 10,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    width: 80,
    minHeight: 48,
    textAlign: 'center',
  },
  radiusUnit: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    marginLeft: 8,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldErrorText: {
    color: colors.error,
    fontSize: 11,
    marginTop: 4,
  },
  saveErrorBox: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginBottom: spacing.spaceSm,
  },
  saveErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 6,
    paddingVertical: spacing.spaceSm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.spaceSm,
    minHeight: 48,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.Button.fontSize,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: spacing.spaceSm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  chainNoteCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceLg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  chainNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 4,
  },
  chainNoteText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    marginBottom: 4,
  },
  chainNoteSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    paddingVertical: spacing.spaceMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  logoutButtonText: {
    color: '#F87171',
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  voiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceXs,
  },
  voiceTitleContainer: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  voiceStatusSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  voiceDescText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.spaceMd,
  },
  sampleButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.spaceSm,
    paddingHorizontal: spacing.spaceMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  sampleButtonActive: {
    backgroundColor: '#C8E6C9',
  },
  sampleButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CollectorProfileScreen;
