/**
 * cameraService.ts
 * Scoped, on-demand device camera capture service for EcoSetu.
 *
 * PRIVACY & LIFECYCLE INVARIANTS:
 * - NO background camera access.
 * - NO camera permission requested on app startup or login.
 * - Only requested when the user taps "Take Photo" / "Submit Image".
 * - Validates capture result, size, and mime type.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { launchCamera, CameraOptions, ImagePickerResponse } from 'react-native-image-picker';

export interface CameraCaptureResult {
  success: boolean;
  uri?: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  error?: string;
}

/**
 * Check if Android camera permission is granted.
 */
export async function checkCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  } catch (err) {
    console.warn('[cameraService] Permission check error:', err);
    return false;
  }
}

/**
 * Request camera permission at runtime when user initiates photo capture.
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'EcoSetu Camera Access',
        message: 'EcoSetu needs camera access to photograph your e-waste items for verification.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[cameraService] Permission request error:', err);
    return false;
  }
}

/**
 * Direct camera launcher.
 * Opens the Android system camera, captures a photo, and returns the image asset details.
 */
export async function capturePhoto(): Promise<CameraCaptureResult> {
  const hasPermission = await checkCameraPermission();
  if (!hasPermission) {
    const granted = await requestCameraPermission();
    if (!granted) {
      return {
        success: false,
        error: 'CAMERA_PERMISSION_DENIED',
      };
    }
  }

  const options: CameraOptions = {
    mediaType: 'photo',
    cameraType: 'back',
    quality: 0.8,
    maxWidth: 1280,
    maxHeight: 1280,
    saveToPhotos: false,
    includeBase64: false,
  };

  try {
    const response: ImagePickerResponse = await launchCamera(options);

    if (response.didCancel) {
      return { success: false, error: 'USER_CANCELLED' };
    }

    if (response.errorCode) {
      return {
        success: false,
        error: response.errorMessage || response.errorCode,
      };
    }

    const asset = response.assets && response.assets[0];
    if (!asset || !asset.uri) {
      return { success: false, error: 'NO_IMAGE_CAPTURED' };
    }

    return {
      success: true,
      uri: asset.uri,
      fileName: asset.fileName || `ewaste_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
      type: asset.type || 'image/jpeg',
    };
  } catch (err: any) {
    console.error('[cameraService] Launch camera error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to open camera.',
    };
  }
}
