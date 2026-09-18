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
import { adminService } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const ROLES = ['ALL', 'CITIZEN', 'INFORMAL_COLLECTOR', 'RECYCLER', 'ADMIN'];
const STATUSES = ['ALL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING_VERIFICATION'];
const PERMITTED_STATUS_UPDATES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

export const AdminUsersScreen: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { isConnected } = useNetwork();

  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    [selectedRole, selectedStatus, searchQuery],
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
        'Internet Connection Required',
        'Account status updates require real-time connection to the ECOSETU backend.',
      );
      return;
    }

    if (selectedUser.id === currentUser?.id) {
      Alert.alert(
        'Action Forbidden',
        'Administrators cannot change their own account status.',
      );
      return;
    }

    if (newStatus === selectedUser.status) {
      Alert.alert('No Change', `User is already in '${newStatus}' status.`);
      return;
    }

    Alert.alert(
      'Confirm Status Modification',
      `Are you sure you want to change status of ${selectedUser.name || 'this user'} to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
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
        'Status Updated',
        `Account status for ${updatedUser?.name || 'user'} has been updated to ${updatedUser?.status}.`,
        [{ text: 'OK', onPress: () => setSelectedUser(null) }],
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to update account status.';

      if (status === 409) {
        setModalError('Status conflict: user status was modified on the server. Please refresh.');
        loadUsers(page, true);
      } else if (status === 403) {
        setModalError('Forbidden: administrative permissions required.');
      } else {
        setModalError(msg);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingStatus(false);
    }
  };

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
        <Text style={styles.metaBadge}>Role: {item.role}</Text>
        {item.phone ? <Text style={styles.metaText}>📞 {item.phone}</Text> : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.joinedDate}>
          Joined: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}
        </Text>
        <View style={styles.verifyChips}>
          {item.isEmailVerified && <Text style={styles.verifiedTag}>✉️ Verified</Text>}
          {item.isPhoneVerified && <Text style={styles.verifiedTag}>📱 Verified</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar title="User Management" subtitle="Platform User Governance" showBack={false} />

      <OfflineBanner />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => loadUsers(1, false)}
          accessibilityLabel="Search users by name or email"
        />
      </View>

      {/* Role Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterChip, selectedRole === r && styles.filterChipActive]}
            onPress={() => setSelectedRole(r)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRole === r }}
          >
            <Text
              style={[styles.filterChipText, selectedRole === r && styles.filterChipTextActive]}
            >
              {r.replace('_', ' ')}
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
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, selectedStatus === s && styles.filterChipActive]}
            onPress={() => setSelectedStatus(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedStatus === s }}
          >
            <Text
              style={[styles.filterChipText, selectedStatus === s && styles.filterChipTextActive]}
            >
              {s.replace('_', ' ')}
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
            actionLabel="Retry"
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
              title="No Users Found"
              message="No users match the current search query or filter criteria."
              actionLabel="Clear Filters"
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
            <Text style={styles.modalTitle}>User Account Details</Text>

            {selectedUser && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedUser.name || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedUser.phone || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>{selectedUser.role}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Status:</Text>
                  <StatusBadge status={selectedUser.status} />
                </View>

                {modalError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{modalError}</Text>
                  </View>
                )}

                {/* Status Modification Controls */}
                <Text style={styles.statusSectionTitle}>Update Account Status</Text>
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
                      disabled={isSubmittingStatus || !isConnected}
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
                  placeholder="Optional administrative reason / notes..."
                  placeholderTextColor={colors.textSecondary}
                  value={statusReason}
                  onChangeText={setStatusReason}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!isSubmittingStatus && isConnected}
                />

                {!isConnected && (
                  <Text style={styles.offlineNotice}>
                    ⚠️ Status changes are disabled while offline.
                  </Text>
                )}

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseModal}
                    disabled={isSubmittingStatus}
                  >
                    <Text style={styles.cancelButtonText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!isConnected || isSubmittingStatus) && styles.buttonDisabled,
                    ]}
                    onPress={handleConfirmStatusChange}
                    disabled={isSubmittingStatus || !isConnected}
                  >
                    {isSubmittingStatus ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Apply Status</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.spaceMd,
    paddingTop: spacing.spaceSm,
    paddingBottom: spacing.spaceXs,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
  },
  filterScroll: {
    maxHeight: 44,
  },
  filterContainer: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 4,
    gap: spacing.spaceXs,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.spaceSm + 4,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
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
    color: colors.textPrimary,
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
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.spaceMd,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
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
    paddingVertical: spacing.spaceSm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
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
    borderColor: colors.divider,
    borderRadius: 6,
    padding: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
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
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: 6,
    minWidth: 110,
    alignItems: 'center',
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
