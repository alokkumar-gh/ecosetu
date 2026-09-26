/**
 * PhoneAuthModal — Government-Grade Phone OTP Verification
 * Implements two-step Phone Number → 6-Digit OTP verification.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 2, docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { firebaseAuthService, PhoneConfirmationResult } from '../../services/firebaseAuthService';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { AppIcon } from '../ui/AppIcon';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PhoneAuthModal: React.FC<Props> = ({ visible, onClose }) => {
  const { loginWithFirebase } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [confirmation, setConfirmation] = useState<PhoneConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const resetState = () => {
    setStep('PHONE');
    setPhoneNumber('+91');
    setOtpCode('');
    setConfirmation(null);
    setIsLoading(false);
    setErrorMessage(null);
    setCountdown(30);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSendOtp = async () => {
    setErrorMessage(null);
    const cleaned = phoneNumber.trim();
    if (!cleaned || cleaned.length < 10) {
      setErrorMessage(t('auth.invalidPhone') || 'Please enter a valid phone number with country code (+91).');
      return;
    }

    setIsLoading(true);
    try {
      const confirmResult = await firebaseAuthService.sendPhoneOtp(cleaned);
      setConfirmation(confirmResult);
      setStep('OTP');
      setCountdown(30);
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage(t('auth.invalidOtp') || 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      let idToken = '';
      if (confirmation?.confirm) {
        const result = await confirmation.confirm(otpCode.trim());
        idToken = result.idToken;
      } else {
        throw new Error('Verification session expired. Please request a new OTP.');
      }

      await loginWithFirebase({ idToken, provider: 'phone' });
      handleClose();
    } catch (err: any) {
      setErrorMessage(firebaseAuthService.mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.badgeCircle}>
                <AppIcon name="phone" size={18} color="#059669" />
              </View>
              <Text style={styles.title}>
                {step === 'PHONE'
                  ? (t('auth.continueWithPhone') || 'Sign In with Phone')
                  : (t('auth.verifyOtp') || 'Verify OTP')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <AppIcon name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <AppIcon name="alert" size={13} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            </View>
          )}

          {step === 'PHONE' ? (
            <View>
              <Text style={styles.subtitle}>
                We will send an SMS verification code to your registered mobile number.
              </Text>

              <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94A3B8"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="phone-pad"
                autoFocus
                accessibilityLabel="Phone number input"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.sendOtp') || 'Send Verification Code'}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('auth.sendOtp') || 'Send Verification Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.subtitle}>
                Enter the 6-digit verification code sent to {phoneNumber}.
              </Text>

              <Text style={styles.inputLabel}>6-Digit Verification Code *</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="• • • • • •"
                placeholderTextColor="#94A3B8"
                value={otpCode}
                onChangeText={(text) => {
                  setOtpCode(text.replace(/\D/g, '').slice(0, 6));
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                accessibilityLabel="6-digit verification code"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, (isLoading || otpCode.length !== 6) && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading || otpCode.length !== 6}
                accessibilityRole="button"
                accessibilityLabel={t('auth.verifyOtp') || 'Verify & Sign In'}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('auth.verifyOtp') || 'Verify & Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.timerText}>
                    Resend code in {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.resendOtp') || 'Resend Code'}
                  >
                    <Text style={styles.resendLink}>
                      {t('auth.resendOtp') || 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 41, 66, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(7, 30, 34, 0.96)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  closeBtn: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '500',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(16, 44, 48, 0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#10B981',
    borderWidth: 1.5,
    color: '#34D399',
  },
  primaryBtn: {
    minHeight: 50,
    backgroundColor: '#10B981',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#051417',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  timerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.60)',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
});

export default PhoneAuthModal;
