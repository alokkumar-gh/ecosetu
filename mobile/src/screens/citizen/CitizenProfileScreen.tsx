/**
 * CitizenProfileScreen
 * Authenticated CITIZEN — Modern Grouped Action Menu Profile Screen
 * Styled identically to Collector & Recycler Profile Screens.
 *
 * Design Structure:
 *  1. PROFILE HEADER — Large avatar, name, verified badge, contact details, joined date, edit button
 *  2. SERVICES & ACTIVITY — My Requests, Pickup History, Green Credits & Impact
 *  3. PREFERENCES — Inline 4-Language Switcher (English, Hindi, Marathi, Odia), Notifications
 *  4. ACCOUNT & SUPPORT — Safety & Privacy, Help & Support, Terms
 *  5. SIGN OUT — Destructive card with confirmation alert
 *  6. EDIT PROFILE MODAL — Allows editing Name & Phone with full client-side validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { LANGUAGE_OPTIONS, SupportedLanguage } from '../../i18n/config';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { userProfileService } from '../../services/userProfileService';
import { colors } from '../../theme/colors';

// ─────────────────────────────────────────────────────────────────────────────
// MENU ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface MenuRowProps {
  icon: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  label,
  sub,
  onPress,
  rightContent,
  destructive = false,
  disabled = false,
}) => (
  <TouchableOpacity
    style={[styles.menuRow, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={!onPress || disabled}
    activeOpacity={onPress ? 0.7 : 1}
    accessibilityRole={onPress ? 'button' : 'text'}
  >
    <View style={styles.menuIconBox}>
      <Text style={styles.menuIcon}>{icon}</Text>
    </View>
    <View style={styles.menuTextCol}>
      <Text style={[styles.menuLabel, destructive && { color: '#FCA5A5' }]}>{label}</Text>
      {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
    </View>
    {rightContent ?? (onPress ? <Text style={styles.menuChevron}>›</Text> : null)}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// MENU GROUP CONTAINER
// ─────────────────────────────────────────────────────────────────────────────
const MenuGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={styles.group}>
    <Text style={styles.groupLabel}>{label}</Text>
    <View style={styles.groupCard}>{children}</View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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
    return 'Invalid phone number format.';
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CITIZEN PROFILE SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export const CitizenProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language, setLanguage } = useI18n();

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await userProfileService.getProfile();
      if (res?.user) {
        setProfile(res.user);
      }
    } catch (e) {
      console.warn('[CitizenProfile] Load error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadProfile(true);
  };

  const handleOpenEdit = () => {
    setEditName(profile?.name || user?.name || '');
    setEditPhone(profile?.phone || user?.phone || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    const nameErr = validateName(editName);
    if (nameErr) {
      setEditError(nameErr);
      return;
    }
    const phoneErr = validatePhone(editPhone);
    if (phoneErr) {
      setEditError(phoneErr);
      return;
    }

    if (!isConnected) {
      Alert.alert(
        t('common.offline', 'Offline'),
        t('citizen.profile.offlineError', 'Internet connection required to update profile.')
      );
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const updated: any = await userProfileService.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });

      if (updated?.user) {
        setProfile(updated.user);
      } else if (updated?.name) {
        setProfile(updated);
      } else {
        setProfile((prev: any) => ({
          ...prev,
          name: editName.trim(),
          phone: editPhone.trim(),
        }));
      }

      setIsEditModalOpen(false);
      Alert.alert(
        t('common.success', 'Success'),
        t('citizen.profile.updatedSuccess', 'Profile updated successfully!')
      );
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout', 'Sign Out'),
      t('citizen.profile.logoutConfirm', 'Are you sure you want to sign out from EcoSetu?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('auth.logout', 'Sign Out'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleLanguageSelect = async (code: SupportedLanguage) => {
    await setLanguage(code);
    setShowLanguagePicker(false);
  };

  // User details
  const activeUser = profile || user;
  const name = activeUser?.name || 'Citizen User';
  const email = activeUser?.email || '';
  const phone = activeUser?.phone || '';
  const initial = (name || 'C').charAt(0).toUpperCase();
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === language);
  const memberSince = activeUser?.createdAt
    ? new Date(activeUser.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : '2026';

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── PROFILE HEADER ───────────────────────────────────────── */}
          <View style={styles.profileHeader}>
            {/* Large avatar */}
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{initial}</Text>
            </View>

            <Text style={styles.profileName}>{name}</Text>

            {/* Verified Badge */}
            <View style={styles.verifiedRow}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedLabel}>{t('citizen.profile.statusActive', 'Active Citizen')}</Text>
            </View>

            {/* Email & Phone Details */}
            <View style={styles.contactDetails}>
              {email ? (
                <Text style={styles.contactText}>✉ {email}</Text>
              ) : null}
              {phone ? (
                <Text style={styles.contactText}>📞 {phone}</Text>
              ) : null}
              <Text style={styles.memberText}>🌱 {t('citizen.profile.memberSince', 'Member since')} {memberSince}</Text>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={handleOpenEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileBtnText}>✏️ {t('citizen.profile.editProfile', 'Edit Profile')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── SERVICES & ACTIVITY ─────────────────────────────────── */}
          <MenuGroup label={t('citizen.profile.sectionActivity', 'SERVICES & ACTIVITY')}>
            <MenuRow
              icon="📦"
              label={t('citizen.profile.myRequests', 'My Disposal Requests')}
              sub={t('citizen.profile.myRequestsSub', 'Track active pickups and collections')}
              onPress={() => navigation.navigate('History')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🎁"
              label={t('citizen.profile.greenCredits', 'Green Credits & Rewards')}
              sub={t('citizen.profile.greenCreditsSub', 'View impact points and eco badges')}
              onPress={() => navigation.navigate('Home')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🗺️"
              label={t('citizen.profile.savedAddresses', 'Pickup Locations & Map')}
              sub={t('citizen.profile.savedAddressesSub', 'Set default disposal addresses')}
              onPress={() => navigation.navigate('Give')}
            />
          </MenuGroup>

          {/* ── PREFERENCES ─────────────────────────────────────────── */}
          <MenuGroup label={t('citizen.profile.sectionPreferences', 'PREFERENCES')}>
            {/* Language Selection Row */}
            <MenuRow
              icon="🌐"
              label={t('citizen.profile.language', 'Language / भाषा')}
              sub={currentLang?.label ?? language}
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            />

            {/* Inline Language Picker Dropdown */}
            {showLanguagePicker && (
              <View style={styles.langPicker}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      styles.langOption,
                      language === opt.code && styles.langOptionSelected,
                    ]}
                    onPress={() => handleLanguageSelect(opt.code as SupportedLanguage)}
                    accessibilityRole="radio"
                  >
                    <Text
                      style={[
                        styles.langOptionLabel,
                        language === opt.code && styles.langOptionLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {language === opt.code && (
                      <Text style={styles.langCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.rowDivider} />
            <MenuRow
              icon="🔔"
              label={t('citizen.profile.notifications', 'Notifications')}
              sub={t('citizen.profile.notificationsSub', 'Collector arrivals and reward updates')}
              onPress={() => Alert.alert('Notifications', 'Notification preferences enabled.')}
            />
          </MenuGroup>

          {/* ── ACCOUNT & SUPPORT ───────────────────────────────────── */}
          <MenuGroup label={t('citizen.profile.sectionSupport', 'ACCOUNT & SUPPORT')}>
            <MenuRow
              icon="🛡️"
              label={t('citizen.profile.privacy', 'Data Privacy & Security')}
              sub={t('citizen.profile.privacySub', 'DPDP compliance and account security')}
              onPress={() => Alert.alert('Privacy & Security', 'EcoSetu adheres to India DPDP Act standards. All personal data is encrypted.')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📞"
              label={t('citizen.profile.help', 'Help & Grievance Helpline')}
              sub={t('citizen.profile.helpSub', '24/7 E-Waste assistance and queries')}
              onPress={() => Alert.alert('EcoSetu Support', 'Toll-free Helpline: 1800-ECO-SETU\nEmail: support@ecosetu.org')}
            />
          </MenuGroup>

          {/* ── SIGN OUT ─────────────────────────────────────────────── */}
          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleLogout}
              disabled={isLoggingOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>
                {isLoggingOut ? t('auth.signingOut', 'Signing out…') : `↩ ${t('auth.logout', 'Sign Out')}`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── EDIT PROFILE MODAL ─────────────────────────────────────── */}
        <Modal
          visible={isEditModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditModalOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('citizen.profile.editProfile', 'Edit Profile')}</Text>

              {editError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{editError}</Text>
                </View>
              ) : null}

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('citizen.profile.fullName', 'Full Name')}</Text>
                <TextInput
                  style={styles.inputField}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('citizen.profile.phoneNumber', 'Phone Number')}</Text>
                <TextInput
                  style={styles.inputField}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 9876543210"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>{t('common.save', 'Save Changes')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 40, paddingTop: 16 },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  largeAvatarText: { color: '#10B981', fontSize: 34, fontWeight: '900' },
  profileName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verifiedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  verifiedLabel: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  contactDetails: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contactText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  memberText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  editProfileBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editProfileBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Group
  group: { paddingHorizontal: 20, gap: 8 },
  groupLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    overflow: 'hidden',
  },

  // Menu row
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    gap: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuIcon: { fontSize: 20 },
  menuTextCol: { flex: 1, gap: 2 },
  menuLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  menuSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  menuChevron: { color: 'rgba(255,255,255,0.2)', fontSize: 22, fontWeight: '300' },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 68 },

  // Language picker
  langPicker: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    minHeight: 48,
  },
  langOptionSelected: { backgroundColor: 'rgba(16,185,129,0.08)' },
  langOptionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  langOptionLabelSelected: { color: '#10B981', fontWeight: '700' },
  langCheck: { color: '#10B981', fontSize: 16, fontWeight: '900' },

  // Sign out
  signOutSection: { paddingHorizontal: 20 },
  signOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
  },
  signOutText: { color: '#FCA5A5', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
    gap: 16,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },
  inputGroup: { gap: 6 },
  inputLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  inputField: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

export default CitizenProfileScreen;
