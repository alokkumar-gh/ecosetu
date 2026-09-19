/**
 * AdminNotificationCenterScreen
 *
 * Professional Administrative Notification Center for EcoSetu Command Center.
 * Enables authorized Administrators to compose and broadcast custom notifications,
 * target audiences or individual accounts, preview Android notification banners,
 * use quick operational templates, inspect broadcast history, and monitor delivery analytics.
 *
 * RBAC: ADMIN ONLY
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassBadge } from '../../components/glass/GlassBadge';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { useNetwork } from '../../hooks/useNetwork';
import { adminService } from '../../services/adminService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';

interface Props {
  navigation?: any;
  route?: any;
}

type TabType = 'compose' | 'history' | 'templates' | 'analytics';

interface TemplateItem {
  id: string;
  title: string;
  message: string;
  recommendedAudience: string;
  icon: string;
  description: string;
}

const NOTIFICATION_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl-service-update',
    title: 'ECOSETU Service Update',
    message: 'Doorstep e-waste collection services in your district may experience minor delays today due to weather conditions. Thank you for your patience.',
    recommendedAudience: 'CITIZENS',
    icon: 'ℹ️',
    description: 'Operational advisory on weather or district-wide logistics adjustments.',
  },
  {
    id: 'tpl-maintenance',
    title: 'Scheduled System Maintenance',
    message: 'The ECOSETU platform will undergo scheduled maintenance tonight between 02:00 AM and 03:00 AM IST. In-app features will resume immediately after.',
    recommendedAudience: 'ALL',
    icon: '🛠️',
    description: 'Advance notice for scheduled backend or server infrastructure maintenance.',
  },
  {
    id: 'tpl-safety-notice',
    title: 'Important: E-Waste Safety Advisory',
    message: 'Please do not dismantle lithium-ion batteries or broken screens before pickup. Keep all electronic items intact for safe collector handling.',
    recommendedAudience: 'CITIZENS',
    icon: '⚠️',
    description: 'Hazard prevention guidelines for handling hazardous electronics.',
  },
  {
    id: 'tpl-pickup-delay',
    title: 'Collector Dispatch Update',
    message: 'High pickup volume in your sector. Authorized informal collectors are fulfilling pending requests sequentially.',
    recommendedAudience: 'CITIZENS',
    icon: '🚚',
    description: 'High-volume notice when collector queues are busy.',
  },
  {
    id: 'tpl-verification-reminder',
    title: 'Profile Verification Required',
    message: 'To accept collection requests and deliver consignments, please ensure your KYC document has been uploaded for administrative verification.',
    recommendedAudience: 'PENDING_VERIFICATION',
    icon: '📋',
    description: 'Prompt unverified collectors or recyclers to upload credentials.',
  },
  {
    id: 'tpl-recycling-awareness',
    title: 'Circular Economy Spotlight',
    message: 'Every kilogram of e-waste recycled prevents toxic heavy metals from entering local landfills and recovers precious metals for reuse.',
    recommendedAudience: 'ALL',
    icon: '♻️',
    description: 'Community educational broadcast on environmental preservation.',
  },
  {
    id: 'tpl-platform-announcement',
    title: 'Official ECOSETU Announcement',
    message: 'New authorized formal recycling facilities have onboarded in your state, expanding accepted categories for safe downstream processing.',
    recommendedAudience: 'COLLECTORS',
    icon: '📢',
    description: 'New facility or regional network expansion notice.',
  },
];

const AUDIENCE_OPTIONS = [
  { id: 'ALL', label: 'All Users', icon: '🌐' },
  { id: 'CITIZENS', label: 'Citizens', icon: '👤' },
  { id: 'COLLECTORS', label: 'Informal Collectors', icon: '🛵' },
  { id: 'RECYCLERS', label: 'Formal Recyclers', icon: '🏭' },
  { id: 'ADMINS', label: 'Administrators', icon: '🛡️' },
  { id: 'VERIFIED', label: 'Verified Accounts', icon: '✅' },
  { id: 'PENDING_VERIFICATION', label: 'Pending Verification', icon: '⏳' },
  { id: 'SUSPENDED', label: 'Suspended Accounts', icon: '⚠️' },
  { id: 'INDIVIDUAL', label: 'Specific User', icon: '🎯' },
];

export const AdminNotificationCenterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabType>(route?.params?.tab || 'compose');

  // Compose State
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [audience, setAudience] = useState<string>(route?.params?.initialAudience || 'ALL');
  const [actionUrl, setActionUrl] = useState<string>('');
  const [targetUser, setTargetUser] = useState<any>(route?.params?.targetUser || null);

  // User search for individual targeting
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);

  // Sending & Confirmation State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);

  // Apply template
  const handleSelectTemplate = useCallback((tpl: TemplateItem) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setAudience(tpl.recommendedAudience);
    setActiveTab('compose');
  }, []);

  // Search users debounce
  useEffect(() => {
    if (audience !== 'INDIVIDUAL' || !userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await adminService.searchNotificationUsers(userSearchQuery);
        setUserSearchResults(results);
      } catch {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [userSearchQuery, audience]);

  // Load History
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const result = await adminService.getAdminNotificationHistory({ page: 1, limit: 20 });
      setHistoryList(result.broadcasts || []);
    } catch {
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load Analytics
  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const result = await adminService.getAdminNotificationAnalytics();
      setAnalyticsData(result);
    } catch {
      setAnalyticsData(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, loadHistory, loadAnalytics]);

  // Handle Send Initiation: Request recipient preview first
  const handleInitiateSend = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a notification title.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing Field', 'Please enter the notification message.');
      return;
    }
    if (audience === 'INDIVIDUAL' && !targetUser) {
      Alert.alert('Target User Required', 'Please search and select a target user account.');
      return;
    }
    if (!isConnected) {
      Alert.alert('Network Required', 'Notification sending is an online-only operation.');
      return;
    }

    setIsSending(true);
    try {
      const preview = await adminService.previewNotificationRecipients({
        audience,
        targetUserId: targetUser?.id || null,
      });
      setPreviewData(preview);
      setConfirmModalVisible(true);
    } catch (err: any) {
      Alert.alert('Preview Error', err?.message || 'Failed to resolve recipient audience.');
    } finally {
      setIsSending(false);
    }
  }, [title, message, audience, targetUser, isConnected]);

  // Confirm and Execute Dispatch
  const handleExecuteSend = useCallback(async () => {
    setConfirmModalVisible(false);
    setIsSending(true);
    setSendSuccessMessage(null);

    try {
      const res = await adminService.sendAdminNotification({
        title: title.trim(),
        message: message.trim(),
        type: 'ADMIN_MESSAGE',
        audience,
        targetUserId: targetUser?.id || null,
        actionUrl: actionUrl.trim() || null,
        confirmed: true,
      });

      setSendSuccessMessage(`Notification successfully broadcasted to ${(res as any)?.recipientCount || 0} recipient(s).`);
      setTitle('');
      setMessage('');
      setTargetUser(null);
      setUserSearchQuery('');
      setActionUrl('');

      // Refresh history if already loaded
      loadHistory();
    } catch (err: any) {
      Alert.alert('Broadcast Error', err?.message || 'Failed to dispatch notification.');
    } finally {
      setIsSending(false);
    }
  }, [title, message, audience, targetUser, actionUrl, loadHistory]);

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TopAppBar
          title="Notification Center"
          subtitle="Admin Broadcast & Governance"
          showBack
          onBack={() => navigation?.goBack?.()}
        />
        <OfflineBanner />

        {/* Tab Navigation Strip */}
        <View style={styles.tabBar}>
          {(['compose', 'history', 'templates', 'analytics'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const labels: Record<TabType, string> = {
              compose: '✍️ Compose',
              history: '📜 History',
              templates: '📑 Templates',
              analytics: '📊 Analytics',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentInner}>
          {/* ============================================================ */}
          {/* TAB 1: COMPOSE                                               */}
          {/* ============================================================ */}
          {activeTab === 'compose' && (
            <View>
              {sendSuccessMessage && (
                <GlassCard style={styles.successBanner}>
                  <Text style={styles.successText}>✅ {sendSuccessMessage}</Text>
                </GlassCard>
              )}

              {/* Quick Template Chips */}
              <Text style={styles.sectionHeading}>Quick Operational Templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateChipsRow}>
                {NOTIFICATION_TEMPLATES.slice(0, 5).map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={styles.templateChip}
                    onPress={() => handleSelectTemplate(tpl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.templateChipIcon}>{tpl.icon}</Text>
                    <Text style={styles.templateChipText}>{tpl.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Audience Selection */}
              <Text style={[styles.sectionHeading, { marginTop: spacing.spaceMd }]}>Target Audience</Text>
              <View style={styles.audienceGrid}>
                {AUDIENCE_OPTIONS.map((opt) => {
                  const isSelected = audience === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.audiencePill, isSelected && styles.audiencePillActive]}
                      onPress={() => {
                        setAudience(opt.id);
                        if (opt.id !== 'INDIVIDUAL') setTargetUser(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.audienceIcon}>{opt.icon}</Text>
                      <Text style={[styles.audienceLabel, isSelected && styles.audienceLabelActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Individual Target Search */}
              {audience === 'INDIVIDUAL' && (
                <GlassCard style={styles.individualCard}>
                  <Text style={styles.inputLabel}>Search Recipient Account</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter user name or email..."
                    placeholderTextColor={colors.textTertiary}
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                  />
                  {isSearchingUsers && (
                    <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
                  )}
                  {targetUser ? (
                    <View style={styles.selectedUserRow}>
                      <View>
                        <Text style={styles.selectedUserName}>{targetUser.name}</Text>
                        <Text style={styles.selectedUserMeta}>{targetUser.role} • {targetUser.status}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setTargetUser(null)}>
                        <Text style={styles.removeUserBtn}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    userSearchResults.length > 0 && (
                      <View style={styles.searchResultsContainer}>
                        {userSearchResults.map((u) => (
                          <TouchableOpacity
                            key={u.id}
                            style={styles.searchResultItem}
                            onPress={() => {
                              setTargetUser(u);
                              setUserSearchResults([]);
                              setUserSearchQuery('');
                            }}
                          >
                            <Text style={styles.searchResultName}>{u.name}</Text>
                            <Text style={styles.searchResultSub}>{u.role} • {u.status}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )
                  )}
                </GlassCard>
              )}

              {/* Title & Message Fields */}
              <GlassCard style={styles.composerCard}>
                <View style={styles.fieldRow}>
                  <Text style={styles.inputLabel}>Notification Title</Text>
                  <Text style={styles.charCount}>{title.length}/100</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ECOSETU Service Update"
                  placeholderTextColor={colors.textTertiary}
                  value={title}
                  onChangeText={(t) => setTitle(t.slice(0, 100))}
                  maxLength={100}
                />

                <View style={[styles.fieldRow, { marginTop: spacing.spaceMd }]}>
                  <Text style={styles.inputLabel}>Message Content</Text>
                  <Text style={styles.charCount}>{message.length}/500</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter clear, actionable message content for users..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  value={message}
                  onChangeText={(t) => setMessage(t.slice(0, 500))}
                  maxLength={500}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.spaceMd }]}>
                  Optional Action Deep Link
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ecosetu://requests or /citizen/submit"
                  placeholderTextColor={colors.textTertiary}
                  value={actionUrl}
                  onChangeText={setActionUrl}
                  autoCapitalize="none"
                />
              </GlassCard>

              {/* Android Notification Live Preview */}
              <Text style={[styles.sectionHeading, { marginTop: spacing.spaceMd }]}>Android Notification Preview</Text>
              <View style={styles.phonePreviewWrapper}>
                <View style={styles.androidNotificationBanner}>
                  <View style={styles.previewHeaderRow}>
                    <View style={styles.previewAppBrand}>
                      <Text style={styles.previewAppIcon}>🛡️</Text>
                      <Text style={styles.previewAppName}>ECOSETU</Text>
                    </View>
                    <Text style={styles.previewTimestamp}>Just now</Text>
                  </View>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {title.trim() || 'Notification Title'}
                  </Text>
                  <Text style={styles.previewBody} numberOfLines={2}>
                    {message.trim() || 'Notification body text will appear here on device lock screen and drawer.'}
                  </Text>
                </View>
              </View>

              {/* Send Button */}
              <GlassButton
                label={isSending ? 'Resolving Audience...' : '📢 Preview & Send Broadcast'}
                variant="primary"
                onPress={handleInitiateSend}
                disabled={isSending || !title.trim() || !message.trim()}
                style={styles.sendButton}
              />
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 2: HISTORY                                               */}
          {/* ============================================================ */}
          {activeTab === 'history' && (
            <View>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionHeading}>Administrative Broadcast History</Text>
                <TouchableOpacity onPress={loadHistory} style={styles.refreshIconBtn}>
                  <Text style={{ fontSize: 16 }}>🔄</Text>
                </TouchableOpacity>
              </View>

              {isLoadingHistory ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 32 }} />
              ) : historyList.length === 0 ? (
                <GlassCard style={styles.emptyCard}>
                  <Text style={styles.emptyCardIcon}>📬</Text>
                  <Text style={styles.emptyCardTitle}>No Broadcasts Yet</Text>
                  <Text style={styles.emptyCardSub}>
                    Administrative campaigns and custom messages sent to users will appear here.
                  </Text>
                </GlassCard>
              ) : (
                historyList.map((item) => (
                  <GlassCard key={item.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <GlassBadge label={item.audience} tone="info" />
                      <Text style={styles.historyDate}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historySender}>Initiated by {item.createdBy}</Text>
                    <View style={styles.historyMetricsRow}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{item.recipientCount}</Text>
                        <Text style={styles.metricLabel}>Recipients</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{item.readCount}</Text>
                        <Text style={styles.metricLabel}>Read</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{item.readRate}%</Text>
                        <Text style={styles.metricLabel}>Read Rate</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 3: TEMPLATES                                             */}
          {/* ============================================================ */}
          {activeTab === 'templates' && (
            <View>
              <Text style={styles.sectionHeading}>Pre-Approved Notification Templates</Text>
              <Text style={styles.sectionSub}>
                Use standardized templates to ensure clear, consistent operational communication.
              </Text>

              {NOTIFICATION_TEMPLATES.map((tpl) => (
                <GlassCard key={tpl.id} style={styles.templateCard}>
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateCardIcon}>{tpl.icon}</Text>
                    <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
                      <Text style={styles.templateCardTitle}>{tpl.title}</Text>
                      <GlassBadge label={tpl.recommendedAudience} tone="neutral" />
                    </View>
                  </View>
                  <Text style={styles.templateCardDesc}>{tpl.description}</Text>
                  <View style={styles.templateBodyPreview}>
                    <Text style={styles.templateBodyText}>{tpl.message}</Text>
                  </View>
                  <GlassButton
                    label="Use This Template"
                    variant="outline"
                    onPress={() => handleSelectTemplate(tpl)}
                    style={styles.useTemplateBtn}
                  />
                </GlassCard>
              ))}
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 4: ANALYTICS                                             */}
          {/* ============================================================ */}
          {activeTab === 'analytics' && (
            <View>
              <Text style={styles.sectionHeading}>Notification Delivery Analytics</Text>

              {isLoadingAnalytics ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 32 }} />
              ) : analyticsData ? (
                <View>
                  <View style={styles.analyticsGrid}>
                    <GlassCard style={styles.analyticsTile}>
                      <Text style={styles.analyticsTileValue}>{analyticsData.totalNotifications}</Text>
                      <Text style={styles.analyticsTileLabel}>Total Delivered</Text>
                    </GlassCard>
                    <GlassCard style={styles.analyticsTile}>
                      <Text style={styles.analyticsTileValue}>{analyticsData.readCount}</Text>
                      <Text style={styles.analyticsTileLabel}>Total Read</Text>
                    </GlassCard>
                    <GlassCard style={styles.analyticsTile}>
                      <Text style={styles.analyticsTileValue}>{analyticsData.readRate}%</Text>
                      <Text style={styles.analyticsTileLabel}>Platform Read Rate</Text>
                    </GlassCard>
                    <GlassCard style={styles.analyticsTile}>
                      <Text style={styles.analyticsTileValue}>{analyticsData.adminBroadcasts?.totalSent || 0}</Text>
                      <Text style={styles.analyticsTileLabel}>Admin Broadcasts</Text>
                    </GlassCard>
                  </View>

                  <GlassCard style={styles.analyticsCardDetailed}>
                    <Text style={styles.analyticsCardTitle}>Broadcast Read Engagement</Text>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>
                        Read: {analyticsData.adminBroadcasts?.read || 0}
                      </Text>
                      <Text style={styles.progressLabel}>
                        Unread: {analyticsData.adminBroadcasts?.unread || 0}
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${analyticsData.adminBroadcasts?.readRate || 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.analyticsFootnote}>
                      * All notifications are committed authoritatively to PostgreSQL before push dispatch.
                    </Text>
                  </GlassCard>
                </View>
              ) : (
                <GlassCard style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>Analytics Unavailable</Text>
                </GlassCard>
              )}
            </View>
          )}
        </ScrollView>

        {/* Confirmation Modal for Broadcasts */}
        <Modal
          visible={confirmModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.confirmModalBox}>
              <Text style={styles.modalTitle}>Confirm Broadcast</Text>
              <Text style={styles.modalBody}>
                You are about to send this official notification to{' '}
                <Text style={{ fontWeight: '700', color: colors.accent }}>
                  {previewData?.count || 0} recipient(s)
                </Text>{' '}
                in the{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                  {previewData?.audience || audience}
                </Text>{' '}
                segment.
              </Text>

              {previewData?.sample && previewData.sample.length > 0 && (
                <View style={styles.modalSampleContainer}>
                  <Text style={styles.modalSampleTitle}>Sample Recipients:</Text>
                  {previewData.sample.slice(0, 3).map((s: any) => (
                    <Text key={s.id} style={styles.modalSampleItem}>
                      • {s.name} ({s.role})
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleExecuteSend}
                >
                  <Text style={styles.modalConfirmText}>Confirm & Dispatch</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    backgroundColor: 'rgba(7, 30, 34, 0.65)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.spaceXs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: spacing.radiusSm,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.45)',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.spaceMd,
    paddingBottom: 60,
  },
  sectionHeading: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  sectionSub: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  successBanner: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    backgroundColor: 'rgba(5, 150, 105, 0.18)',
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  templateChipsRow: {
    marginBottom: spacing.spaceSm,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: spacing.radiusPill,
    marginRight: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  templateChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  templateChipText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceXs,
    marginBottom: spacing.spaceMd,
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  audiencePillActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.35)',
    borderColor: colors.accent,
  },
  audienceIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  audienceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  audienceLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  individualCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  composerCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: spacing.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  phonePreviewWrapper: {
    marginBottom: spacing.spaceLg,
  },
  androidNotificationBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewAppBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAppIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  previewAppName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  previewTimestamp: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  previewBody: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  sendButton: {
    marginTop: spacing.spaceXs,
  },
  selectedUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginTop: 8,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  selectedUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedUserMeta: {
    fontSize: 11,
    color: colors.accent,
  },
  removeUserBtn: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  searchResultsContainer: {
    marginTop: 8,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchResultName: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  searchResultSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  refreshIconBtn: {
    padding: 6,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCardIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  historyCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  historySender: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  historyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  templateCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateCardIcon: {
    fontSize: 22,
  },
  templateCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  templateCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  templateBodyPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 10,
    borderRadius: spacing.radiusSm,
    marginBottom: 12,
  },
  templateBodyText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  useTemplateBtn: {
    marginTop: 4,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  analyticsTile: {
    width: '48%',
    padding: spacing.spaceMd,
    alignItems: 'center',
  },
  analyticsTileValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
  },
  analyticsTileLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  analyticsCardDetailed: {
    padding: spacing.spaceMd,
  },
  analyticsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  analyticsFootnote: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  confirmModalBox: {
    width: '100%',
    padding: spacing.spaceLg,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  modalSampleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 10,
    borderRadius: spacing.radiusSm,
    marginBottom: 16,
  },
  modalSampleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalSampleItem: {
    fontSize: 11,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCancelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.accent,
  },
  modalConfirmText: {
    fontSize: 13,
    color: '#071E22',
    fontWeight: '700',
  },
});

export default AdminNotificationCenterScreen;
