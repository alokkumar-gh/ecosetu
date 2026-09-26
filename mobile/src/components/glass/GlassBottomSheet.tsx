/**
 * GlassBottomSheet
 * Translucent slide-up bottom sheet with swipe/tap to dismiss.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

import { AppIcon } from '../ui/AppIcon';

interface GlassBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassBottomSheet: React.FC<GlassBottomSheetProps> = memo(({
  visible,
  onClose,
  title,
  children,
  style,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.sheet, style]} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
              >
                <AppIcon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.body}>{children}</View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

GlassBottomSheet.displayName = 'GlassBottomSheet';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 41, 66, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.90)',
    paddingHorizontal: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 41, 66, 0.20)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.80)',
  },
  title: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 41, 66, 0.05)',
  },
  closeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  body: {
    paddingTop: spacing.spaceSm,
  },
});

export default GlassBottomSheet;
