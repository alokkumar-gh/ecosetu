/**
 * AuthorizedImage.tsx
 * Authenticated image loader component for EcoSetu.
 *
 * Securely loads private citizen e-waste photos and documents by injecting
 * the user's JWT access token via Authorization headers and token query parameters.
 *
 * Provides:
 * - Skeleton loading state
 * - Graceful fallback on network or authorization error
 * - Fullscreen preview modal on tap
 * - Complete adherence to EcoSetu glassmorphism theme
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ViewStyle,
  ImageStyle,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';
import { apiClient } from '../../services/apiClient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon } from '../ui/AppIcon';

interface Props {
  uri?: string | null;
  style?: ImageStyle | ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackIcon?: string;
  fallbackText?: string;
  allowFullscreen?: boolean;
  categoryLabel?: string;
  accessibilityLabel?: string;
}

export const AuthorizedImage: React.FC<Props> = ({
  uri,
  style,
  resizeMode = 'cover',
  fallbackIcon,
  fallbackText = 'Photo unavailable',
  allowFullscreen = true,
  categoryLabel,
  accessibilityLabel = 'E-Waste Item Photo',
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isFullscreenVisible, setIsFullscreenVisible] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    storage.getItem(STORAGE_KEYS.ACCESS_TOKEN).then((tok) => {
      if (isMounted) setToken(tok);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedUri = useMemo(() => {
    if (!uri) return null;

    // Local device image (captured or picked photo)
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      return uri;
    }

    // Relative backend path
    let full = uri;
    if (uri.startsWith('/')) {
      const base = apiClient.getBaseUrl();
      full = `${base}${uri}`;
    }

    // If token is available, append query parameter as fallback for native decoders
    if (token && full.includes('/api/v1/')) {
      const separator = full.includes('?') ? '&' : '?';
      return `${full}${separator}token=${encodeURIComponent(token)}`;
    }

    return full;
  }, [uri, token]);

  const imageSource = useMemo(() => {
    if (!resolvedUri) return null;
    if (resolvedUri.startsWith('file://') || resolvedUri.startsWith('content://')) {
      return { uri: resolvedUri };
    }
    return {
      uri: resolvedUri,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  }, [resolvedUri, token]);

  if (!resolvedUri || hasError) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <AppIcon name="camera" size={22} color={colors.textSecondary} />
        <Text style={styles.fallbackText} numberOfLines={1}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={allowFullscreen ? 0.85 : 1}
        onPress={() => allowFullscreen && setIsFullscreenVisible(true)}
        disabled={!allowFullscreen}
        style={[styles.container, style]}
        accessibilityRole={allowFullscreen ? 'button' : 'image'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={allowFullscreen ? 'Opens fullscreen photo view' : undefined}
      >
        <Image
          source={imageSource as any}
          style={[styles.image, style as any]}
          resizeMode={resizeMode}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />

        {isLoading && (
          <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {allowFullscreen && !isLoading && !hasError && (
          <View style={styles.expandPill}>
            <AppIcon name="search" size={10} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Fullscreen Zoom Modal */}
      {allowFullscreen && (
        <Modal
          visible={isFullscreenVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsFullscreenVisible(false)}
        >
          <SafeAreaView style={styles.modalBackdrop}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {categoryLabel || 'E-Waste Item Photo'}
                </Text>
                <Text style={styles.modalSubtitle}>Authorized Chain of Custody Media</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsFullscreenVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close fullscreen photo view"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <AppIcon name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageContainer}>
              <Image
                source={imageSource as any}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 30, 34, 0.35)',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: spacing.spaceXs,
  },
  fallbackIcon: {
    fontSize: 22,
    marginBottom: 2,
    opacity: 0.7,
  },
  fallbackText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  expandPill: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(7, 30, 34, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandText: {
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 28, 0.96)',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceMd,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  fullscreenImage: {
    width: width - 32,
    height: height - 180,
  },
});

export default AuthorizedImage;
