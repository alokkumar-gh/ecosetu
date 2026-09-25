/**
 * EcoSetu Mobile AI Microservice Client
 * Communicates with backend POST /api/v1/ai/predict for assistive e-waste detection.
 *
 * Invariants:
 * - Assistive ONLY: Never overrides user choice automatically.
 * - Non-blocking: Network/AI errors fail gracefully returning null/error without crashing UI.
 * - Stale request safe: Supports request tracking to prevent out-of-order overrides.
 *
 * Canonical Reference: docs/11_AI_EWASTE_DETECTION.md, docs/25_SIH_26229_REQUIREMENTS.md
 */

import { Platform } from 'react-native';
import { apiClient } from './apiClient.js';

export interface AIBoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface AIDetectionItem {
  class_id: number;
  category: string;
  confidence: number;
  bbox: AIBoundingBox;
}

export interface AIPrediction {
  has_detection: boolean;
  category: string;
  confidence: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  review_required: boolean;
  review_reason: string | null;
  bbox: AIBoundingBox | null;
  detections: AIDetectionItem[];
  allPredictions?: Array<{ category: string; confidence: number }>;
  modelVersion: string;
  inferenceTimeMs: number;
}

export interface AIPredictResult {
  success: boolean;
  prediction?: AIPrediction;
  error?: string;
  isStale?: boolean;
}

class MobileAiService {
  private _currentRequestId: number = 0;

  /**
   * Submit captured image to backend AI bridge for material suggestion.
   * @param imageUri - Local device URI of the captured photo
   * @param filename - Optional filename
   * @param mimeType - Optional MIME type (image/jpeg, image/png)
   * @returns AIPredictResult with prediction details or graceful failure
   */
  async predictMaterial(
    imageUri: string,
    filename?: string,
    mimeType?: string
  ): Promise<AIPredictResult> {
    const startTime = Date.now();
    console.log(`[EcoSetu AI MOBILE DEBUG] AI request started`);
    console.log(`[EcoSetu AI MOBILE DEBUG] image URI: ${imageUri}`);
    console.log(`[EcoSetu AI MOBILE DEBUG] request start time: ${new Date(startTime).toISOString()}`);

    if (!imageUri || typeof imageUri !== 'string') {
      console.warn('[EcoSetu AI MOBILE DEBUG] caught exception name/message: InvalidImageUri: image URI invalid');
      return { success: false, error: 'INVALID_IMAGE_URI' };
    }

    const requestId = ++this._currentRequestId;

    try {
      const formData = new FormData();
      const name = filename || `ewaste_${Date.now()}.jpg`;
      const type = mimeType || (imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      // Prepare React Native multipart file object
      const filePayload: any = {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        name,
        type,
      };

      formData.append('image', filePayload);

      const baseUrl = apiClient.getBaseUrl();
      const sanitizedHost = baseUrl ? baseUrl.replace(/\/api\/v1.*$/, '') : 'unknown';
      console.log(`[EcoSetu AI MOBILE DEBUG] request URL host only: ${sanitizedHost}`);
      console.log(`[EcoSetu AI MOBILE DEBUG] timeout: 30000ms`);

      let rawPrediction: any = null;
      let httpStatus = 200;

      // Send upload request to Node Backend bridge (/api/v1/ai/predict)
      try {
        const response = await apiClient.upload('/ai/predict', formData, {
          timeoutMs: 30000, // 30-second timeout optimized for Roboflow hosted inference
        });
        const elapsedMs = Date.now() - startTime;
        console.log(`[EcoSetu AI MOBILE DEBUG] HTTP status: 200 (elapsed: ${elapsedMs}ms)`);
        console.log(
          `[EcoSetu AI MOBILE DEBUG] raw response status/body shape: success=${Boolean(response?.success)}, hasData=${Boolean(response?.data)}, hasPrediction=${Boolean(response?.data?.prediction || response?.prediction)}`
        );
        if (response && response.success && response.data && response.data.prediction) {
          rawPrediction = response.data.prediction;
        } else if (response && response.prediction) {
          rawPrediction = response.prediction;
        } else if (response && response.data && (response.data.category || typeof response.data.has_detection === 'boolean')) {
          rawPrediction = response.data;
        }
      } catch (backendErr: any) {
        httpStatus = backendErr?.status || backendErr?.statusCode || 500;
        console.warn(`[EcoSetu AI MOBILE DEBUG] HTTP status: ${httpStatus}`);
        console.warn(`[EcoSetu AI MOBILE DEBUG] caught exception name/message: ${backendErr?.name || 'Error'}: ${backendErr?.message || backendErr}`);
      }

      // Stale request check: If another image was submitted while this request was in-flight
      if (requestId !== this._currentRequestId) {
        console.log('[EcoSetu AI MOBILE DEBUG] Request became stale, ignoring response');
        return { success: false, isStale: true, error: 'STALE_REQUEST' };
      }

      if (rawPrediction) {
        const hasDetection = Boolean(
          rawPrediction.has_detection !== false &&
          rawPrediction.category &&
          rawPrediction.category !== 'OTHER' &&
          (rawPrediction.confidence || 0) > 0.15
        );

        const prediction: AIPrediction = {
          has_detection: hasDetection,
          category: rawPrediction.category || 'OTHER',
          confidence: typeof rawPrediction.confidence === 'number' ? rawPrediction.confidence : 0.0,
          confidence_level: rawPrediction.confidence_level || 'LOW',
          review_required: Boolean(rawPrediction.review_required),
          review_reason: rawPrediction.review_reason || null,
          bbox: rawPrediction.bbox || null,
          detections: Array.isArray(rawPrediction.detections) ? rawPrediction.detections : [],
          allPredictions: Array.isArray(rawPrediction.allPredictions || rawPrediction.predictions) ? (rawPrediction.allPredictions || rawPrediction.predictions) : [],
          modelVersion: rawPrediction.modelVersion || rawPrediction.model_version || 'material-detection-v0.2.0',
          inferenceTimeMs: typeof (rawPrediction.inferenceTimeMs || rawPrediction.inference_time_ms) === 'number' ? (rawPrediction.inferenceTimeMs || rawPrediction.inference_time_ms) : 0,
        };

        console.log(
          `[EcoSetu AI MOBILE DEBUG] parsed success: true, has_detection: ${prediction.has_detection}, category: ${prediction.category}, confidence: ${prediction.confidence}, review_required: ${prediction.review_required}, detections count: ${prediction.detections.length}`
        );

        return {
          success: true,
          prediction,
        };
      }

      console.warn('[EcoSetu AI MOBILE DEBUG] parsed success: false, caught exception name/message: AI_SERVICE_UNAVAILABLE');
      return {
        success: false,
        error: 'AI_SERVICE_UNAVAILABLE',
      };
    } catch (err: any) {
      console.warn(`[EcoSetu AI MOBILE DEBUG] caught exception name/message: ${err?.name || 'Error'}: ${err?.message || err}`);
      // Return graceful failure without throwing to UI
      return {
        success: false,
        error: err?.message || 'AI_SERVICE_UNAVAILABLE',
      };
    }
  }

  /**
   * Reset request tracking sequence
   */
  cancelInFlight() {
    this._currentRequestId++;
  }
}

export const aiService = new MobileAiService();
export default aiService;
