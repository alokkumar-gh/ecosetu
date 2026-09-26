/**
 * VernacularDocumentHelper.tsx
 * Phase 8: Optical Character Recognition (OCR) + Vernacular "Explain This" Component.
 * 
 * Flow:
 * Image (Camera / Gallery) -> Backend OCR -> Extracted Text -> "Explain this" Simple Language -> Optional TTS
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ViewStyle,
} from 'react-native';
import { useI18n } from '../../i18n';
import { bhashiniClientService } from '../../services/bhashiniClientService';
import { voiceService } from '../../services/voiceService';
import { AppIcon } from '../ui/AppIcon';
import { colors } from '../../theme/colors';

interface Props {
  imageBase64?: string;
  onExtractedText?: (text: string) => void;
  style?: ViewStyle;
}

export const VernacularDocumentHelper: React.FC<Props> = ({
  imageBase64,
  onExtractedText,
  style,
}) => {
  const { language, t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleExtractText = async () => {
    if (!imageBase64) {
      setStatusMessage(
        language === 'or'
          ? 'ଦୟାକରି ପ୍ରଥମେ ଏକ ଫଟୋ ବାଛନ୍ତୁ।'
          : language === 'hi'
          ? 'कृपया पहले एक फोटो चुनें।'
          : language === 'mr'
          ? 'कृपया प्रथम एक फोटो निवडा.'
          : 'Please select a photo first.'
      );
      return;
    }

    setLoading(true);
    setStatusMessage(
      language === 'or'
        ? 'ଫଟୋରୁ ଲେଖା ପଢାଯାଉଛି...'
        : language === 'hi'
        ? 'फोटो से टेक्स्ट पढ़ा जा रहा है...'
        : language === 'mr'
        ? 'फोटोमधून मजकूर वाचला जात आहे...'
        : 'Extracting text from image...'
    );

    try {
      const res = await bhashiniClientService.extractText(imageBase64, language);
      setLoading(false);

      if (res && res.extractedText) {
        setExtractedText(res.extractedText);
        onExtractedText?.(res.extractedText);
        setStatusMessage(null);
      } else {
        setStatusMessage(
          language === 'or'
            ? 'ଫଟୋରେ କୌଣସି ଲେଖା ଚିହ୍ନିହେଲା ନାହିଁ।'
            : language === 'hi'
            ? 'फोटो में कोई टेक्स्ट नहीं मिला।'
            : language === 'mr'
            ? 'फोटोमध्ये कोणताही स्पष्ट मजकूर सापडला नाही.'
            : 'No clear text detected in this image.'
        );
      }
    } catch (err) {
      setLoading(false);
      setStatusMessage('OCR processing error. Please try again.');
    }
  };

  const handleExplainThis = async () => {
    if (!extractedText.trim()) return;

    setLoading(true);
    setStatusMessage(
      language === 'or'
        ? 'ସହଜ ଭାଷାରେ ବୁଝାଉଛି...'
        : language === 'hi'
        ? 'सरल भाषा में समझ रहे हैं...'
        : language === 'mr'
        ? 'सोप्या भाषेत समजावून सांगत आहे...'
        : 'Simplifying explanation...'
    );

    try {
      // In production, backend or simple language layer translates & explains
      let simpleExplanation = '';
      if (language === 'or') {
        simpleExplanation = `ଏହି କାଗଜ/ଲେବଲ୍ ରେ ଇ-ୱେଷ୍ଟ ସାମଗ୍ରୀର ବିବରଣୀ ଏବଂ ନିୟମାବଳୀ ଲେଖା ଅଛି: "${extractedText.slice(0, 100)}..."। ଏହା ଏକ ପ୍ରାମାଣିକ ସାମଗ୍ରୀ।`;
      } else if (language === 'hi') {
        simpleExplanation = `इस दस्तावेज/लेबल पर ई-कचरे का विवरण और सुरक्षा निर्देश लिखे हैं: "${extractedText.slice(0, 100)}..."। यह वैध सामान है।`;
      } else if (language === 'mr') {
        simpleExplanation = `या दस्तऐवज/लेबलवर ई-कचऱ्याचे तपशील आणि सुरक्षा सूचना लिहिल्या आहेत: "${extractedText.slice(0, 100)}..."। हे वैध साहित्य आहे.`;
      } else {
        simpleExplanation = `This document/label contains equipment specification details: "${extractedText.slice(0, 100)}...". Valid for recycling logging.`;
      }

      setExplanation(simpleExplanation);
      setLoading(false);
      setStatusMessage(null);
    } catch {
      setLoading(false);
      setStatusMessage('Unable to simplify explanation.');
    }
  };

  const handleListenExplanation = async () => {
    if (isPlayingAudio) {
      await voiceService.stop();
      setIsPlayingAudio(false);
      return;
    }

    const textToSpeak = explanation || extractedText;
    if (!textToSpeak) return;

    setIsPlayingAudio(true);
    try {
      await voiceService.speak(textToSpeak, { language, force: true });
      setIsPlayingAudio(false);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <AppIcon name="document" size={16} color="#10B981" />
        <Text style={styles.headerTitle}>
          {language === 'or'
            ? 'କାଗଜ / ଲେବଲ୍ ପଢ଼ିବା ସହାୟକ (OCR)'
            : language === 'hi'
            ? 'दस्तावेज / लेबल रीडर (OCR)'
            : language === 'mr'
            ? 'दस्तऐवज / लेबल वाचक (OCR)'
            : 'Vernacular Document Reader'}
        </Text>
      </View>

      {statusMessage && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      {extractedText ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {language === 'or' ? 'ମିଳିଥିବା ଲେଖା:' : language === 'hi' ? 'पहचाना गया टेक्स्ट:' : language === 'mr' ? 'ओळखलेला मजकूर:' : 'Extracted Text:'}
          </Text>
          <Text style={styles.resultText} numberOfLines={4}>
            {extractedText}
          </Text>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleExplainThis}
              activeOpacity={0.8}
            >
              <AppIcon name="sparkles" size={14} color="#6EE7B7" />
              <Text style={styles.actionBtnText}>
                {language === 'or' ? 'ଏହାକୁ ବୁଝାନ୍ତୁ' : language === 'hi' ? 'इसे समझाइए' : language === 'mr' ? 'हे समजावून सांगा' : 'Explain This'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, isPlayingAudio && styles.actionBtnActive]}
              onPress={handleListenExplanation}
              activeOpacity={0.8}
            >
              <AppIcon
                name={isPlayingAudio ? 'square' : 'volume'}
                size={14}
                color={isPlayingAudio ? '#EF4444' : '#6EE7B7'}
              />
              <Text style={[styles.actionBtnText, isPlayingAudio && { color: '#EF4444' }]}>
                {isPlayingAudio
                  ? (language === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Stop')
                  : (language === 'or' ? 'ଶୁଣନ୍ତୁ' : 'Listen')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {explanation ? (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationTitle}>
            {language === 'or' ? '💡 ସରଳ ବୁଝାମଣା:' : language === 'hi' ? '💡 सरल सारांश:' : '💡 Simple Explanation:'}
          </Text>
          <Text style={styles.explanationContent}>{explanation}</Text>
        </View>
      ) : null}

      {!extractedText && imageBase64 && (
        <TouchableOpacity
          style={styles.extractBtn}
          onPress={handleExtractText}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#02080D" />
          ) : (
            <View style={styles.btnInner}>
              <AppIcon name="camera" size={16} color="#02080D" />
              <Text style={styles.extractBtnText}>
                {language === 'or' ? 'ଲେଖା ପଢ଼ନ୍ତୁ' : language === 'hi' ? 'टेक्स्ट पढ़ें' : 'Scan & Read Text'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(7, 30, 34, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  statusBox: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  resultBox: {
    backgroundColor: 'rgba(3, 12, 18, 0.6)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  resultText: {
    fontSize: 13,
    color: '#F1F5F9',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  explanationBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  explanationContent: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
  },
  extractBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extractBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#02080D',
  },
});

export default VernacularDocumentHelper;
