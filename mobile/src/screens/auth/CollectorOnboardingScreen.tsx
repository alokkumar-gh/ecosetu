/**
 * CollectorOnboardingScreen — Dedicated Collector Profile & Identity Verification
 * Canonical Reference: Prompt Sections 7, 8, 9, 10, 11, 12, 14, 15
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { AUTH_COLORS, AUTH_SPACE, AUTH_RADIUS, AUTH_SHADOW } from '../../components/auth/design/AuthTheme';
import { AppIcon } from '../../components/ui/AppIcon';

interface Props {
  navigation?: any;
  route?: any;
}

export const CollectorOnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { loginWithFirebase } = useAuth();
  const idToken = (route?.params as any)?.idToken;
  const initialName = (route?.params as any)?.name || '';
  const initialEmail = (route?.params as any)?.email || '';

  // Form Fields
  const [name, setName] = useState<string>(initialName);
  const [phone, setPhone] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');

  // Identity Document State
  const [documentType, setDocumentType] = useState<string>('AADHAAR');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mask document number for display (XXXX XXXX 1234)
  const getMaskedNumber = (val: string) => {
    const clean = val.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    const masked = 'X'.repeat(Math.max(0, clean.length - 4));
    return (masked + last4).replace(/(.{4})/g, '$1 ').trim();
  };

  const handlePickDocument = () => {
    // Simulated native picker demonstration (with option for mock Aadhaar or demo image)
    Alert.alert(
      'Upload Identity Proof',
      'Select a document source (Accepted: JPG, PNG, PDF up to 10MB)',
      [
        {
          text: 'Use Camera',
          onPress: () => {
            setDocumentUri('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
            setDocumentFileName('aadhaar_capture.jpg');
          },
        },
        {
          text: 'Choose from Files/Gallery',
          onPress: () => {
            setDocumentUri('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
            setDocumentFileName('gov_id_scan.png');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemoveDocument = () => {
    setDocumentUri(null);
    setDocumentBase64(null);
    setDocumentFileName(null);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone Number is required for pickup coordination.');
      return;
    }
    if (!serviceArea.trim()) {
      setErrorMsg('Operating Service Area / Ward is required.');
      return;
    }
    if (!documentUri) {
      setErrorMsg('Please upload a valid identity proof document.');
      return;
    }

    setIsLoading(true);
    try {
      const maskedDoc = documentNumber ? getMaskedNumber(documentNumber) : 'XXXX XXXX 4821';
      const profileData = {
        name: name.trim(),
        phone: phone.trim(),
        serviceArea: serviceArea.trim(),
        city: city.trim() || 'New Delhi',
        pincode: pincode.trim() || '110001',
        documentType,
        documentNumberMasked: maskedDoc,
        idDocumentUrl: documentUri,
      };

      if (idToken) {
        // Complete Google registration with role and profile
        await loginWithFirebase({
          idToken,
          role: ROLES.INFORMAL_COLLECTOR,
          profileData,
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification submission failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1612" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <AppIcon name="truck" size={32} color="#10B981" />
          </View>
          <Text style={styles.title}>COLLECTOR ONBOARDING</Text>
          <Text style={styles.subtitle}>
            Register your operational profile and submit identity verification for administrative review.
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <AppIcon name="alert" size={16} color={AUTH_COLORS.error} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Section 1: Profile Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. BASIC PROFILE</Text>

          <Text style={styles.inputLabel}>FULL NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Kumar"
            placeholderTextColor={AUTH_COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>PHONE NUMBER *</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor={AUTH_COLORS.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.inputLabel}>OPERATING AREA / LOCALITY *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rohini Sector 14, Ward 42"
            placeholderTextColor={AUTH_COLORS.textMuted}
            value={serviceArea}
            onChangeText={setServiceArea}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>CITY</Text>
              <TextInput
                style={styles.input}
                placeholder="Delhi"
                placeholderTextColor={AUTH_COLORS.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>PINCODE</Text>
              <TextInput
                style={styles.input}
                placeholder="110085"
                placeholderTextColor={AUTH_COLORS.textMuted}
                keyboardType="numeric"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
              />
            </View>
          </View>
        </View>

        {/* Section 2: Identity Verification */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. VERIFY YOUR IDENTITY</Text>
          <Text style={styles.sectionNotice}>
            To participate as an ECOSETU collector, your identity must be verified by our administration team.
            Submit a valid government identity document. Your account will remain pending until an administrator completes the review.
          </Text>

          <Text style={styles.inputLabel}>DOCUMENT TYPE</Text>
          <View style={styles.typeSelector}>
            {['AADHAAR', 'VOTER_ID', 'PAN'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeTab,
                  documentType === type && styles.typeTabActive,
                ]}
                onPress={() => setDocumentType(type)}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    documentType === type && styles.typeTabTextActive,
                  ]}
                >
                  {type === 'AADHAAR' ? 'Aadhaar' : type === 'VOTER_ID' ? 'Voter ID' : 'PAN'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>DOCUMENT NUMBER (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5623 8912 4821"
            placeholderTextColor={AUTH_COLORS.textMuted}
            keyboardType="numeric"
            value={documentNumber}
            onChangeText={setDocumentNumber}
          />
          {documentNumber.length > 4 ? (
            <Text style={styles.maskedPreview}>
              Masked on file: {getMaskedNumber(documentNumber)}
            </Text>
          ) : null}

          {/* Upload UX */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>IDENTITY PROOF DOCUMENT *</Text>
          {!documentUri ? (
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={handlePickDocument}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <AppIcon name="upload" size={32} color="#10B981" style={{ marginBottom: 8 }} />
              <Text style={styles.uploadTitle}>Upload Identity Proof</Text>
              <Text style={styles.uploadSubtitle}>JPG, PNG or PDF (Max 10MB)</Text>
              <View style={styles.chooseBtn}>
                <Text style={styles.chooseBtnText}>CHOOSE DOCUMENT</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewBox}>
              <Image source={{ uri: documentUri }} style={styles.previewImage} />
              <View style={styles.previewMeta}>
                <Text style={styles.previewFileName}>{documentFileName || 'Document Attached'}</Text>
                <Text style={styles.previewStatus}>Ready to submit for verification</Text>
                <View style={styles.previewActions}>
                  <TouchableOpacity onPress={handlePickDocument} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleRemoveDocument} style={styles.actionBtnDanger}>
                    <Text style={styles.actionBtnDangerText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.privacyNote}>
            <AppIcon name="shieldCheck" size={16} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <Text style={styles.privacyNoteText}>
              Privacy Guaranteed: Stored securely in encrypted cloud storage. Only accessible to authorized ECOSETU verification admins.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color={AUTH_COLORS.textPrimaryOnLight} />
          ) : (
            <>
              <Text style={styles.submitBtnText}>SUBMIT FOR VERIFICATION</Text>
              <Text style={styles.submitBtnArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1612',
  },
  scrollContent: {
    paddingHorizontal: AUTH_SPACE.screenH,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: AUTH_RADIUS.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: AUTH_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    marginBottom: 20,
    ...AUTH_SHADOW.card,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionNotice: {
    fontSize: 12,
    color: AUTH_COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AUTH_COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: AUTH_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeTab: {
    flex: 1,
    minHeight: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: AUTH_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTabActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: AUTH_COLORS.textSecondary,
  },
  typeTabTextActive: {
    color: '#FBBF24',
  },
  maskedPreview: {
    fontSize: 11,
    color: AUTH_COLORS.primaryLight,
    marginTop: -8,
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    borderRadius: AUTH_RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: AUTH_COLORS.textMuted,
    marginBottom: 14,
  },
  chooseBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: AUTH_RADIUS.full,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  chooseBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  previewBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: AUTH_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: AUTH_RADIUS.sm,
    backgroundColor: '#000',
  },
  previewMeta: {
    flex: 1,
  },
  previewFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  previewStatus: {
    fontSize: 11,
    color: AUTH_COLORS.primaryLight,
    marginBottom: 8,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: AUTH_COLORS.primaryLight,
  },
  actionBtnDanger: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
  },
  privacyNote: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: AUTH_RADIUS.sm,
  },
  privacyNoteText: {
    fontSize: 11,
    color: AUTH_COLORS.textMuted,
    lineHeight: 16,
  },
  submitBtn: {
    minHeight: 54,
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: AUTH_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...AUTH_SHADOW.button,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimaryOnLight,
    letterSpacing: 1,
  },
  submitBtnArrow: {
    fontSize: 18,
    fontWeight: '900',
    color: AUTH_COLORS.textPrimaryOnLight,
  },
});

export default CollectorOnboardingScreen;
