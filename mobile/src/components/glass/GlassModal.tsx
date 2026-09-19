/**
 * GlassModal — Reusable Glassmorphism Modal Wrapper
 * Restrained public-service modal dialog with translucent overlay,
 * keyboard-avoiding container, safe-area inset compliance, and accessible actions.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  onClose,
  title,
  children,
  contentStyle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoid}
            >
              <View style={[styles.modalCard, contentStyle]}>
                {Boolean(title) && (
                  <View style={styles.headerRow}>
                    <Text style={styles.titleText}>{title}</Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      accessibilityRole="button"
                      accessibilityLabel="Close dialog"
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.closeIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {children}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

GlassModal.displayName = 'GlassModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.glassOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 440,
  },
  modalCard: {
    backgroundColor: colors.glassFillElevated,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    padding: spacing.spaceLg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
    paddingBottom: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  closeButton: {
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default GlassModal;
