/**
 * VerificationDocumentCard — Reusable Professional KYC/Document Upload Card
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { AppIcon } from '../ui/AppIcon';
import { StatusBadge } from './StatusBadge';

interface VerificationDocumentCardProps {
  title: string;
  subtitle?: string;
  required?: boolean;
  status?: string;
  fileUri?: string | null;
  onUpload: () => void;
  onRemove?: () => void;
  iconName?: 'document' | 'camera' | 'shield' | 'idCard' | 'file';
  disabled?: boolean;
}

export const VerificationDocumentCard: React.FC<VerificationDocumentCardProps> = memo(({
  title,
  subtitle,
  required = true,
  status,
  fileUri,
  onUpload,
  onRemove,
  iconName = 'document',
  disabled = false,
}) => {
  const isUploaded = Boolean(fileUri);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <AppIcon
            name={iconName === 'idCard' ? 'shield' : iconName}
            size={20}
            color={colors.primary}
            strokeWidth={2}
          />
        </View>
        <View style={styles.titleArea}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {required ? (
              <View style={styles.requiredTag}>
                <Text style={styles.requiredText}>REQUIRED</Text>
              </View>
            ) : (
              <View style={styles.optionalTag}>
                <Text style={styles.optionalText}>OPTIONAL</Text>
              </View>
            )}
          </View>
          {Boolean(subtitle) && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {status && (
        <View style={styles.statusRow}>
          <StatusBadge status={status} />
        </View>
      )}

      {isUploaded && fileUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: fileUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.replaceBtn}
              onPress={onUpload}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <AppIcon name="refresh" size={14} color={colors.primary} />
              <Text style={styles.replaceText}>Replace</Text>
            </TouchableOpacity>
            {onRemove && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={onRemove}
                disabled={disabled}
                activeOpacity={0.8}
              >
                <AppIcon name="trash" size={14} color={colors.error} />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadArea, disabled && styles.disabled]}
          onPress={onUpload}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <AppIcon name="upload" size={24} color={colors.primary} strokeWidth={2} />
          <Text style={styles.uploadText}>Upload Document</Text>
          <Text style={styles.uploadSub}>PDF, PNG or JPG (Max 5MB)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

VerificationDocumentCard.displayName = 'VerificationDocumentCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.spaceMd,
    marginVertical: spacing.spaceSm,
    gap: spacing.spaceSm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentFill,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requiredTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  requiredText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.5,
  },
  optionalTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  optionalText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.55)',
  },
  statusRow: {
    marginTop: 2,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: colors.primary + '50',
    borderStyle: 'dashed',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    gap: 4,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  uploadSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  previewContainer: {
    gap: spacing.spaceSm,
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceMd,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  replaceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default VerificationDocumentCard;
