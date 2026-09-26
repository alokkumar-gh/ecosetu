/**
 * simpleLanguageExplanations.ts
 * Phase 9 & Phase 10: Simple Language Layer and Page Explanations for ECOSETU.
 * 
 * Philosophy:
 * Transforms formal / technical compliance jargon into accessible, natural,
 * conversational explanations understandable by informal e-waste collectors.
 * Supports Odia (or), Hindi (hi), Marathi (mr), and English (en).
 */

import { SupportedLanguage } from '../i18n/config';

export interface PageExplanation {
  title: string;
  simpleExplanation: Record<SupportedLanguage, string>;
  quickActionHint?: Record<SupportedLanguage, string>;
}

export const PAGE_EXPLANATIONS: Record<string, PageExplanation> = {
  CollectorDashboard: {
    title: 'Dashboard Overview',
    simpleExplanation: {
      or: 'ଏହା ଆପଣଙ୍କ ECOSETU ଡ୍ୟାସବୋର୍ଡ। ଏଠାରେ ଆପଣ କେତେ ଟଙ୍କା ରୋଜଗାର କରିଛନ୍ତି, କେତେ ଇ-ୱେଷ୍ଟ ସଂଗ୍ରହ କରିଛନ୍ତି ଏବଂ ନୂଆ କଲେକ୍ସନ୍ ଦେଖିପାରିବେ।',
      hi: 'यह आपका इकोसेतु डैशबोर्ड है। यहाँ आप अपनी कुल कमाई, एकत्र किया गया ई-कचरा और नए कलेक्शन देख सकते हैं।',
      mr: 'हे तुमचे इकोसेतू डॅशबोर्ड आहे. येथे तुम्ही तुमची एकूण कमाई, जमा केलेला ई-कचरा आणि नवीन संकलन पाहू शकता.',
      en: 'This is your EcoSetu dashboard. You can see your total earnings, collected e-waste, and active transactions here.',
    },
    quickActionHint: {
      or: 'ନୂଆ ମାଲ୍ ଯୋଡ଼ିବା ପାଇଁ ତଳେ ଥିବା ପ୍ଲସ୍ ବଟନ୍ ଦବାନ୍ତୁ।',
      hi: 'नया माल जोड़ने के लिए नीचे प्लस बटन दबाएं।',
      mr: 'नवीन माल जोडण्यासाठी खालील प्लस बटण दाबा.',
      en: 'Tap the add button below to record new scrap materials.',
    },
  },
  CollectorMaterialCapture: {
    title: 'E-Waste Identification',
    simpleExplanation: {
      or: 'କ୍ୟାମେରା ସାହାଯ୍ୟରେ ପୁରୁଣା ସାମଗ୍ରୀର ଫଟୋ ଉଠାନ୍ତୁ। ଆମର ସିଷ୍ଟମ୍ ଜାଣିପାରିବ ଏହା କେଉଁ ପ୍ରକାରର ସାମଗ୍ରୀ ଏବଂ ଏହାର ଉଚିତ୍ ଦର କେତେ।',
      hi: 'कैमरे से पुराने सामान की फोटो लें। हमारा सिस्टम पहचान लेगा कि यह किस तरह का सामान है और इसका सही दाम क्या होना चाहिए।',
      mr: 'कॅमेऱ्याने जुन्या साहित्याचा फोटो काढा. आमची प्रणाली ओळखेल की हे कोणत्या प्रकारचे साहित्य आहे आणि त्याचा योग्य दर काय असावा.',
      en: 'Take a clear photo of the e-waste item. The system helps identify the material category and estimated value.',
    },
    quickActionHint: {
      or: 'ଫଟୋ ଉଠାଇବା ପରେ ଓଜନ ଲେଖନ୍ତୁ।',
      hi: 'फोटो लेने के बाद वजन दर्ज करें।',
      mr: 'फोटो काढल्यानंतर वजन टाका.',
      en: 'Enter approximate weight after taking a photo.',
    },
  },
  CollectorPriceBoard: {
    title: 'Market Prices',
    simpleExplanation: {
      or: 'ଏଠାରେ ଆଜିର ବଜାର ଦର ଦେଖନ୍ତୁ। ମୋବାଇଲ୍, ଲ୍ୟାପଟପ୍, ବ୍ୟାଟେରୀ ଏବଂ ସର୍କିଟ୍ ବୋର୍ଡର କେଜି ପ୍ରତି ଦର ଏଠାରେ ମିଳିବ।',
      hi: 'यहाँ आज का बाजार भाव देखें। मोबाइल, लैपटॉप, बैटरी और सर्किट बोर्ड का प्रति किलो सही रेट यहाँ मिलेगा।',
      mr: 'येथे आजचे बाजार भाव पहा. मोबाईल, लॅपटॉप, बॅटरी आणि सर्किट बोर्डचे प्रतिकिलो योग्य दर येथे मिळतील.',
      en: 'View current benchmark market prices per kilogram for mobile phones, circuit boards, batteries, and appliances.',
    },
    quickActionHint: {
      or: 'ଅଧିକ ଦର ପାଇବା ପାଇଁ ସଠିକ୍ ରିସାଇକ୍ଲର ବାଛନ୍ତୁ।',
      hi: 'अच्छा दाम पाने के लिए सीधे रीसायकलर से जुड़ें।',
      mr: 'चांगला दर मिळवण्यासाठी थेट रीसायकलरशी संपर्क साधा.',
      en: 'Negotiate the best final rates directly with authorized recyclers.',
    },
  },
  CollectorLots: {
    title: 'Your Material Lots',
    simpleExplanation: {
      or: 'ଆପଣ ଯେଉଁ ସବୁ ମାଲ୍ ଏକାଠି କରିଛନ୍ତି, ତାହାର ତାଲିକା ଏଠାରେ ଅଛି। ଏହାକୁ ରିସାଇକ୍ଲରଙ୍କୁ ବିକ୍ରି କରିବା ପାଇଁ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।',
      hi: 'आपने जो भी सामान इकट्ठा किया है, उसकी लिस्ट यहाँ है। इसे रीसायकलर को बेचने के लिए तैयार करें।',
      mr: 'तुम्ही गोळा केलेल्या सर्व साहित्याची यादी येथे आहे. हे रीसायकलरला विकण्यासाठी तयार करा.',
      en: 'Here is the list of your aggregated scrap lots ready to be quoted and sold to authorized recyclers.',
    },
  },
  CollectorHandover: {
    title: 'Handover & Verification',
    simpleExplanation: {
      or: 'ମାଲ୍ ଦେବା ସମୟରେ ଓଜନ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ଡିଜିଟାଲ୍ ସ୍ୱୀକୃତି ନିଅନ୍ତୁ। ଏହା ଦ୍ୱାରା ଆପଣଙ୍କ ପେମେଣ୍ଟ ସୁରକ୍ଷିତ ରହିବ।',
      hi: 'सामान देते समय वजन की जांच करें और डिजिटल रसीद प्राप्त करें। इससे आपका भुगतान सुरक्षित रहेगा।',
      mr: 'माल देताना वजन तपासा आणि डिजिटल पावती घ्या. यामुळे तुमचे पेमेंट सुरक्षित राहील.',
      en: 'Verify final lot weight during pickup or delivery to generate a digital verifiable transfer receipt.',
    },
    quickActionHint: {
      or: 'ଓଜନ ମିଳାଇବା ପରେ ସବୁଜ ବଟନ୍ ଦବାନ୍ତୁ।',
      hi: 'वजन मिलाने के बाद हरा बटन दबाएं।',
      mr: 'वजन जुळल्यानंतर हिरवे बटण दाबा.',
      en: 'Confirm weight matching to seal the handover.',
    },
  },
  CollectorEarnings: {
    title: 'Earnings Ledger',
    simpleExplanation: {
      or: 'ଆପଣଙ୍କ ସମସ୍ତ ବିକ୍ରି ଏବଂ ପାଇଥିବା ଟଙ୍କାର ହିସାବ ଏଠାରେ ସୁରକ୍ଷିତ ଅଛି। କେଉଁ ଟଙ୍କା ମିଳିଛି ଏବଂ କେଉଁଟା ବାକି ଅଛି ସବୁ ଦେଖିପାରିବେ।',
      hi: 'आपकी कुल बिक्री और मिले हुए पैसों का हिसाब यहाँ सुरक्षित है। कितना पैसा मिला और कितना बाकी है, सब दिखेगा।',
      mr: 'तुमची एकूण विक्री आणि मिळालेल्या पैशांचा हिशोब येथे सुरक्षित आहे. किती पैसे मिळाले आणि किती बाकी आहेत ते पहा.',
      en: 'View your complete transparent financial earnings ledger, settled amounts, and pending receivables.',
    },
  },
  CollectorSafetyCenter: {
    title: 'Safety & Protection',
    simpleExplanation: {
      or: 'ଇ-ୱେଷ୍ଟ କାମ କରିବା ସମୟରେ ନିଜକୁ ସୁରକ୍ଷିତ ରଖନ୍ତୁ। ଫୁଲି ଯାଇଥିବା ବ୍ୟାଟେରୀ ଏବଂ ସିଆରଟି କାଚ ସମ୍ଭାଳି ଧରନ୍ତୁ। ଗ୍ଲୋଭସ୍ ବ୍ୟବହାର କରନ୍ତୁ।',
      hi: 'ई-कचरा संभालते समय अपनी सुरक्षा का ध्यान रखें। फूली हुई बैटरी और कांच को सावधानी से संभालें। दस्ताने जरूर पहनें।',
      mr: 'ई-कचरा हाताळताना स्वतःची काळजी घ्या. फुगलेली बॅटरी आणि काच जपून हाताळा. हातमोजे वापरा.',
      en: 'Essential safety guidelines for handling swollen lithium batteries, CRT glass, and sharp electronic parts.',
    },
  },
  CollectorPickups: {
    title: 'Pickup Requests',
    simpleExplanation: {
      or: 'ଆଖପାଖ ଲୋକଙ୍କ ଠାରୁ ଇ-ୱେଷ୍ଟ ନେବା ପାଇଁ ଅନୁରୋଧ ଏଠାରେ ଦେଖନ୍ତୁ। ଗ୍ରାହକଙ୍କ ଠିକଣା ଏବଂ ସମୟ ଯାଞ୍ଚ କରି ପିକଅପ୍ କରନ୍ତୁ।',
      hi: 'आसपास के लोगों से ई-कचरा उठाने के अनुरोध यहाँ देखें। पता और समय देखकर पिकअप पूरा करें।',
      mr: 'परिसरातील लोकांकडून ई-कचरा गोळा करण्याच्या विनंत्या येथे पहा. पत्ता आणि वेळ तपासून पिकअप पूर्ण करा.',
      en: 'View incoming e-waste pickup requests from nearby residents, verify location details, and navigate to collection points.',
    },
  },
  CollectorPayments: {
    title: 'Instant Payments',
    simpleExplanation: {
      or: 'ରିସାଇକ୍ଲରଙ୍କ ଠାରୁ ମିଳିଥିବା ଟଙ୍କାର ହିସାବ। ବ୍ୟାଙ୍କ ଖାତା କିମ୍ବା ୟୁପିଆଇ ମାଧ୍ୟମରେ ସିଧାସଳଖ ଟଙ୍କା ପାଆନ୍ତୁ।',
      hi: 'रीसायकलर्स से मिले पैसों का पूरा विवरण। बैंक खाते या यूपीआई से तुरंत भुगतान प्राप्त करें।',
      mr: 'रीसायकलर्सकडून मिळालेल्या पैशांचे संपूर्ण विवरण. बँक खाते किंवा यूपीआयद्वारे थेट पैसे मिळवा.',
      en: 'Track your settled payments from verified recyclers deposited directly into your bank or UPI account.',
    },
  },
  CollectorHelp: {
    title: 'EcoSaathi Vernacular Help',
    simpleExplanation: {
      or: 'କୌଣସି ଅସୁବିଧା ହେଲେ ଇକୋସାଥୀକୁ ନିଜ ଭାଷାରେ ପଚାରନ୍ତୁ। ସାମଗ୍ରୀର ଦର, ସୁରକ୍ଷା ନିୟମ ଏବଂ କଲେକ୍ସନ୍ ସହାୟତା ମିଳିବ।',
      hi: 'कोई भी समस्या होने पर इकोसाथी से अपनी भाषा में बात करें। भाव, सुरक्षा और कलेक्शन की पूरी मदद मिलेगी।',
      mr: 'काही अडचण आल्यास इकोसाथीशी आपल्या भाषेत बोला. साहित्याचे दर, सुरक्षा नियम आणि संकलनाची पूर्ण मदत मिळेल.',
      en: 'Ask EcoSaathi voice assistant in Marathi, Hindi, Odia, or English for pricing guidance, safety tips, and operational help.',
    },
  },
};

/**
 * Helper to get simple page explanation in active language
 */
export function getPageVoiceGuideText(
  pageKey: string,
  language: SupportedLanguage = 'en'
): string {
  const guide = PAGE_EXPLANATIONS[pageKey];
  if (!guide) {
    return '';
  }
  const explanation = guide.simpleExplanation[language] || guide.simpleExplanation.en || '';
  const hint = guide.quickActionHint?.[language] || guide.quickActionHint?.en || '';
  return hint ? `${explanation} ${hint}` : explanation;
}
