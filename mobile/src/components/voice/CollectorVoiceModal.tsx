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

  const getStatusIcon = (): string => {
    switch (sessionState) {
      case 'LISTENING':
        return '🎙️';
      case 'PROCESSING':
        return '⏳';
      case 'SUCCESS':
        return '✅';
      case 'NO_SPEECH':
      case 'UNRECOGNIZED_COMMAND':
        return '❓';
      case 'PERMISSION_DENIED':
      case 'UNAVAILABLE':
      case 'OFFLINE':
      case 'ERROR':
        return '⚠️';
      case 'IDLE':
      default:
        return '🎤';
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
                <Text style={styles.headerTitle}>
                  🎙️ {t('voice.voiceAssistance') || 'Voice Commands'}
                </Text>
                <TouchableOpacity
                  onPress={closeVoiceModal}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close voice modal"
                >
                  <Text style={styles.closeBtnText}>✕</Text>
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
                    <Text style={styles.micIcon}>{getStatusIcon()}</Text>
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
    backgroundColor: 'rgba(15, 28, 18, 0.96)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.spaceLg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  headerTitle: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: spacing.spaceMd,
  },
  micCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  micCircleListening: {
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255, 152, 0, 0.25)',
  },
  micIcon: {
    fontSize: 32,
  },
  statusLabel: {
    fontSize: typography.Body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.spaceSm,
  },
  transcriptBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderRadius: 10,
    marginTop: spacing.spaceSm,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  transcriptText: {
    fontSize: typography.Body.fontSize,
    color: colors.primaryLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  intentBox: {
    marginTop: spacing.spaceSm,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 6,
  },
  intentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmationCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.4)',
    borderRadius: 14,
    padding: spacing.spaceMd,
    marginVertical: spacing.spaceSm,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFA726',
    marginBottom: 4,
  },
  confirmMessage: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
  },
  confirmBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.spaceLg,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 14,
    color: colors.surface,
    fontWeight: '700',
  },
  hintContainer: {
    marginTop: spacing.spaceMd,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.spaceSm,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  hintText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
