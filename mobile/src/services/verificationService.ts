/**
 * VerificationService — Mobile Client for Identity & Role Verification
 * Communicates with backend /api/v1/verifications endpoints.
 * Canonical Reference: docs/05_API_SPECIFICATION.md Section 14
 */

import { apiClient } from './apiClient.js';
import { AppError } from '../utils/AppError.js';

export interface VerificationSubmissionData {
  documentType: string;
  documentNumberMasked?: string;
  documentUrl?: string;
  fileBase64?: string;
  fileExtension?: string;
  mimeType?: string;
  reviewNotes?: string;
}

export interface VerificationStatusResponse {
  userId: string;
  role: string;
  accountStatus: string;
  isVerified: boolean;
  latestVerification: {
    id: string;
    status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUIRED';
    documentType: string;
    documentNumberMasked?: string;
    submittedAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
    rejectionReason?: string;
    changeRequestReason?: string;
    changeRequestOptions?: string[];
  } | null;
  history: Array<{
    id: string;
    status: string;
    documentType: string;
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    changeRequestReason?: string;
  }>;
}

class VerificationService {
  /**
   * Submit identity / authorization document for verification
   */
  async submitVerification(data: VerificationSubmissionData) {
    const response = await apiClient.post('/verifications/submit', data);
    if (!response?.success || !response.data) {
      throw AppError.validationError('Verification submission failed');
    }
    return response.data;
  }

  /**
   * Fetch current verification status and admin feedback
   */
  async getStatus(): Promise<VerificationStatusResponse> {
    const response = await apiClient.get('/verifications/status');
    if (!response?.success || !response.data) {
      throw AppError.serverError('Failed to fetch verification status');
    }
    return response.data;
  }

  /**
   * Resubmit corrected verification documents
   */
  async resubmitVerification(data: VerificationSubmissionData) {
    const response = await apiClient.post('/verifications/resubmit', data);
    if (!response?.success || !response.data) {
      throw AppError.validationError('Verification resubmission failed');
    }
    return response.data;
  }
}

export const verificationService = new VerificationService();
export default verificationService;
