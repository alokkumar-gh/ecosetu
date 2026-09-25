/**
 * AdminUsersScreen
 * Authenticated ADMIN — User ecosystem management and account status controls.
 *
 * Operational Scope:
 *   - List platform users via GET /api/v1/admin/users
 *   - Filter by Role (ALL, CITIZEN, INFORMAL_COLLECTOR, RECYCLER, ADMIN)
 *   - Filter by Status (ALL, ACTIVE, SUSPENDED, DEACTIVATED, PENDING_VERIFICATION)
 *   - Search by Name or Email
 *   - Detail & Status Action Modal:
 *       Update user status via PATCH /api/v1/admin/users/:id/status
 *       Permitted transitions: ACTIVE, SUSPENDED, DEACTIVATED
 *       Pre-flight confirmation, duplicate protection, online-only validation
 *   - Verification bridge:
 *       Accounts in PENDING_VERIFICATION link to AdminVerifications
 *   - Multilingual support via useI18n() (EN, HI, MR, OR)
 *   - Strict privacy safeguards: ZERO passwords, tokens, addresses, coordinates
 *   - Accessible touch targets >= 48px
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 14
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md Section 4
 *   docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { useNetwork } from '../../hooks/useNetwork';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { adminService } from '../../services/adminService';
import { ROLES as CONST_ROLES } from '../../utils/constants';
import { EcoGlassSearch } from '../../components/eco';
import { AdminShell } from '../../components/admin/AdminShell';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const ROLE_FILTERS = ['ALL', 'CITIZEN', 'INFORMAL_COLLECTOR', 'RECYCLER', 'ADMIN'];
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING_VERIFICATION'];
const STATUSES = STATUS_FILTERS;
const PERMITTED_STATUS_UPDATES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

interface Props {
  navigation?: any;
  route?: any;
}

export const AdminUsersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user: currentUser } = useAuth();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  // Role Guard: Administrator access only
  const isAdmin = currentUser?.role === CONST_ROLES.ADMIN;

  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRole, setSelectedRole] = useState<string>(route?.params?.filterRole || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(route?.params?.filterStatus || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (route?.params?.filterRole) setSelectedRole(route.params.filterRole);
    if (route?.params?.filterStatus) setSelectedStatus(route.params.filterStatus);
  }, [route?.params]);

  // Selected User Modal & Status Modification
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('ACTIVE');
  const [statusReason, setStatusReason] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isSubmittingRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);

  const loadUsers = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!isAdmin) return;
      if (!silent) setError(null);
      try {
        const result = await adminService.getUsers({
          role: selectedRole,
          status: selectedStatus,
          search: searchQuery,
          page: targetPage,
          limit: 20,
        });
        setUsers(result.users || []);
        setPagination(result.pagination || null);
        setPage(targetPage);
        setFromCache(result.fromCache);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Unable to load users.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAdmin, selectedRole, selectedStatus, searchQuery],
  );

  useEffect(() => {
    setIsLoading(true);
    loadUsers(1, false);
  }, [loadUsers]);

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadUsers(1, true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadUsers]);

  const handleOpenUserModal = (targetUser: any) => {
    setSelectedUser(targetUser);
    setNewStatus(
      PERMITTED_STATUS_UPDATES.includes(targetUser.status)
        ? targetUser.status
        : 'ACTIVE',
    );
    setStatusReason('');
    setModalError(null);
  };

  const handleCloseModal = () => {
    if (isSubmittingStatus) return;
    setSelectedUser(null);
    setModalError(null);
  };

  const handleConfirmStatusChange = () => {
    if (!selectedUser) return;

    if (!isConnected) {
      Alert.alert(
        t('admin.governance.accessRestricted'),
        t('admin.users.offlineNotice'),
      );
      return;
    }

    if (selectedUser.id === currentUser?.id) {
      Alert.alert(
        t('admin.users.selfStatusForbidden'),
        t('admin.users.selfStatusForbiddenMessage'),
      );
      return;
    }

    if (newStatus === selectedUser.status) {
      Alert.alert(
        t('common.info') || 'Info',
        `User is already in '${newStatus}' status.`,
      );
      return;
    }

    Alert.alert(
      t('admin.users.confirmStatusTitle'),
      t('admin.users.confirmStatusMessage', { status: newStatus }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: newStatus === 'SUSPENDED' ? 'destructive' : 'default',
          onPress: executeStatusChange,
        },
      ],
    );
  };

  const executeStatusChange = async () => {
    if (!selectedUser || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmittingStatus(true);
    setModalError(null);

    try {
      const updatedUser: any = await adminService.updateUserStatus(
        selectedUser.id,
        newStatus,
        statusReason,
      );

      // Reconcile user list with authoritative update
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, ...updatedUser } : u)),
      );

      Alert.alert(
        t('common.success') || 'Success',
        t('admin.users.statusUpdatedSuccess'),
        [{ text: t('common.confirm') || 'OK', onPress: () => setSelectedUser(null) }],
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to update account status.';

      if (status === 409) {
        setModalError(t('admin.users.statusConflictMessage'));
        loadUsers(page, true);
      } else if (status === 403) {
        setModalError(t('admin.users.forbiddenError'));
      } else {
        setModalError(msg);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingStatus(false);
    }
  };

  // Bridge to verification center for pending accounts
  const handleNavigateToVerification = () => {
    handleCloseModal();
    if (navigation?.navigate) {
      navigation.navigate('AdminVerifications');
    }
  };

  // Access-denied guard for non-administrators
  if (!isAdmin) {
    return (
      <AdminShell
        title={t('admin.users.title')}
        activeScreen="AdminUsers"
        navigation={navigation}
      >
        <View style={styles.centerContainer}>
          <EmptyState
            title={t('admin.users.selfStatusForbidden')}
            message={t('admin.governance.accessRestrictedMessage')}
            actionLabel={t('common.back')}
            onAction={() => navigation?.goBack()}
          />
        </View>
      </AdminShell>
    );
  }

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleOpenUserModal(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`User: ${item.name || 'Unnamed'}, Role: ${item.role}, Status: ${item.status}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{item.name || 'Unnamed User'}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaBadge}>{t('admin.users.roleLabel')}: {item.role}</Text>
        {item.phone ? <Text style={styles.metaText}>📞 {item.phone}</Text> : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.joinedDate}>
          {t('admin.users.joinedLabel')}: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}
        </Text>
        <View style={styles.verifyChips}>
          {item.isEmailVerified && (
            <Text style={styles.verifiedTag}>{t('admin.users.verifiedEmailTag')}</Text>
          )}
          {item.isPhoneVerified && (
            <Text style={styles.verifiedTag}>{t('admin.users.verifiedPhoneTag')}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <AdminShell
      screenKey="AdminUsers"
      breadcrumb={['Ecosystem', 'Users']}
      navigation={navigation}
    >

        {fromCache && <OfflineBanner />}

        {/* Search Input using EcoGlassSearch */}
        <View style={styles.searchContainer}>
          <EcoGlassSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => {
              setSearchQuery('');
              loadUsers(1, false);
            }}
            placeholder={t('admin.users.searchPlaceholder') || 'Search users by name or email...'}
          />
        </View>

      {/* Role Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {ROLE_FILTERS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterChip, selectedRole === r && styles.filterChipActive]}
            onPress={() => setSelectedRole(r)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRole === r }}
            accessibilityLabel={`Role: ${r}`}
          >
            <Text
              style={[styles.filterChipText, selectedRole === r && styles.filterChipTextActive]}
            >
              {r === 'ALL' ? t('admin.users.roleFilterAll') : r.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, selectedStatus === s && styles.filterChipActive]}
            onPress={() => setSelectedStatus(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedStatus === s }}
            accessibilityLabel={`Status: ${s}`}
          >
            <Text
              style={[styles.filterChipText, selectedStatus === s && styles.filterChipTextActive]}
            >
              {s === 'ALL' ? t('admin.users.statusFilterAll') : s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={90} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
          <Skeleton width="100%" height={90} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
          <Skeleton width="100%" height={90} borderRadius={8} style={{ marginBottom: spacing.spaceSm }} />
        </View>
      ) : error && users.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Unable to Load Users"
            message={error}
            actionLabel={t('common.retry')}
            onAction={() => loadUsers(1, false)}
          />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={t('admin.users.noUsersFound')}
              message={t('admin.users.noUsersFoundSubtitle')}
              actionLabel={t('admin.users.clearFilters')}
              onAction={() => {
                setSelectedRole('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
            />
          }
        />
      )}

      {/* User Detail & Status Management Modal */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('admin.users.userDetailsTitle')}</Text>

            {selectedUser && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.nameLabel')}:</Text>
                  <Text style={styles.detailValue}>{selectedUser.name || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.emailLabel')}:</Text>
                  <Text style={styles.detailValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.phoneLabel')}:</Text>
                  <Text style={styles.detailValue}>{selectedUser.phone || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.roleLabel')}:</Text>
                  <View style={styles.roleValueWrap}>
                    <Text style={styles.detailValue}>{selectedUser.role}</Text>
                    <Text style={styles.roleImmutableNote}>
                      {t('admin.users.roleUnchangeableNotice')}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.statusLabel')}:</Text>
                  <StatusBadge status={selectedUser.status} />
                </View>

                {modalError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{modalError}</Text>
                  </View>
                )}

                {/* Pending Verification Notice & Bridge */}
                {selectedUser.status === 'PENDING_VERIFICATION' && (
                  <View style={styles.pendingVerificationBox}>
                    <Text style={styles.pendingVerificationText}>
                      ⚠️ {t('admin.users.pendingVerificationNotice')}
                    </Text>
                    <TouchableOpacity
                      style={styles.verificationBridgeButton}
                      onPress={handleNavigateToVerification}
                      accessibilityRole="button"
                      accessibilityLabel={t('admin.users.reviewVerification')}
                    >
                      <Text style={styles.verificationBridgeText}>
                        📑 {t('admin.users.reviewVerification')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Status Modification Controls */}
                <Text style={styles.statusSectionTitle}>
                  {t('admin.users.updateStatusTitle')}
                </Text>
                <View style={styles.statusButtonsRow}>
                  {PERMITTED_STATUS_UPDATES.map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusSelectButton,
                        newStatus === st && styles.statusSelectButtonActive,
                        st === 'SUSPENDED' && newStatus === st && styles.statusButtonSuspended,
                      ]}
                      onPress={() => setNewStatus(st)}
                      disabled={isSubmittingStatus || !isConnected || selectedUser.id === currentUser?.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Select status: ${st}`}
                    >
                      <Text
                        style={[
                          styles.statusSelectButtonText,
                          newStatus === st && styles.statusSelectButtonTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reasonInput}
                  placeholder={t('admin.users.reasonPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={statusReason}
                  onChangeText={setStatusReason}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!isSubmittingStatus && isConnected && selectedUser.id !== currentUser?.id}
                  accessibilityLabel={t('admin.users.reasonPlaceholder')}
                />

                {!isConnected && (
                  <Text style={styles.offlineNotice}>
                    {t('admin.users.offlineNotice')}
                  </Text>
                )}

                {selectedUser.id === currentUser?.id && (
                  <Text style={styles.selfNotice}>
                    ℹ️ {t('admin.users.selfStatusForbiddenMessage')}
                  </Text>
                )}

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseModal}
                    disabled={isSubmittingStatus}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.users.close')}
                  >
                    <Text style={styles.cancelButtonText}>{t('admin.users.close')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!isConnected || isSubmittingStatus || selectedUser.id === currentUser?.id) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleConfirmStatusChange}
                    disabled={isSubmittingStatus || !isConnected || selectedUser.id === currentUser?.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.users.applyStatus')}
                  >
                    {isSubmittingStatus ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('admin.users.applyStatus')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    paddingHorizontal: spacing.spaceMd,
    paddingTop: spacing.spaceSm,
    paddingBottom: spacing.spaceXs,
  },
  filterScroll: {
    maxHeight: 52,
    marginVertical: 2,
  },
  filterContainer: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 2,
    gap: spacing.spaceXs,
  },
  filterChip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.75)',
    paddingHorizontal: spacing.spaceSm + 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.20)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: spacing.spaceMd,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  listContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
    gap: spacing.spaceSm,
  },
  userCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceXs,
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  userName: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceXs,
  },
  metaBadge: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceXs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  joinedDate: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  verifyChips: {
    flexDirection: 'row',
    gap: 4,
  },
  verifiedTag: {
    fontSize: 10,
    color: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.85)',
    justifyContent: 'center',
    padding: spacing.spaceMd,
  },
  modalContent: {
    backgroundColor: '#071A21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    padding: spacing.spaceLg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.spaceMd,
    textAlign: 'center',
  },
  modalScroll: {
    flexGrow: 0,
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
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: typography.Body.fontSize,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  roleValueWrap: {
    alignItems: 'flex-end',
  },
  roleImmutableNote: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingVerificationBox: {
    marginTop: spacing.spaceSm,
    padding: spacing.spaceSm,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  pendingVerificationText: {
    fontSize: 12,
    color: '#D97706',
    marginBottom: spacing.spaceXs,
  },
  verificationBridgeButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: spacing.spaceMd,
  },
  verificationBridgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusSectionTitle: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  statusSelectButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.spaceSm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  statusSelectButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonSuspended: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  statusSelectButtonText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusSelectButtonTextActive: {
    color: '#FFFFFF',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.30)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: '#FFFFFF',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.spaceSm,
  },
  offlineNotice: {
    fontSize: typography.Caption.fontSize,
    color: '#E65100',
    marginBottom: spacing.spaceSm,
    textAlign: 'center',
  },
  selfNotice: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginTop: spacing.spaceSm,
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: typography.Caption.fontSize,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceMd,
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    borderRadius: 6,
    minWidth: 110,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AdminUsersScreen;
