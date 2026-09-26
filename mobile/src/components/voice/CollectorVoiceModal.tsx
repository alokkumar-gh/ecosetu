/**
 * CollectorVoiceModal.tsx
 * Visual Glassmorphic Voice Command Interface for Informal Collectors.
 *
 * States:
 * IDLE, LISTENING, PROCESSING, SUCCESS, NO_SPEECH, UNRECOGNIZED_COMMAND,
 * PERMISSION_DENIED, UNAVAILABLE, OFFLINE, ERROR.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useCollectorVoice } from '../../context/CollectorVoiceContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';

import { AppIcon, IconName } from '../ui/AppIcon';

export const CollectorVoiceModal: React.FC = () => {
  const {
    isVoiceModalVisible,
    closeVoiceModal,
    sessionState,
    recognizedTranscript,
    parsedIntent,
    confirmationPrompt,
    triggerListening,
  } = useCollectorVoice();

  const { t } = useI18n();

  if (!isVoiceModalVisible) return null;

  const getStatusText = (): string => {
    switch (sessionState) {
      case 'LISTENING':
        return t('voice.speaking') || 'Listening... Speak now';
      case 'PROCESSING':
        return t('common.loading') || 'Processing speech...';
      case 'SUCCESS':
        return t('common.success') || 'Command recognized!';
      case 'NO_SPEECH':
        return 'No speech detected. Tap to try again.';
      case 'UNRECOGNIZED_COMMAND':
        return 'Command not recognized. Tap to try again.';
      case 'PERMISSION_DENIED':
        return 'Microphone access is required for voice commands.';
      case 'UNAVAILABLE':
        return t('voice.ttsUnavailable') || 'Voice recognition unavailable on this device.';
      case 'OFFLINE':
        return t('common.offline') || 'Internet connection required for this action.';
      case 'ERROR':
        return t('common.error') || 'Recognition error. Tap to retry.';
      case 'IDLE':
      default:
        return 'Tap microphone to speak a command';
    }
  };

  const getStatusIconName = (): IconName => {
    switch (sessionState) {
      case 'LISTENING':
        return 'mic';
      case 'PROCESSING':
        return 'clock';
      case 'SUCCESS':
        return 'check';
      case 'NO_SPEECH':
      case 'UNRECOGNIZED_COMMAND':
        return 'help';
      case 'PERMISSION_DENIED':
      case 'UNAVAILABLE':
      case 'OFFLINE':
      case 'ERROR':
        return 'alert';
      case 'IDLE':
      default:
        return 'mic';
    }
  };

  return (
    <Modal
      visible={isVoiceModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeVoiceModal}
    >
      <TouchableWithoutFeedback onPress={closeVoiceModal}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card} accessibilityRole="alert">
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <AppIcon name="mic" size={20} color="#10B981" />
                  <Text style={styles.headerTitle}>
                    {t('voice.voiceAssistance') || 'Voice Commands'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeVoiceModal}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close voice modal"
                >
                  <AppIcon name="close" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              {/* Status Section */}
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  onPress={triggerListening}
                  style={[
                    styles.micCircle,
                    sessionState === 'LISTENING' && styles.micCircleListening,
                  ]}
                  disabled={sessionState === 'LISTENING' || sessionState === 'PROCESSING'}
                  accessibilityRole="button"
                  accessibilityLabel="Activate microphone to speak command"
                >
                  {sessionState === 'PROCESSING' ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <AppIcon
                      name={getStatusIconName()}
                      size={32}
                      color={sessionState === 'LISTENING' ? '#22D3EE' : sessionState === 'SUCCESS' ? '#10B981' : '#FFFFFF'}
                    />
                  )}
                </TouchableOpacity>

                <Text style={styles.statusLabel}>{getStatusText()}</Text>

                {/* Recognized Transcript */}
                {recognizedTranscript ? (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptLabel}>Transcript:</Text>
                    <Text style={styles.transcriptText}>"{recognizedTranscript}"</Text>
                  </View>
                ) : null}

                {/* Recognized Action Feedback */}
                {parsedIntent && parsedIntent.intent !== 'UNKNOWN' && !confirmationPrompt ? (
                  <View style={styles.intentBox}>
                    <Text style={styles.intentText}>
                      Action: {parsedIntent.intent.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Confirmation Dialog for Destructive / State-Changing Commands */}
              {confirmationPrompt ? (
                <View style={styles.confirmationCard}>
                  <Text style={styles.confirmTitle}>{confirmationPrompt.title}</Text>
                  <Text style={styles.confirmMessage}>{confirmationPrompt.message}</Text>
                  <View style={styles.confirmBtnRow}>
                    <TouchableOpacity
                      onPress={confirmationPrompt.onCancel}
                      style={[styles.confirmBtn, styles.cancelBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel voice action"
                    >
                      <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmationPrompt.onConfirm}
                      style={[styles.confirmBtn, styles.actionBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm voice action"
                    >
                      <Text style={styles.actionBtnText}>{t('common.confirm') || 'Confirm'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* Command Hints */}
              {!confirmationPrompt && (
                <View style={styles.hintContainer}>
                  <Text style={styles.hintTitle}>Examples:</Text>
                  <Text style={styles.hintText}>• "Open pickups" / "मेरे पिकअप दिखाओ"</Text>
                  <Text style={styles.hintText}>• "Read available requests" / "अनुरोध पढ़ो"</Text>
                  <Text style={styles.hintText}>• "Accept this request" / "अनुरोध स्वीकार करो"</Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceLg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#071A21',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    padding: spacing.spaceLg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#CBD5E1',
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: spacing.spaceMd,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  micCircleListening: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },
  micIcon: {
    fontSize: 34,
  },
  statusLabel: {
    fontSize: typography.Body.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.spaceSm,
  },
  transcriptBox: {
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: 10,
    marginTop: spacing.spaceSm,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  transcriptText: {
    fontSize: typography.Body.fontSize,
    color: '#34D399',
    fontWeight: '600',
    marginTop: 2,
  },
  intentBox: {
    marginTop: spacing.spaceSm,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  intentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  confirmationCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.40)',
    borderRadius: 14,
    padding: spacing.spaceMd,
    marginVertical: spacing.spaceSm,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FCD34D',
    marginBottom: 4,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#F1F5F9',
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceMd,
  },
  confirmBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.spaceLg,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  actionBtnText: {
    fontSize: 14,
    color: '#03120E',
    fontWeight: '800',
  },
  hintContainer: {
    marginTop: spacing.spaceMd,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: spacing.spaceSm,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  hintText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
